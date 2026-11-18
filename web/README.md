# Site public Monétique Tunisie (Next.js)

Front-end du site, généré en **HTML statique** à partir du contenu Strapi (`../smt-cms`).

## Démarrer

```bash
cp .env.example .env.local   # adresse de Strapi, adresse publique du site…
npm install
npm run dev                  # http://localhost:3000 (Strapi doit tourner)
npm run build                # génère le site statique dans out/
```

Le dossier `out/` se sert tel quel par Nginx (ou tout serveur web). Aucun serveur Node n'est nécessaire en production.

## Organisation

| Dossier | Contenu |
|---|---|
| `src/app/` | Routes : accueil (`page.tsx`), pages Strapi (`[slug]/`), 404 |
| `src/components/Header.tsx`, `Footer.tsx` | En-tête (menu, sous-menu Solutions, menu mobile, horloge de Tunis) et pied de page, alimentés par les types « Navigation » et « Réglages globaux » |
| `src/components/blocks/content.tsx` | Blocs éditoriaux : bannière, texte, texte + visuel, chiffres clés, cartes, étiquettes, bandeau d'appel à l'action |
| `src/components/blocks/data.tsx` | Blocs automatiques : solutions, dernières publications, partenaires, FAQ, dirigeants, statistiques, contact |
| `src/components/ContactForm.tsx` | Formulaire de contact (envoi vers `NEXT_PUBLIC_CONTACT_ENDPOINT`) |
| `src/lib/strapi.ts` | Client de l'API Strapi et types |
| `src/app/globals.css` | Charte : couleurs, typographies, tailles (issues des maquettes) |

Polices (Inter, Plus Jakarta Sans) et icônes (Material Symbols) sont **auto-hébergées** : aucun appel à Google Fonts.

## Formulaire de contact en production
Le site étant statique, le formulaire poste vers `/api/messages-contact`. Nginx ne doit exposer que cette route
vers Strapi (le reste de Strapi reste sur le réseau interne). Exemple fourni à l'étape 6.

## Routes

| URL | Source |
|---|---|
| `/` et `/{page}/` | Pages Strapi composées de blocs |
| `/solutions/` · `/solutions/{slug}/` | Page « Solutions » + une page par fiche solution |
| `/actualites/` · `/actualites/{slug}/` | Liste filtrable (type, recherche, pagination) + une page par actualité |
| `/appels-offres/` · `/appels-offres/{slug}/` | Liste filtrable + une page par avis (date limite, compte à rebours, infos pratiques, documents) |
| `/sitemap.xml`, `/robots.txt` | Générés à partir des contenus publiés |

Données structurées schema.org : `Organization` sur toutes les pages, `NewsArticle` sur les actualités.
