<?php

namespace Drupal\smt_site\Controller;

use Drupal\Component\Utility\Html;
use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Url;
use Drupal\node\Entity\Node;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * POST /api/messages-contact : dépôt d'un message par le formulaire du site public.
 *
 * Même contrat que l'ancienne API Strapi (corps JSON { data: {...} }, réponse 201 sans donnée) :
 *  - limitation : 5 messages par adresse IP sur 15 minutes (429) ;
 *  - anti-spam serveur : champ piège « website », délai de saisie < 3 s, plus de 3 liens,
 *    doublon (même e-mail et même texte) en moins de 10 minutes → réponse 201 identique, rien n'est enregistré ;
 *  - consentement exprès obligatoire (loi organique n° 2004-63, art. 27), date conservée ;
 *  - seuls les champs du formulaire sont repris ; statut forcé à « nouveau » ;
 *  - notification interne (routage par objet) et accusé de réception au visiteur.
 */
class ContactController extends ControllerBase {

  const ALLOWED = ['fullName' => 'title', 'phone' => 'message_contact_phone', 'email' => 'message_contact_email',
    'subject' => 'message_contact_subject', 'message' => 'message_contact_message'];
  const SUBJECTS = [
    'carte_bancaire' => 'Carte bancaire', 'switch_monetique' => 'Switch monétique', 'switch_mobile_wallet' => 'Switch mobile & Wallet',
    'ecommerce_clictopay' => 'E-commerce – ClicToPay', 'paysmart' => 'Paysmart – paiement de factures', 'certification' => 'Certification',
    'formation_conseil' => 'Formation & conseil', 'reclamation_autre' => 'Réclamation / autre demande',
  ];
  const WINDOW = 900;
  const MAX_PER_WINDOW = 5;
  const MIN_FILL_MS = 3000;
  const MAX_LINKS = 3;
  const DUP_SECONDS = 600;

  public function submit(Request $request): JsonResponse {
    if ($request->getMethod() === 'OPTIONS') {
      return $this->cors($request, new JsonResponse(NULL, 204));
    }
    $ip = $request->getClientIp();
    $flood = \Drupal::flood();
    if (!$flood->isAllowed('smt_site.contact', self::MAX_PER_WINDOW, self::WINDOW, $ip)) {
      return $this->cors($request, new JsonResponse(['error' => 'Trop de messages envoyés. Merci de réessayer plus tard.'], 429));
    }
    $flood->register('smt_site.contact', self::WINDOW, $ip);

    $body = json_decode($request->getContent() ?: '{}', TRUE);
    $input = is_array($body['data'] ?? NULL) ? $body['data'] : [];
    if ($reason = $this->spamReason($input)) {
      $this->getLogger('smt_site')->info('Message de contact écarté (@r) — IP @ip', ['@r' => $reason, '@ip' => $ip]);
      return $this->cors($request, new JsonResponse(['ok' => TRUE], 201));
    }
    if (($input['consent'] ?? NULL) !== TRUE) {
      return $this->cors($request, new JsonResponse(['error' => 'Consentement requis.'], 400));
    }
    $values = ['type' => 'message_contact', 'status' => 0, 'langcode' => 'fr', 'uid' => 0,
      'message_contact_status' => 'nouveau', 'message_contact_consent_at' => gmdate('Y-m-d\TH:i:s')];
    foreach (self::ALLOWED as $key => $field) {
      if (is_string($input[$key] ?? NULL)) {
        $values[$field] = mb_substr(trim($input[$key]), 0, $key === 'message' ? 5000 : 254);
      }
    }
    $node = Node::create($values);
    $violations = $node->validate()->filterByFieldAccess();
    if (count($violations) || empty($values['title']) || empty($values['message_contact_email']) || empty($values['message_contact_message'])
      || !isset(self::SUBJECTS[$values['message_contact_subject'] ?? ''])) {
      return $this->cors($request, new JsonResponse(['error' => 'Champs obligatoires manquants ou invalides.'], 400));
    }
    $node->save();
    try {
      $this->notify($node);
    }
    catch (\Throwable $e) {
      // Le message est déjà enregistré : une panne de messagerie ne le fait jamais perdre.
      $this->getLogger('smt_site')->error('Notification de contact impossible : @m', ['@m' => $e->getMessage()]);
    }
    finally {
      // Une erreur d'envoi d'e-mail serait sinon affichée via la session : pas de cookie pour le visiteur.
      \Drupal::messenger()->deleteAll();
    }
    return $this->cors($request, new JsonResponse(['ok' => TRUE], 201));
  }

  protected function spamReason(array $input): ?string {
    if (is_string($input['website'] ?? NULL) && trim($input['website']) !== '') {
      return 'champ piège rempli';
    }
    $elapsed = $input['elapsed'] ?? NULL;
    if (!is_numeric($elapsed) || $elapsed < self::MIN_FILL_MS || $elapsed > 86400000) {
      return 'délai de saisie anormal';
    }
    $text = (string) ($input['message'] ?? '');
    if (preg_match_all('#https?://|www\.#i', $text) > self::MAX_LINKS) {
      return 'trop de liens';
    }
    $email = mb_strtolower(trim((string) ($input['email'] ?? '')));
    $key = 'smt_site.dup.' . hash('sha256', $email . '|' . mb_substr(trim($text), 0, 500));
    $expirable = \Drupal::keyValueExpirable('smt_site');
    if ($expirable->get($key)) {
      return 'doublon';
    }
    $expirable->setWithExpire($key, 1, self::DUP_SECONDS);
    return NULL;
  }

  /** Réponse sans cache ; les en-têtes CORS sont ajoutés par ContactCorsSubscriber. */
  protected function cors(Request $request, JsonResponse $response): JsonResponse {
    $response->setPrivate();
    return $response;
  }

  /** Notification interne et accusé de réception (qui ne reprend pas le texte saisi : pas de relais de spam). */
  protected function notify(Node $node): void {
    $mail = \Drupal::service('plugin.manager.mail');
    $one = fn($s, $max = 120) => mb_substr(trim(preg_replace('/\s+/u', ' ', (string) $s)), 0, $max);
    $subject = $node->get('message_contact_subject')->value;
    $label = self::SUBJECTS[$subject] ?? 'Demande';
    $name = $one($node->label(), 80);
    $email = $one($node->get('message_contact_email')->value, 254);
    $routing = json_decode(getenv('SMT_CONTACT_ROUTING') ?: '{}', TRUE) ?: [];
    $to = $routing[$subject] ?? (getenv('SMT_CONTACT_NOTIFY_TO') ?: 'contact@monetiquetunisie.com');
    $admin = Url::fromRoute('entity.node.edit_form', ['node' => $node->id()], ['absolute' => TRUE])->toString();
    $text = implode("\n", [
      'Nouveau message reçu depuis le formulaire de contact du site.', '',
      "Nom : $name", "E-mail : $email", 'Téléphone : ' . ($one($node->get('message_contact_phone')->value) ?: '—'), "Objet : $label", '',
      'Message :', mb_substr((string) $node->get('message_contact_message')->value, 0, 5000), '', "Traiter le message : $admin",
    ]);
    $mail->mail('smt_site', 'internal', $to, 'fr', ['subject' => "[Site web] $label — $name", 'text' => $text, 'reply_to' => $email]);
    if (getenv('SMT_CONTACT_ACK_ENABLED') !== 'false' && $email) {
      $ack = "Bonjour,\n\nNous avons bien reçu votre demande (objet : " . Html::decodeEntities($label) . "). Notre équipe vous répondra dans les meilleurs délais.\n\n"
        . "Pour toute urgence : +216 71 155 840.\n\nMonétique Tunisie\nCet e-mail est envoyé automatiquement, merci de ne pas y répondre.";
      $mail->mail('smt_site', 'ack', $email, 'fr', ['subject' => 'Monétique Tunisie — nous avons bien reçu votre message', 'text' => $ack]);
    }
  }

}
