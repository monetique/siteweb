import type { Metadata } from "next";
import NextLink from "next/link";

export const metadata: Metadata = { title: "Page introuvable", robots: { index: false } };

export default function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-32 text-center">
      <span className="text-eyebrow uppercase text-secondary">Erreur 404</span>
      <h1 className="mt-4 text-headline-lg">Page introuvable</h1>
      <p className="mt-4 text-body-lg text-on-surface-variant">La page demandée n’existe pas ou a été déplacée.</p>
      <NextLink href="/" className="mt-8 inline-flex rounded-lg bg-secondary px-6 py-3 text-label-md text-on-secondary">Retour à l’accueil</NextLink>
    </section>
  );
}
