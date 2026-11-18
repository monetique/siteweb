import { L as NextLink } from "@/components/LangProvider";
import type { Global, Navigation } from "@/lib/strapi";
import { Icon } from "./Icon";
import { SmartLink } from "./SmartLink";
import { BackToTop } from "./BackToTop";
import { t } from "@/lib/lang-server";

export function Footer({ global, nav, logoUrl }: { global: Global; nav: Navigation; logoUrl: string | null }) {
  const d = t();
  return (
    <footer className="w-full border-t border-white/10 bg-primary-container pb-8 pt-16 text-on-primary">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-14 md:grid-cols-2 lg:grid-cols-5">
          {nav.footerColumns.map((col, i) => (
            <div key={col.title}>
              {i === 0 && logoUrl && (
                <NextLink href="/" className="mb-6 inline-flex rounded-xl bg-white px-4 py-3 shadow-sm" aria-label={`${global.siteName} – ${d.homeAria}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt={global.siteName} className="h-10 w-auto" width={100} height={43} />
                </NextLink>
              )}
              <h2 className="mb-4 font-sans text-label-md uppercase tracking-wider text-on-primary">{col.title}</h2>
              <ul className="space-y-2.5 text-body-sm text-on-primary-container">
                {col.links.map((l) => (
                  <li key={l.url + l.label}><SmartLink href={l.url} className="transition-colors hover:text-on-primary">{l.label}</SmartLink></li>
                ))}
              </ul>
              {i === 0 && (
                <div className="mt-6 border-t border-white/10 pt-4">
                  {global.accreditation && <span className="mb-2 block text-label-sm text-on-primary">{global.accreditation}</span>}
                  <div className="flex flex-wrap gap-2">
                    {global.certifications.map((c) => (
                      <span key={c.text} className="rounded bg-white/10 px-2 py-0.5 text-eyebrow text-secondary-fixed">{c.text}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div>
            <h2 className="mb-4 font-sans text-label-md uppercase tracking-wider text-on-primary">{d.contact}</h2>
            <ul className="space-y-3 text-body-sm text-on-primary-container">
              {global.address && <li className="flex items-start gap-2"><Icon name="location_on" className="text-[18px] text-secondary-fixed" />{global.address}</li>}
              {global.phoneCallCenter && (
                <li className="flex items-start gap-2"><Icon name="support_agent" className="text-[18px] text-secondary-fixed" />
                  <span><a href={`tel:${global.phoneCallCenter.replace(/\s/g, "")}`} className="hover:text-on-primary">{global.phoneCallCenter}</a><br /><span className="text-[12px]">{d.callCenter247}</span></span></li>
              )}
              {global.phoneGreenNumber && (
                <li className="flex items-start gap-2"><Icon name="call" className="text-[18px] text-secondary-fixed" />
                  <span><a href={`tel:${global.phoneGreenNumber.replace(/\s/g, "")}`} className="hover:text-on-primary">{global.phoneGreenNumber}</a> <span className="text-[12px]">({d.greenNumber})</span></span></li>
              )}
              {global.emailContact && (
                <li className="flex items-start gap-2"><Icon name="mail" className="text-[18px] text-secondary-fixed" />
                  <a href={`mailto:${global.emailContact}`} className="break-all hover:text-on-primary">{global.emailContact}</a></li>
              )}
            </ul>
            <NextLink href="/contact" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-secondary-container px-4 py-2.5 text-label-md text-on-secondary-container">
              {d.writeToUs} <Icon name="east" className="text-[16px]" />
            </NextLink>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4 pt-8 text-body-sm text-on-primary-container md:flex-row md:items-center">
          <span>{nav.copyright}</span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {nav.legalLinks.map((l) => (
              <SmartLink key={l.label} href={l.url} className="transition-colors hover:text-on-primary">{l.label}</SmartLink>
            ))}
          </div>
        </div>
      </div>
      <BackToTop />
    </footer>
  );
}
