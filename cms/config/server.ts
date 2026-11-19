import type { Core } from '@strapi/strapi';
import cronTasks from './cron-tasks';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // Derrière Nginx : utiliser l'adresse IP réelle du visiteur (X-Forwarded-For) pour la limitation des envois
  proxy: { koa: env.bool('IS_PROXIED', false) },
  app: {
    keys: env.array('APP_KEYS')!,
  },
  // Tâches planifiées : suppression des messages de contact au-delà de la durée de conservation
  cron: { enabled: env.bool('CRON_ENABLED', true), tasks: cronTasks },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;
