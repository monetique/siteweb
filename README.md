# Site institutionnel Monétique Tunisie

Nouveau site web de Monétique Tunisie : un **CMS Strapi** (back-office des équipes) et un **site Next.js** généré en pages statiques (rapide, sûr, sans serveur applicatif exposé).

```
cms/      Strapi 5 — contenus, rôles Rédacteur/Validateur, formulaire de contact, e-mails, webhook
web/      Next.js 16 — site public généré en HTML statique
deploy/   Production : configuration Nginx, service de reconstruction automatique, procédures
qa/       Scripts de tests QA, accessibilité, sécurité, intrusion, reconstruction
docs/     Rapport de recette QA & sécurité
```

## Installation sur un poste (Windows, macOS, Linux)

**Pré-requis :** [Node.js 22 LTS](https://nodejs.org) et [Git](https://git-scm.com). Python 3 est facultatif (tests et simulateur d'e-mails).

```bash
git clone <adresse-du-dépôt> site-monetique-tunisie
cd site-monetique-tunisie
npm install        # outil de lancement
npm run setup      # dépendances, fichiers .env locaux, import du contenu (≈ 3-5 min)
npm run dev        # lance le CMS et le site
```

1. Ouvrir **http://localhost:1337/admin** et créer le premier compte administrateur (une seule fois).
2. Le site est sur **http://localhost:3100** (port choisi pour ne pas entrer en conflit avec d'autres applications sur le port 3000). Une modification publiée dans le CMS apparaît au rechargement de la page.

| Commande | Rôle |
|---|---|
| `npm run dev` | CMS + site en développement |
| `npm run dev:cms` / `npm run dev:web` | l'un ou l'autre séparément |
| `npm run build:web` | génère le site statique dans `web/out/` (CMS lancé) |
| `cd cms && npm run seed -- --reset` | réimporte le contenu de démonstration |
| `python cms/scripts/smtp-simulateur.py` | reçoit localement les e-mails du formulaire dans `cms/mails/` |
| `npm run audit` | vérifie les vulnérabilités connues des dépendances |

Le site est trilingue : français à la racine (`/`), anglais sous **/en/** et arabe (de droite à gauche) sous **/ar/**. Voir « Langues » plus bas.

En local, la base est un fichier SQLite (`cms/.tmp/data.db`) et les médias sont dans `cms/public/uploads/` : ni l'un ni l'autre n'est versionné.

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
