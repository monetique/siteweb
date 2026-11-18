import path from "node:path";
import type { NextConfig } from "next";

/**
 * Export statique : `next build` produit le dossier `out/` (HTML/CSS/JS) à servir par Nginx.
 * Aucun serveur Node n'est nécessaire pour le site public.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Page 404 commune aux trois langues (plusieurs mises en page racine : une par langue)
  experimental: { globalNotFound: true },
  turbopack: {
    root: path.resolve(__dirname), // dépôt à plusieurs projets : la racine du site est ce dossier
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
