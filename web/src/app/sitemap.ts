import type { MetadataRoute } from "next";
import { getActualites, getAppelsOffres, getPageSlugs, getSolutions } from "@/lib/strapi";

export const dynamic = "force-static";
const SITE = (process.env.SITE_URL || "https://www.monetiquetunisie.com").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, solutions, actus, aos] = await Promise.all([getPageSlugs(), getSolutions(), getActualites(), getAppelsOffres()]);
  return [
    ...pages.filter((p) => p.slug !== "cookies").map((p) => ({ url: p.isHomepage ? `${SITE}/` : `${SITE}/${p.slug}/`, changeFrequency: "monthly" as const, priority: p.isHomepage ? 1 : 0.7 })),
    ...solutions.map((s) => ({ url: `${SITE}/solutions/${s.slug}/`, changeFrequency: "yearly" as const, priority: 0.8 })),
    ...actus.map((a) => ({ url: `${SITE}/actualites/${a.slug}/`, lastModified: a.date, priority: 0.6 })),
    ...aos.map((t) => ({ url: `${SITE}/appels-offres/${t.slug}/`, lastModified: t.publicationDate, priority: 0.6 })),
  ];
}
