# Reconstruction automatique du site

```
Validateur publie ──> Strapi ──webhook signé──> smt-builder (127.0.0.1:4000)
                                                   │ attend 20 s (regroupe les publications)
                                                   │ vérifie que Strapi répond
                                                   │ npm run build (site Next.js)
                                                   │ contrôle : pages clés, nombre de pages
                                                   └─> releases/<date> puis bascule atomique de « current »
Nginx sert /var/www/smt/current ──> visiteurs
```

**Déclencheurs** : publication, dépublication, suppression d'un contenu, modification ou suppression d'un média. Les brouillons et les messages de contact ne déclenchent rien.
**Délai de mise en ligne** : environ 30 secondes après la publication (20 s de regroupement + build).
**En cas d'échec** (CMS arrêté, erreur de contenu, nombre de pages anormal) : le site en ligne reste inchangé, l'erreur est dans le journal (`journalctl -u smt-builder`) et dans `/status`.

## Installation (serveur)
1. `useradd --system smt-web` ; dossiers `/opt/smt` (projets) et `/var/www/smt` appartenant à `smt-web`.
2. `cd /opt/smt/smt-web && npm ci`.
3. Copier `builder.env.example` en `builder.env` et le compléter ; mettre le **même** secret dans le `.env` de Strapi (`REBUILD_WEBHOOK_URL=http://127.0.0.1:4000/rebuild`, `REBUILD_WEBHOOK_SECRET=…`). Strapi crée le webhook tout seul au démarrage.
4. `cp smt-builder.service /etc/systemd/system/ && systemctl enable --now smt-builder`.
5. Premier site : `curl -X POST -H "Authorization: Bearer $SECRET" http://127.0.0.1:4000/rebuild`.
6. Dans Nginx : `root /var/www/smt/current;`.

## Exploitation
| Besoin | Commande |
|---|---|
| État, dernier build, versions disponibles | `curl -s http://127.0.0.1:4000/status` |
| Forcer une reconstruction | `curl -X POST -H "Authorization: Bearer $SECRET" http://127.0.0.1:4000/rebuild` |
| Revenir à la version précédente | `curl -X POST -H "Authorization: Bearer $SECRET" http://127.0.0.1:4000/rollback` |
| Journal | `journalctl -u smt-builder -f` |

Sécurité : le service n'écoute que sur 127.0.0.1, exige le secret (comparaison à temps constant) et tourne sous un compte sans privilèges avec écriture limitée à deux dossiers.
