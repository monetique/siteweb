/* Blocs « éditoriaux » : leur contenu est saisi directement dans la page Strapi. */
import type { Block, Page } from "@/lib/strapi";
import { getIndicateurs, mediaUrl } from "@/lib/strapi";
import { Breadcrumb } from "../Breadcrumb";
import { Icon } from "../Icon";
import { RichText } from "../RichText";
import { Container, Eyebrow, Section, SectionTitle } from "../Section";
import { ButtonLink } from "../SmartLink";

type P = { block: Block; page: Page };

/* ---------- Bannière */
export async function Hero({ block, page }: P) {
  if (block.variant === "accueil") return <HomeHero block={block} />;
  const crumbs = page.parentLabel ? [{ label: page.parentLabel }, { label: page.title }] : [{ label: page.title }];
  return (
    <section className="relative -mt-[116px] w-full overflow-hidden bg-primary-container pb-16 pt-[156px] text-on-primary shadow-md lg:pb-20">
      <div className="grid-nodes pointer-events-none absolute inset-0 text-white opacity-[0.07]" />
      <div className="pointer-events-none absolute -top-32 right-0 h-[540px] w-[540px] rounded-full bg-secondary/20 blur-3xl" />
      <Container className="relative">
        <Breadcrumb items={crumbs} />
        {block.eyebrow && (
          <span className="mb-6 inline-flex items-center gap-2 rounded-lg bg-secondary-container px-3 py-1 text-eyebrow uppercase text-on-secondary-container">
            <span className="h-1.5 w-1.5 rounded-full bg-on-secondary-container" />{block.eyebrow}
          </span>
        )}
        <h1 className="max-w-4xl text-headline-xl-mobile text-on-primary lg:text-headline-xl">{block.title}</h1>
        {block.subtitle && <p className="mt-4 max-w-2xl text-body-lg text-on-primary-container">{block.subtitle}</p>}
        {block.ctas?.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3">{block.ctas.map((c: any) => <ButtonLink key={c.label} link={c} dark />)}</div>
        )}
      </Container>
    </section>
  );
}

async function HomeHero({ block }: { block: Block }) {
  const indicateurs = await getIndicateurs();
  const dispo = indicateurs.find((i) => i.unit === "%")?.values.at(-1);
  // Le titre se termine par les mots mis en valeur après la dernière virgule (ex. « …, sécurisées »).
  const words: string[] = block.title.split(" ");
  const accent = words.slice(-1).join(" ");
  const lead = words.slice(0, -1).join(" ");
  const img = mediaUrl(block.image);
  return (
    <section className="relative w-full overflow-hidden bg-surface-bright">
      <Container className="grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-12 lg:py-24">
        <div className="lg:col-span-7">
          {block.eyebrow && (
            <span className="inline-flex items-center gap-2 rounded bg-surface-container px-3 py-1 text-eyebrow uppercase text-secondary">
              {block.eyebrow}
            </span>
          )}
          <h1 className="mt-6 text-headline-xl-mobile text-on-surface lg:text-headline-xl">
            {lead} <span className="text-secondary">{accent}</span>
          </h1>
          {block.subtitle && <p className="mt-6 max-w-2xl text-body-lg text-on-surface-variant">{block.subtitle}</p>}
          <div className="mt-8 flex flex-wrap gap-3">{block.ctas?.map((c: any) => <ButtonLink key={c.label} link={c} />)}</div>
        </div>
        <div className="lg:col-span-5">
          <div className="relative overflow-hidden rounded-2xl bg-primary-container p-8 text-on-primary shadow-xl">
            {img && /* eslint-disable-next-line @next/next/no-img-element */ <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
            <div className="grid-nodes pointer-events-none absolute inset-0 text-white opacity-[0.08]" />
            <div className="relative">
              <Eyebrow dark>Switch national monétique</Eyebrow>
              <p className="mt-3 text-body-md text-on-primary-container">
                Traitement des transactions cartes (GAB, TPE, e-commerce via ClicToPay), du paiement mobile et du paiement de factures avec Paysmart.
              </p>
              {dispo && (
                <div className="mt-8 rounded-xl bg-white/5 p-5">
                  <span className="font-display text-stat text-secondary-container">{dispo.displayValue ?? dispo.value} %</span>
                  <p className="mt-2 text-label-sm text-on-primary-container">Taux de disponibilité du switch national ({dispo.period.toLowerCase()})</p>
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                {["Agréé par la BCT", "PCI DSS", "14 banques africaines"].map((t) => (
                  <span key={t} className="rounded-full bg-white/10 px-3 py-1 text-label-sm text-secondary-fixed">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ---------- Texte riche */
export function RichTextBlock({ block }: P) {
  return (
    <Section tone="surface" className="rt-block">
      <div className="max-w-3xl">
        <SectionTitle eyebrow={block.eyebrow} title={block.title} />
        <RichText content={block.body} className="text-body-lg" />
      </div>
    </Section>
  );
}

/* ---------- Texte + visuel */
export function TextImage({ block }: P) {
  const img = mediaUrl(block.image);
  const left = block.imagePosition === "gauche";
  return (
    <Section tone="surface" id={block.anchor || undefined}>
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
        <div className={`lg:col-span-7 ${left ? "lg:order-2" : ""}`}>
          <span className="mb-4 inline-block rounded bg-surface-container px-3 py-1 text-eyebrow uppercase text-secondary">{block.eyebrow}</span>
          <h2 className="mb-6 text-headline-lg-mobile lg:text-headline-lg">{block.title}</h2>
          <RichText content={block.body} className="text-justify" />
          {block.cta && <div className="mt-8"><ButtonLink link={block.cta} /></div>}
        </div>
        <div className={`lg:col-span-5 ${left ? "lg:order-1" : ""}`}>
          {img ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={img} alt={block.image?.alternativeText ?? ""} className="w-full rounded-2xl object-cover shadow-lg" />
          ) : (
            <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-8">
              <div className="grid-nodes pointer-events-none absolute inset-0 text-secondary opacity-10" />
              <ul className="relative space-y-3">
                {block.keyPoints?.map((k: any) => (
                  <li key={k.text} className="flex items-center gap-3 rounded-xl bg-surface-container-lowest px-4 py-3 shadow-sm">
                    <Icon name={k.icon ?? "check_circle"} className="text-secondary" />
                    <span className="text-label-md">{k.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ---------- Chiffres clés */
export function KeyFigures({ block }: P) {
  return (
    <Section tone="surface">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <SectionTitle eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
        {block.cta && <div className="mb-10"><ButtonLink link={{ ...block.cta, style: "texte" }} /></div>}
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {block.items?.map((f: any) => (
          <div key={f.label} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
            <span className="text-label-sm text-on-surface-variant">{f.label}</span>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-headline-lg text-on-surface">{f.value}</span>
              {f.unit && <span className="text-headline-sm text-on-surface-variant">{f.unit}</span>}
            </div>
            {f.evolution && <span className="mt-2 inline-flex items-center gap-1 text-label-sm text-secondary"><Icon name="trending_up" className="text-[16px]" />{f.evolution}</span>}
            {f.note && <p className="mt-2 text-body-sm text-on-surface-variant">{f.note}</p>}
          </div>
        ))}
      </div>
      {block.source && <p className="mt-4 text-body-sm text-on-surface-variant">{block.source}</p>}
    </Section>
  );
}

/* ---------- Grille de cartes */
export function CardsGrid({ block }: P) {
  const cols = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-2 lg:grid-cols-4" }[block.columns as 2 | 3 | 4] ?? "md:grid-cols-3";
  return (
    <Section tone="low">
      <SectionTitle eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
      <div className={`grid grid-cols-1 gap-6 ${cols}`}>
        {block.cards?.map((c: any) => (
          <article key={c.title} className="flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-7 shadow-sm">
            {c.icon && <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-low text-secondary"><Icon name={c.icon} /></span>}
            {c.eyebrow && <span className="mt-5 text-eyebrow uppercase text-secondary">{c.eyebrow}</span>}
            <h3 className="mt-2 text-headline-sm">{c.title}</h3>
            {c.text && <p className="mt-3 flex-1 text-body-md text-on-surface-variant">{c.text}</p>}
            {c.bullets?.length > 0 && (
              <ul className="mt-5 space-y-2 border-t border-outline-variant/30 pt-5">
                {c.bullets.map((b: any) => (
                  <li key={b.text} className="flex items-start gap-2 text-body-sm"><Icon name="check_circle" className="text-[18px] text-secondary" />{b.text}</li>
                ))}
              </ul>
            )}
            {c.link && <div className="mt-5"><ButtonLink link={{ ...c.link, style: "texte" }} /></div>}
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Liste d'étiquettes */
export function TagList({ block }: P) {
  return (
    <Section tone="low">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionTitle eyebrow={block.eyebrow} title={block.title} />
          <RichText content={block.body} />
        </div>
        <div className="flex flex-wrap gap-3">
          {block.tags?.map((t: any) => (
            <span key={t.text} className="rounded-full border border-outline-variant/40 bg-surface-container-lowest px-4 py-2 text-label-md">{t.text}</span>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------- Bandeau d'appel à l'action */
export function CtaBand({ block }: P) {
  return (
    <section className="w-full bg-primary-container py-16 text-on-primary">
      <Container className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h2 className="text-headline-md">{block.title}</h2>
          {block.text && <p className="mt-2 max-w-2xl text-body-md text-on-primary-container">{block.text}</p>}
        </div>
        {block.cta && (
          <ButtonLink link={{ ...block.cta, style: "primaire" }} className="shrink-0 bg-secondary-container! text-on-secondary-container! hover:bg-secondary-fixed!" />
        )}
      </Container>
    </section>
  );
}
