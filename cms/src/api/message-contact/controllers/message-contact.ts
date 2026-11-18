import { factories } from '@strapi/strapi';
import { sendContactEmails } from '../services/notifications';

const ALLOWED = ['fullName', 'phone', 'email', 'subject', 'message'] as const;

/** Limitation simple des envois : 5 messages par adresse IP sur 15 minutes. */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();
function tooMany(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

/**
 * Le public peut seulement déposer un message : on ne garde que les champs du formulaire,
 * le statut est forcé à « nouveau » et la réponse ne renvoie aucune donnée.
 */
export default factories.createCoreController('api::message-contact.message-contact', ({ strapi }) => ({
  async create(ctx) {
    if (tooMany(ctx.request.ip)) {
      ctx.status = 429;
      ctx.body = { error: 'Trop de messages envoyés. Merci de réessayer plus tard.' };
      return;
    }
    const input = (ctx.request.body as any)?.data ?? {};
    const data: Record<string, unknown> = { status: 'nouveau' };
    for (const key of ALLOWED) {
      if (typeof input[key] === 'string') data[key] = input[key].trim();
    }
    const saved = await strapi.documents('api::message-contact.message-contact').create({ data: data as any });
    // Envoi en arrière-plan : la réponse au visiteur n'attend pas le serveur de messagerie,
    // et une panne SMTP ne fait jamais perdre le message (il est déjà enregistré).
    void sendContactEmails(strapi, { ...(data as any), documentId: saved.documentId }).catch((e) =>
      strapi.log.error(`[contact] notification impossible : ${e?.message ?? e}`),
    );
    ctx.status = 201;
    ctx.body = { ok: true };
  },
}));
