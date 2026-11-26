<?php

namespace Drupal\smt_site;

use Drupal\Core\Entity\Entity\EntityFormDisplay;
use Drupal\Core\Entity\Entity\EntityViewDisplay;
use Drupal\field\Entity\FieldConfig;
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\language\Entity\ConfigurableLanguage;
use Drupal\language\Entity\ContentLanguageSettings;
use Drupal\node\Entity\NodeType;
use Drupal\paragraphs\Entity\ParagraphsType;
use Drupal\user\Entity\Role;
use Drupal\workflows\Entity\Workflow;

/**
 * Construit le modèle de contenu à partir de model/model.json (généré depuis les schémas Strapi).
 *
 * Idempotent : peut être relancé (drush smt_site.rebuild via hook_update) pour ajouter ce qui manque.
 */
class ModelBuilder {

  /** Types de contenu non soumis au circuit de validation. */
  const NOT_MODERATED = ['message_contact'];

  public static function model(): array {
    return json_decode(file_get_contents(__DIR__ . '/../model/model.json'), TRUE);
  }

  public static function build(): void {
    $m = self::model();
    self::languages();
    self::cleanStandardProfile();
    foreach ($m['paragraph'] as $id => $def) {
      if (!ParagraphsType::load($id)) {
        ParagraphsType::create(['id' => $id, 'label' => $def['label']])->save();
      }
      self::translation('paragraph', $id, TRUE);
    }
    foreach ($m['node'] as $id => $def) {
      $type = NodeType::load($id) ?: NodeType::create(['type' => $id, 'name' => $def['label'], 'description' => $def['description']]);
      $type->set('new_revision', TRUE);
      $type->set('display_submitted', FALSE);
      $type->set('preview_mode', 0);
      $type->save();
      self::translation('node', $id, $def['translatable']);
      // Libellé du titre (Nom, Question…) ; titre non traduit pour les types non traduisibles.
      $title = \Drupal::service('entity_field.manager')->getFieldDefinitions('node', $id)['title'];
      $title->getConfig($id)->setLabel($def['titleLabel'])->save();
    }
    // Les paragraphes doivent exister avant les champs qui les référencent.
    foreach ($m['paragraph'] as $id => $def) {
      self::fields('paragraph', $id, $def['fields']);
    }
    foreach ($m['node'] as $id => $def) {
      self::fields('node', $id, $def['fields']);
    }
    self::workflow(array_diff(array_keys($m['node']), self::NOT_MODERATED));
    self::roles(array_keys($m['node']));
  }

  /** Retire le contenu de démonstration du profil standard (type Article, corps de la page de base). */
  protected static function cleanStandardProfile(): void {
    if ($body = FieldConfig::loadByName('node', 'page', 'body')) {
      $body->delete();
    }
    if (($article = NodeType::load('article')) && !\Drupal::entityQuery('node')->accessCheck(FALSE)->condition('type', 'article')->range(0, 1)->execute()) {
      $article->delete();
    }
  }

  /** Français (par défaut), anglais, arabe (de droite à gauche). */
  protected static function languages(): void {
    foreach (['fr', 'en', 'ar'] as $code) {
      if (!ConfigurableLanguage::load($code)) {
        ConfigurableLanguage::createFromLangcode($code)->save();
      }
    }
    \Drupal::configFactory()->getEditable('system.site')->set('default_langcode', 'fr')->save();
    $w = 0;
    foreach (['fr', 'en', 'ar'] as $code) {
      ConfigurableLanguage::load($code)->setWeight($w++)->save();
    }
    // Préfixes d'URL : /fr (défaut, sans préfixe), /en, /ar — utilisés par l'API pour choisir la langue.
    $prefixes = \Drupal::configFactory()->getEditable('language.negotiation');
    $prefixes->set('url.prefixes', ['fr' => '', 'en' => 'en', 'ar' => 'ar'])->save();
  }

  protected static function translation(string $entity_type, string $bundle, bool $enabled): void {
    $s = ContentLanguageSettings::loadByEntityTypeBundle($entity_type, $bundle);
    $s->setDefaultLangcode('site_default')->setLanguageAlterable(FALSE);
    $s->setThirdPartySetting('content_translation', 'enabled', $enabled);
    $s->save();
  }

  /** Paramètres de stockage/champ et widget par type logique. */
  protected static function spec(array $f): array {
    $multiple = !empty($f['multiple']);
    switch ($f['type']) {
      case 'string': return ['string', ['max_length' => 255], [], 'string_textfield'];
      case 'string_long': return ['string_long', [], [], 'string_textarea'];
      case 'text_long': return ['text_long', [], ['allowed_formats' => ['basic_html']], 'text_textarea'];
      case 'integer': return ['integer', [], [], 'number'];
      case 'decimal': return ['decimal', ['precision' => 14, 'scale' => 2], [], 'number'];
      case 'boolean': return ['boolean', [], ['on_label' => 'Oui', 'off_label' => 'Non'], 'boolean_checkbox'];
      case 'email': return ['email', [], [], 'email_default'];
      case 'date': return ['datetime', ['datetime_type' => 'date'], [], 'datetime_default'];
      case 'datetime': return ['datetime', ['datetime_type' => 'datetime'], [], 'datetime_default'];
      case 'list_string':
        $allowed = [];
        foreach ($f['options'] as $v) {
          $allowed[$v] = ucfirst(str_replace('_', ' ', $v));
        }
        return ['list_string', ['allowed_values' => $allowed], [], 'options_select'];
      case 'image':
        return ['image', [], ['file_extensions' => 'png gif jpg jpeg webp', 'alt_field' => TRUE, 'alt_field_required' => FALSE,
          'file_directory' => 'images/[date:custom:Y]-[date:custom:m]', 'max_filesize' => '8 MB'], 'image_image'];
      case 'file':
        return ['file', [], ['file_extensions' => $f['strapi'] === 'video' ? 'mp4 webm' : 'pdf doc docx xls xlsx ppt pptx zip png jpg jpeg ico',
          'file_directory' => ($f['strapi'] === 'video' ? 'videos' : 'documents') . '/[date:custom:Y]-[date:custom:m]', 'max_filesize' => '20 MB'], 'file_generic'];
      case 'paragraphs':
        return ['entity_reference_revisions', ['target_type' => 'paragraph'], [
          'handler' => 'default:paragraph',
          'handler_settings' => ['target_bundles' => array_combine($f['targets'], $f['targets']), 'negate' => 0],
        ], 'paragraphs'];
    }
    throw new \InvalidArgumentException('Type inconnu : ' . $f['type']);
  }

  protected static function fields(string $entity_type, string $bundle, array $fields): void {
    $form = EntityFormDisplay::load("$entity_type.$bundle.default")
      ?: EntityFormDisplay::create(['targetEntityType' => $entity_type, 'bundle' => $bundle, 'mode' => 'default', 'status' => TRUE]);
    $view = EntityViewDisplay::load("$entity_type.$bundle.default")
      ?: EntityViewDisplay::create(['targetEntityType' => $entity_type, 'bundle' => $bundle, 'mode' => 'default', 'status' => TRUE]);
    $weight = 1;
    foreach ($fields as $f) {
      [$type, $storage_settings, $field_settings, $widget] = self::spec($f);
      $cardinality = !empty($f['multiple']) ? -1 : 1;
      if (!FieldStorageConfig::loadByName($entity_type, $f['name'])) {
        FieldStorageConfig::create([
          'field_name' => $f['name'], 'entity_type' => $entity_type, 'type' => $type,
          'cardinality' => $cardinality, 'settings' => $storage_settings, 'translatable' => TRUE,
        ])->save();
      }
      $config = FieldConfig::loadByName($entity_type, $bundle, $f['name']) ?: FieldConfig::create([
        'field_name' => $f['name'], 'entity_type' => $entity_type, 'bundle' => $bundle,
      ]);
      $config->setLabel($f['label'])->setDescription($f['description'] ?? '')->setRequired(!empty($f['required']));
      foreach ($field_settings as $k => $v) {
        $config->setSetting($k, $v);
      }
      // Structure des paragraphes commune aux langues ; leur contenu, lui, se traduit.
      $config->setTranslatable($type === 'entity_reference_revisions' ? FALSE : !empty($f['translatable']));
      if (isset($f['default']) && $f['default'] !== NULL) {
        $config->setDefaultValue($type === 'boolean' ? ['value' => (int) $f['default']] : ['value' => $f['default']]);
      }
      $config->save();
      $options = ['type' => $widget, 'weight' => $weight++];
      if ($widget === 'paragraphs') {
        $options['settings'] = ['title' => 'Élément', 'title_plural' => 'Éléments', 'edit_mode' => 'closed', 'closed_mode' => 'summary',
          'add_mode' => 'dropdown', 'form_display_mode' => 'default', 'default_paragraph_type' => count($f['targets']) === 1 ? $f['targets'][0] : '_none'];
      }
      if ($widget === 'string_textarea' || $widget === 'text_textarea') {
        $options['settings'] = ['rows' => $type === 'text_long' ? 8 : 3];
      }
      $form->setComponent($f['name'], $options);
      $view->setComponent($f['name'], ['label' => 'above', 'weight' => $weight]);
    }
    $form->save();
    $view->save();
  }

  /** Circuit : Brouillon → À valider → Publié (→ Archivé). */
  protected static function workflow(array $bundles): void {
    $wf = Workflow::load('smt_validation') ?: Workflow::create(['id' => 'smt_validation', 'label' => 'Validation éditoriale', 'type' => 'content_moderation']);
    $t = $wf->getTypePlugin();
    $states = ['draft' => 'Brouillon', 'review' => 'À valider', 'published' => 'Publié', 'archived' => 'Archivé'];
    $w = 0;
    foreach ($states as $id => $label) {
      if (!$t->hasState($id)) {
        $t->addState($id, $label);
      }
      else {
        $t->setStateLabel($id, $label);
      }
      $t->setStateWeight($id, $w++);
    }
    $conf = $t->getConfiguration();
    $conf['states']['published']['published'] = TRUE;
    $conf['states']['published']['default_revision'] = TRUE;
    $conf['states']['archived']['published'] = FALSE;
    $conf['states']['archived']['default_revision'] = TRUE;
    $t->setConfiguration($conf);
    $transitions = [
      'create_new_draft' => ['Enregistrer en brouillon', ['draft', 'published', 'review'], 'draft'],
      'submit_review' => ['Soumettre à validation', ['draft', 'review'], 'review'],
      'publish' => ['Publier', ['draft', 'review', 'published'], 'published'],
      'archive' => ['Archiver (retirer du site)', ['published'], 'archived'],
      'restore' => ['Restaurer en brouillon', ['archived'], 'draft'],
    ];
    foreach ($transitions as $id => [$label, $from, $to]) {
      if (!$t->hasTransition($id)) {
        $t->addTransition($id, $label, $from, $to);
      }
    }
    $conf = $t->getConfiguration();
    $conf['default_moderation_state'] = 'draft';
    foreach ($bundles as $b) {
      $conf['entity_types']['node'][] = $b;
    }
    $conf['entity_types']['node'] = array_values(array_unique($conf['entity_types']['node']));
    $t->setConfiguration($conf);
    $wf->save();
  }

  /**
   * Rédacteur : crée et modifie les contenus, les soumet à validation.
   * Validateur : en plus, publie, archive, supprime et traite les messages de contact.
   */
  protected static function roles(array $bundles): void {
    $common = ['access content', 'access content overview', 'access toolbar', 'access administration pages', 'view the administration theme',
      'view own unpublished content', 'view any unpublished content', 'view latest version', 'view all revisions',
      'create content translations', 'update content translations', 'translate editable entities', 'access files overview',
      'use smt_validation transition create_new_draft', 'use smt_validation transition submit_review'];
    $editor = $common;
    foreach (array_diff($bundles, ['message_contact']) as $b) {
      array_push($editor, "create $b content", "edit any $b content", "edit own $b content", "view $b revisions");
    }
    $validator = array_merge($editor, ['use smt_validation transition publish', 'use smt_validation transition archive',
      'use smt_validation transition restore', 'manage smt contact messages', 'edit any message_contact content',
      'delete any message_contact content', 'revert all revisions', 'delete content translations']);
    foreach (array_diff($bundles, ['message_contact']) as $b) {
      $validator[] = "delete any $b content";
    }
    foreach (['redacteur' => ['Rédacteur', $editor], 'validateur' => ['Validateur', $validator]] as $id => [$label, $perms]) {
      $role = Role::load($id) ?: Role::create(['id' => $id, 'label' => $label]);
      $valid = array_keys(\Drupal::service('user.permissions')->getPermissions());
      foreach (array_intersect($perms, $valid) as $p) {
        $role->grantPermission($p);
      }
      $role->save();
    }
    // Public : lecture des contenus publiés uniquement (pas de profils, pas de messages).
    foreach (['anonymous', 'authenticated'] as $rid) {
      $role = Role::load($rid);
      $role->grantPermission('access content');
      $role->save();
    }
  }

}
