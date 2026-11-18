import type { MetadataRoute } from "next";
import { LANGS, localizePath } from "@/lib/i18n";
import { getActualites, getAppelsOffres, getPageSlugs, getSolutions } from "@/lib/strapi";

export const dynamic = "force-static";
const SITE = (process.env.SITE_URL || "https://www.monetiquetunisie.com").replace(/\/$/, "");

/** Plan du site : chaque page dans les trois langues, avec les liens hreflang entre versions. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, solutions, actus, aos] = await Promise.all([getPageSlugs(), getSolutions(), getActualites(), getAppelsOffres()]);
  const entries: { path: string; priority: number; lastModified?: string; changeFrequency?: "monthly" | "yearly" }[] = [
    ...pages.filter((p) => p.slug !== "cookies").map((p) => ({ path: p.isHomepage ? "/" : `/${p.slug}/`, priority: p.isHomepage ? 1 : 0.7, changeFrequency: "monthly" as const })),
    ...solutions.map((s) => ({ path: `/solutions/${s.slug}/`, priority: 0.8, changeFrequency: "yearly" as const })),
    ...actus.map((a) => ({ path: `/actualites/${a.slug}/`, priority: 0.6, lastModified: a.date })),
    ...aos.map((t) => ({ path: `/appels-offres/${t.slug}/`, priority: 0.6, lastModified: t.publicationDate })),
  ];
  const languages = (path: string) => Object.fromEntries(LANGS.map((l) => [l, `${SITE}${localizePath(path, l)}`]));
  return entries.flatMap((e) =>
    LANGS.map((lang) => ({
      url: `${SITE}${localizePath(e.path, lang)}`,
      lastModified: e.lastModified,
      changeFrequency: e.changeFrequency,
      priority: lang === "fr" ? e.priority : Math.round(e.priority * 8) / 10,
      alternates: { languages: languages(e.path) },
    })),
  );
}
