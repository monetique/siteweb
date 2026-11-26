/* Blocs « données » : ils affichent automatiquement les collections Strapi. */
import type React from "react";
import { L as NextLink } from "@/components/LangProvider";
import type { Block, Page, Partenaire } from "@/lib/strapi";
import { safeHref } from "@/lib/safe";
import { getActualites, getAppelsOffres, getDirigeants, getFaqs, getGlobal, getIndicateurs, getPartenaires, getSolutions, mediaUrl } from "@/lib/strapi";
import { formatEvolution, localizePeriod } from "@/lib/i18n";
import { getLang, t } from "@/lib/lang-server";
import { Icon } from "../Icon";
import { RichText } from "../RichText";
import { Container, Section, SectionTitle } from "../Section";
import { ContactForm } from "../ContactForm";
import { NewsCard, type NewsItem } from "../NewsCard";
import { SolutionsJourney } from "../SolutionsJourney";
export type { NewsItem };

type P = { block: Block; page: Page };

/* ---------- Liste des solutions */
export async function SolutionsList({ block }: P) {
  const solutions = await getSolutions();
  return (
    <Section tone="low">
      {block.title ? <SectionTitle eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} /> : <h2 className="sr-only">{t().solutionsList}</h2>}
      {block.display === "parcours" ? (
        <SolutionsJourney learnMore={t().learnMore}
          labels={String(block.stepLabels ?? "").split("\n").map((l: string) => l.trim()).filter(Boolean)}
          items={solutions.map((s) => ({ slug: s.slug, name: s.name, tagline: s.tagline, icon: s.icon }))} />
      ) : (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {solutions.map((s) => (
          <NextLink key={s.slug} href={`/solutions/${s.slug}`}
            className="group flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-7 shadow-sm transition-shadow hover:shadow-md">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-low text-secondary"><Icon name={s.icon} /></span>
            <h3 className="mt-5 text-headline-sm">{s.name}</h3>
            <p className="mt-2 flex-1 text-body-sm text-on-surface-variant">{s.tagline}</p>
            <span className="mt-5 inline-flex items-center gap-1 text-label-md text-secondary">
              {t().learnMore} <Icon name="east" className="text-[16px] transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </span>
          </NextLink>
        ))}
      </div>
      )}
    </Section>
  );
}

/* ---------- Dernières publications (actualités + appels d'offres) */
export async function getNewsItems(source: string = "mixte", limit = 100): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  if (source !== "appels_offres") {
    for (const a of await getActualites()) {
      items.push({ kind: "actu", title: a.title, href: `/actualites/${a.slug}`, date: a.date, label: a.label || t().newsCategory[a.category], excerpt: a.excerpt, cover: mediaUrl(a.cover), group: a.category });
    }
  }
  if (source !== "actualites") {
    const d = t();
    for (const ao of await getAppelsOffres()) {
      items.push({ kind: "ao", title: ao.title, href: `/appels-offres/${ao.slug}`, date: ao.publicationDate, label: d.tenderType[ao.type], excerpt: ao.summary, meta: ao.reference, group: ao.type, status: ao.tenderStatus, deadline: ao.deadline });
    }
  }
  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export async function LatestNews({ block }: P) {
  const items = await getNewsItems(block.source, block.count ?? 3);
  return (
    <Section tone="surface">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <SectionTitle eyebrow={block.eyebrow} title={block.title} />
        <div className="mb-10 flex gap-3 text-label-md">
          <NextLink href="/actualites" className="text-secondary hover:underline">{t().allNews}</NextLink>
          <span className="text-outline-variant">|</span>
          <NextLink href="/appels-offres" className="text-secondary hover:underline">{t().allTenders}</NextLink>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">{items.map((i) => <NewsCard key={i.href} item={i} />)}</div>
    </Section>
  );
}

/* ---------- Partenaires */

/** Lien vers le site officiel d'un partenaire (nouvel onglet) ; simple texte si aucune adresse n'est renseignée. */
function PartnerLink({ partner, className, children }: { partner: Partenaire; className?: string; children: React.ReactNode }) {
  const href = partner.website ? safeHref(partner.website) : "#";
  if (href === "#" || !/^https?:/i.test(href)) return <span className={className}>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={`${partner.name} – ${t().officialSite}`}>
      {children}
    </a>
  );
}

export async function PartnersRibbon({ block }: { block: Block }) {
  const all = await getPartenaires();
  const homeStyle = block.variant === "facturiers";
  // Même présentation partout (accueil, pages intérieures, page Partenaires) : filet, intitulé discret,
  // noms en typographie (ou logo), liens vers les sites. Seule la sélection change : facturiers sur l'accueil,
  // partenaires cochés « bandeau » ailleurs.
  const partners = all.filter((p) => (homeStyle ? p.showOnHome : p.showInRibbon));
  if (!partners.length) return null;
  return (
    <section className={`w-full bg-surface-container-low ${homeStyle ? "pb-20 pt-2" : "py-16"}`}>
      <Container>
        <div className="border-t border-outline-variant/40 pt-10">
          <h2 className="mb-6 block text-center text-eyebrow font-bold uppercase tracking-widest text-on-surface-variant">
            {block.title || (homeStyle ? t().partnersHome : t().partnersInner)}
          </h2>
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 opacity-80 md:gap-x-12">
            {partners.map((p) => {
              const logo = mediaUrl(p.logo);
              return (
                <li key={p.name} className="text-center text-body-lg font-bold tracking-wider text-on-surface md:text-headline-sm">
                  <PartnerLink partner={p} className="transition-colors hover:text-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {logo ? <img src={logo} alt={p.name} className="h-8 w-auto grayscale transition hover:grayscale-0" /> : p.name}
                  </PartnerLink>
                </li>
              );
            })}
          </ul>
          {block.showAllLink && (
            <p className="mt-8 text-center">
              <NextLink href="/partenaires" className="inline-flex items-center gap-1 text-label-md text-secondary underline-offset-4 hover:underline">
                Voir tous nos partenaires <Icon name="east" className="text-[16px]" />
              </NextLink>
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}

export async function PartnersGrid({ block }: P) {
  const partners = await getPartenaires();
  const groups = Object.entries(t().partnerCategory).map(([key, label]) => ({ label, items: partners.filter((p) => p.category === key) })).filter((g) => g.items.length);
  // Même présentation que le bandeau de l'accueil : filet, intitulé discret, noms en typographie (ou logo), liens vers les sites.
  return (
    <Section tone="low">
      <SectionTitle title={block.title} subtitle={block.intro} />
      {groups.map((g) => (
        <div key={g.label} className="border-t border-outline-variant/40 py-10 last:pb-0">
          <h2 className="mb-6 text-center text-eyebrow font-bold uppercase tracking-widest text-on-surface-variant">
            {g.label} <span className="font-normal">· {g.items.length}</span>
          </h2>
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 opacity-80 md:gap-x-12">
            {g.items.map((p) => {
              const logo = mediaUrl(p.logo);
              return (
                <li key={p.name} className="text-center text-body-lg font-bold tracking-wider text-on-surface md:text-headline-sm">
                  <PartnerLink partner={p} className="transition-colors hover:text-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {logo ? <img src={logo} alt={p.name} className="h-8 w-auto grayscale transition hover:grayscale-0" /> : p.name}
                  </PartnerLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </Section>
  );
}

/* ---------- FAQ */
export async function FaqList({ block }: P) {
  const all = await getFaqs();
  const cats = block.category && block.category !== "toutes" ? [block.category] : Object.keys(t().faqCategory);
  const showNav = cats.length > 1;
  return (
    <Section tone={showNav ? "surface" : "low"}>
      <SectionTitle title={block.title} />
      {showNav && (
        <nav aria-label={t().faqTopics} className="mb-12 flex flex-wrap gap-3">
          {cats.map((c) => (
            <a key={c} href={`#faq-${c}`} className="rounded-full border border-outline-variant/40 bg-surface-container-lowest px-4 py-2 text-label-md hover:bg-surface-container">{t().faqCategory[c]}</a>
          ))}
        </nav>
      )}
      <div className="max-w-4xl">
        {cats.map((c) => {
          const qs = all.filter((f) => f.category === c);
          if (!qs.length) return null;
          return (
            <div key={c} id={`faq-${c}`} className="mb-12 scroll-mt-40 last:mb-0">
              {showNav && <h2 className="mb-5 text-headline-md">{t().faqCategory[c]}</h2>}
              <div className="space-y-3">
                {qs.map((q, i) => (
                  <details key={q.question} className="group rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm" open={i === 0}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-label-md lg:text-[1rem]">
                      {q.question}<Icon name="add" className="text-secondary transition-transform group-open:rotate-45" />
                    </summary>
                    <div className="px-5 pb-5"><RichText content={q.answer} /></div>
                  </details>
                ))}
              </div>
            </div>
          );
        })}
        {!showNav && (
          <NextLink href="/faq" className="mt-8 inline-flex items-center gap-1 text-label-md text-secondary hover:underline">
            {t().allQuestions} <Icon name="east" className="text-[16px]" />
          </NextLink>
        )}
      </div>
    </Section>
  );
}

/* ---------- Dirigeants */
export async function PeopleGrid({ block }: P) {
  const people = await getDirigeants();
  return (
    <Section tone="surface" id={block.anchor || undefined}>
      <SectionTitle eyebrow={block.eyebrow} title={block.title} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {people.map((p) => {
          const photo = mediaUrl(p.photo);
          return (
            <div key={p.fullName} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photo ? <img src={photo} alt={p.fullName} className="h-16 w-16 rounded-full object-cover" /> : <Icon name="person" className="text-[32px] text-secondary" />}
              <h3 className="mt-3 text-headline-sm">{p.fullName}</h3>
              <p className="mt-1 text-body-sm text-on-surface-variant">{p.role}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------- Tableau statistiques */
export async function StatsTable({ block }: P) {
  const indicateurs = (await getIndicateurs()).filter((i) => i.values.length > 1);
  return (
    <Section tone="surface">
      <SectionTitle title={block.title} subtitle={block.subtitle} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {indicateurs.map((ind) => (
          <div key={ind.name} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-headline-sm">{ind.name}</h3>
                {ind.unit && <span className="text-body-sm text-on-surface-variant">({ind.unit})</span>}
              </div>
              <Icon name={ind.icon} className="text-secondary" />
            </div>
            <table className="w-full text-body-sm">
              <caption className="sr-only">{ind.name}</caption>
              <thead><tr className="text-start text-label-sm text-on-surface-variant"><th className="py-2 font-semibold">{t().period}</th><th className="py-2 text-end font-semibold">{t().value}</th><th className="py-2 text-end font-semibold">{t().evolution}</th></tr></thead>
              <tbody>
                {ind.values.map((v) => (
                  <tr key={v.period} className="border-t border-outline-variant/30">
                    <td className="py-2.5">{localizePeriod(v.period, getLang())}{v.isPartialYear ? "*" : ""}</td>
                    <td className="py-2.5 text-end font-display font-bold"><span dir="ltr">{v.displayValue ?? v.value}</span></td>
                    <td className={`py-2.5 text-end ${(v.evolution ?? 0) < 0 ? "text-error" : "text-secondary"}`}><span dir="ltr">{formatEvolution(v.evolution, getLang())}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ind.note && <p className="mt-3 text-body-sm text-on-surface-variant">{ind.note}</p>}
          </div>
        ))}
      </div>
      {block.footnote && <p className="mt-6 text-body-sm text-on-surface-variant">{block.footnote}</p>}
    </Section>
  );
}

/* ---------- Coordonnées + formulaire */
export async function ContactSection({ block }: P) {
  const g = await getGlobal();
  const tel = (s?: string) => s?.replace(/\s/g, "");
  return (
    <Section tone="low">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionTitle eyebrow={t().contact} title={block.title} subtitle={t().contactIntro} />
          <ul className="space-y-5">
            <li className="flex gap-3"><Icon name="location_on" className="text-secondary" /><div><strong className="block text-label-md">{t().address}</strong>{g.address}{g.mapUrl && <> · <a href={g.mapUrl} target="_blank" rel="noopener noreferrer" className="text-secondary underline underline-offset-2">{t().route}</a></>}</div></li>
            <li className="flex gap-3"><Icon name="support_agent" className="text-secondary" /><div><strong className="block text-label-md">{t().callCenter}</strong><a href={`tel:${tel(g.phoneCallCenter)}`} className="text-secondary">{g.phoneCallCenter}</a></div></li>
            <li className="flex gap-3"><Icon name="call" className="text-secondary" /><div><strong className="block text-label-md">{t().greenNumberStd}</strong><a href={`tel:${tel(g.phoneGreenNumber)}`} className="text-secondary">{g.phoneGreenNumber}</a> · <a href={`tel:${tel(g.phoneHeadquarters)}`} className="text-secondary">{g.phoneHeadquarters}</a></div></li>
            <li className="flex gap-3"><Icon name="mail" className="text-secondary" /><div><strong className="block text-label-md">{t().emailLabel}</strong><a href={`mailto:${g.emailContact}`} className="break-all text-secondary">{g.emailContact}</a><br /><a href={`mailto:${g.emailCommercial}`} className="break-all text-secondary">{g.emailCommercial}</a></div></li>
          </ul>
        </div>
        {block.showForm !== false && <div className="lg:col-span-7"><ContactForm /></div>}
      </div>
    </Section>
  );
}
