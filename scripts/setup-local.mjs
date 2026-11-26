/**
 * Installation locale en une commande (Windows, macOS, Linux) : `npm run setup`
 *  - installe les dépendances du CMS et du site ;
 *  - crée cms/.env (secrets aléatoires, SQLite, CORS localhost) et web/.env.local s'ils n'existent pas ;
 *  - importe le contenu de démonstration (contenu réel du site actuel) si la base est vide.
 * Ne touche jamais à des fichiers .env existants.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const CMS = path.join(ROOT, "cms");
const WEB = path.join(ROOT, "web");
const rnd = () => crypto.randomBytes(24).toString("base64");

const [major] = process.versions.node.split(".").map(Number);
if (major < 22) { console.error(`Node.js 22 ou plus est requis (version actuelle : ${process.versions.node}).`); process.exit(1); }

function run(cmd, cwd) {
  console.log(`\n> ${cmd}   (${path.relative(ROOT, cwd) || "."})`);
  const r = spawnSync(cmd, { cwd, stdio: "inherit", shell: true });
  if (r.status !== 0) { console.error(`\nÉchec de : ${cmd}`); process.exit(r.status ?? 1); }
}

run("npm ci", CMS);
run("npm ci", WEB);

const cmsEnv = path.join(CMS, ".env");
if (!fs.existsSync(cmsEnv)) {
  fs.writeFileSync(cmsEnv, `# Généré par npm run setup — environnement LOCAL de développement
HOST=127.0.0.1
PORT=1337
APP_KEYS=${[rnd(), rnd()].join(",")}
API_TOKEN_SALT=${rnd()}
ADMIN_JWT_SECRET=${rnd()}
TRANSFER_TOKEN_SALT=${rnd()}
JWT_SECRET=${rnd()}
ENCRYPTION_KEY=${rnd()}
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
STRAPI_TELEMETRY_DISABLED=true
CORS_ORIGINS=http://localhost:3100,http://localhost:1337
IS_PROXIED=false
# E-mails : lancer le simulateur (python cms/scripts/smtp-simulateur.py) pour les recevoir dans cms/mails/
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
CONTACT_NOTIFY_TO=contact@monetiquetunisie.com
ADMIN_PUBLIC_URL=http://localhost:1337
# Reconstruction automatique : inutile en local (laisser vide)
REBUILD_WEBHOOK_URL=
REBUILD_WEBHOOK_SECRET=
`);
  console.log("\n✓ cms/.env créé");
}

const webEnv = path.join(WEB, ".env.local");
if (!fs.existsSync(webEnv)) {
  fs.writeFileSync(webEnv, `STRAPI_URL=http://localhost:1337
STRAPI_TOKEN=
SITE_URL=http://localhost:3100
NEXT_PUBLIC_CONTACT_ENDPOINT=http://127.0.0.1:8080/api/messages-contact
DRUPAL_URL=http://127.0.0.1:8080
`);
  console.log("✓ web/.env.local créé");
}

if (!fs.existsSync(path.join(CMS, ".tmp", "data.db"))) run("npm run seed", CMS);
run("npm run icons", WEB); // pictogrammes du site (fichier généré, non versionné)
else console.log("\n(base existante conservée — pour réimporter : cd cms && npm run seed -- --reset)");

console.log(`
Installation terminée.
  1. npm run dev                      → lance le CMS et le site
  2. http://localhost:1337/admin      → créer le premier compte administrateur
  3. http://localhost:3100            → le site
`);
