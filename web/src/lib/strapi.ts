import type { BlocksContent } from "@strapi/blocks-react-renderer";

/* ------------------------------------------------------------------ configuration */
const STRAPI_URL = (process.env.STRAPI_URL || "http://localhost:1337").replace(/\/$/, "");
const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL || STRAPI_URL).replace(/\/$/, "");
const TOKEN = process.env.STRAPI_TOKEN;
export const LOCALE = "fr";

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
  const qs = toQuery({ locale: LOCALE, ...params }).join("&");
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

export async function getGlobal() {
  return (await strapiGet<One<Global>>("global", { populate: "*" })).data;
}
export async function getNavigation() {
  return (await strapiGet<One<Navigation>>("navigation", {
    populate: { mainMenu: { populate: "*" }, headerCta: true, footerColumns: { populate: "*" }, legalLinks: true },
  })).data;
}

const BLOCK_POPULATE = {
  on: {
    "blocks.hero": { populate: "*" },
    "blocks.rich-text": { populate: "*" },
    "blocks.text-image": { populate: "*" },
    "blocks.key-figures": { populate: "*" },
    "blocks.cards-grid": { populate: { cards: { populate: "*" } } },
    "blocks.tag-list": { populate: "*" },
    "blocks.cta-band": { populate: "*" },
    "blocks.solutions-list": { populate: "*" },
    "blocks.latest-news": { populate: "*" },
    "blocks.partners-ribbon": { populate: "*" },
    "blocks.partners-grid": { populate: "*" },
    "blocks.faq-list": { populate: "*" },
    "blocks.people-grid": { populate: "*" },
    "blocks.stats-table": { populate: "*" },
    "blocks.contact-section": { populate: "*" },
  },
};

export async function getPage(slug: string) {
  const res = await strapiGet<Many<Page>>("pages", {
    filters: { slug: { $eq: slug } },
    populate: { blocks: BLOCK_POPULATE, seo: { populate: "*" } },
  });
  return res.data[0] ?? null;
}
export async function getPageSlugs() {
  return (await strapiGet<Many<Pick<Page, "slug" | "isHomepage">>>("pages", { fields: ["slug", "isHomepage"], pagination: ALL })).data;
}
export async function getSolutions() {
  return (await strapiGet<Many<Solution>>("solutions", { sort: "order:asc", populate: "*", pagination: ALL })).data;
}
export async function getPartenaires() {
  return (await strapiGet<Many<Partenaire>>("partenaires", { locale: undefined, sort: "order:asc", populate: "logo", pagination: ALL })).data;
}
export async function getActualites(limit = 100) {
  return (await strapiGet<Many<Actualite>>("actualites", { sort: "date:desc", populate: "*", pagination: { pageSize: limit } })).data;
}
export async function getAppelsOffres(limit = 100) {
  return (await strapiGet<Many<AppelOffres>>("appels-offres", { sort: "publicationDate:desc", populate: "*", pagination: { pageSize: limit } })).data;
}
export async function getFaqs() {
  return (await strapiGet<Many<Faq>>("faqs", { sort: ["category:asc", "order:asc"], pagination: ALL })).data;
}
export async function getIndicateurs() {
  return (await strapiGet<Many<Indicateur>>("indicateurs", { sort: "order:asc", populate: "values", pagination: ALL })).data;
}
export async function getDirigeants() {
  return (await strapiGet<Many<Dirigeant>>("dirigeants", { sort: "order:asc", populate: "photo", pagination: ALL })).data;
}

async function bySlug<T>(path: string, slug: string, populate: unknown = "*") {
  const res = await strapiGet<Many<T>>(path, { filters: { slug: { $eq: slug } }, populate });
  return res.data[0] ?? null;
}
export const getSolution = (slug: string) => bySlug<Solution>("solutions", slug, { sections: true, keyPoints: true, cta: true, seo: { populate: "*" } });
export const getActualite = (slug: string) => bySlug<Actualite>("actualites", slug, { cover: true, attachments: true, seo: { populate: "*" } });
export const getAppelOffres = (slug: string) => bySlug<AppelOffres>("appels-offres", slug, { documents: true, seo: { populate: "*" } });
