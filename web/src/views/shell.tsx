import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { HideOnHome } from "@/components/HideOnHome";
import { PartnersRibbon } from "@/components/blocks/data";
import { Header } from "@/components/Header";
import { LangProvider } from "@/components/LangProvider";
import { dirOf, dictOf, type Lang } from "@/lib/i18n";
import { setLang } from "@/lib/lang-server";
import { jsonLd } from "@/lib/safe";
import { getGlobal, getNavigation, mediaUrl } from "@/lib/strapi";

const SITE = process.env.SITE_URL || "https://www.monetiquetunisie.com";

export async function shellMetadata(lang: Lang): Promise<Metadata> {
  setLang(lang);
  const g = await getGlobal();
  return {
    metadataBase: new URL(SITE),
    title: { default: g.defaultSeo?.metaTitle || g.siteName, template: `%s | ${g.siteName}` },
    description: g.defaultSeo?.metaDescription,
    icons: mediaUrl(g.favicon) ? { icon: mediaUrl(g.favicon)! } : undefined,
  };
}

/** Mise en page racine d'une langue : <html lang dir>, en-tête, pied de page, bandeau partenaires. */
export async function SiteShell({ lang, children }: { lang: Lang; children: ReactNode }) {
  setLang(lang);
  const [global, nav] = await Promise.all([getGlobal(), getNavigation()]);
  const d = dictOf(lang);
  const logoUrl = mediaUrl(global.logo);
  const orgLd = {
    "@context": "https://schema.org", "@type": "Organization", name: global.siteName, description: global.tagline,
    url: SITE, logo: logoUrl ?? undefined, email: global.emailContact, telephone: global.phoneHeadquarters,
    address: { "@type": "PostalAddress", streetAddress: "Centre urbain Nord, Sana Center, bloc C", postalCode: "1082", addressLocality: "Tunis", addressCountry: "TN" },
    contactPoint: [{ "@type": "ContactPoint", contactType: "customer service", telephone: global.phoneCallCenter, availableLanguage: ["fr", "ar", "en"], hoursAvailable: "Mo-Su 00:00-23:59" }],
    sameAs: global.socialLinks.map((s) => s.url),
  };
  return (
    <html lang={lang} dir={dirOf(lang)} data-scroll-behavior="smooth">
      <body>
        <LangProvider lang={lang}>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(orgLd) }} />
          <Header global={global} nav={nav} logoUrl={logoUrl} />
          <main id="contenu" className="w-full pt-[116px]">{children}</main>
          <HideOnHome>
            <PartnersRibbon block={{ __component: "blocks.partners-ribbon", id: 0, title: d.partnersInner, variant: "pastilles", showAllLink: true }} />
          </HideOnHome>
          <Footer global={global} nav={nav} logoUrl={logoUrl} />
        </LangProvider>
      </body>
    </html>
  );
}
