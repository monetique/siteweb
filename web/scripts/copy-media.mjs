/**
 * Après `next build` : copie dans out/uploads/ les médias Strapi utilisés par le site et réécrit
 * leurs adresses en chemins relatifs. Le site publié ne dépend ainsi plus du serveur Strapi,
 * qui peut rester sur le réseau interne.
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(import.meta.dirname, "../out");
const BASE = (process.env.MEDIA_BASE_URL || process.env.STRAPI_URL || "http://localhost:1337").replace(/\/$/, "");
if (process.env.KEEP_REMOTE_MEDIA === "true") process.exit(0);

const esc = BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const re = new RegExp(`${esc}(/uploads/[A-Za-z0-9._\\-/%]+)`, "g");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(OUT).filter((f) => /\.(html|txt|xml|json|js)$/.test(f));
const media = new Set();
for (const f of files) for (const m of fs.readFileSync(f, "utf8").matchAll(re)) media.add(m[1]);

for (const rel of media) {
  const dest = path.join(OUT, decodeURIComponent(rel));
  if (!dest.startsWith(path.join(OUT, "uploads"))) throw new Error(`Chemin de média refusé : ${rel}`);
  const res = await fetch(BASE + rel);
  if (!res.ok) throw new Error(`Média introuvable (${res.status}) : ${rel}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  if (s.includes(BASE + "/uploads/")) fs.writeFileSync(f, s.replace(re, "$1"));
}
console.log(`[médias] ${media.size} fichier(s) copiés dans out/uploads`);
