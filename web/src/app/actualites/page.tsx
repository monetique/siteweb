import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/BlockRenderer";
import { getNewsItems } from "@/components/blocks/data";
import { NewsExplorer } from "@/components/NewsExplorer";
import { buildMetadata } from "@/lib/seo";
import { getPage } from "@/lib/strapi";

export async function generateMetadata() {
  const page = await getPage("actualites");
  return buildMetadata(page?.seo, "Actualités", "/actualites/");
}

export default async function ActualitesPage() {
  const page = await getPage("actualites");
  if (!page) notFound();
  const items = await getNewsItems("mixte");
  const tabs = [
    { key: "all", label: "Toutes" },
    { key: "actu", label: "Actualités", groups: ["actualite", "annonce"] },
    { key: "event", label: "Évènements", groups: ["evenement"] },
    { key: "ao", label: "Appels d'offres", groups: ["appel_offres", "consultation"] },
    { key: "cand", label: "Appels à candidatures", groups: ["appel_candidatures"] },
  ];
  return (
    <BlockRenderer page={page} overrides={{ "blocks.latest-news": ({ block }: any) => <NewsExplorer items={items} tabs={tabs} title={block.title} /> }} />
  );
}
