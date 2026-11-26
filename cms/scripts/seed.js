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
// Traductions du contenu de départ (data/seed.en.json, data/seed.ar.json — voir scripts/i18n_strings.py)
const TRANSLATIONS = Object.fromEntries(
  ['en', 'ar']
    .map((l) => [l, path.join(ROOT, 'data', `seed.${l}.json`)])
    .filter(([, f]) => fs.existsSync(f))
    .map(([l, f]) => [l, JSON.parse(fs.readFileSync(f, 'utf8'))]),
);

const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === null ? undefined : v)));

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

async function uploadFile(strapi, file, alt) {
  const filepath = path.join(ROOT, 'data', 'media', file);
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: file } });
  if (existing) return existing;
  const stats = fs.statSync(filepath);
  const [uploaded] = await strapi.plugin('upload').service('upload').upload({
    data: { fileInfo: { name: file, alternativeText: alt, caption: alt } },
    files: { filepath, originalFilename: file, mimetype: MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', size: stats.size },
  });
  return uploaded;
}

/** Dans les données de démo, `imageFile` (fichier de data/media) + `imageAlt` deviennent le champ média `image`. */
async function resolveMedia(strapi, value) {
  if (Array.isArray(value)) return Promise.all(value.map((v) => resolveMedia(strapi, v)));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === 'imageAlt') continue;
    if (k === 'imageFile') out.image = (await uploadFile(strapi, v, value.imageAlt ?? '')).id;
    else out[k] = await resolveMedia(strapi, v);
  }
  return out;
}

async function setSingle(strapi, uid, data, locale = LOCALE) {
  const docs = strapi.documents(uid);
  const current = await docs.findFirst({ locale: LOCALE });
  if (current) return docs.update({ documentId: current.documentId, locale, data });
  return docs.create({ locale, data });
}

async function fillCollection(strapi, uid, items, { localized = true, publish = true, key } = {}) {
  const docs = strapi.documents(uid);
  const count = await strapi.db.query(uid).count();
  if (count && !RESET) {
    console.log(`  ${uid} : ${count} entrées déjà présentes, ignoré (utiliser --reset)`);
    return 0;
  }
  if (RESET) await strapi.db.query(uid).deleteMany({});
  let n = 0;
  let translated = 0;
  for (const [i, item] of items.entries()) {
    const params = { data: await resolveMedia(strapi, clean(item)) };
    if (localized) params.locale = LOCALE;
    if (publish) params.status = 'published';
    const created = await docs.create(params);
    n += 1;
    // Versions anglaise et arabe : même document (même documentId), une localisation par langue.
    if (localized && key) {
      for (const [lang, seed] of Object.entries(TRANSLATIONS)) {
        const tr = seed[key]?.[i];
        if (!tr) continue;
        await docs.update({ documentId: created.documentId, locale: lang, data: await resolveMedia(strapi, clean(tr)), ...(publish ? { status: 'published' } : {}) });
        translated += 1;
      }
    }
  }
  console.log(`  ${uid} : ${n} entrées importées${translated ? ` (+ ${translated} traductions)` : ''}`);
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
    for (const [lang, seed] of Object.entries(TRANSLATIONS)) {
      await setSingle(strapi, 'api::global.global', clean({ ...seed.global, logo: logo.id, favicon: favicon.id }), lang);
      await setSingle(strapi, 'api::navigation.navigation', clean(seed.navigation), lang);
    }

    console.log('Collections…');
    await fillCollection(strapi, 'api::dirigeant.dirigeant', SEED.dirigeants, { key: 'dirigeants' });
    await fillCollection(strapi, 'api::indicateur.indicateur', SEED.indicateurs, { key: 'indicateurs' });
    await fillCollection(strapi, 'api::solution.solution', SEED.solutions, { key: 'solutions' });
    await fillCollection(strapi, 'api::innovation.innovation', SEED.innovations, { key: 'innovations' });
    await fillCollection(strapi, 'api::partenaire.partenaire', SEED.partenaires, { localized: false });
    await fillCollection(strapi, 'api::faq.faq', SEED.faqs, { key: 'faqs' });
    await fillCollection(strapi, 'api::actualite.actualite', SEED.actualites, { key: 'actualites' });
    await fillCollection(strapi, 'api::appel-offres.appel-offres', SEED.appelsOffres, { key: 'appelsOffres' });
    await fillCollection(strapi, 'api::page.page', SEED.pages, { key: 'pages' });
    console.log('Import terminé.');
  } finally {
    await strapi.destroy();
  }
}

main().catch((err) => {
  console.error('Échec de l’import :', err?.details?.errors || err);
  process.exit(1);
});
