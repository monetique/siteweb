# Tests QA & sécurité — site Monétique Tunisie

Pré-requis : `pip install playwright && playwright install chromium`, `npm install` (axe-core), Strapi et le site lancés.
Les scripts utilisent le compte admin de **recette** : variables `QA_ADMIN_EMAIL` (défaut admin@smt.local) et `QA_ADMIN_PASSWORD` (obligatoire) : à adapter, ne jamais lancer sur la production.

| Script | Rôle |
|---|---|
| `crawl.py` | Parcourt toutes les pages du sitemap dans les 3 langues (≈ 110 pages) : statut HTTP, `lang`/`dir`, liens restant dans la langue, hreflang, pictogrammes manquants, erreurs console, ressources en échec, SEO (title, description, canonical, OG, JSON-LD), titres, accessibilité axe-core, débordements mobile |
| `interactions.py` | 52 contrôles utilisateur : menus, sous-menus Solutions et Expertise (ancres, fermeture après clic), recherche/filtres/pagination actualités, FAQ, formulaire de contact, mobile, 404, sélecteur de langue, arabe RTL (menu, chiffres, formulaire, mobile), hreflang |
| `security.py` | 35 contrôles API et rôles (lecture publique seule, brouillons invisibles, Rédacteur/Validateur, CORS, inscription fermée, limitation de débit) |
| `pentest.py` | 28 tentatives d'intrusion (injections, fichiers piégés, énumération, accès admin, fichiers sensibles) |
| `xss.py` / `xss_check.py` | Injection d'un article piégé puis vérification que le site généré l'échappe |

| `rebuild_test.py` | 17 scénarios de reconstruction automatique : publication, regroupement, dépublication, panne du CMS, retour arrière |

Adresse testée : premier argument ou variable `QA_BASE` — ex. `python3 crawl.py http://localhost:3100` (développement) ou `http://127.0.0.1:8080` (site généré derrière Nginx). Par défaut : `crawl.py` → 3100, `interactions.py` → 4321.

Le formulaire de contact est limité à 5 envois / 15 min par IP (Strapi) et 5/min (Nginx) : redémarrer Strapi entre deux campagnes.
