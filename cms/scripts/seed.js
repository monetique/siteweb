/**
 * Import du contenu réel de monetiquetunisie.com dans Strapi.
 *
 *   npm run seed            -> importe (n'écrase pas une base déjà remplie)
 *   npm run seed -- --reset -> vide les collections puis réimporte
 *
 * À lancer Strapi arrêté. Les données viennent de data/seed.json (voir scripts/build_seed.py).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { createStrapi, compileStrapi } = require('@strapi/strapi');

const ROOT = path.resolve(__dirname, '..');
const SEED = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed.json'), 'utf8'));
const RESET = process.argv.includes('--reset');
const LOCALE = 'fr';

const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === null ? undefined : v)));

async function uploadFile(strapi, file, alt) {
  const filepath = path.join(ROOT, 'data', 'media', file);
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: file } });
  if (existing) return existing;
  const stats = fs.statSync(filepath);
  const [uploaded] = await strapi.plugin('upload').service('upload').upload({
    data: { fileInfo: { name: file, alternativeText: alt, caption: alt } },
    files: { filepath, originalFilename: file, mimetype: 'image/png', size: stats.size },
  });
  return uploaded;
}

async function setSingle(strapi, uid, data) {
  const docs = strapi.documents(uid);
  const current = await docs.findFirst({ locale: LOCALE });
  if (current) return docs.update({ documentId: current.documentId, locale: LOCALE, data });
  return docs.create({ locale: LOCALE, data });
}

async function fillCollection(strapi, uid, items, { localized = true, publish = true } = {}) {
  const docs = strapi.documents(uid);
  const count = await strapi.db.query(uid).count();
  if (count && !RESET) {
    console.log(`  ${uid} : ${count} entrées déjà présentes, ignoré (utiliser --reset)`);
    return 0;
  }
  if (RESET) await strapi.db.query(uid).deleteMany({});
  let n = 0;
  for (const item of items) {
    const params = { data: clean(item) };
    if (localized) params.locale = LOCALE;
    if (publish) params.status = 'published';
    await docs.create(params);
    n += 1;
  }
  console.log(`  ${uid} : ${n} entrées importées`);
  return n;
}

async function main() {
  const ctx = await compileStrapi();
  const strapi = await createStrapi(ctx).load();
  strapi.log.level = 'error';
  try {
    console.log('Médias…');
    const logo = await uploadFile(strapi, 'logo-monetique-tunisie.png', 'Logo Monétique Tunisie');
    const favicon = await uploadFile(strapi, 'favicon-monetique-tunisie.png', 'Icône Monétique Tunisie');

    console.log('Réglages globaux et navigation…');
    await setSingle(strapi, 'api::global.global', clean({ ...SEED.global, logo: logo.id, favicon: favicon.id }));
    await setSingle(strapi, 'api::navigation.navigation', clean(SEED.navigation));

    console.log('Collections…');
    await fillCollection(strapi, 'api::dirigeant.dirigeant', SEED.dirigeants);
    await fillCollection(strapi, 'api::indicateur.indicateur', SEED.indicateurs);
    await fillCollection(strapi, 'api::solution.solution', SEED.solutions);
    await fillCollection(strapi, 'api::partenaire.partenaire', SEED.partenaires, { localized: false });
    await fillCollection(strapi, 'api::faq.faq', SEED.faqs);
    await fillCollection(strapi, 'api::actualite.actualite', SEED.actualites);
    await fillCollection(strapi, 'api::appel-offres.appel-offres', SEED.appelsOffres);
    await fillCollection(strapi, 'api::page.page', SEED.pages);
    console.log('Import terminé.');
  } finally {
    await strapi.destroy();
  }
}

main().catch((err) => {
  console.error('Échec de l’import :', err?.details?.errors || err);
  process.exit(1);
});
