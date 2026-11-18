import NextLink from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumb({ items, dark = true }: { items: Crumb[]; dark?: boolean }) {
  const all: Crumb[] = [{ label: "Accueil", href: "/" }, ...items];
  return (
    <nav aria-label="Fil d'Ariane" className={`mb-6 flex flex-wrap items-center gap-2 text-label-md ${dark ? "text-on-primary-container" : "text-on-surface-variant"}`}>
      {all.map((c, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className={dark ? "text-white/40" : "text-outline-variant"}>/</span>}
          {c.href && i < all.length - 1 ? (
            <NextLink href={c.href} className={dark ? "hover:text-on-primary" : "hover:text-secondary"}>{c.label}</NextLink>
          ) : (
            <span aria-current="page" className={`font-semibold ${dark ? "text-secondary-fixed" : "text-on-surface"}`}>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
