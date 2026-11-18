import NextLink from "next/link";
import { Icon } from "./Icon";

/** Barre claire des pages de détail : fil d'Ariane + lien retour. */
export function DetailBar({ crumbs, back }: { crumbs: { label: string; href?: string }[]; back: { label: string; href: string } }) {
  const all = [{ label: "Accueil", href: "/" }, ...crumbs];
  return (
    <section className="w-full border-b border-outline-variant/30 bg-surface-container-low">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-6 py-5 sm:flex-row sm:items-center lg:px-12">
        <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-2 text-label-sm text-on-surface-variant">
          {all.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-outline-variant">/</span>}
              {c.href && i < all.length - 1 ? <NextLink href={c.href} className="hover:text-secondary">{c.label}</NextLink>
                : <span aria-current="page" className="line-clamp-1 font-semibold text-on-surface">{c.label}</span>}
            </span>
          ))}
        </nav>
        <NextLink href={back.href} className="group inline-flex shrink-0 items-center gap-1.5 text-label-md text-secondary">
          <Icon name="arrow_back" className="text-[18px] transition-transform group-hover:-translate-x-1" />{back.label}
        </NextLink>
      </div>
    </section>
  );
}
