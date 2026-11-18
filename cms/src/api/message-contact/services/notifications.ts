import type { Core } from '@strapi/strapi';

/**
 * E-mails envoyés à la réception d'un message de contact :
 *  1. une notification interne à l'équipe concernée (routage par objet) ;
 *  2. un accusé de réception au visiteur (désactivable), qui ne reprend PAS le texte saisi,
 *     pour que le formulaire ne puisse pas servir à relayer du spam vers des tiers.
 * Tout contenu saisi par le visiteur est échappé (HTML) et nettoyé (retours à la ligne dans les en-têtes).
 */

export const SUBJECT_LABELS: Record<string, string> = {
  carte_bancaire: 'Carte bancaire',
  switch_monetique: 'Switch monétique',
  switch_mobile_wallet: 'Switch mobile & Wallet',
  ecommerce_clictopay: 'E-commerce – ClicToPay',
  paysmart: 'Paysmart – paiement de factures',
  certification: 'Certification',
  formation_conseil: 'Formation & conseil',
  reclamation_autre: 'Réclamation / autre demande',
};

type Message = { documentId: string; fullName?: string; email?: string; phone?: string; subject?: string; message?: string };

const esc = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const oneLine = (s = '', max = 120) => s.replace(/\s+/g, ' ').trim().slice(0, max); // \s couvre aussi CR, LF et les séparateurs Unicode

/** CONTACT_ROUTING='{"reclamation_autre":"reclamations@…","ecommerce_clictopay":"ecommerce@…"}' */
function recipientsFor(subject?: string): string {
  const fallback = process.env.CONTACT_NOTIFY_TO || 'contact@monetiquetunisie.com';
  try {
    const map = JSON.parse(process.env.CONTACT_ROUTING || '{}');
    return (subject && typeof map[subject] === 'string' && map[subject]) || fallback;
  } catch {
    return fallback;
  }
}

const BRAND = '#0d1b33';
const ACCENT = '#008ab0';
function layout(title: string, body: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif;color:#1b2333">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="background:${BRAND};color:#fff;padding:20px 28px;font-size:18px;font-weight:bold">Monétique Tunisie<div style="font-size:13px;font-weight:normal;opacity:.85;margin-top:4px">${title}</div></td></tr>
<tr><td style="padding:28px">${body}</td></tr>
<tr><td style="padding:16px 28px;background:#f4f6fa;font-size:12px;color:#5b6475">Monétique Tunisie — Centre urbain Nord, Sana Center, bloc C – 1082 Tunis · www.monetiquetunisie.com</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendContactEmails(strapi: Core.Strapi, msg: Message) {
  const email = strapi.plugin('email')?.service('email');
  if (!email) return;
  const subjectLabel = SUBJECT_LABELS[msg.subject ?? ''] ?? 'Demande';
  const name = oneLine(msg.fullName, 80);
  const adminUrl = `${(process.env.ADMIN_PUBLIC_URL || 'http://localhost:1337').replace(/\/$/, '')}/admin/content-manager/collection-types/api::message-contact.message-contact/${msg.documentId}`;
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#5b6475;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:6px 0">${v}</td></tr>`;

  const internal = {
    to: recipientsFor(msg.subject),
    replyTo: oneLine(msg.email, 254),
    subject: `[Site web] ${subjectLabel} — ${name}`,
    text: [
      `Nouveau message reçu depuis le formulaire de contact du site.`,
      ``,
      `Nom : ${name}`, `E-mail : ${oneLine(msg.email)}`, `Téléphone : ${oneLine(msg.phone) || '—'}`, `Objet : ${subjectLabel}`,
      ``, `Message :`, (msg.message ?? '').slice(0, 5000), ``, `Traiter le message : ${adminUrl}`,
    ].join('\n'),
    html: layout(
      'Nouveau message — formulaire de contact',
      `<p style="margin:0 0 16px">Un visiteur a envoyé un message depuis le site.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:16px">
${row('Nom', esc(name))}${row('E-mail', `<a href="mailto:${esc(oneLine(msg.email))}">${esc(oneLine(msg.email))}</a>`)}${row('Téléphone', esc(oneLine(msg.phone)) || '—')}${row('Objet', esc(subjectLabel))}
</table>
<div style="background:#f4f6fa;border-left:4px solid ${ACCENT};padding:14px 16px;font-size:14px;line-height:1.5;white-space:pre-wrap">${esc((msg.message ?? '').slice(0, 5000))}</div>
<p style="margin:24px 0 0"><a href="${esc(adminUrl)}" style="background:${ACCENT};color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;display:inline-block">Traiter dans le back-office</a></p>
<p style="font-size:12px;color:#5b6475;margin-top:16px">Répondre à cet e-mail écrit directement au visiteur.</p>`,
    ),
  };

  const ack = {
    to: oneLine(msg.email, 254),
    subject: 'Monétique Tunisie — nous avons bien reçu votre message',
    text: `Bonjour,\n\nNous avons bien reçu votre demande (objet : ${subjectLabel}). Notre équipe vous répondra dans les meilleurs délais.\n\nPour toute urgence : +216 71 155 840.\n\nMonétique Tunisie\nCet e-mail est envoyé automatiquement, merci de ne pas y répondre.`,
    html: layout(
      'Accusé de réception',
      `<p style="margin:0 0 12px">Bonjour,</p>
<p style="margin:0 0 12px">Nous avons bien reçu votre demande concernant <strong>${esc(subjectLabel)}</strong>. Notre équipe vous répondra dans les meilleurs délais.</p>
<p style="margin:0 0 12px">Pour toute urgence, vous pouvez nous joindre au <a href="tel:+21671155840">+216 71 155 840</a>.</p>
<p style="margin:16px 0 0">Monétique Tunisie</p>
<p style="font-size:12px;color:#5b6475;margin-top:20px">Cet e-mail est envoyé automatiquement, merci de ne pas y répondre.</p>`,
    ),
  };

  const jobs = [email.send(internal)];
  if (process.env.CONTACT_ACK_ENABLED !== 'false' && msg.email) jobs.push(email.send(ack));
  const results = await Promise.allSettled(jobs);
  results.forEach((r, i) => {
    if (r.status === 'rejected') strapi.log.error(`[contact] e-mail ${i === 0 ? 'interne' : 'accusé'} non envoyé (message ${msg.documentId}) : ${r.reason?.message ?? r.reason}`);
    else strapi.log.info(`[contact] e-mail ${i === 0 ? 'interne' : 'accusé'} envoyé (message ${msg.documentId})`);
  });
}
