# Site institutionnel Monétique Tunisie

Nouveau site web de Monétique Tunisie : un **back-office Drupal 11** (CMS découplé, équipes éditoriales) et un **site Next.js** généré en pages statiques (rapide, sûr, sans serveur applicatif exposé).

```
drupal/   Drupal 11 — contenus, rôles Rédacteur/Validateur, validation, formulaire de contact, e-mails (module smt_site)
web/      Next.js 16 — site public généré en HTML statique à partir de l'API Drupal
cms/      Ancien CMS Strapi (transition) et contenu de départ commun (cms/data/seed*.json)
deploy/   Production : configuration Nginx, service de reconstruction automatique, procédures
qa/       Scripts de tests QA, accessibilité, sécurité, intrusion, reconstruction
docs/     Rapport de recette QA & sécurité
```

## Installation sur un poste

**Pré-requis :** [Node.js 22 LTS](https://nodejs.org), [Git](https://git-scm.com), PHP 8.3+ et Composer (macOS : `brew install php composer`). Python 3 est facultatif (tests).

```bash
git clone <adresse-du-dépôt> siteweb && cd siteweb
npm install                 # outil de lancement
npm run setup               # dépendances du site, fichiers .env locaux
npm run drupal:install      # Drupal : installation en français, module smt_site, import du contenu (≈ 5 min)
npm run dev                 # lance Drupal et le site
```

1. Back-office : **http://127.0.0.1:8080/user/login**, compte `admin` (mot de passe affiché à la fin de `drupal:install`, à changer).
2. Le site est sur **http://localhost:3100**. Une modification publiée dans Drupal apparaît au rechargement de la page.

| Commande | Rôle |
|---|---|
| `npm run dev` | Drupal + site en développement |
| `npm run dev:cms` / `npm run dev:web` | l'un ou l'autre séparément |
| `npm run build:web` | génère le site statique dans `web/out/` (Drupal lancé) |
| `npm run drupal:import` | remplace le contenu par le contenu de départ |
| `npm run drupal:update` | après un `git pull` (dépendances, mises à jour du modèle) |
| `npm run dev:strapi` | ancien CMS Strapi (transition, `CMS_BACKEND=strapi`) |
| `npm run audit` | vérifie les vulnérabilités connues des dépendances |

Détails du back-office, variables et mise en production : `drupal/README.md`.

Le site est trilingue : français à la racine (`/`), anglais sous **/en/** et arabe (de droite à gauche) sous **/ar/**. Voir « Langues » plus bas.

En local, la base Drupal est un fichier SQLite (`drupal/web/sites/default/files/.ht.sqlite`) et les médias sont dans `drupal/web/sites/default/files/` : ni l’un ni l’autre n’est versionné.

## Langues (FR / EN / AR)

| Adresse | Langue |
|---|---|
| `http://localhost:3100/` | Français (langue de référence) |
| `http://localhost:3100/en/` | Anglais |
| `http://localhost:3100/ar/` | Arabe, mise en page de droite à gauche |

- **Contenus** : chaque contenu Strapi existe en trois versions (sélecteur de langue en haut à droite de l'éditeur). Une version anglaise ou arabe absente est remplacée par le français : rien ne casse si une traduction manque.
- **Textes fixes de l'interface** (boutons, libellés, dates) : dictionnaire `web/src/lib/i18n.ts`.
- **Noms propres** : les noms des partenaires, institutions et entreprises (Banque Centrale de Tunisie, STEG, SONEDE, Tunisie Telecom, ministères…) restent en français dans les trois langues.
- **Traductions initiales** : faites pour le démarrage du site. Elles doivent être **relues par SMT** (idéalement un traducteur pour l'arabe) avant la mise en ligne. Procédure de mise à jour : [`cms/README.md`](cms/README.md#traductions).
- **Routes** : les pages `/en/…` et `/ar/…` sont générées par `node web/scripts/gen-routes.mjs` à partir des vues communes (`web/src/views/`). Relancer ce script seulement si l'on ajoute un nouveau type de page.

## Mise en production

Voir [`deploy/README.md`](deploy/README.md) : PostgreSQL, Nginx (seul le formulaire de contact atteint Strapi), HTTPS, reconstruction automatique du site à chaque publication ([`deploy/builder/README.md`](deploy/builder/README.md)). En production, Strapi refuse de démarrer avec des secrets d'exemple ou une base SQLite.

## Sécurité du dépôt

- Aucun secret n'est versionné : les fichiers `.env` sont ignorés, seuls les modèles `.env.example` sont fournis.
- Le dépôt doit rester **privé**.
- Les comptes et mots de passe des tests se passent par variables d'environnement (`QA_ADMIN_PASSWORD`…), jamais dans le code.

## Documentation

- CMS : modèle de contenus, rôles, import, e-mails → [`cms/README.md`](cms/README.md)
- Site : organisation, pages, composants → [`web/README.md`](web/README.md)
- Recette QA & sécurité → [`docs/RAPPORT-QA-SECURITE.md`](docs/RAPPORT-QA-SECURITE.md)
- Tests → [`qa/README.md`](qa/README.md)
