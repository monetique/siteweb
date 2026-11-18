// Fichier généré par scripts/gen-routes.mjs — ne pas modifier à la main.
import "../globals.css";
import type { ReactNode } from "react";
import { SiteShell, shellMetadata } from "@/views/shell";

export const generateMetadata = () => shellMetadata("fr");
export default function Layout({ children }: { children: ReactNode }) {
  return <SiteShell lang="fr">{children}</SiteShell>;
}
