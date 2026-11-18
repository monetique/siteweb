import { L as NextLink } from "@/components/LangProvider";
import type { ReactNode } from "react";
import type { Link } from "@/lib/strapi";
import { Icon } from "./Icon";
import { safeHref } from "@/lib/safe";

const isExternal = (url: string) => /^(https?:|mailto:|tel:)/.test(url);

export function SmartLink({ href: rawHref, className, children, ...rest }: { href: string; className?: string; children: ReactNode; [k: string]: unknown }) {
  const href = safeHref(rawHref);
  if (isExternal(href)) {
    const blank = href.startsWith("http");
    return (
      <a href={href} className={className} {...(blank ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <NextLink href={href} className={className} {...rest}>
      {children}
    </NextLink>
  );
}

const STYLES = {
  primaire: "bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant",
  secondaire: "bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-low",
  texte: "text-secondary hover:underline px-0!",
} as const;

/** Bouton issu d'un composant « Lien » de Strapi. */
export function ButtonLink({ link, className = "", dark = false }: { link?: Link | null; className?: string; dark?: boolean }) {
  if (!link?.url) return null;
  const style = link.style ?? "primaire";
  const variant = dark && style === "secondaire" ? "border border-white/30 text-on-primary hover:bg-white/10" : STYLES[style];
  return (
    <SmartLink
      href={link.url}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3.5 font-sans text-label-md transition-colors ${variant} ${className}`}
    >
      {link.icon && <Icon name={link.icon} className="text-[18px]" />}
      {link.label}
      {style === "texte" && <Icon name="east" className="text-[16px]" />}
    </SmartLink>
  );
}
