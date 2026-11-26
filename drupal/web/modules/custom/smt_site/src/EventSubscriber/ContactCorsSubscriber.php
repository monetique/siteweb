<?php

namespace Drupal\smt_site\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * En-têtes CORS de /api/messages-contact, y compris pour la requête OPTIONS (pré-vérification du
 * navigateur), à laquelle Drupal répond lui-même avant le contrôleur.
 *
 * Utile seulement si le site public est servi depuis une autre origine (développement) ;
 * en production, Nginx sert le site et proxifie cette adresse sur le même domaine.
 * Origines autorisées : SMT_CORS_ORIGINS (séparées par des virgules), par défaut http://localhost:3100.
 */
class ContactCorsSubscriber implements EventSubscriberInterface {

  public static function getSubscribedEvents(): array {
    return [KernelEvents::RESPONSE => ['onResponse', -100]];
  }

  public function onResponse(ResponseEvent $event): void {
    $request = $event->getRequest();
    if ($request->getPathInfo() !== '/api/messages-contact') {
      return;
    }
    $origins = array_filter(array_map('trim', explode(',', getenv('SMT_CORS_ORIGINS') ?: 'http://localhost:3100')));
    $origin = $request->headers->get('Origin');
    $response = $event->getResponse();
    if ($origin && in_array($origin, $origins, TRUE)) {
      $response->headers->set('Access-Control-Allow-Origin', $origin);
      $response->headers->set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      $response->headers->set('Access-Control-Allow-Headers', 'Content-Type');
      $response->headers->set('Access-Control-Max-Age', '600');
    }
    $response->headers->set('Vary', 'Origin', FALSE);
  }

}
