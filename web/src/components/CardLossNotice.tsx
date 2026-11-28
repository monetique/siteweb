import { getLang, t } from "@/lib/lang-server";
import { localizePath } from "@/lib/i18n";
import { getGlobal } from "@/lib/strapi";
import { Container } from "./Section";
import { Icon } from "./Icon";

/** Rubrique « Carte bancaire » de la FAQ, qui détaille la démarche d'opposition. */
const FAQ_CARD_PATH = "/faq/#faq-carte_bancaire";

/**
 * Encart « Carte perdue ou volée ? » sous la bannière d'accueil : première raison de visite d'un particulier.
 * Numéro du centre d'appel lu dans les réglages généraux du CMS ; sans numéro renseigné, l'encart n'est pas affiché.
 */
export async function CardLossNotice() {
  const g = await getGlobal();
  const phone = g.phoneCallCenter?.trim();
  if (!phone) return null;
  const d = t();
  const lang = getLang();

  return (
    <Container className="pb-14 lg:pb-20">
      <aside
        aria-labelledby="card-loss-title"
        className="flex flex-col gap-5 rounded-xl border border-error/20 border-s-4 border-s-error bg-surface-container-lowest p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between lg:p-6"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-error-container text-error">
            <Icon name="credit_card" className="text-[22px]" />
          </span>
          <div>
            <h2 id="card-loss-title" className="text-label-md font-semibold text-on-surface lg:text-[1.05rem]">{d.cardLossTitle}</h2>
            <p className="mt-1 max-w-2xl text-label-sm leading-relaxed text-on-surface-variant">{d.cardLossText}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-error px-5 py-3 text-label-md font-semibold text-white transition hover:bg-error/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
          >
            <Icon name="call" className="text-[18px]" />
            <span dir="ltr">{phone}</span>
          </a>
          <a href={localizePath(FAQ_CARD_PATH, lang)} className="inline-flex items-center gap-1 text-label-sm font-semibold text-secondary hover:underline">
            {d.cardLossMore}<Icon name="arrow_forward" className="text-[16px]" />
          </a>
        </div>
      </aside>
    </Container>
  );
}
