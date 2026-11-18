import type { Page } from "@/lib/strapi";
import { CardsGrid, CtaBand, Hero, KeyFigures, RichTextBlock, TagList, TextImage } from "./blocks/content";
import { ContactSection, FaqList, LatestNews, PartnersGrid, PartnersRibbon, PeopleGrid, SolutionsList, StatsTable } from "./blocks/data";

const REGISTRY: Record<string, (p: any) => any> = {
  "blocks.hero": Hero,
  "blocks.rich-text": RichTextBlock,
  "blocks.text-image": TextImage,
  "blocks.key-figures": KeyFigures,
  "blocks.cards-grid": CardsGrid,
  "blocks.tag-list": TagList,
  "blocks.cta-band": CtaBand,
  "blocks.solutions-list": SolutionsList,
  "blocks.latest-news": LatestNews,
  "blocks.partners-ribbon": PartnersRibbon,
  "blocks.partners-grid": PartnersGrid,
  "blocks.faq-list": FaqList,
  "blocks.people-grid": PeopleGrid,
  "blocks.stats-table": StatsTable,
  "blocks.contact-section": ContactSection,
};

/** Affiche, dans l'ordre, les blocs composés par les rédacteurs dans Strapi. */
export function BlockRenderer({ page, overrides = {} }: { page: Page; overrides?: Record<string, (p: any) => any> }) {
  return (
    <>
      {page.blocks.map((block) => {
        const Component = overrides[block.__component] ?? REGISTRY[block.__component];
        if (!Component) return null;
        return <Component key={`${block.__component}-${block.id}`} block={block} page={page} />;
      })}
    </>
  );
}
