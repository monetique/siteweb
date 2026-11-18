"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Affiche son contenu partout sauf sur l'accueil (qui a sa propre version du bandeau). */
export function HideOnHome({ children }: { children: ReactNode }) {
  return usePathname() === "/" ? null : <>{children}</>;
}
