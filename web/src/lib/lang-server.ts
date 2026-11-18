import { cache } from "react";
import { DEFAULT_LANG, dictOf, localizePath, type Lang } from "./i18n";

/**
 * Langue de la page en cours de génération (côté serveur uniquement).
 * Chaque mise en page racine et chaque page la fixent dès leur premier appel ; tous les composants serveur
 * et la couche de données la relisent ensuite. `cache` de React la limite à la génération d'une seule page.
 */
const store = cache(() => ({ lang: DEFAULT_LANG as Lang }));
export const setLang = (lang: Lang) => { store().lang = lang; };
export const getLang = (): Lang => store().lang;
export const t = () => dictOf(getLang());
export const lp = (href: string) => localizePath(href, getLang());
