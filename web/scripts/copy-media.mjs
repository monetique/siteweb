/**
 * Après `next build` : copie dans out/uploads/ les médias Strapi utilisés par le site et réécrit
 * leurs adresses en chemins relatifs. Le site publié ne dépend ainsi plus du serveur Strapi,
 * qui peut rester sur le réseau interne.
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(import.meta.dirname, "../out");
const BASE = (process.env.MEDIA_BASE_URL || (process.env.CMS_BACKEND === "strapi" ? process.env.STRAPI_URL || "http://localhost:1337" : process.env.DRUPAL_URL || "http://127.0.0.1:8080")).replace(/\/$/, "");
if (process.env.KEEP_REMOTE_MEDIA === "true") process.exit(0);

const esc = BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Strapi : /uploads/… ; Drupal : /sites/default/files/… (publié sous /uploads/…)
const re = new RegExp(`${esc}(/uploads/|/sites/default/files/)([A-Za-z0-9._\\-/%]+)`, "g");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(OUT).filter((f) => /\.(html|txt|xml|json|js)$/.test(f));
const media = new Set();
for (const f of files) for (const m of fs.readFileSync(f, "utf8").matchAll(re)) media.add(m[1] + m[2]);

for (const src of media) {
  const rel = src.replace(/^\/sites\/default\/files\//, "/uploads/");
  const dest = path.join(OUT, decodeURIComponent(rel));
  if (!dest.startsWith(path.join(OUT, "uploads"))) throw new Error(`Chemin de média refusé : ${rel}`);
  const res = await fetch(BASE + src);
  if (!res.ok) throw new Error(`Média introuvable (${res.status}) : ${rel}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  if (s.includes(BASE + "/")) fs.writeFileSync(f, s.replace(re, "/uploads/$2"));
}
console.log(`[médias] ${media.size} fichier(s) copiés dans out/uploads`);
