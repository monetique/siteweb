/**
 * Service de reconstruction automatique du site public (sans dépendance externe).
 *
 * Strapi appelle POST /rebuild (webhook signé) à chaque publication, dépublication, suppression ou
 * modification de média. Le service :
 *   1. regroupe les publications rapprochées (délai DEBOUNCE_MS) et ne lance jamais deux builds en même temps ;
 *   2. génère le site (npm run build dans WEB_DIR) ;
 *   3. contrôle le résultat (pages clés présentes, pas de chute anormale du nombre de pages) ;
 *   4. le met en ligne de façon atomique : copie dans releases/<horodatage> puis bascule du lien « current »
 *      lu par Nginx. En cas d'échec, l'ancien site reste en ligne. Les KEEP_RELEASES dernières versions
 *      sont conservées pour un retour arrière instantané.
 *
 * Écoute uniquement sur 127.0.0.1. Endpoints : POST /rebuild, POST /rollback, GET /status.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const cfg = {
  port: Number(process.env.BUILDER_PORT || 4000),
  secret: process.env.REBUILD_WEBHOOK_SECRET || "",
  webDir: path.resolve(process.env.WEB_DIR || "../../smt-web"),
  siteRoot: path.resolve(process.env.SITE_ROOT || "/var/www/smt"),
  debounceMs: Number(process.env.DEBOUNCE_MS || 20000),
  keep: Number(process.env.KEEP_RELEASES || 5),
  buildTimeoutMs: Number(process.env.BUILD_TIMEOUT_MS || 5 * 60 * 1000),
  strapiUrl: (process.env.STRAPI_URL || "http://127.0.0.1:1337").replace(/\/$/, ""),
  minPages: Number(process.env.MIN_PAGES || 20),
};
if (cfg.secret.length < 24) {
  console.error("[builder] REBUILD_WEBHOOK_SECRET absent ou trop court (24 caractères minimum).");
  process.exit(1);
}
const IGNORED_MODELS = new Set(["message-contact"]); // un message reçu ne change pas le site
const RELEASES = path.join(cfg.siteRoot, "releases");
const CURRENT = path.join(cfg.siteRoot, "current");
fs.mkdirSync(RELEASES, { recursive: true });

const state = { status: "idle", pending: false, lastTrigger: null, lastSuccess: null, lastError: null, history: [] };
let timer = null;
const log = (m) => console.log(`[builder ${new Date().toISOString()}] ${m}`);

function schedule(reason) {
  state.lastTrigger = { at: new Date().toISOString(), reason };
  if (state.status === "building") { state.pending = true; log(`build en cours, nouvelle demande mise en attente (${reason})`); return; }
  clearTimeout(timer);
  state.status = "scheduled";
  timer = setTimeout(runBuild, cfg.debounceMs);
  log(`build programmé dans ${cfg.debounceMs / 1000}s (${reason})`);
}

function countHtml(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += countHtml(path.join(dir, e.name));
    else if (e.name.endsWith(".html")) n++;
  }
  return n;
}

function npmBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "build"], {
      cwd: cfg.webDir,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    const keep = (d) => { out = (out + d).slice(-8000); };
    child.stdout.on("data", keep); child.stderr.on("data", keep);
    const t = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("délai de build dépassé")); }, cfg.buildTimeoutMs);
    child.on("close", (code) => { clearTimeout(t); code === 0 ? resolve(out) : reject(new Error(`build en échec (code ${code}) :\n${out.slice(-1500)}`)); });
  });
}

function currentRelease() {
  try { return fs.readlinkSync(CURRENT); } catch { return null; }
}

function activate(releaseDir) {
  const tmp = path.join(cfg.siteRoot, `.current-${process.pid}-${Date.now()}`);
  fs.symlinkSync(releaseDir, tmp, process.platform === "win32" ? "junction" : "dir");
  fs.renameSync(tmp, CURRENT); // rename() est atomique : Nginx voit l'ancien OU le nouveau site, jamais un état intermédiaire
}

function prune() {
  const active = currentRelease();
  const all = fs.readdirSync(RELEASES).sort();
  for (const name of all.slice(0, Math.max(0, all.length - cfg.keep))) {
    const p = path.join(RELEASES, name);
    if (p !== active) fs.rmSync(p, { recursive: true, force: true });
  }
}

async function runBuild() {
  state.status = "building"; state.pending = false;
  const started = Date.now();
  const id = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  log(`build ${id} démarré`);
  try {
    // Vérification préalable : inutile de lancer un build si le CMS ne répond pas.
    const health = await fetch(`${cfg.strapiUrl}/_health`, { signal: AbortSignal.timeout(5000) }).catch((e) => e);
    if (!(health instanceof Response) || !health.ok)
      throw new Error(`CMS Strapi injoignable (${cfg.strapiUrl}) : ${health instanceof Response ? health.status : health.message}`);
    await npmBuild();
    const out = path.join(cfg.webDir, "out");
    for (const f of ["index.html", "404.html", "contact/index.html", "sitemap.xml"])
      if (!fs.existsSync(path.join(out, f))) throw new Error(`contrôle : ${f} manquant`);
    const pages = countHtml(out);
    const prev = currentRelease();
    const prevPages = prev && fs.existsSync(prev) ? countHtml(prev) : 0;
    if (pages < cfg.minPages) throw new Error(`contrôle : seulement ${pages} pages générées (minimum ${cfg.minPages})`);
    if (prevPages && pages < prevPages * 0.7) throw new Error(`contrôle : ${pages} pages contre ${prevPages} en ligne (chute > 30 %, mise en ligne bloquée)`);
    const dest = path.join(RELEASES, id);
    fs.cpSync(out, dest, { recursive: true });
    activate(dest);
    prune();
    const entry = { id, at: new Date().toISOString(), ok: true, pages, seconds: Math.round((Date.now() - started) / 1000) };
    state.lastSuccess = entry; state.lastError = null; state.history.unshift(entry);
    log(`build ${id} en ligne : ${pages} pages en ${entry.seconds}s`);
  } catch (e) {
    const entry = { id, at: new Date().toISOString(), ok: false, error: String(e.message || e).slice(0, 2000) };
    state.lastError = entry; state.history.unshift(entry);
    log(`build ${id} ÉCHOUÉ — le site en ligne est inchangé : ${entry.error.split("\n")[0]}`);
  } finally {
    state.history = state.history.slice(0, 20);
    state.status = "idle";
    if (state.pending) schedule("demandes reçues pendant le build");
  }
}

function rollback() {
  const all = fs.readdirSync(RELEASES).sort();
  const active = currentRelease();
  const idx = all.indexOf(path.basename(active || ""));
  if (idx <= 0) throw new Error("aucune version antérieure disponible");
  activate(path.join(RELEASES, all[idx - 1]));
  log(`retour arrière vers ${all[idx - 1]}`);
  return all[idx - 1];
}

const authorized = (req) => {
  const got = Buffer.from(String(req.headers.authorization || ""));
  const want = Buffer.from(`Bearer ${cfg.secret}`);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
};
const send = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(body)); };

http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/status")
    return send(res, 200, { ...state, current: path.basename(currentRelease() || "—"), releases: fs.readdirSync(RELEASES).sort() });
  if (req.method !== "POST" || !["/rebuild", "/rollback"].includes(req.url)) return send(res, 404, { error: "introuvable" });
  if (!authorized(req)) return send(res, 401, { error: "non autorisé" });
  let body = "";
  req.on("data", (d) => { body += d; if (body.length > 1e6) req.destroy(); });
  req.on("end", () => {
    if (req.url === "/rollback") {
      try { return send(res, 200, { ok: true, current: rollback() }); } catch (e) { return send(res, 409, { error: e.message }); }
    }
    let evt = {};
    try { evt = JSON.parse(body || "{}"); } catch {}
    if (evt.model && IGNORED_MODELS.has(evt.model)) return send(res, 202, { ok: true, ignored: true });
    schedule(`${evt.event || "manuel"}${evt.model ? " · " + evt.model : ""}`);
    send(res, 202, { ok: true, status: state.status });
  });
}).listen(cfg.port, "127.0.0.1", () => log(`prêt sur 127.0.0.1:${cfg.port} — site servi depuis ${CURRENT}`));
