<?php

namespace Drupal\smt_site\EventSubscriber;

use Drupal\jsonapi\ResourceType\ResourceTypeBuildEvent;
use Drupal\jsonapi\ResourceType\ResourceTypeBuildEvents;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * L'API publique (JSON:API, lecture seule) n'expose que les contenus du site.
 *
 * Désactivées : messages de contact (données personnelles), comptes, rôles, configuration, etc.
 */
class JsonApiResourceSubscriber implements EventSubscriberInterface {

  /** Types d'entités exposés ; tout le reste est désactivé. */
  const ALLOWED_ENTITY_TYPES = ['node', 'paragraph', 'file'];

  public static function getSubscribedEvents(): array {
    return [ResourceTypeBuildEvents::BUILD => 'onBuild'];
  }

  public function onBuild(ResourceTypeBuildEvent $event): void {
    [$entity_type] = explode('--', $event->getResourceTypeName());
    if (!in_array($entity_type, self::ALLOWED_ENTITY_TYPES, TRUE) || $event->getResourceTypeName() === 'node--message_contact') {
      $event->disableResourceType();
    }
  }

}
