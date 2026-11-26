/**
 * Lecture du contenu depuis Drupal (API JSON:API, lecture seule).
 *
 * Renvoie exactement les mêmes objets que l'ancienne couche Strapi (mêmes noms de champs) :
 * les pages et composants du site n'ont pas à connaître le CMS utilisé. La correspondance
 * des champs vient de drupal-model.json (généré depuis les schémas, voir drupal-src/smt_site/model).
 */
import { DEFAULT_LANG } from "../i18n";
import { getLang } from "../lang-server";
import { htmlToBlocks } from "./html-blocks";
import MODEL from "./drupal-model.json";

const DRUPAL_URL = (process.env.DRUPAL_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL || DRUPAL_URL).replace(/\/$/, "");

type FieldDef = { name: string; strapi: string; type: string; multiple?: boolean; targets?: string[] };
type TypeDef = { label: string; strapi?: string; titleField?: string | null; single?: boolean; fields: FieldDef[] };
const NODES = MODEL.node as Record<string, TypeDef>;
const PARAS = MODEL.paragraph as Record<string, TypeDef>;

type Ref = { type: string; id: string; meta?: Record<string, unknown> };
type Resource = { type: string; id: string; attributes: Record<string, any>; relationships?: Record<string, { data: Ref | Ref[] | null }> };
type Doc = { data: Resource[]; included?: Resource[]; links?: { next?: { href: string } } };

/** Chemins « include » : paragraphes imbriqués et fichiers, calculés depuis le modèle. */
function includes(fields: FieldDef[], prefix = "", depth = 0): string[] {
  if (depth > 4) return [];
  return fields.flatMap((f) => {
    const path = prefix + f.name;
    if (f.type === "image" || f.type === "file") return [path];
    if (f.type !== "paragraphs") return [];
    const sub = (f.targets ?? []).flatMap((t) => includes(PARAS[t].fields, path + ".", depth + 1));
    return [path, ...sub];
  });
}

async function get(url: string): Promise<Doc> {
  let res: Response | undefined;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetch(url, {
        headers: { Accept: "application/vnd.api+json" },
        cache: process.env.NODE_ENV === "development" ? "no-store" : "force-cache",
        signal: AbortSignal.timeout(30_000),
      });
      break;
    } catch (e) {
      // Si Drupal ne répond pas, le build échoue proprement (le site en ligne reste inchangé).
      if (attempt >= 3) throw new Error(`Drupal injoignable (${url}) : ${(e as Error).message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  if (!res.ok) throw new Error(`Drupal ${res.status} sur ${url}`);
  return (await res.json()) as Doc;
}

/** Tous les contenus publiés d'un type, dans une langue (Drupal renvoie le français si la traduction manque). */
async function fetchAll(bundle: string, lang: string): Promise<{ items: Resource[]; index: Map<string, Resource> }> {
  const inc = includes(NODES[bundle].fields);
  const prefix = lang === DEFAULT_LANG ? "" : `/${lang}`;
  let url: string | undefined = `${DRUPAL_URL}${prefix}/jsonapi/node/${bundle}?page[limit]=50` + (inc.length ? `&include=${inc.join(",")}` : "");
  const items: Resource[] = [];
  const index = new Map<string, Resource>();
  while (url) {
    const doc = await get(url);
    items.push(...doc.data);
    for (const r of doc.included ?? []) index.set(`${r.type}:${r.id}`, r);
    url = doc.links?.next?.href;
  }
  return { items, index };
}

function media(ref: Ref | null | undefined, index: Map<string, Resource>) {
  if (!ref) return undefined;
  const f = index.get(`${ref.type}:${ref.id}`);
  if (!f) return undefined;
  const url: string = f.attributes.uri?.url ?? "";
  return {
    url: url.startsWith("http") ? url : `${MEDIA_BASE_URL}${url}`,
    alternativeText: (ref.meta?.alt as string) || null,
    width: ref.meta?.width as number | undefined,
    height: ref.meta?.height as number | undefined,
    mime: f.attributes.filemime, name: f.attributes.filename, size: f.attributes.filesize,
  };
}

/** Ressource Drupal -> objet au format du site. */
function convert(r: Resource, def: TypeDef, index: Map<string, Resource>, depth = 0): Record<string, any> {
  const out: Record<string, any> = { documentId: r.id, id: r.attributes.drupal_internal__id ?? r.attributes.drupal_internal__nid };
  if (def.titleField) out[def.titleField] = r.attributes.title;
  for (const f of def.fields) {
    if (f.type === "paragraphs" || f.type === "image" || f.type === "file") {
      const data = r.relationships?.[f.name]?.data;
      const refs = Array.isArray(data) ? data : data ? [data] : [];
      let values: any[];
      if (f.type === "paragraphs") {
        values = depth > 6 ? [] : refs.flatMap((ref) => {
          const p = index.get(`${ref.type}:${ref.id}`);
          if (!p) return [];
          const bundle = ref.type.replace("paragraph--", "");
          return [{ __component: PARAS[bundle].strapi, ...convert(p, PARAS[bundle], index, depth + 1) }];
        });
      } else values = refs.map((ref) => media(ref, index)).filter(Boolean);
      out[f.strapi] = f.multiple ? values : values[0] ?? null;
      continue;
    }
    const v = r.attributes[f.name];
    if (v === undefined || v === null) { out[f.strapi] = f.multiple ? [] : null; continue; }
    switch (f.type) {
      case "text_long": out[f.strapi] = htmlToBlocks(typeof v === "string" ? v : v.value); break;
      case "decimal": out[f.strapi] = Number(v); break;
      default: out[f.strapi] = v;
    }
  }
  return out;
}

/** Mémoïsation par type et langue : un build ne télécharge chaque type qu'une fois par langue. */
const memo = new Map<string, Promise<Record<string, any>[]>>();
export function list<T = Record<string, any>>(bundle: string, lang: string = getLang()): Promise<T[]> {
  const key = `${bundle}:${lang}`;
  if (!memo.has(key) || process.env.NODE_ENV === "development") {
    memo.set(key, fetchAll(bundle, lang).then(({ items, index }) => items.map((r) => convert(r, NODES[bundle], index))));
  }
  return memo.get(key) as Promise<T[]>;
}
