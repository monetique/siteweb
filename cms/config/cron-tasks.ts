import type { Core } from '@strapi/strapi';

const UID = 'api::message-contact.message-contact';

/**
 * Durée de conservation des messages de contact (page « Données personnelles » du site) :
 * chaque nuit, suppression des messages reçus il y a plus de CONTACT_RETENTION_MONTHS mois (12 par défaut ;
 * 0 = désactivé). Une réclamation qui n'est pas encore « traitée » est conservée jusqu'à sa clôture.
 */
export async function purgeContactMessages(strapi: Core.Strapi) {
  const months = Number(process.env.CONTACT_RETENTION_MONTHS ?? 12);
  if (!Number.isFinite(months) || months <= 0) return 0;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  let deleted = 0;
  for (;;) {
    const batch = await strapi.documents(UID).findMany({
      filters: {
        createdAt: { $lt: cutoff.toISOString() },
        $or: [{ subject: { $ne: 'reclamation_autre' } }, { status: 'traite' }],
      },
      fields: ['documentId'],
      limit: 200,
    });
    if (!batch.length) break;
    for (const m of batch) await strapi.documents(UID).delete({ documentId: m.documentId });
    deleted += batch.length;
  }
  if (deleted) strapi.log.info(`[contact] ${deleted} message(s) de plus de ${months} mois supprimé(s) (durée de conservation)`);
  return deleted;
}

export default {
  purgeContactMessages: {
    task: ({ strapi }: { strapi: Core.Strapi }) => purgeContactMessages(strapi),
    options: { rule: process.env.CONTACT_PURGE_CRON || '30 3 * * *', tz: 'Africa/Tunis' },
  },
};
