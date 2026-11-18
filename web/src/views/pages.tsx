/**
 * Pages du site, communes aux trois langues. Les routes de app/(fr), app/en et app/ar se contentent
 * d'appeler ces fonctions avec leur langue (fichiers générés par scripts/gen-routes.mjs).
 */
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/BlockRenderer";
import { getNewsItems } from "@/components/blocks/data";
import { NewsExplorer } from "@/components/NewsExplorer";
import { dictOf, type Lang } from "@/lib/i18n";
import { setLang } from "@/lib/lang-server";
import { buildMetadata } from "@/lib/seo";
import { getPage, getPageSlugs } from "@/lib/strapi";

/** Pages Strapi servies par une route dédiée (liste filtrable, pages de détail imbriquées). */
const DEDICATED = ["actualites", "appels-offres", "solutions"];

/* ---------- Accueil */
export async function homeMetadata(lang: Lang) {
  setLang(lang);
  const page = await getPage("accueil");
  return buildMetadata(page?.seo, dictOf(lang).home, "/");
}
export async function HomeView({ lang }: { lang: Lang }) {
  setLang(lang);
  const page = await getPage("accueil");
  if (!page) notFound();
  return <BlockRenderer page={page} />;
}

/* ---------- Pages composées dans Strapi (Monétique Tunisie, Expertise, FAQ, Contact…) */
export async function pageParams() {
  const pages = await getPageSlugs();
  return pages.filter((p) => !p.isHomepage && !DEDICATED.includes(p.slug)).map((p) => ({ slug: p.slug }));
}
export async function pageMetadata(lang: Lang, slug: string) {
  setLang(lang);
  const page = await getPage(slug);
  return buildMetadata(page?.seo, page?.title ?? "", `/${slug}/`);
}
export async function PageView({ lang, slug }: { lang: Lang; slug: string }) {
  setLang(lang);
  const page = await getPage(slug);
  if (!page) notFound();
  return <BlockRenderer page={page} />;
}

/* ---------- Liste des solutions */
export async function solutionsMetadata(lang: Lang) {
  setLang(lang);
  const page = await getPage("solutions");
  return buildMetadata(page?.seo, dictOf(lang).solutions, "/solutions/");
}
export async function SolutionsView({ lang }: { lang: Lang }) {
  setLang(lang);
  const page = await getPage("solutions");
  if (!page) notFound();
  return <BlockRenderer page={page} />;
}

/* ---------- Actualités (liste filtrable) */
export async function newsMetadata(lang: Lang) {
  setLang(lang);
  const page = await getPage("actualites");
  return buildMetadata(page?.seo, dictOf(lang).news, "/actualites/");
}
export async function NewsView({ lang }: { lang: Lang }) {
  setLang(lang);
  const d = dictOf(lang);
  const page = await getPage("actualites");
  if (!page) notFound();
  const items = await getNewsItems("mixte");
  const tabs = [
    { key: "all", label: d.tabs.all },
    { key: "actu", label: d.tabs.actu, groups: ["actualite", "annonce"] },
    { key: "event", label: d.tabs.event, groups: ["evenement"] },
    { key: "ao", label: d.tabs.ao, groups: ["appel_offres", "consultation"] },
    { key: "cand", label: d.tabs.cand, groups: ["appel_candidatures"] },
  ];
  return <BlockRenderer page={page} overrides={{ "blocks.latest-news": ({ block }: any) => <NewsExplorer items={items} tabs={tabs} title={block.title} /> }} />;
}

/* ---------- Appels d'offres (liste filtrable) */
export async function tendersMetadata(lang: Lang) {
  setLang(lang);
  const page = await getPage("appels-offres");
  return buildMetadata(page?.seo, dictOf(lang).tenders, "/appels-offres/");
}
export async function TendersView({ lang }: { lang: Lang }) {
  setLang(lang);
  const d = dictOf(lang);
  const page = await getPage("appels-offres");
  if (!page) notFound();
  const items = await getNewsItems("appels_offres");
  const tabs = [
    { key: "all", label: d.tabAllMasc },
    { key: "open", label: d.tabs.open, status: "ouvert" },
    { key: "ao", label: d.tabs.ao, groups: ["appel_offres", "consultation"] },
    { key: "cand", label: d.tabs.cand, groups: ["appel_candidatures"] },
  ];
  return <BlockRenderer page={page} overrides={{ "blocks.latest-news": ({ block }: any) => <NewsExplorer items={items} tabs={tabs} title={block.title} /> }} />;
}
