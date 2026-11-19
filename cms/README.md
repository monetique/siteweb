# Back-office Strapi – site Monétique Tunisie

Strapi 5 (édition Community, gratuite, licence MIT). Il fournit le contenu au site public Next.js.

## Démarrage rapide (développement)

```bash
cp .env.example .env        # puis générer de vrais secrets (voir plus bas)
npm install
npm run develop             # admin : http://localhost:1337/admin
```

En développement, la base est un fichier SQLite (`.tmp/data.db`). En production, utilisez PostgreSQL :

```
DATABASE_CLIENT=postgres
DATABASE_HOST=...
DATABASE_PORT=5432
DATABASE_NAME=smt_cms
DATABASE_USERNAME=...
DATABASE_PASSWORD=...
```

Générer les secrets : `node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"`
(une valeur par variable, 4 valeurs séparées par des virgules pour `APP_KEYS`).

## Importer le contenu réel du site actuel

Le contenu de monetiquetunisie.com (pages, actualités, appels d'offres, solutions, partenaires, FAQ,
statistiques, gouvernance, réglages, menu) est fourni dans `data/seed.json`, avec le logo dans `data/media/`.

```bash
npm run build
npm run seed              # remplit une base vide (Strapi doit être arrêté)
npm run seed -- --reset   # vide les collections importées puis réimporte
```

Pour modifier les données source : éditer `scripts/seed_content.py` ou `scripts/build_seed.py`,
puis `npm run seed:build` (régénère `data/seed.json`) et `npm run seed -- --reset`.
Tout est importé en français et **publié**.

## Ce qui est configuré automatiquement au démarrage (`src/index.ts`)

- **Langues** : français (par défaut), arabe, anglais.
- **API publique en lecture seule** pour les contenus publiés. Le formulaire de contact peut seulement
  *créer* un message ; il ne peut ni lire ni modifier les messages existants.
- **Rôles éditoriaux** :
  - **Rédacteur** : rédige et modifie ses propres contenus en brouillon, sans publier. Pas d'accès aux
    réglages globaux, à la navigation ni aux messages de contact.
  - **Validateur** : relit, publie, supprime ; gère les réglages globaux et consulte les messages.
  - **Super Admin** : administration technique.
- **Libellés en français** pour tous les champs de l'admin, colonnes des listes et tris par défaut.

## Modèle de contenu

### Types uniques
| Type | Rôle |
|---|---|
| Réglages globaux | Nom, logo, favicon, coordonnées, téléphones, e-mails, réseaux sociaux, certifications, SEO par défaut |
| Navigation | Menu principal (avec sous-menus), bouton d'en-tête, colonnes du pied de page, liens légaux |

### Collections
| Collection | Champs principaux | Multilingue | Brouillon/Publication |
|---|---|---|---|
| Page | titre, URL, page d'accueil, rubrique, **blocs** (zone dynamique), SEO | oui | oui |
| Actualité | titre, URL, date, catégorie (actualité / évènement / annonce), étiquette, chapô, couverture, contenu, pièces jointes, à la une, SEO | oui | oui |
| Appel d'offres | titre, URL, type (AO / consultation / appel à candidatures), référence, dates de publication et limite, statut, direction émettrice, résumé, contenu, retrait et coût du cahier des charges, validité des offres, adresse de dépôt, documents, SEO | oui | oui |
| Solution | nom, URL, icône, accroche, résumé, sections, points clés, bouton, ordre, SEO | oui | oui |
| Partenaire | nom, logo, catégorie, site web, bandeau, ordre | non | oui |
| Question FAQ | question, réponse, rubrique (carte, wallet, Paysmart, achat Internet, glossaire), ordre | oui | oui |
| Indicateur statistique | nom, unité, icône, valeurs par période (période, année, valeur, valeur affichée, évolution, période partielle), note, accueil, ordre | oui | oui |
| Dirigeant | nom, fonction, photo, biographie, ordre | oui | oui |
| Message de contact | nom, téléphone, e-mail, objet, message, statut de traitement, note interne | non | non |

### Blocs de page (zone dynamique « Blocs de la page »)
Bannière · Texte riche · Texte + visuel · Chiffres clés · Grille de cartes · Liste d'étiquettes ·
Bandeau d'appel à l'action · Liste des solutions · Dernières publications · Bandeau partenaires ·
Liste FAQ · Dirigeants · Tableau statistiques · Coordonnées + formulaire

Les blocs « Liste des solutions », « Dernières publications », « Bandeau partenaires », « Liste FAQ »,
« Dirigeants » et « Tableau statistiques » affichent automatiquement les données des collections :
on les place une fois sur une page, ils restent à jour.

## Régénérer le modèle
Les schémas sont produits par `scripts/gen_schema.py` (`python3 scripts/gen_schema.py`). Modifier ce script plutôt que
les JSON à la main, puis `npm run build`.

## E-mails du formulaire de contact (étape 5)
À chaque message déposé sur le site, Strapi enregistre le message **puis** envoie en arrière-plan :
1. **une notification interne**, routée selon l'objet (`CONTACT_ROUTING`, sinon `CONTACT_NOTIFY_TO`), avec un bouton vers le message dans le back-office. « Répondre » écrit directement au visiteur ;
2. **un accusé de réception** au visiteur (désactivable par `CONTACT_ACK_ENABLED=false`). Il ne reprend pas le texte saisi, pour que le formulaire ne puisse pas servir à relayer du spam.

Une panne du serveur de messagerie ne fait jamais perdre un message : il reste dans « Messages de contact » et l'erreur est journalisée (`[contact] … non envoyé`).
Sécurité : contenu échappé en HTML, retours à la ligne supprimés des en-têtes (pas d'injection `Bcc:`), limites d'envoi Nginx + Strapi.

**Simulation en local** : `python3 scripts/smtp-simulateur.py` (nécessite `pip install aiosmtpd`) écoute sur 127.0.0.1:1025 ; chaque e-mail est enregistré dans `mails/` (.eml et aperçu .html). Rien ne part sur Internet.
**Production** : renseigner `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_REQUIRE_TLS=true`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` avec les paramètres de la messagerie SMT ; prévoir SPF/DKIM pour l'adresse d'envoi afin d'éviter les spams.

## Bannière de la page d'accueil

Dans **Pages → Accueil → Bannière** (variante « accueil ») :

| Champ | Rôle | Exemple |
|---|---|---|
| `eyebrow` | pastille au-dessus du titre | Switch national monétique |
| `badge` | mention à côté de la pastille | Depuis 1989 |
| `title` | partie fixe du titre | Solutions de paiement digital |
| `rotatingWords` | mots écrits puis effacés lettre par lettre à la fin du titre (effet machine à écrire), **un par ligne** | sécurisées / innovantes / fiables |
| `subtitle` | paragraphe d'introduction | |
| `highlightTitle`, `highlightText`, `highlightUrl` | encadré sombre (cliquable si une adresse est saisie) | Leader des systèmes… → /monetique-tunisie |
| `image` | visuel de droite (format paysage, ≥ 1400 px de large ; le haut de l'image reste visible) | |
| `ctas` | boutons | Nos solutions, Expertise monétique |

Si le mot animé ne doit pas être à la fin (cas de l'anglais : « Secure digital payment solutions »), écrire `{mot}` dans le titre à l'endroit voulu : `{mot} digital payment solutions`. La carte « Switch national monétique » et le taux de disponibilité viennent du dictionnaire du site et des indicateurs statistiques.

## Carte « Expertise à l'international »

Bloc **Liste d'étiquettes** avec `display` = `carte` (accueil et page Monétique Tunisie) : chaque étiquette est un pays.
Les liaisons animées partent de Tunis vers la capitale de chaque pays reconnu (Tunisie, Algérie, Libye, Mauritanie,
Rwanda, Congo, Cap-Vert, en FR / EN / AR). Un pays non reconnu s'affiche en pastille sans liaison : pour l'ajouter
à la carte, relancer `web/scripts/gen-africa-map.mjs` (mode d'emploi en tête du fichier) et compléter `COUNTRIES`
dans `web/src/components/InternationalMap.tsx`. Avec `display` = `pastilles`, le bloc reste une simple liste.

## Traductions

Le site existe en français (langue par défaut), anglais (`en`) et arabe (`ar`) grâce au module i18n de Strapi.

**Au quotidien (rédacteurs)** : ouvrir un contenu, choisir la langue dans le sélecteur en haut à droite de l'éditeur, saisir ou corriger la version, puis publier. Une langue non remplie affiche la version française sur le site. Les chiffres des indicateurs statistiques (valeurs, évolutions) sont communs aux trois langues : on les met à jour une seule fois.

**Contenu de démonstration** : les traductions initiales sont stockées dans `data/i18n/` et importées par `npm run seed`.

| Commande | Rôle |
|---|---|
| `python3 scripts/i18n_strings.py extract` | liste les textes français à traduire dans `data/i18n/source.fr.json` |
| `python3 scripts/i18n_strings.py status` | nombre de textes traduits par langue |
| `python3 scripts/i18n_strings.py build` | produit `data/seed.en.json` et `data/seed.ar.json` à partir de `data/i18n/en.json` et `ar.json` |
| `npm run seed -- --reset` | réimporte le contenu et ses traductions |

Règles appliquées :

- les noms des partenaires, institutions et entreprises restent en français ;
- les identifiants (slugs, adresses, e-mails, téléphones, références d'appels d'offres) ne sont jamais traduits ;
- dans un texte arabe, écrire les numéros de téléphone dans l'ordre normal (`+216 71 155 840`). Le site les isole automatiquement dans les textes riches pour qu'ils ne s'affichent pas à l'envers (le contenu de démonstration est déjà traité).

Ces traductions sont un point de départ : **elles doivent être relues par SMT** avant la mise en ligne.
