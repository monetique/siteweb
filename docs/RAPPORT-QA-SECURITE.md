# Rapport de recette QA & sécurité — nouveau site Monétique Tunisie

**Date :** 17 novembre 2026 · **Périmètre :** CMS Strapi 5.62 (smt-cms), site Next.js 16 en export statique (smt-web), configuration Nginx de production (deploy/)
**Environnement de test :** site servi par Nginx 1.24 avec la configuration de production, Strapi en mode `start` derrière le proxy, Chromium (Playwright) et Lighthouse 12 en profil mobile.

## 1. Synthèse

| Campagne | Résultat final |
|---|---|
| Parcours des pages (36 pages + 404) | 36 × 200, 404 personnalisée, 0 erreur JavaScript, 0 image cassée, 2 150 liens internes valides |
| Scénarios utilisateur | 34 / 34 réussis (menus, clavier, recherche, filtres, FAQ, formulaire, mobile) |
| Accessibilité (axe-core + Lighthouse) | 100 / 100 sur les pages auditées |
| Performance Lighthouse mobile | 94 à 97 (contre 55 avant correction) — LCP 2,4–2,8 s, CLS 0 |
| Bonnes pratiques / SEO Lighthouse | 100 / 100 |
| Contrôles API et rôles | 35 / 35 |
| Tests d'intrusion | 28 / 28 |
| Tests Nginx (en-têtes, accès bloqués, anti-abus) | Tous réussis |
| Dépendances site public (npm audit) | 0 vulnérabilité |

Aucune anomalie bloquante ouverte. Restent des points de contenu à fournir et des mesures d'exploitation (§5).

## 2. Anomalies détectées et corrigées

### Sécurité
| # | Gravité | Constat | Correction |
|---|---|---|---|
| S1 | **Critique** | Injection de script possible via un titre d'article (balise `</script>` dans les données structurées JSON-LD) : un compte éditeur compromis pouvait piéger toutes les pages | Échappement systématique du JSON-LD (`<`, `>`, `&`, U+2028/2029) ; vérifié avec un article piégé |
| S2 | Élevée | Brouillons lisibles par tout le monde via `?status=draft` sur l'API | Middleware qui force « publié » sur toute lecture publique |
| S3 | Élevée | Inscription publique ouverte (création de comptes par n'importe qui) | Inscription désactivée automatiquement au démarrage |
| S4 | Élevée | Fichier HTML déguisé en `.png` accepté au téléversement | Contrôle de la signature binaire réelle + liste blanche de types ; SVG/HTML/JS/exécutables refusés |
| S5 | Élevée | Strapi exposable en entier sur Internet (admin, API) | Nginx ne relaie que `POST /api/messages-contact` ; tout le reste → 404 ; Strapi lié à 127.0.0.1 |
| S6 | Moyenne | Formulaire de contact sans limite (spam, saturation) | 5 envois/min/IP (Nginx) + 5/15 min/IP (Strapi) + champ piège anti-robot + liste blanche de champs |
| S7 | Moyenne | CORS ouvert à tous les domaines | Liste blanche configurable (`CORS_ORIGINS`) |
| S8 | Moyenne | Démarrage possible en production avec les secrets d'exemple ou SQLite | Strapi refuse désormais de démarrer (testé) |
| S9 | Moyenne | Images servies depuis le serveur Strapi (dépendance et exposition) | Médias copiés dans le site au build ; le site public ne contacte jamais Strapi |
| S10 | Faible | En-têtes de sécurité absents, version serveur et `X-Powered-By` divulgués | CSP stricte, HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy, COOP ; versions masquées |
| S11 | Faible | Liens saisis par les éditeurs non filtrés (`javascript:`) | Filtrage des protocoles (http, https, mailto, tel, liens internes) |

### Fonctionnel, accessibilité, performance
| # | Gravité | Constat | Correction |
|---|---|---|---|
| F1 | Élevée | Police d'icônes de 3,9 Mo : performance mobile 55 | Icônes SVG générées au build (quelques Ko) → 94–97 |
| F2 | Moyenne | Débordement horizontal sur mobile (adresse e-mail longue, page Contact) | Césure automatique des textes longs |
| F3 | Moyenne | Ancres masquées sous l'en-tête fixe | Décalage de défilement ajusté |
| F4 | Moyenne | Logo cassé derrière Nginx (règle de blocage `/upload` trop large) | Règle corrigée, retesté |
| F5 | Faible | Titres de pages dupliqués ou trop longs, hiérarchie h1→h3 | Titres SEO courts et uniques, hiérarchie corrigée |
| F6 | Faible | Liens dans le texte non distinguables (axe) / libellés incohérents | Soulignement, libellés accessibles explicites |

## 3. Ce qui a été testé

- **Pages :** statut, erreurs console, ressources en échec, title/description/canonical/Open Graph/JSON-LD, titres, attributs alt, débordement mobile, accessibilité axe-core.
- **Parcours :** menu et état actif, sous-menu Solutions (souris et clavier), lien d'évitement, retour en haut, actualités (15 publications, filtres, recherche par référence, insensible aux accents, pagination), FAQ, formulaire (champs requis, e-mail invalide, erreur serveur, envoi réussi), menu mobile, 404, liens PDF et téléphone.
- **API et rôles :** lecture publique seule, aucune écriture/suppression anonyme, brouillons et champs internes invisibles, Rédacteur sans droit de publication ni accès aux messages et réglages, Validateur peut publier, CORS, inscription fermée.
- **Intrusion :** injections SQL et opérateurs dans les filtres, injection de script, parcours de répertoires, fichiers sensibles (`.env`, base, `.git`), téléversements piégés (SVG, HTML, PNG déguisé, exécutable), force brute sur l'admin (blocage 429 natif), usurpation d'en-têtes.
- **Nginx :** en-têtes, méthodes interdites (405), corps trop gros (413), limitation de débit (429), `/admin`, `/api`, `/upload`, fichiers cachés et sources → 404, absence de listing, cache et compression.

## 4. Risques résiduels

| Risque | Niveau | Mesure |
|---|---|---|
| Vulnérabilités dans des dépendances internes de Strapi (picomatch, vite, react-router de l'interface admin, zod 3 utilisé par koa-body pour sa seule configuration) — pas de correctif non majeur publié | Faible (non exploitable depuis le site public : admin non exposé, aucune donnée visiteur traitée par ces modules) | Admin uniquement sur réseau interne/VPN, `npm audit` mensuel, mise à jour de Strapi à chaque version |
| Pas de double authentification dans Strapi Community | Moyen | Accès admin derrière VPN, mots de passe forts nominatifs, revue trimestrielle des comptes |
| Contournement de la limite du formulaire si Strapi était joignable directement (en-tête X-Forwarded-For) | Faible si le pare-feu est appliqué | Port 1337 fermé, `HOST=127.0.0.1` |
| Attaques volumétriques (DDoS) | Moyen | Limites Nginx en place ; envisager un WAF/anti-DDoS chez l'hébergeur ou l'opérateur |
| CSP avec `'unsafe-inline'` (requis par Next.js en export statique) | Faible | Aucun script tiers ; à durcir si un hébergement avec nonces est retenu |

## 5. Actions avant mise en ligne

**DSI / infrastructure :** certificat HTTPS + redirection 80→443 ; pare-feu (80/443 seulement, 1337 et 5432 fermés) ; secrets générés (`openssl rand -base64 32`) ; PostgreSQL ; sauvegardes quotidiennes base + médias ; contrôle final SSL Labs et securityheaders.com (objectif A/A+).

**Contenu à fournir (Marketing/Communication) :** adresse du site Paysmart (bouton actuellement inactif), liens réseaux sociaux, confirmation des chiffres (volume d'affaires en MDT, évolution commerçants +23,1 %), photos et logos partenaires, logo ClicToPay, texte de la page Cookies, texte de l'article Darnaoui.

**Étapes suivantes du plan :** 5 — envoi d'e-mail à réception d'un message (paramètres SMTP SMT nécessaires) et reconstruction automatique du site à la publication ; 6 — Docker, PostgreSQL, documentation de passation et guide éditeur.
