import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getGlobal, getNavigation, mediaUrl } from "@/lib/strapi";
import { jsonLd } from "@/lib/safe";

export async function generateMetadata(): Promise<Metadata> {
  const g = await getGlobal();
  return {
    metadataBase: new URL(process.env.SITE_URL || "https://www.monetiquetunisie.com"),
    title: { default: g.defaultSeo?.metaTitle || g.siteName, template: `%s | ${g.siteName}` },
    description: g.defaultSeo?.metaDescription,
    icons: mediaUrl(g.favicon) ? { icon: mediaUrl(g.favicon)! } : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [global, nav] = await Promise.all([getGlobal(), getNavigation()]);
  const logoUrl = mediaUrl(global.logo);
  const orgLd = {
    "@context": "https://schema.org", "@type": "Organization", name: global.siteName, description: global.tagline,
    url: process.env.SITE_URL || "https://www.monetiquetunisie.com", logo: logoUrl ?? undefined, email: global.emailContact,
    telephone: global.phoneHeadquarters,
    address: { "@type": "PostalAddress", streetAddress: "Centre urbain Nord, Sana Center, bloc C", postalCode: "1082", addressLocality: "Tunis", addressCountry: "TN" },
    contactPoint: [{ "@type": "ContactPoint", contactType: "customer service", telephone: global.phoneCallCenter, availableLanguage: ["fr", "ar"], hoursAvailable: "Mo-Su 00:00-23:59" }],
    sameAs: global.socialLinks.map((s) => s.url),
  };
  return (
    <html lang="fr">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(orgLd) }} />
        <Header global={global} nav={nav} logoUrl={logoUrl} />
        <main id="contenu" className="w-full pt-[116px]">{children}</main>
        <Footer global={global} nav={nav} logoUrl={logoUrl} />
      </body>
    </html>
  );
}
