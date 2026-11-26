# Back-office Drupal (CMS découplé)

Drupal 11 sert uniquement de back-office et d'API de lecture (JSON:API) : le site public reste le site
Next.js statique de `web/`, généré à partir de ce contenu. Les visiteurs n'accèdent jamais à Drupal,
sauf l'adresse `/api/messages-contact` du formulaire (proxifiée par Nginx).

Tout le paramétrage est créé par le module **`smt_site`** (`web/modules/custom/smt_site`) :

| Élément | Détail |
|---|---|
| Modèle de contenu | 12 types de contenu, 26 types de paragraphes, généré depuis les schémas d'origine (`scripts/build_model.py` → `model/model.json`) |
| Langues | Français (défaut), anglais, arabe ; structure des blocs commune, textes traduits |
| Validation | Brouillon → À valider → Publié (→ Archivé) |
| Rôles | **Rédacteur** (crée, modifie, soumet) ; **Validateur** (publie, archive, supprime, traite les messages de contact) |
| API publique | Lecture seule ; seuls les contenus publiés et leurs fichiers ; ni comptes, ni rôles, ni messages de contact |
| Formulaire de contact | `POST /api/messages-contact` : anti-spam (piège, délai, liens, doublons), 5 envois / 15 min par IP, consentement daté, notification interne et accusé de réception |
| Conservation | Messages supprimés après 12 mois (sauf réclamations non traitées), au passage du cron |
| Reconstruction du site | Chaque publication, retrait ou suppression appelle le service `deploy/builder` |

## Installation locale (Mac)

Prérequis : PHP 8.3 ou plus et Composer (`brew install php composer`).

```bash
npm run drupal:install      # dépendances, installation en français, module smt_site, import du contenu
npm run dev                 # Drupal sur http://127.0.0.1:8080 + site sur http://localhost:3100
```

Le mot de passe du compte `admin` est affiché à la fin de l'installation : changez-le à la première connexion.
Back-office : http://127.0.0.1:8080/user/login

Autres commandes :

```bash
npm run drupal:import       # remplace le contenu par le contenu de départ (cms/data/seed*.json)
npm run drupal:update       # après une mise à jour du dépôt (dépendances, mises à jour de base)
```

Les dépendances sont calées sur PHP 8.3 (`config.platform.php` dans `composer.json`), la version
d'Ubuntu 24.04 prévue en production : ne pas retirer ce réglage.

## Variables d'environnement (serveur)

À déclarer pour PHP-FPM (`env[...]` dans le pool, ou `putenv()` en fin de `settings.php`) :

| Variable | Rôle | Exemple |
|---|---|---|
| `SMT_REBUILD_URL` | Service de reconstruction du site | `http://127.0.0.1:4000/rebuild` |
| `SMT_REBUILD_SECRET` | Secret partagé avec `deploy/builder` (24 caractères min.) | `openssl rand -hex 24` |
| `SMT_CONTACT_NOTIFY_TO` | Destinataire des messages de contact | `contact@monetiquetunisie.com` |
| `SMT_CONTACT_ROUTING` | Routage par objet (JSON) | `{"reclamation_autre":"reclamations@…"}` |
| `SMT_CONTACT_ACK_ENABLED` | Accusé de réception au visiteur | `true` |
| `SMT_CONTACT_RETENTION_MONTHS` | Durée de conservation des messages | `12` |
| `SMT_CORS_ORIGINS` | Origines autorisées pour le formulaire (développement seulement) | `http://localhost:3100` |

Derrière Nginx, déclarer le proxy pour que la limitation d'envois du formulaire voie l'adresse IP réelle
du visiteur (`settings.php`) :

```php
$settings['reverse_proxy'] = TRUE;
$settings['reverse_proxy_addresses'] = ['127.0.0.1'];
$settings['trusted_host_patterns'] = ['^127\\.0\\.0\\.1$', '^cms\\.smt\\.local$'];
```

Envoi des e-mails : Configuration → Système → Paramètres du site (adresse d'expédition) et transport
SMTP dans `settings.php` (`$config['system.mail']['mailer_dsn']`).

## Mise en production (résumé)

1. Serveur Ubuntu 24.04 : `php8.3-fpm php8.3-{gd,xml,mbstring,curl,pgsql,sqlite3,zip,intl}`, PostgreSQL ou MariaDB.
2. `composer install --no-dev`, puis `drush site:install … --db-url=pgsql://…` et `drush en smt_site`, ou import d'une sauvegarde de base.
3. Nginx : Drupal sur une adresse interne (ex. `127.0.0.1:8080`, accessible par VPN seulement) ;
   le site public ne proxifie que `POST /api/messages-contact` vers cette adresse (voir `deploy/nginx-smt.conf`).
4. Cron : `*/15 * * * * cd /opt/smt/drupal && vendor/bin/drush cron` (purge des messages, tâches Drupal).
5. Sauvegardes quotidiennes de la base et de `web/sites/default/files`.

## Vérifications

```bash
DRUPAL_URL=http://127.0.0.1:8080 DRUPAL_DIR=drupal DRUSH=vendor/bin/drush python3 qa/drupal_security.py
```
