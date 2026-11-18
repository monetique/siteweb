import { notFound } from "next/navigation";
import { ContactCard } from "@/components/ContactCard";
import { Countdown } from "@/components/Countdown";
import { DetailBar } from "@/components/DetailBar";
import { Documents } from "@/components/Documents";
import { Icon } from "@/components/Icon";
import { NewsCard } from "@/components/NewsCard";
import { RichText } from "@/components/RichText";
import { Container } from "@/components/Section";
import { getNewsItems } from "@/components/blocks/data";
import { formatDate, formatDateTime, TENDER_STATUS, TENDER_TYPE } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import { getAppelOffres, getAppelsOffres } from "@/lib/strapi";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getAppelsOffres()).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const t = await getAppelOffres(slug);
  return buildMetadata(t?.seo?.metaTitle ? t.seo : { ...t?.seo, metaTitle: t?.title?.slice(0, 70), metaDescription: t?.summary }, t?.title ?? "Appel d'offres", `/appels-offres/${slug}/`);
}

function Info({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surface-container-low p-4">
      <Icon name={icon} className="text-secondary" />
      <div><span className="block text-label-sm uppercase text-on-surface-variant">{label}</span><span className="text-body-md font-semibold">{children}</span></div>
    </div>
  );
}

export default async function AppelOffresPage({ params }: Props) {
  const { slug } = await params;
  const t = await getAppelOffres(slug);
  if (!t) notFound();
  const others = (await getNewsItems("appels_offres")).filter((i) => !i.href.includes(`/${t.slug}`)).slice(0, 3);
  const open = t.tenderStatus === "ouvert";
  return (
    <>
      <DetailBar crumbs={[{ label: "Actualités", href: "/actualites/" }, { label: "Appels d'offres", href: "/appels-offres/" }, { label: t.reference || t.title }]}
        back={{ label: "Tous les appels d'offres", href: "/appels-offres/" }} />
      <section className="w-full py-12 lg:py-16">
        <Container>
          <div className="flex flex-wrap items-center gap-2 text-label-sm">
            <span className="rounded bg-primary-container px-2 py-1 text-eyebrow uppercase text-secondary-fixed">{TENDER_TYPE[t.type]}</span>
            {t.issuer && <span className="rounded bg-surface-container px-2 py-1 text-eyebrow uppercase text-secondary">{t.issuer}</span>}
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${open ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-high text-on-surface-variant"}`}>
              Statut : {TENDER_STATUS[t.tenderStatus]}
            </span>
          </div>
          <h1 className="mt-5 max-w-5xl text-headline-lg-mobile lg:text-headline-lg">{t.title}</h1>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.reference && <Info icon="tag" label="Référence">{t.reference}</Info>}
            <Info icon="event" label="Publication">{formatDate(t.publicationDate)}</Info>
            {t.deadline && <Info icon="event_busy" label="Date limite">{formatDateTime(t.deadline)}</Info>}
            {t.documentCost && <Info icon="payments" label="Cahier des charges">{t.documentCost}</Info>}
          </div>
          {t.deadline && (
            <div className={`mt-6 flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between ${open ? "bg-secondary-container/30" : "bg-surface-container-low"}`}>
              <div className="flex items-start gap-3">
                <Icon name="schedule" className="text-secondary" />
                <p className="text-body-md">La date limite de réception est fixée au <strong>{formatDateTime(t.deadline)}</strong> (heure de Tunis). La date du cachet du bureau d’ordre central fait foi.</p>
              </div>
              <Countdown deadline={t.deadline} />
            </div>
          )}
        </Container>
      </section>
      <section className="w-full pb-16">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <article className="lg:col-span-8">
            <RichText content={t.content} className="text-body-lg" />
          </article>
          <aside className="flex flex-col gap-6 self-start lg:sticky lg:top-36 lg:col-span-4">
            <div className="space-y-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-sans text-label-md uppercase tracking-wider"><Icon name="assured_workload" className="text-[20px] text-secondary" />Informations pratiques</h2>
              {t.documentRetrieval && <div><span className="block text-label-sm text-on-surface">Retrait du dossier</span><p className="mt-1 text-body-sm text-on-surface-variant">{t.documentRetrieval}</p></div>}
              {t.submissionAddress && <div><span className="block text-label-sm text-on-surface">Dépôt des offres</span><p className="mt-1 text-body-sm text-on-surface-variant">{t.submissionAddress}</p></div>}
              {t.offerValidityDays && <div><span className="block text-label-sm text-on-surface">Validité des offres</span><p className="mt-1 text-body-sm text-on-surface-variant">{t.offerValidityDays} jours à compter du lendemain de la date limite</p></div>}
            </div>
            <Documents files={t.documents} />
            <ContactCard />
          </aside>
        </Container>
      </section>
      {others.length > 0 && (
        <section className="w-full bg-surface-container-low py-16">
          <Container>
            <h2 className="mb-8 text-headline-md">Autres avis</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">{others.map((i) => <NewsCard key={i.href} item={i} />)}</div>
          </Container>
        </section>
      )}
    </>
  );
}
