"use client";
import NextLink from "next/link";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { DEFAULT_LANG, dictOf, localizePath, type Lang } from "@/lib/i18n";

const LangContext = createContext<Lang>(DEFAULT_LANG);

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}
export const useLang = () => useContext(LangContext);
export const useDict = () => dictOf(useContext(LangContext));

/** Lien interne : ajoute automatiquement le préfixe de langue (/en/, /ar/) à une adresse du site. */
export function L({ href, ...rest }: ComponentProps<typeof NextLink> & { href: string }) {
  const lang = useContext(LangContext);
  return <NextLink href={localizePath(href, lang)} {...rest} />;
}
