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
 * Filtre anti-spam (côté serveur : un robot qui écrit directement à l'API ne passe pas par le formulaire).
 * Renvoie la raison du rejet, ou null si le message semble légitime.
 *  - champ piège « website » rempli (invisible pour un humain) ;
 *  - envoi trop rapide (< 3 s après l'affichage du formulaire) ou sans le délai fourni par le formulaire ;
 *  - plus de 3 liens dans le message ;
 *  - même message envoyé deux fois par la même adresse e-mail en moins de 10 minutes.
 */
const MIN_FILL_MS = 3000;
const MAX_LINKS = 3;
const DUP_MS = 10 * 60 * 1000;
const recent = new Map<string, number>();
function spamReason(input: Record<string, unknown>): string | null {
  if (typeof input.website === 'string' && input.website.trim()) return 'champ piège rempli';
  const elapsed = Number(input.elapsed);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS || elapsed > 24 * 3600 * 1000) return 'délai de saisie anormal';
  const text = String(input.message ?? '');
  if ((text.match(/https?:\/\/|www\./gi) ?? []).length > MAX_LINKS) return 'trop de liens';
  const key = `${String(input.email ?? '').toLowerCase()}|${text.trim().slice(0, 500)}`;
  const now = Date.now();
  if (now - (recent.get(key) ?? 0) < DUP_MS) return 'doublon';
  recent.set(key, now);
  if (recent.size > 10_000) recent.clear();
  return null;
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
    const reason = spamReason(input);
    if (reason) {
      // Réponse identique à un envoi réussi : le robot n'apprend rien ; rien n'est enregistré ni envoyé.
      strapi.log.info(`[contact] message écarté (${reason}) — IP ${ctx.request.ip}`);
      ctx.status = 201;
      ctx.body = { ok: true };
      return;
    }
    // Consentement exprès (loi organique n° 2004-63, art. 27) : case cochée dans le formulaire, date conservée
    if (input.consent !== true) {
      ctx.status = 400;
      ctx.body = { error: 'Consentement requis.' };
      return;
    }
    const data: Record<string, unknown> = { status: 'nouveau', consentAt: new Date().toISOString() };
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
