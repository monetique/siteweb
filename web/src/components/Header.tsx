"use client";

import { L as NextLink } from "@/components/LangProvider";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Global, Navigation } from "@/lib/strapi";
import { INTL, LANG_LABEL, LANG_NAME, LANGS, localizePath, stripLang, type Lang } from "@/lib/i18n";
import { useDict, useLang } from "./LangProvider";
import { Icon } from "./Icon";

function TunisClock({ lang }: { lang: Lang }) {
  const [time, setTime] = useState<string>("--:--");
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString(INTL[lang], { timeZone: "Africa/Tunis", hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [lang]);
  return <span suppressHydrationWarning dir="ltr">{time}</span>;
}

const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);

export function Header({ global, nav, logoUrl }: { global: Global; nav: Navigation; logoUrl: string | null }) {
  const lang = useLang();
  const d = useDict();
  const rawPath = usePathname() || "/";
  const pathname = norm(stripLang(rawPath));
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");
  // Libellé du lien « vue d'ensemble » en tête de chaque menu déroulant
  const overview = (url: string) => (url === "/expertise" ? d.allExpertise : d.allSolutions);
  // Après un clic dans un menu déroulant (ancre sur la même page comprise), on le referme
  const closeDropdown = () => (document.activeElement as HTMLElement | null)?.blur();
  const cta = nav.headerCta;

  return (
    <header className="fixed inset-x-0 top-0 z-50 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-[60] focus:rounded focus:bg-secondary focus:px-4 focus:py-2 focus:text-on-secondary">
        {d.skipToContent}
      </a>
      {/* Bandeau supérieur */}
      <div className="border-b border-white/10 bg-primary-container text-on-primary">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6 text-label-sm lg:px-12">
          <div className="flex items-center gap-6 text-on-primary-container">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary-container" />
              {d.switchStatus} <strong className="font-semibold text-on-primary">{global.statusLabel ?? d.statusDefault}</strong>
            </span>
            <span className="hidden items-center gap-1.5 md:flex">
              <Icon name="schedule" className="text-[14px]" />{d.tunisTime} <TunisClock lang={lang} />
            </span>
          </div>
          <nav aria-label={d.languages} className="flex items-center gap-2">
            {LANGS.map((l, i) => (
              <span key={l} className="flex items-center gap-2">
                {i > 0 && <span className="text-white/20" aria-hidden="true">/</span>}
                {l === lang ? (
                  <span lang={l} className="font-bold text-on-primary" aria-current="true" title={LANG_NAME[l]}>{LANG_LABEL[l]}</span>
                ) : (
                  <a href={localizePath(stripLang(rawPath), l)} lang={l} hrefLang={l} title={LANG_NAME[l]} className="text-on-primary-container transition-colors hover:text-on-primary">{LANG_LABEL[l]}</a>
                )}
              </span>
            ))}
          </nav>
        </div>
      </div>

      {/* Barre principale */}
      <div className="border-b border-outline-variant/20 bg-surface-container-lowest/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-6 lg:px-12">
          <NextLink href="/" className="flex shrink-0 items-center" aria-label={`${global.siteName} – ${d.homeAria}`}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={global.siteName} className="h-12 w-auto" width={120} height={52} />
            ) : (
              <span className="font-display text-headline-sm font-extrabold">{global.siteName}</span>
            )}
          </NextLink>

          <nav aria-label={d.mainNav} className="hidden items-center gap-1 xl:flex">
            {nav.mainMenu.map((item) =>
              item.children?.length ? (
                <div key={item.url} className="group relative">
                  <NextLink
                    href={item.url}
                    aria-current={isActive(item.url) ? "page" : undefined}
                    className={`flex items-center gap-1 rounded-lg px-3 py-2 text-label-md transition-colors ${isActive(item.url) ? "bg-surface-container-low font-semibold text-secondary" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}`}
                  >
                    {item.label}
                    <Icon name="expand_more" className="text-[16px] transition-transform group-hover:rotate-180" />
                  </NextLink>
                  <div className="absolute start-0 top-full z-50 hidden pt-2 group-focus-within:block group-hover:block">
                    <div className="w-80 rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-2 shadow-xl">
                      <NextLink href={item.url} onClick={closeDropdown} className="mb-1 flex items-center justify-between border-b border-outline-variant/30 px-4 py-2.5 text-sm font-semibold hover:text-secondary">
                        {overview(item.url)} <Icon name="east" className="text-[16px]" />
                      </NextLink>
                      {item.children.map((c) => (
                        <NextLink key={c.url} href={c.url} onClick={closeDropdown}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-surface-container hover:text-secondary ${isActive(c.url) ? "font-semibold text-secondary" : "text-on-surface"}`}>
                          <Icon name={c.icon} className="text-[18px] text-secondary" />{c.label}
                        </NextLink>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <NextLink key={item.url} href={item.url} aria-current={isActive(item.url) ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-label-md transition-colors ${isActive(item.url) ? "bg-surface-container-low font-semibold text-secondary" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}`}>
                  {item.label}
                </NextLink>
              ),
            )}
          </nav>

          <div className="flex items-center gap-3">
            {cta && (
              <NextLink href={cta.url} aria-current={isActive(cta.url) ? "page" : undefined}
                className={`hidden items-center gap-2 rounded-lg px-5 py-2.5 text-label-md text-on-secondary transition-colors md:inline-flex ${isActive(cta.url) ? "bg-primary-container" : "bg-secondary hover:bg-on-secondary-fixed-variant"}`}>
                <Icon name={cta.icon ?? "mail"} className="text-[18px]" />{cta.label}
              </NextLink>
            )}
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="menu-mobile"
              aria-label={open ? d.closeMenu : d.openMenu}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/40 xl:hidden">
              <Icon name={open ? "close" : "menu"} />
            </button>
          </div>
        </div>

        {open && (
          <nav id="menu-mobile" aria-label={d.mobileNav} className="max-h-[calc(100vh-116px)] overflow-y-auto border-t border-outline-variant/30 bg-surface-container-lowest xl:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
              {nav.mainMenu.map((item) =>
                item.children?.length ? (
                  <details key={item.url} className="group" open={isActive(item.url)}>
                    <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-4 py-3 text-label-md">
                      {item.label}<Icon name="expand_more" className="transition-transform group-open:rotate-180" />
                    </summary>
                    <NextLink href={item.url} onClick={() => setOpen(false)} className="block py-2 ps-8 pe-4 text-sm font-semibold">{overview(item.url)}</NextLink>
                    {item.children.map((c) => (
                      <NextLink key={c.url} href={c.url} onClick={() => setOpen(false)} className="block py-2 ps-8 pe-4 text-sm text-on-surface-variant hover:text-secondary">{c.label}</NextLink>
                    ))}
                  </details>
                ) : (
                  <NextLink key={item.url} href={item.url}
                    className={`rounded-lg px-4 py-3 text-label-md ${isActive(item.url) ? "bg-surface-container-low text-secondary" : ""}`}>
                    {item.label}
                  </NextLink>
                ),
              )}
              {cta && (
                <NextLink href={cta.url} className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-3 text-label-md text-on-secondary">
                  <Icon name={cta.icon ?? "mail"} className="text-[18px]" />{cta.label}
                </NextLink>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
