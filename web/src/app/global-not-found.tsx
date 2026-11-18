import "./globals.css";
import type { Metadata } from "next";
import { DICT, LANG_NAME, localizePath, LANGS } from "@/lib/i18n";

export const metadata: Metadata = { title: "Page introuvable · Page not found · الصفحة غير موجودة", robots: { index: false } };

/** Page 404 commune aux trois langues (adresse inconnue : la langue du visiteur n'est pas connue). */
export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body className="flex min-h-screen items-center bg-surface">
        <main className="mx-auto grid max-w-5xl gap-10 px-6 py-24 md:grid-cols-3">
          {LANGS.map((lang) => {
            const d = DICT[lang];
            return (
              <section key={lang} lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center shadow-sm">
                <span className="text-eyebrow uppercase text-secondary">{d.error404} · {LANG_NAME[lang]}</span>
                <h1 className="mt-4 text-headline-md">{d.notFoundTitle}</h1>
                <p className="mt-3 text-body-md text-on-surface-variant">{d.notFoundText}</p>
                <a href={localizePath("/", lang)} className="mt-6 inline-flex rounded-lg bg-secondary px-5 py-3 text-label-md text-on-secondary">{d.backHome}</a>
              </section>
            );
          })}
        </main>
      </body>
    </html>
  );
}
