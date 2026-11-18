import type { Metadata } from "next";
import { LANGS, localizePath, OG_LOCALE } from "./i18n";
import { getLang } from "./lang-server";
import { getGlobal, mediaUrl, type Seo } from "./strapi";

const SITE_URL = (process.env.SITE_URL || "https://www.monetiquetunisie.com").replace(/\/$/, "");

/** Métadonnées d'une page : titre, description, adresse canonique de la langue et versions dans les autres langues (hreflang). */
export async function buildMetadata(seo: Seo | undefined, fallbackTitle: string, path: string): Promise<Metadata> {
  const lang = getLang();
  const g = await getGlobal();
  const title = seo?.metaTitle || fallbackTitle;
  const description = seo?.metaDescription || g.defaultSeo?.metaDescription;
  const image = mediaUrl(seo?.shareImage) || mediaUrl(g.defaultSeo?.shareImage) || mediaUrl(g.logo);
  const url = `${SITE_URL}${localizePath(path, lang)}`;
  const languages = Object.fromEntries([...LANGS.map((l) => [l, `${SITE_URL}${localizePath(path, l)}`]), ["x-default", `${SITE_URL}${path}`]]);
  return {
    title: path === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages },
    robots: seo?.noIndex ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url, siteName: g.siteName, locale: OG_LOCALE[lang], type: "website", images: image ? [{ url: image }] : undefined },
  };
}
