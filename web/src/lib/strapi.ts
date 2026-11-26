/**
 * Accès au contenu du site. Le CMS est Drupal (API JSON:API, voir lib/cms/drupal.ts) ;
 * l'ancien Strapi reste utilisable pendant la transition avec CMS_BACKEND=strapi.
 * Les deux renvoient les mêmes objets : pages et composants ne dépendent pas du CMS.
 */
import type { BlocksContent } from "@strapi/blocks-react-renderer";
import { DEFAULT_LANG } from "./i18n";
import { getLang } from "./lang-server";
import { list } from "./cms/drupal";

/* ------------------------------------------------------------------ configuration */
export const CMS_BACKEND: "drupal" | "strapi" = process.env.CMS_BACKEND === "strapi" ? "strapi" : "drupal";
const DRUPAL = CMS_BACKEND === "drupal";
const STRAPI_URL = (process.env.STRAPI_URL || "http://localhost:1337").replace(/\/$/, "");
const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL || STRAPI_URL).replace(/\/$/, "");
const TOKEN = process.env.STRAPI_TOKEN;

/** Construit la query string au format Strapi (filters[slug][$eq]=…, populate[a][populate]=*). */
function toQuery(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const k = prefix ? `${prefix}[${key}]` : key;
    if (value === undefined || value === null) return [];
    if (typeof value === "object") return toQuery(value as Record<string, unknown>, k);
    return [`${encodeURIComponent(k)}=${encodeURIComponent(String(value))}`];
  });
}

async function strapiGet<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
  const locale = "locale" in params ? params.locale : getLang();
  const json = await strapiFetch<T>(path, { ...params, locale });
  // Contenu pas encore traduit : on affiche la version française plutôt qu'une page vide.
  const data = (json as { data?: unknown } | null)?.data;
  const empty = data === null || data === undefined || (Array.isArray(data) && data.length === 0);
  if (empty && locale && locale !== DEFAULT_LANG) {
    const fallback = await strapiFetch<T>(path, { ...params, locale: DEFAULT_LANG });
    if (fallback) return fallback;
  }
  if (!json) throw new Error(`Strapi 404 sur /api/${path}`);
  return json;
}

async function strapiFetch<T>(path: string, params: Record<string, unknown>): Promise<T | null> {
  const qs = toQuery(params).join("&");
  // Délai maximal et nouvelles tentatives : si Strapi ne répond pas, le build échoue proprement
  // (et le site en ligne reste inchangé) au lieu de rester bloqué.
  let res: Response | undefined;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetch(`${STRAPI_URL}/api/${path}?${qs}`, {
        headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
        // Build : cache partagé entre les pages (vidé avant chaque build par prebuild).
        // Développement : jamais de cache, pour voir immédiatement ce qui est publié dans le CMS.
        cache: process.env.NODE_ENV === "development" ? "no-store" : "force-cache",
        signal: AbortSignal.timeout(20_000),
      });
      break;
    } catch (e) {
      if (attempt >= 3) throw new Error(`Strapi injoignable sur /api/${path} : ${(e as Error).message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  if (res.status === 404) return null; // type unique sans version dans cette langue
  if (!res.ok) throw new Error(`Strapi ${res.status} sur /api/${path}`);
  return (await res.json()) as T;
}

type One<T> = { data: T };
type Many<T> = { data: T[] };

export function mediaUrl(media?: Media | null): string | null {
  if (!media?.url) return null;
  return media.url.startsWith("http") ? media.url : `${MEDIA_BASE_URL}${media.url}`;
}

/* ------------------------------------------------------------------ types */
export type Media = { url: string; alternativeText?: string | null; width?: number; height?: number; mime?: string; name?: string; size?: number };
export type Link = { label: string; url: string; isExternal?: boolean; style?: "primaire" | "secondaire" | "texte"; icon?: string | null };
export type KeyPoint = { text: string; icon?: string | null };
export type Seo = { metaTitle?: string; metaDescription?: string; shareImage?: Media | null; noIndex?: boolean };

export type Global = {
  siteName: string; tagline?: string; logo?: Media; favicon?: Media; statusLabel?: string; accreditation?: string;
  address?: string; mapUrl?: string; phoneHeadquarters?: string; phoneCallCenter?: string; phoneGreenNumber?: string;
  emailContact?: string; emailCommercial?: string; socialLinks: { platform: string; url: string }[];
  certifications: KeyPoint[]; defaultSeo?: Seo;
};
export type MenuItem = { label: string; url: string; children: { label: string; url: string; icon?: string }[] };
export type Navigation = {
  mainMenu: MenuItem[]; headerCta?: Link; footerColumns: { title: string; links: Link[] }[]; legalLinks: Link[]; copyright?: string;
};

export type Block = { __component: string; id: number } & Record<string, any>;
export type Page = { documentId: string; title: string; slug: string; isHomepage?: boolean; parentLabel?: string; blocks: Block[]; seo?: Seo };

export type Solution = { documentId: string; name: string; slug: string; icon?: string; tagline?: string; summary?: string; order: number;
  sections: { title: string; body: BlocksContent }[]; keyPoints: KeyPoint[]; cta?: Link; seo?: Seo };
export type Actualite = { documentId: string; title: string; slug: string; date: string; category: string; label?: string; excerpt?: string;
  cover?: Media; content?: BlocksContent; attachments?: Media[]; isFeatured?: boolean; seo?: Seo };
export type AppelOffres = { documentId: string; title: string; slug: string; type: string; reference?: string; publicationDate: string;
  deadline?: string; tenderStatus: string; issuer?: string; summary?: string; content?: BlocksContent; documentRetrieval?: string;
  documentCost?: string; offerValidityDays?: number; submissionAddress?: string; documents?: Media[]; seo?: Seo };
export type Partenaire = { name: string; category: string; logo?: Media; website?: string; showInRibbon?: boolean; showOnHome?: boolean; order: number };
export type Faq = { question: string; answer: BlocksContent; category: string; order: number };
export type Indicateur = { name: string; unit?: string; icon?: string; note?: string; showOnHomepage?: boolean; order: number;
  values: { period: string; year?: number; value: number; displayValue?: string; evolution?: number | null; isPartialYear?: boolean }[] };
export type Dirigeant = { fullName: string; role: string; photo?: Media; bio?: string; order: number };

/* ------------------------------------------------------------------ requêtes */
const ALL = { pageSize: 100 };
const byOrder = <T extends { order?: number }>(a: T[]) => [...a].sort((x, y) => (x.order ?? 0) - (y.order ?? 0));
const desc = <T,>(a: T[], k: keyof T) => [...a].sort((x, y) => String(y[k] ?? "").localeCompare(String(x[k] ?? "")));

export async function getGlobal() {
  if (DRUPAL) return (await list<Global>("global"))[0];
  return (await strapiGet<One<Global>>("global", { populate: "*" })).data;
}
export async function getNavigation() {
  if (DRUPAL) return (await list<Navigation>("navigation"))[0];
  return (await strapiGet<One<Navigation>>("navigation", {
    populate: { mainMenu: { populate: "*" }, headerCta: true, footerColumns: { populate: "*" }, legalLinks: true },
  })).data;
}

const BLOCK_POPULATE = {
  on: Object.fromEntries(["hero", "rich-text", "text-image", "key-figures", "tag-list", "cta-band", "solutions-list", "latest-news",
    "partners-ribbon", "partners-grid", "faq-list", "people-grid", "stats-table", "contact-section"].map((b) => [`blocks.${b}`, { populate: "*" }])
    .concat([["blocks.cards-grid", { populate: { cards: { populate: "*" } } } as any]])),
};

export async function getPage(slug: string) {
  if (DRUPAL) return (await list<Page>("page")).find((p) => p.slug === slug) ?? null;
  const res = await strapiGet<Many<Page>>("pages", {
    filters: { slug: { $eq: slug } },
    populate: { blocks: BLOCK_POPULATE, seo: { populate: "*" } },
  });
  return res.data[0] ?? null;
}
export async function getPageSlugs() {
  if (DRUPAL) return (await list<Page>("page")).map(({ slug, isHomepage }) => ({ slug, isHomepage }));
  return (await strapiGet<Many<Pick<Page, "slug" | "isHomepage">>>("pages", { fields: ["slug", "isHomepage"], pagination: ALL })).data;
}
export async function getSolutions() {
  if (DRUPAL) return byOrder(await list<Solution>("solution"));
  return (await strapiGet<Many<Solution>>("solutions", { sort: "order:asc", populate: "*", pagination: ALL })).data;
}
export async function getInnovations() {
  if (DRUPAL) return byOrder(await list<Solution>("innovation"));
  return (await strapiGet<Many<Solution>>("innovations", { sort: "order:asc", populate: "*", pagination: ALL })).data;
}
export async function getPartenaires() {
  if (DRUPAL) return byOrder(await list<Partenaire>("partenaire", DEFAULT_LANG));
  return (await strapiGet<Many<Partenaire>>("partenaires", { locale: undefined, sort: "order:asc", populate: "logo", pagination: ALL })).data;
}
export async function getActualites(limit = 100) {
  if (DRUPAL) return desc(await list<Actualite>("actualite"), "date").slice(0, limit);
  return (await strapiGet<Many<Actualite>>("actualites", { sort: "date:desc", populate: "*", pagination: { pageSize: limit } })).data;
}
export async function getAppelsOffres(limit = 100) {
  if (DRUPAL) return desc(await list<AppelOffres>("appel_offres"), "publicationDate").slice(0, limit);
  return (await strapiGet<Many<AppelOffres>>("appels-offres", { sort: "publicationDate:desc", populate: "*", pagination: { pageSize: limit } })).data;
}
export async function getFaqs() {
  if (DRUPAL) return [...(await list<Faq>("faq"))].sort((a, b) => a.category.localeCompare(b.category) || (a.order ?? 0) - (b.order ?? 0));
  return (await strapiGet<Many<Faq>>("faqs", { sort: ["category:asc", "order:asc"], pagination: ALL })).data;
}
export async function getIndicateurs() {
  if (DRUPAL) return byOrder(await list<Indicateur>("indicateur"));
  return (await strapiGet<Many<Indicateur>>("indicateurs", { sort: "order:asc", populate: "values", pagination: ALL })).data;
}
export async function getDirigeants() {
  if (DRUPAL) return byOrder(await list<Dirigeant>("dirigeant"));
  return (await strapiGet<Many<Dirigeant>>("dirigeants", { sort: "order:asc", populate: "photo", pagination: ALL })).data;
}

async function bySlug<T extends { slug: string }>(path: string, bundle: string, slug: string, populate: unknown = "*") {
  if (DRUPAL) return (await list<T>(bundle)).find((x) => x.slug === slug) ?? null;
  const res = await strapiGet<Many<T>>(path, { filters: { slug: { $eq: slug } }, populate });
  return res.data[0] ?? null;
}
export const getSolution = (slug: string) => bySlug<Solution>("solutions", "solution", slug, { sections: true, keyPoints: true, cta: true, seo: { populate: "*" } });
export const getInnovation = (slug: string) => bySlug<Solution>("innovations", "innovation", slug, { sections: true, keyPoints: true, cta: true, seo: { populate: "*" } });
export const getActualite = (slug: string) => bySlug<Actualite>("actualites", "actualite", slug, { cover: true, attachments: true, seo: { populate: "*" } });
export const getAppelOffres = (slug: string) => bySlug<AppelOffres>("appels-offres", "appel_offres", slug, { documents: true, seo: { populate: "*" } });
