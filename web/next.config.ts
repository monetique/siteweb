import type { NextConfig } from "next";

/**
 * Export statique : `next build` produit le dossier `out/` (HTML/CSS/JS) à servir par Nginx.
 * Aucun serveur Node n'est nécessaire pour le site public.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
