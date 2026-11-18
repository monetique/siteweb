"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { stripLang } from "@/lib/i18n";

/** Affiche son contenu partout sauf sur l'accueil (qui a sa propre version du bandeau) et la page Partenaires (qui les liste tous). */
export function HideOnHome({ children }: { children: ReactNode }) {
  const path = stripLang(usePathname() || "/");
  return path === "/" || path?.startsWith("/partenaires") ? null : <>{children}</>;
}
