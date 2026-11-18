# Mise en ligne sécurisée — site public Monétique Tunisie

## Architecture
```
Internet ──HTTPS──> Nginx (DMZ) ──> fichiers statiques (smt-web/out)
                       └── POST /api/messages-contact uniquement ──> Strapi (réseau interne, 127.0.0.1:1337)
Équipe éditoriale ──VPN/LAN──> Strapi /admin (jamais exposé sur Internet)
```

## Étapes
1. **Strapi** : copier `.env.example` en `.env`, générer chaque secret (`openssl rand -base64 32`), `DATABASE_CLIENT=postgres`, `HOST=127.0.0.1`, `IS_PROXIED=true`, `NODE_ENV=production`. Strapi **refuse de démarrer** si un secret est d'exemple/trop court, si la base est SQLite ou si `CORS_ORIGINS` manque.
2. **Site** : mis en ligne automatiquement par le service `builder/` à chaque publication (voir `builder/README.md`). Les médias Strapi sont copiés dans le site : le site publié ne contacte jamais Strapi.
3. **Nginx** : copier `nginx-smt.conf`, remplacer `__ROOT__` (dossier `out`), `__STRAPI__` (127.0.0.1:1337), passer en `listen 443 ssl http2` avec certificat (Let's Encrypt ou certificat SMT) + redirection 80→443. `nginx -t && systemctl reload nginx`.
4. **Pare-feu** : seuls 80/443 ouverts vers Nginx ; port 1337 et PostgreSQL 5432 fermés depuis l'extérieur.
5. **Vérifier** : `curl -I https://www.monetiquetunisie.com` (en-têtes de sécurité), `https://…/admin` et `/api/actualites` → 404, puis https://securityheaders.com et https://www.ssllabs.com/ssltest (objectif A/A+).

## Ce que la configuration Nginx garantit (testé)
- En-têtes : CSP stricte, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP ; version Nginx masquée.
- Strapi invisible : `/admin`, `/api/*`, `/upload`, `/content-manager`, `/_health`… → 404 ; seul `POST /api/messages-contact` passe (GET/PUT/DELETE → 405).
- Anti-abus : 5 envois/min/IP sur le formulaire (+ 5/15 min côté Strapi), 50 req/s/IP sur le site, 30 connexions/IP, corps limité à 32 Ko (413), en-tête X-Forwarded-For réécrit (pas d'usurpation d'IP).
- Aucun fichier caché (`.env`, `.git`), source map, sauvegarde ni contenu actif (`.html`, `.svg`, `.js`) dans `/uploads`.
- Pas de listing de répertoires ; méthodes limitées à GET/HEAD/POST ; cache 1 an pour `/_next/static`, gzip.

## Exploitation
- `npm audit` mensuel sur les deux projets ; mise à jour Strapi à chaque version de sécurité.
- Sauvegarde quotidienne PostgreSQL + dossier `public/uploads` de Strapi, test de restauration trimestriel.
- Mots de passe admin forts et nominatifs, comptes désactivés au départ d'un collaborateur.
