import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Icon } from "@/components/Icon";
import { RichText } from "@/components/RichText";
import { Container } from "@/components/Section";
import { ButtonLink } from "@/components/SmartLink";
import { buildMetadata } from "@/lib/seo";
import { getSolution, getSolutions } from "@/lib/strapi";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getSolutions()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const s = await getSolution(slug);
  return buildMetadata(s?.seo ?? { metaDescription: s?.tagline }, s?.name ?? "Solution", `/solutions/${slug}/`);
}

export default async function SolutionPage({ params }: Props) {
  const { slug } = await params;
  const [s, all] = await Promise.all([getSolution(slug), getSolutions()]);
  if (!s) notFound();
  return (
    <>
      <section className="relative -mt-[116px] w-full overflow-hidden bg-primary-container pb-16 pt-[156px] text-on-primary lg:pb-20">
        <div className="grid-nodes pointer-events-none absolute inset-0 text-white opacity-[0.07]" />
        <Container className="relative">
          <Breadcrumb items={[{ label: "Solutions", href: "/solutions/" }, { label: s.name }]} />
          <span className="mb-6 inline-flex items-center gap-2 rounded-lg bg-secondary-container px-3 py-1 text-eyebrow uppercase text-on-secondary-container">
            <Icon name={s.icon} className="text-[16px]" />Solution
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
              <h2 className="mt-3 text-headline-sm">Points clés</h2>
              <ul className="mt-4 space-y-3">
                {s.keyPoints.map((k) => <li key={k.text} className="flex items-start gap-3 text-label-md"><Icon name="check_circle" className="text-[20px] text-secondary-fixed" />{k.text}</li>)}
              </ul>
              {s.cta && <ButtonLink link={s.cta} className="mt-6 w-full bg-secondary-container! text-on-secondary-container!" />}
            </div>
            <nav aria-label="Toutes nos solutions" className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
              <h2 className="px-4 pb-3 pt-2 font-sans text-eyebrow uppercase text-on-surface-variant">Toutes nos solutions</h2>
              {all.map((o) => (
                <NextLink key={o.slug} href={`/solutions/${o.slug}/`} aria-current={o.slug === s.slug ? "page" : undefined}
                  className={`block rounded-lg px-4 py-2.5 text-body-sm hover:bg-surface-container-low ${o.slug === s.slug ? "bg-surface-container-low font-semibold text-secondary" : "text-on-surface-variant"}`}>{o.name}</NextLink>
              ))}
            </nav>
            <NextLink href="/contact/" className="block rounded-lg border border-outline-variant py-3 text-center text-label-md hover:bg-surface-container-low">Nous contacter</NextLink>
          </aside>
        </Container>
      </section>
    </>
  );
}
