import { notFound } from "next/navigation";
import { ContactCard } from "@/components/ContactCard";
import { DetailBar } from "@/components/DetailBar";
import { Documents } from "@/components/Documents";
import { Icon } from "@/components/Icon";
import { NewsCard } from "@/components/NewsCard";
import { RichText } from "@/components/RichText";
import { Container } from "@/components/Section";
import { getNewsItems } from "@/components/blocks/data";
import { formatDate, NEWS_CATEGORY } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import { jsonLd as toJsonLd } from "@/lib/safe";
import { getActualite, getActualites, getGlobal, mediaUrl } from "@/lib/strapi";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getActualites()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const a = await getActualite(slug);
  return buildMetadata(a?.seo?.metaTitle ? a.seo : { ...a?.seo, metaTitle: a?.title?.slice(0, 70), metaDescription: a?.excerpt }, a?.title ?? "Actualité", `/actualites/${slug}/`);
}

export default async function ActualitePage({ params }: Props) {
  const { slug } = await params;
  const [a, g] = await Promise.all([getActualite(slug), getGlobal()]);
  if (!a) notFound();
  const others = (await getNewsItems("actualites")).filter((i) => !i.href.includes(`/${a.slug}`)).slice(0, 3);
  const cover = mediaUrl(a.cover);
  const isArabic = /[؀-ۿ]/.test(JSON.stringify(a.content ?? ""));
  const jsonLd = {
    "@context": "https://schema.org", "@type": "NewsArticle", headline: a.title, datePublished: a.date,
    description: a.excerpt, image: cover ? [cover] : undefined, inLanguage: isArabic ? "ar" : "fr",
    publisher: { "@type": "Organization", name: g.siteName, logo: mediaUrl(g.logo) ?? undefined },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }} />
      <DetailBar crumbs={[{ label: "Actualités", href: "/actualites/" }, { label: a.title }]} back={{ label: "Toutes les actualités", href: "/actualites/" }} />
      <section className="w-full py-12 lg:py-16">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <article className="lg:col-span-8">
            <div className="flex flex-wrap items-center gap-3 text-label-sm">
              <span className="rounded bg-surface-container px-2 py-1 text-eyebrow uppercase text-secondary">{NEWS_CATEGORY[a.category]}</span>
              {a.label && <span className="rounded bg-surface-container-high px-2 py-1 text-eyebrow uppercase text-on-surface-variant">{a.label}</span>}
              <span className="flex items-center gap-1 text-on-surface-variant"><Icon name="calendar_today" className="text-[16px]" /><time dateTime={a.date}>{formatDate(a.date)}</time></span>
            </div>
            <h1 className="mt-5 text-headline-lg-mobile lg:text-headline-lg">{a.title}</h1>
            {a.excerpt && <p className="mt-6 border-l-4 border-secondary bg-surface-container-low p-5 text-headline-sm font-medium">{a.excerpt}</p>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {cover && <img src={cover} alt={a.cover?.alternativeText ?? ""} className="mt-8 w-full rounded-2xl object-cover" />}
            <div className="mt-8" dir={isArabic ? "rtl" : undefined} lang={isArabic ? "ar" : undefined}>
              <RichText content={a.content} className="text-body-lg" />
            </div>
          </article>
          <aside className="flex flex-col gap-6 self-start lg:sticky lg:top-36 lg:col-span-4">
            <Documents files={a.attachments} title="Pièces jointes" />
            <ContactCard />
          </aside>
        </Container>
      </section>
      {others.length > 0 && (
        <section className="w-full bg-surface-container-low py-16">
          <Container>
            <h2 className="mb-8 text-headline-md">Autres actualités</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">{others.map((i) => <NewsCard key={i.href} item={i} />)}</div>
          </Container>
        </section>
      )}
    </>
  );
}
