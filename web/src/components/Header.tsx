"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Global, Navigation } from "@/lib/strapi";
import { Icon } from "./Icon";

function TunisClock() {
  const [time, setTime] = useState<string>("--:--");
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString("fr-FR", { timeZone: "Africa/Tunis", hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return <span suppressHydrationWarning>{time}</span>;
}

const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);

export function Header({ global, nav, logoUrl }: { global: Global; nav: Navigation; logoUrl: string | null }) {
  const pathname = norm(usePathname() || "/");
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");
  const cta = nav.headerCta;

  return (
    <header className="fixed inset-x-0 top-0 z-50 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[60] focus:rounded focus:bg-secondary focus:px-4 focus:py-2 focus:text-on-secondary">
        Aller au contenu
      </a>
      {/* Bandeau supérieur */}
      <div className="border-b border-white/10 bg-primary-container text-on-primary">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6 text-label-sm lg:px-12">
          <div className="flex items-center gap-6 text-on-primary-container">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary-container" />
              Statut du switch : <strong className="font-semibold text-on-primary">{global.statusLabel ?? "Opérationnel"}</strong>
            </span>
            <span className="hidden items-center gap-1.5 md:flex">
              <Icon name="schedule" className="text-[14px]" />Tunis : <TunisClock />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-on-primary" aria-current="true">FR</span>
            <span className="text-white/20">/</span>
            <span lang="ar" className="text-on-primary-container" title="Version arabe à venir">عربي</span>
            <span className="text-white/20">/</span>
            <span lang="en" className="text-on-primary-container" title="Version anglaise à venir">EN</span>
          </div>
        </div>
      </div>

      {/* Barre principale */}
      <div className="border-b border-outline-variant/20 bg-surface-container-lowest/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-6 lg:px-12">
          <NextLink href="/" className="flex shrink-0 items-center" aria-label={`${global.siteName} – Accueil`}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={global.siteName} className="h-12 w-auto" width={120} height={52} />
            ) : (
              <span className="font-display text-headline-sm font-extrabold">{global.siteName}</span>
            )}
          </NextLink>

          <nav aria-label="Navigation principale" className="hidden items-center gap-1 xl:flex">
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
                  <div className="absolute left-0 top-full z-50 hidden pt-2 group-focus-within:block group-hover:block">
                    <div className="w-80 rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-2 shadow-xl">
                      <NextLink href={item.url} className="mb-1 flex items-center justify-between border-b border-outline-variant/30 px-4 py-2.5 text-sm font-semibold hover:text-secondary">
                        Toutes nos solutions <Icon name="east" className="text-[16px]" />
                      </NextLink>
                      {item.children.map((c) => (
                        <NextLink key={c.url} href={c.url}
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
              aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/40 xl:hidden">
              <Icon name={open ? "close" : "menu"} />
            </button>
          </div>
        </div>

        {open && (
          <nav id="menu-mobile" aria-label="Navigation mobile" className="max-h-[calc(100vh-116px)] overflow-y-auto border-t border-outline-variant/30 bg-surface-container-lowest xl:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
              {nav.mainMenu.map((item) =>
                item.children?.length ? (
                  <details key={item.url} className="group" open={isActive(item.url)}>
                    <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-4 py-3 text-label-md">
                      {item.label}<Icon name="expand_more" className="transition-transform group-open:rotate-180" />
                    </summary>
                    <NextLink href={item.url} className="block py-2 pl-8 pr-4 text-sm font-semibold">Toutes nos solutions</NextLink>
                    {item.children.map((c) => (
                      <NextLink key={c.url} href={c.url} className="block py-2 pl-8 pr-4 text-sm text-on-surface-variant hover:text-secondary">{c.label}</NextLink>
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
