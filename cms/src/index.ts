import type { Core } from '@strapi/strapi';
import adminLabels from './admin-labels.json';

/** Contenus lisibles publiquement (lecture seule) par le site Next.js. */
const PUBLIC_READ = [
  'api::global.global',
  'api::navigation.navigation',
  'api::page.page',
  'api::actualite.actualite',
  'api::appel-offres.appel-offres',
  'api::solution.solution',
  'api::innovation.innovation',
  'api::partenaire.partenaire',
  'api::faq.faq',
  'api::indicateur.indicateur',
  'api::dirigeant.dirigeant',
];

/** Langues du site : français par défaut, arabe et anglais prêts. */
const LOCALES = [
  { code: 'fr', name: 'Français (fr)' },
  { code: 'ar', name: 'Arabic (ar)' },
  { code: 'en', name: 'English (en)' },
];

async function ensureLocales(strapi: Core.Strapi) {
  const localeService = strapi.plugin('i18n').service('locales');
  const existing = await localeService.find();
  for (const loc of LOCALES) {
    if (!existing.find((l: { code: string }) => l.code === loc.code)) {
      await localeService.create(loc);
    }
  }
  await localeService.setDefaultLocale({ code: 'fr' });
}

async function ensurePublicPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });
  if (!publicRole) return;

  const wanted: string[] = [];
  for (const uid of PUBLIC_READ) {
    const isSingle = strapi.contentType(uid as any)?.kind === 'singleType';
    wanted.push(`${uid}.find`);
    if (!isSingle) wanted.push(`${uid}.findOne`);
  }
  // Le formulaire de contact peut seulement créer un message, jamais le relire.
  wanted.push('api::message-contact.message-contact.create');

  for (const action of wanted) {
    const exists = await strapi
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: publicRole.id } });
    if (!exists) {
      await strapi
        .query('plugin::users-permissions.permission')
        .create({ data: { action, role: publicRole.id } });
    }
  }
}

/**
 * Rôles éditoriaux : Rédacteur (Author) prépare les contenus, Validateur (Editor) relit et publie.
 * Donne à ces rôles l'accès aux trois langues et au Validateur le droit de publier / supprimer.
 */
async function ensureEditorialRoles(strapi: Core.Strapi) {
  const roleService = strapi.service('admin::role') as any;
  const locales = LOCALES.map((l) => l.code);
  const apiTypes = Object.values(strapi.contentTypes).filter((c: any) => c.uid.startsWith('api::'));
  const isLocalized = (uid: string) => !!(strapi.contentType(uid as any) as any)?.pluginOptions?.i18n?.localized;
  const hasDraft = (uid: string) => !!(strapi.contentType(uid as any) as any)?.options?.draftAndPublish;
  const CM = 'plugin::content-manager.explorer.';

  const setup: Record<string, { name: string; description: string; extra: string[]; exclude: string[] }> = {
    'strapi-editor': {
      name: 'Validateur',
      description: 'Relit, publie et supprime les contenus. Consulte les messages de contact.',
      extra: ['delete', 'publish'],
      exclude: [],
    },
    'strapi-author': {
      name: 'Rédacteur',
      description: 'Rédige et modifie ses propres contenus en brouillon, sans pouvoir publier.',
      extra: [],
      exclude: ['api::message-contact.message-contact', 'api::global.global', 'api::navigation.navigation'],
    },
  };

  for (const [code, cfg] of Object.entries(setup)) {
    const role = await strapi.db.query('admin::role').findOne({ where: { code } });
    if (!role) continue;
    if (role.name !== cfg.name) {
      await strapi.db.query('admin::role').update({ where: { id: role.id }, data: { name: cfg.name, description: cfg.description } });
    }
    const current = await strapi.db.query('admin::permission').findMany({ where: { role: { id: role.id } } });
    const perms: any[] = current
      .filter((p: any) => !cfg.exclude.includes(p.subject))
      .map((p: any) => ({ action: p.action, subject: p.subject, properties: { ...(p.properties || {}) }, conditions: p.conditions || [] }));

    for (const ctype of apiTypes as any[]) {
      if (cfg.exclude.includes(ctype.uid)) continue;
      for (const act of cfg.extra) {
        if (act === 'publish' && !hasDraft(ctype.uid)) continue;
        if (!perms.find((p) => p.action === CM + act && p.subject === ctype.uid)) {
          perms.push({ action: CM + act, subject: ctype.uid, properties: {}, conditions: [] });
        }
      }
    }
    for (const p of perms) {
      if (p.subject?.startsWith('api::') && p.action.startsWith(CM) && isLocalized(p.subject)) {
        p.properties.locales = locales;
      }
    }
    await roleService.assignPermissions(role.id, perms);
  }
}

/** Colonnes affichées dans les listes de l'admin. */
const LIST_COLUMNS: Record<string, string[]> = {
  'api::actualite.actualite': ['title', 'date', 'category', 'isFeatured'],
  'api::appel-offres.appel-offres': ['title', 'reference', 'publicationDate', 'deadline', 'tenderStatus'],
  'api::solution.solution': ['name', 'tagline', 'order'],
  'api::innovation.innovation': ['name', 'tagline', 'order'],
  'api::partenaire.partenaire': ['name', 'category', 'showInRibbon', 'order'],
  'api::faq.faq': ['question', 'category', 'order'],
  'api::indicateur.indicateur': ['name', 'unit', 'showOnHomepage', 'order'],
  'api::dirigeant.dirigeant': ['fullName', 'role', 'order'],
  'api::page.page': ['title', 'slug', 'isHomepage'],
  'api::message-contact.message-contact': ['fullName', 'email', 'subject', 'status', 'createdAt'],
};

/** Libellés en français dans les formulaires et listes de l'admin (champs, composants, colonnes). */
async function applyAdminLabels(strapi: Core.Strapi) {
  const { labels, descriptions, mainFields } = adminLabels as any;
  const cm = strapi.plugin('content-manager');
  const relabel = (config: any) => {
    for (const [field, meta] of Object.entries<any>(config.metadatas || {})) {
      if (labels[field]) {
        if (meta.edit) meta.edit.label = labels[field];
        if (meta.list) meta.list.label = labels[field];
      }
      if (descriptions[field] && meta.edit) meta.edit.description = descriptions[field];
    }
    return config;
  };
  const ctService = cm.service('content-types') as any;
  for (const uid of Object.keys(strapi.contentTypes).filter((u) => u.startsWith('api::'))) {
    const ct = ctService.findContentType(uid);
    const { uid: _u, ...config } = await ctService.findConfiguration(ct);
    relabel(config);
    if (mainFields[uid]) config.settings = { ...config.settings, mainField: mainFields[uid], defaultSortBy: mainFields[uid] };
    if (uid === 'api::actualite.actualite') config.settings = { ...config.settings, defaultSortBy: 'date', defaultSortOrder: 'DESC' };
    if (uid === 'api::appel-offres.appel-offres') config.settings = { ...config.settings, defaultSortBy: 'publicationDate', defaultSortOrder: 'DESC' };
    if (LIST_COLUMNS[uid]) config.layouts = { ...config.layouts, list: LIST_COLUMNS[uid] };
    await ctService.updateConfiguration(ct, config);
  }
  const compService = cm.service('components') as any;
  for (const uid of Object.keys(strapi.components)) {
    const comp = compService.findComponent(uid);
    const { uid: _u, category: _c, ...config } = await compService.findConfiguration(comp);
    relabel(config);
    const main = ['title', 'label', 'text', 'period', 'question', 'value'].find((k) => comp.attributes?.[k]);
    if (main) config.settings = { ...config.settings, mainField: main };
    await compService.updateConfiguration(comp, config);
  }
}

/** Pas d'inscription publique : seuls les comptes admin (rédacteurs, validateurs) existent. */
async function disablePublicRegistration(strapi: Core.Strapi) {
  const store = strapi.store({ type: 'plugin', name: 'users-permissions', key: 'advanced' });
  const advanced = ((await store.get()) as Record<string, unknown>) || {};
  if (advanced.allow_register !== false) await store.set({ value: { ...advanced, allow_register: false } });
}


/** En production, refuse de démarrer avec des secrets d'exemple, trop courts ou une base SQLite. */
function checkProductionSecrets() {
  if (process.env.NODE_ENV !== "production") return;
  const names = ["APP_KEYS", "API_TOKEN_SALT", "ADMIN_JWT_SECRET", "TRANSFER_TOKEN_SALT", "JWT_SECRET", "ENCRYPTION_KEY"];
  const bad = names.filter((n) => {
    const v = process.env[n] ?? "";
    return v.split(",").some((part) => part.length < 16 || /tobemodified/i.test(part));
  });
  const problems: string[] = [];
  if (bad.length) problems.push(`secrets absents, trop courts ou d'exemple : ${bad.join(", ")}`);
  if ((process.env.DATABASE_CLIENT ?? "sqlite") === "sqlite") problems.push("DATABASE_CLIENT=sqlite interdit en production (utiliser postgres)");
  if (!process.env.CORS_ORIGINS) problems.push("CORS_ORIGINS non défini");
  if (problems.length) throw new Error(`[SMT] Démarrage refusé en production : ${problems.join(" ; ")}`);
}


/**
 * Webhook « Reconstruction du site » : créé ou mis à jour à chaque démarrage à partir de
 * REBUILD_WEBHOOK_URL / REBUILD_WEBHOOK_SECRET, pour ne jamais dépendre d'une saisie manuelle dans l'admin.
 */
async function ensureRebuildWebhook(strapi: Core.Strapi) {
  const url = process.env.REBUILD_WEBHOOK_URL;
  const secret = process.env.REBUILD_WEBHOOK_SECRET;
  const name = "Reconstruction du site public";
  const store: any = strapi.get("webhookStore");
  const runner: any = strapi.get("webhookRunner");
  const existing = (await store.findWebhooks()).find((w: any) => w.name === name);
  if (!url || !secret) {
    if (existing) { await store.deleteWebhook(existing.id); runner.remove(existing); }
    return;
  }
  const data = {
    name,
    url,
    headers: { Authorization: `Bearer ${secret}` },
    events: ["entry.publish", "entry.unpublish", "entry.delete", "media.update", "media.delete"],
    isEnabled: true,
  };
  if (existing) runner.update(await store.updateWebhook(existing.id, data));
  else runner.add(await store.createWebhook(data));
  strapi.log.info(`[SMT] Webhook de reconstruction actif → ${url}`);
}

export default {
  register() {
    checkProductionSecrets();
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureLocales(strapi);
    await disablePublicRegistration(strapi);
    await ensurePublicPermissions(strapi);
    await ensureEditorialRoles(strapi);
    await ensureRebuildWebhook(strapi);
    await applyAdminLabels(strapi);
  },
};
