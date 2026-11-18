import type { Core } from '@strapi/strapi';

/**
 * L'API publique (/api/…) ne sert QUE des contenus publiés : le paramètre ?status=draft est
 * neutralisé, pour qu'aucun brouillon ne puisse être lu de l'extérieur.
 */
export default (_config: unknown, _ctx: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    if (ctx.path.startsWith('/api/') && ctx.method === 'GET' && ctx.query && 'status' in ctx.query) {
      ctx.query = { ...ctx.query, status: 'published' };
    }
    await next();
  };
};
