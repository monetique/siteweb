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
  for (const m of src.matchAll(/["']([a-z][a-z0-9_]+)["']\s*:\s*["']/g)) if (fs.existsSync(path.join(SVG_DIR, `${m[1]}.svg`))) names.add(m[1]);
}

// 2. Icônes saisies dans Strapi (tous les champs « icon » de tous les contenus)
const collect = (node) => {
  if (Array.isArray(node)) return node.forEach(collect);
  if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) (k === "icon" && typeof v === "string" ? names.add(v) : collect(v));
};
const endpoints = ["solutions?populate=*", "indicateurs?pagination[pageSize]=100", "navigation?populate[mainMenu][populate]=*&populate[headerCta]=true",
  "pages?pagination[pageSize]=100&populate[blocks][on][blocks.cards-grid][populate][cards][populate]=*&populate[blocks][on][blocks.text-image][populate]=*&populate[blocks][on][blocks.tag-list][populate]=*&populate[blocks][on][blocks.hero][populate]=*&populate[blocks][on][blocks.cta-band][populate]=*"];
for (const ep of endpoints) {
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
