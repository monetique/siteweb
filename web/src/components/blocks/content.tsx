/* Blocs « éditoriaux » : leur contenu est saisi directement dans la page Strapi. */
import type { Block, Page } from "@/lib/strapi";
import { getLang, t } from "@/lib/lang-server";
import { localizePeriod } from "@/lib/i18n";
import { getIndicateurs, mediaUrl } from "@/lib/strapi";
import { Breadcrumb } from "../Breadcrumb";
import { HeroVisual } from "../HeroVisual";
import { Icon } from "../Icon";
import { RichText } from "../RichText";
import { Container, Eyebrow, Section, SectionTitle } from "../Section";
import { ButtonLink, SmartLink } from "../SmartLink";
import { RotatingWord } from "../RotatingWord";
import { InternationalMap } from "../InternationalMap";

type P = { block: Block; page: Page };

/* ---------- Bannière */
export async function Hero({ block, page }: P) {
  if (block.variant === "accueil") return <HomeHero block={block} />;
  const crumbs = page.parentLabel ? [{ label: page.parentLabel }, { label: page.title }] : [{ label: page.title }];
  return (
    <section className="relative -mt-[116px] w-full overflow-hidden bg-primary-container pb-16 pt-[156px] text-on-primary shadow-md lg:pb-20">
      <div className="grid-nodes pointer-events-none absolute inset-0 text-white opacity-[0.07]" />
      <div className="pointer-events-none absolute -top-32 end-0 h-[540px] w-[540px] rounded-full bg-secondary/20 blur-3xl" />
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
  const d = t();
  const img = mediaUrl(block.image);

  // Titre : partie fixe + mot qui défile (un par ligne dans « rotatingWords »).
  // « {mot} » dans le titre place le mot (ex. EN « {mot} digital payment solutions ») ; sinon il vient à la fin.
  const words: string[] = String(block.rotatingWords ?? "").split("\n").map((w) => w.trim()).filter(Boolean);
  let before: string = block.title;
  let after = "";
  if (words.length) {
    [before, after] = block.title.includes("{mot}") ? block.title.split("{mot}") : [`${block.title} `, ""];
  }
  const title = words.length ? (
    <>{before}<RotatingWord words={words} />{after}</>
  ) : (
    // Ancien format sans mots animés : dernier mot du titre mis en valeur
    <>{block.title.split(" ").slice(0, -1).join(" ")} <span className="text-secondary">{block.title.split(" ").at(-1)}</span></>
  );

  const highlight = block.highlightTitle || block.highlightText ? (
    <>
      <span className="text-label-md leading-relaxed">
        {block.highlightTitle && <strong className="block font-semibold text-on-primary">{block.highlightTitle}</strong>}
        {block.highlightText && <span className="text-on-primary-container">{block.highlightText}</span>}
      </span>
    </>
  ) : null;
  const highlightClass = "flex items-center gap-4 rounded-lg bg-primary-container p-4 shadow-sm lg:p-5";

  return (
    <section className="relative w-full overflow-hidden bg-surface-bright">
      <Container className="grid grid-cols-1 items-center gap-12 py-14 lg:grid-cols-12 lg:gap-16 lg:py-20">
        <div className="lg:col-span-7">
          {(block.eyebrow || block.badge) && (
            <div className="flex flex-wrap items-center gap-3">
              {block.eyebrow && (
                <span className="rounded bg-surface-container px-3 py-1.5 text-eyebrow uppercase text-secondary">{block.eyebrow}</span>
              )}
              {block.badge && <span className="text-label-sm font-semibold text-on-surface-variant">{block.badge}</span>}
            </div>
          )}
          <h1 className="mt-6 text-headline-xl-mobile text-on-surface lg:text-headline-xl">{title}</h1>
          {block.subtitle && <p className="mt-6 max-w-2xl text-body-lg text-on-surface-variant">{block.subtitle}</p>}
          {highlight && (
            <>
              <hr className="my-8 border-outline-variant/40" />
              {block.highlightUrl ? (
                <SmartLink href={block.highlightUrl} className={`${highlightClass} group transition-shadow hover:shadow-md`}>{highlight}</SmartLink>
              ) : (
                <div className={highlightClass}>{highlight}</div>
              )}
            </>
          )}
          {block.ctas?.length > 0 && (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {block.ctas.map((c: any) => (
                <ButtonLink key={c.label} link={c} className={c.style === "secondaire" ? "w-full bg-surface-container-low! hover:bg-surface-container!" : "w-full"} />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          {/* Visuel : photo en haut, fondu vers le bleu nuit, carte « switch national » par-dessus */}
          <div className="relative overflow-hidden rounded-xl bg-primary-container shadow-2xl lg:aspect-[4/4.3]">
            {img && (
              <HeroVisual
                img={img}
                video={mediaUrl(block.video)}
                loop={!!block.videoLoop}
                className="h-60 w-full sm:h-80 lg:absolute lg:inset-x-0 lg:top-0 lg:h-[72%]"
                imgClassName="object-[58%_50%]"
              />
            )}
            <div className="pointer-events-none absolute inset-x-0 top-[9rem] h-24 bg-gradient-to-b from-transparent to-primary-container sm:top-[14rem] lg:top-[44%] lg:h-[30%]" />
            <div className="relative mx-4 -mt-16 mb-4 rounded-lg bg-white/95 p-5 shadow-lg backdrop-blur sm:mx-6 sm:mb-6 lg:absolute lg:inset-x-6 lg:bottom-6 lg:m-0">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-eyebrow uppercase text-secondary">
                  <span className="h-2 w-2 rounded-full bg-secondary" />{d.switchNational}
                </span>
                <span className="shrink-0 whitespace-nowrap rounded bg-surface-container px-2 py-0.5 text-[11px] font-bold tracking-wide text-secondary">PCI DSS</span>
              </div>
              <p className="mt-3 text-label-sm leading-relaxed text-on-surface-variant">{d.switchText}</p>
              {dispo && (
                <div className="mt-4 flex items-end justify-between gap-4 border-t border-outline-variant/40 pt-4">
                  <span className="text-label-sm font-semibold text-on-surface">{d.availability(localizePeriod(dispo.period, getLang()).toLowerCase())}</span>
                  <span className="shrink-0 font-display text-headline-md font-bold text-secondary" dir="ltr">{dispo.displayValue ?? dispo.value} %</span>
                </div>
              )}
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
const COLS: Record<number, string> = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5" };
export function KeyFigures({ block }: P) {
  return (
    <Section tone="surface">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <SectionTitle eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
        {block.cta && <div className="mb-10"><ButtonLink link={{ ...block.cta, style: "texte" }} /></div>}
      </div>
      <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${COLS[block.items?.length] ?? "lg:grid-cols-4"}`}>
        {block.items?.map((f: any) => (
          <div key={f.label} className="flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm lg:p-7">
            <div className="flex items-start justify-between gap-3">
              <span className="pt-1 text-label-sm font-medium text-on-surface">{f.label}</span>
              {f.evolution && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded bg-surface-container px-2 py-1 text-label-sm font-bold text-secondary">
                  <Icon name="trending_up" className="text-[16px]" /><span dir="ltr">{f.evolution}</span>
                </span>
              )}
            </div>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-display text-stat text-on-surface lg:text-[3.5rem]" dir="ltr">{f.value}</span>
              {f.unit && <span className="font-display text-headline-md font-medium text-on-surface-variant">{f.unit}</span>}
            </div>
            {f.note && <p className="mt-auto pt-6 text-body-sm leading-relaxed text-on-surface-variant">{f.note}</p>}
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
    <Section tone="low" id={block.anchor || undefined}>
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
        {block.display === "carte" ? (
          <InternationalMap tags={(block.tags ?? []).map((t: any) => t.text)} />
        ) : (
          <div className="flex flex-wrap gap-3">
            {block.tags?.map((t: any) => (
              <span key={t.text} className="rounded-full border border-outline-variant/40 bg-surface-container-lowest px-4 py-2 text-label-md">{t.text}</span>
            ))}
          </div>
        )}
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
