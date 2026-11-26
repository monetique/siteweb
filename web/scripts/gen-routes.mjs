/**
 * Génère les routes de chaque langue : app/(fr)/… (racine du site), app/en/…, app/ar/….
 * Toutes appellent les mêmes vues (src/views) avec leur langue : une seule source à maintenir.
 * Relancer après avoir ajouté une route : node scripts/gen-routes.mjs
 */
import fs from "node:fs";
import path from "node:path";

const APP = path.resolve(import.meta.dirname, "../src/app");
const DIRS = { fr: "(fr)", en: "en", ar: "ar" };
const HEADER = "// Fichier généré par scripts/gen-routes.mjs — ne pas modifier à la main.\n";

const staticRoute = (view, meta, file) => (lang) => [file, `${HEADER}import { ${view}, ${meta} } from "@/views/${file.includes("/") ? "pages" : "pages"}";

export const generateMetadata = () => ${meta}("${lang}");
export default function Page() {
  return <${view} lang="${lang}" />;
}
`];
const dynamicRoute = (module, view, meta, params, file) => (lang) => [file, `${HEADER}import { ${view}, ${meta}, ${params} } from "@/views/${module}";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export const generateStaticParams = ${params};
export async function generateMetadata({ params }: Props) {
  return ${meta}("${lang}", (await params).slug);
}
export default async function Page({ params }: Props) {
  return <${view} lang="${lang}" slug={(await params).slug} />;
}
`];

const ROUTES = [
  staticRoute("HomeView", "homeMetadata", "page.tsx"),
  dynamicRoute("pages", "PageView", "pageMetadata", "pageParams", "[slug]/page.tsx"),
  staticRoute("SolutionsView", "solutionsMetadata", "solutions/page.tsx"),
  dynamicRoute("solution", "SolutionView", "solutionMetadata", "solutionParams", "solutions/[slug]/page.tsx"),
  dynamicRoute("solution", "InnovationView", "innovationMetadata", "innovationParams", "innovations/[slug]/page.tsx"),
  staticRoute("NewsView", "newsMetadata", "actualites/page.tsx"),
  dynamicRoute("article", "ArticleView", "articleMetadata", "articleParams", "actualites/[slug]/page.tsx"),
  staticRoute("TendersView", "tendersMetadata", "appels-offres/page.tsx"),
  dynamicRoute("tender", "TenderView", "tenderMetadata", "tenderParams", "appels-offres/[slug]/page.tsx"),
  (lang) => ["layout.tsx", `${HEADER}import "../globals.css";
import type { ReactNode } from "react";
import { SiteShell, shellMetadata } from "@/views/shell";

export const generateMetadata = () => shellMetadata("${lang}");
export default function Layout({ children }: { children: ReactNode }) {
  return <SiteShell lang="${lang}">{children}</SiteShell>;
}
`],
];

for (const [lang, dir] of Object.entries(DIRS)) {
  const root = path.join(APP, dir);
  fs.rmSync(root, { recursive: true, force: true });
  for (const make of ROUTES) {
    const [file, code] = make(lang);
    const dest = path.join(root, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, code);
  }
}
console.log(`[routes] ${ROUTES.length} routes × ${Object.keys(DIRS).length} langues générées`);
