import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    // Seuls le site public et l'admin peuvent appeler l'API depuis un navigateur
    name: 'strapi::cors',
    config: {
      origin: env.array('CORS_ORIGINS', ['http://localhost:3000', 'http://localhost:4321', 'http://localhost:1337']),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    },
  },
  // 'strapi::poweredBy' retiré : ne pas annoncer la technologie utilisée
  'strapi::query',
  'global::public-published-only',
  'strapi::body',
  'global::upload-guard',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
