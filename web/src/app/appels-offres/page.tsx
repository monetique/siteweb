import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/BlockRenderer";
import { getNewsItems } from "@/components/blocks/data";
import { NewsExplorer } from "@/components/NewsExplorer";
import { buildMetadata } from "@/lib/seo";
import { getPage } from "@/lib/strapi";

export async function generateMetadata() {
  const page = await getPage("appels-offres");
  return buildMetadata(page?.seo, "Appels d'offres", "/appels-offres/");
}

export default async function AppelsOffresPage() {
  const page = await getPage("appels-offres");
  if (!page) notFound();
  const items = await getNewsItems("appels_offres");
  const tabs = [
    { key: "all", label: "Tous" },
    { key: "open", label: "En cours", status: "ouvert" },
    { key: "ao", label: "Appels d'offres", groups: ["appel_offres", "consultation"] },
    { key: "cand", label: "Appels à candidatures", groups: ["appel_candidatures"] },
  ];
  return (
    <BlockRenderer page={page} overrides={{ "blocks.latest-news": ({ block }: any) => <NewsExplorer items={items} tabs={tabs} title={block.title} /> }} />
  );
}
