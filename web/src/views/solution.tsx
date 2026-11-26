import { L as NextLink } from "@/components/LangProvider";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Icon } from "@/components/Icon";
import { RichText } from "@/components/RichText";
import { Container } from "@/components/Section";
import { ButtonLink } from "@/components/SmartLink";
import { buildMetadata } from "@/lib/seo";
import { getInnovation, getInnovations, getSolution, getSolutions } from "@/lib/strapi";
import { dictOf, type Lang } from "@/lib/i18n";
import { setLang } from "@/lib/lang-server";

/** Même gabarit pour les solutions (/solutions/…) et les innovations de l'accueil (/innovations/…). */
type Kind = "solution" | "innovation";
type Dict = ReturnType<typeof dictOf>;
const KIND = {
  solution: { base: "/solutions/", one: getSolution, all: getSolutions,
    labels: (d: Dict) => ({ list: d.solutions, one: d.solution, all: d.allOurSolutions, listHref: "/solutions/" }) },
  innovation: { base: "/innovations/", one: getInnovation, all: getInnovations,
    labels: (d: Dict) => ({ list: d.innovations, one: d.innovation, all: d.allOurInnovations, listHref: "/#innovations" }) },
};

export async function solutionParams() {
  return (await getSolutions()).map((s) => ({ slug: s.slug }));
}
export async function innovationParams() {
  return (await getInnovations()).map((s) => ({ slug: s.slug }));
}

export async function solutionMetadata(lang: Lang, slug: string, kind: Kind = "solution") {
  setLang(lang);
  const k = KIND[kind], s = await k.one(slug);
  return buildMetadata(s?.seo ?? { metaDescription: s?.tagline }, s?.name ?? k.labels(dictOf(lang)).one, `${k.base}${slug}/`);
}
export const innovationMetadata = (lang: Lang, slug: string) => solutionMetadata(lang, slug, "innovation");

export async function InnovationView({ lang, slug }: { lang: Lang; slug: string }) {
  return SolutionView({ lang, slug, kind: "innovation" });
}

export async function SolutionView({ lang, slug, kind = "solution" }: { lang: Lang; slug: string; kind?: Kind }) {
  setLang(lang);
  const d = dictOf(lang);
  const k = KIND[kind], lb = k.labels(d);
  const [s, all] = await Promise.all([k.one(slug), k.all()]);
  if (!s) notFound();
  return (
    <>
      <section className="relative -mt-[116px] w-full overflow-hidden bg-primary-container pb-16 pt-[156px] text-on-primary lg:pb-20">
        <div className="grid-nodes pointer-events-none absolute inset-0 text-white opacity-[0.07]" />
        <Container className="relative">
          <Breadcrumb items={[{ label: lb.list, href: lb.listHref }, { label: s.name }]} />
          <span className="mb-6 inline-flex items-center gap-2 rounded-lg bg-secondary-container px-3 py-1 text-eyebrow uppercase text-on-secondary-container">
            <Icon name={s.icon} className="text-[16px]" />{lb.one}
          </span>
          <h1 className="max-w-4xl text-headline-xl-mobile lg:text-headline-xl">{s.name}</h1>
          {s.tagline && <p className="mt-4 max-w-2xl text-body-lg text-on-primary-container">{s.tagline}</p>}
        </Container>
      </section>

      <section className="w-full py-16 lg:py-20">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <article className="flex flex-col gap-10 lg:col-span-8">
            {s.sections.map((sec) => (
              <div key={sec.title} className="space-y-4">
                <div className="flex items-center gap-3"><span className="h-6 w-1.5 rounded-full bg-secondary" /><h2 className="text-headline-md">{sec.title}</h2></div>
                <RichText content={sec.body} className="text-body-lg" />
              </div>
            ))}
          </article>
          <aside className="flex flex-col gap-6 self-start lg:sticky lg:top-36 lg:col-span-4">
            <div className="rounded-xl bg-primary-container p-6 text-on-primary">
              <Icon name={s.icon} className="text-[32px] text-secondary-fixed" />
              <h2 className="mt-3 text-headline-sm">{d.keyPoints}</h2>
              <ul className="mt-4 space-y-3">
                {s.keyPoints.map((k) => <li key={k.text} className="flex items-start gap-3 text-label-md"><Icon name="check_circle" className="text-[20px] text-secondary-fixed" />{k.text}</li>)}
              </ul>
              {s.cta && <ButtonLink link={s.cta} className="mt-6 w-full bg-secondary-container! text-on-secondary-container!" />}
            </div>
            <nav aria-label={lb.all} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
              <h2 className="px-4 pb-3 pt-2 font-sans text-eyebrow uppercase text-on-surface-variant">{lb.all}</h2>
              {all.map((o) => (
                <NextLink key={o.slug} href={`${k.base}${o.slug}/`} aria-current={o.slug === s.slug ? "page" : undefined}
                  className={`block rounded-lg px-4 py-2.5 text-body-sm hover:bg-surface-container-low ${o.slug === s.slug ? "bg-surface-container-low font-semibold text-secondary" : "text-on-surface-variant"}`}>{o.name}</NextLink>
              ))}
            </nav>
            <NextLink href="/contact/" className="block rounded-lg border border-outline-variant py-3 text-center text-label-md hover:bg-surface-container-low">{d.contactUs}</NextLink>
          </aside>
        </Container>
      </section>
    </>
  );
}
