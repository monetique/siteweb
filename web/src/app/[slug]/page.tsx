import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/BlockRenderer";
import { buildMetadata } from "@/lib/seo";
import { getPage, getPageSlugs } from "@/lib/strapi";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

/** Pages Strapi servies par une route dédiée (liste filtrable, pages de détail imbriquées). */
const DEDICATED = ["actualites", "appels-offres", "solutions"];

export async function generateStaticParams() {
  const pages = await getPageSlugs();
  return pages.filter((p) => !p.isHomepage && !DEDICATED.includes(p.slug)).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = await getPage(slug);
  return buildMetadata(page?.seo, page?.title ?? "", `/${slug}/`);
}

export default async function StrapiPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();
  return <BlockRenderer page={page} />;
}
