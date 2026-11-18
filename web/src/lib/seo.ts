import type { Metadata } from "next";
import { getGlobal, mediaUrl, type Seo } from "./strapi";

const SITE_URL = (process.env.SITE_URL || "https://www.monetiquetunisie.com").replace(/\/$/, "");

export async function buildMetadata(seo: Seo | undefined, fallbackTitle: string, path: string): Promise<Metadata> {
  const g = await getGlobal();
  const title = seo?.metaTitle || fallbackTitle;
  const description = seo?.metaDescription || g.defaultSeo?.metaDescription;
  const image = mediaUrl(seo?.shareImage) || mediaUrl(g.defaultSeo?.shareImage) || mediaUrl(g.logo);
  return {
    title: path === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
    robots: seo?.noIndex ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: `${SITE_URL}${path}`, siteName: g.siteName, locale: "fr_TN", type: "website", images: image ? [{ url: image }] : undefined },
  };
}
