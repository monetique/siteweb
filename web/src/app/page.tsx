import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/BlockRenderer";
import { buildMetadata } from "@/lib/seo";
import { getPage } from "@/lib/strapi";

export async function generateMetadata() {
  const page = await getPage("accueil");
  return buildMetadata(page?.seo, "Accueil", "/");
}

export default async function HomePage() {
  const page = await getPage("accueil");
  if (!page) notFound();
  return <BlockRenderer page={page} />;
}
