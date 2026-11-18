import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/BlockRenderer";
import { buildMetadata } from "@/lib/seo";
import { getPage } from "@/lib/strapi";

export async function generateMetadata() {
  const page = await getPage("solutions");
  return buildMetadata(page?.seo, "Solutions", "/solutions/");
}

export default async function SolutionsPage() {
  const page = await getPage("solutions");
  if (!page) notFound();
  return <BlockRenderer page={page} />;
}
