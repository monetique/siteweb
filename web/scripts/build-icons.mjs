/**
 * Génère src/lib/icons.json : uniquement les icônes Material Symbols réellement utilisées
 * (dans le code et dans les contenus Strapi), en SVG. Évite de charger la police d'icônes (3,9 Mo).
 * Lancé automatiquement avant `next build` et `next dev`.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SVG_DIR = path.join(ROOT, "node_modules/@material-symbols/svg-400/outlined");
const STRAPI = (process.env.STRAPI_URL || "http://localhost:1337").replace(/\/$/, "");
const names = new Set();

// 1. Icônes citées dans le code : <Icon name="…" />, icon: "…", ["xxx", "…"]
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
for (const file of walk(path.join(ROOT, "src")).filter((f) => /\.(tsx?|mjs)$/.test(f))) {
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/(?:name|icon)=\{?["']([a-z0-9_]+)["']/g)) names.add(m[1]);
  for (const m of src.matchAll(/(?:icon|name)\s*\?\?\s*["']([a-z0-9_]+)["']/g)) names.add(m[1]);
  // name={cond ? "close" : "menu"} : les deux branches d'un ternaire
  for (const m of src.matchAll(/(?:name|icon)=\{[^}]*?\?\s*["']([a-z0-9_]+)["']\s*:\s*["']([a-z0-9_]+)["']/g)) { names.add(m[1]); names.add(m[2]); }
  for (const m of src.matchAll(/["']([a-z][a-z0-9_]+)["']\s*:\s*["']/g)) if (fs.existsSync(path.join(SVG_DIR, `${m[1]}.svg`))) names.add(m[1]);
}

// 2. Icônes du contenu de départ (cms/data/seed.json) : disponibles même si Strapi n'est pas encore démarré
const collect = (node) => {
  if (Array.isArray(node)) return node.forEach(collect);
  // « icon » (Strapi) ou « <type>_icon » (Drupal)
  if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) ((k === "icon" || k.endsWith("_icon")) && typeof v === "string" ? names.add(v) : collect(v));
};
const SEED = path.resolve(ROOT, "../cms/data/seed.json");
if (fs.existsSync(SEED)) collect(JSON.parse(fs.readFileSync(SEED, "utf8")));

// 3. Jeu d'icônes courantes, pour qu'une icône choisie par un éditeur s'affiche sans régénération
const COMMON = `account_balance account_balance_wallet add analytics apartment api arrow_back arrow_forward arrow_outward arrow_upward
  assured_workload badge bar_chart bolt business_center calendar_month calendar_today call campaign check check_circle
  chevron_left chevron_right close cloud cloud_done code contactless contacts content_copy credit_card credit_score currency_exchange
  dashboard database description devices dns docs domain download east edit_document electric_bolt encrypted event event_available
  event_busy fact_check fingerprint flag gavel globe groups handshake help hub info inventory key language lightbulb link
  local_atm location_on lock mail map menu monitoring newspaper paid payments person point_of_sale policy public qr_code
  qr_code_scanner query_stats receipt receipt_long request_quote rocket_launch savings schedule school search security send sell
  settings shield shield_lock shopping_cart sim_card speed storage store storefront support_agent sync sync_alt tag task_alt
  timeline trending_up tune verified verified_user visibility wallet water_drop wifi workspace_premium`.split(/\s+/);
for (const n of COMMON) if (n) names.add(n);

// 4. Icônes saisies dans Strapi (tous les champs « icon » de tous les contenus). Attend le CMS jusqu’à 30 s au démarrage.
const endpoints = ["solutions?populate=*", "indicateurs?pagination[pageSize]=100", "navigation?populate[mainMenu][populate]=*&populate[headerCta]=true",
  "pages?pagination[pageSize]=100&populate[blocks][on][blocks.cards-grid][populate][cards][populate]=*&populate[blocks][on][blocks.text-image][populate]=*&populate[blocks][on][blocks.tag-list][populate]=*&populate[blocks][on][blocks.hero][populate]=*&populate[blocks][on][blocks.cta-band][populate]=*"];
async function strapiReady() {
  for (let i = 0; i < 15; i++) {
    try { if ((await fetch(`${STRAPI}/_health`, { signal: AbortSignal.timeout(2000) })).ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
// Drupal (CMS par défaut) : champs « *_icon » des contenus et paragraphes, lus directement dans l'API.
const DRUPAL = process.env.CMS_BACKEND === "strapi" ? null : (process.env.DRUPAL_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
if (DRUPAL && process.env.ICONS_SKIP_STRAPI !== "true") {
  const res = ["node/solution", "node/innovation", "node/indicateur", "paragraph/card", "paragraph/sub_item", "paragraph/key_point", "paragraph/link"];
  let ok = 0;
  for (const r of res) {
    for (let url = `${DRUPAL}/jsonapi/${r}?page[limit]=50`; url; ) {
      try {
        const doc = await (await fetch(url, { signal: AbortSignal.timeout(10000) })).json();
        collect((doc.data ?? []).map((d) => d.attributes)); ok++;
        url = doc.links?.next?.href;
      } catch { url = null; }
    }
  }
  if (!ok) console.warn("[icons] Drupal indisponible : icônes du code, du contenu de départ et du jeu courant uniquement");
}
const reachable = DRUPAL || process.env.ICONS_SKIP_STRAPI === "true" ? false : await strapiReady();
if (!reachable && !DRUPAL) console.warn("[icons] Strapi indisponible : icônes du code, du contenu de départ et du jeu courant uniquement");
for (const ep of reachable ? endpoints : []) {
  try {
    const res = await fetch(`${STRAPI}/api/${ep}${ep.includes("?") ? "&" : "?"}locale=fr`, { headers: process.env.STRAPI_TOKEN ? { Authorization: `Bearer ${process.env.STRAPI_TOKEN}` } : {} });
    if (res.ok) collect(await res.json());
  } catch { console.warn(`[icons] Strapi injoignable pour ${ep}`); }
}

// Noms historiques renommés dans les versions récentes de Material Symbols
const ALIASES = { expand_more: "keyboard_arrow_down", smartphone: "mobile", expand_less: "keyboard_arrow_up", phone_iphone: "mobile" };
const IGNORE = new Set(["email", "message", "phone", "website", "name", "subject"]); // noms de champs, pas des icônes
const out = {};
const missing = [];
for (const n of [...names].sort()) {
  if (IGNORE.has(n)) continue;
  const file = path.join(SVG_DIR, `${ALIASES[n] ?? n}.svg`);
  if (!fs.existsSync(file)) { missing.push(n); continue; }
  out[n] = fs.readFileSync(file, "utf8").replace(/^.*?<svg[^>]*>/s, "").replace(/<\/svg>\s*$/s, "");
}
fs.writeFileSync(path.join(ROOT, "src/lib/icons.json"), JSON.stringify(out));
console.log(`[icons] ${Object.keys(out).length} icônes générées${missing.length ? ` — introuvables : ${missing.join(", ")}` : ""}`);
