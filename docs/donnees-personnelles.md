# Données personnelles du site — dossier pour la Direction juridique

Ce document récapitule ce qui est en place sur le site et prépare la **déclaration préalable à l'INPDP**.
Cadre : loi organique n° 2004-63 du 27 juillet 2004 (protection des données à caractère personnel) et
décret n° 2007-3004 du 27 novembre 2007 (procédures de déclaration et d'autorisation).

> Ce dossier est une aide technique, pas un avis juridique : il doit être validé par la Direction juridique.

## 1. Ce qui est en place sur le site

| Exigence | Mise en œuvre | Où la modifier |
|---|---|---|
| Information préalable (art. 31) | Mention sous le formulaire de contact (FR / EN / AR) + page **Données personnelles** | Mention : `web/src/lib/i18n.ts` (`privacyNotice`) — Page : Strapi → Pages → Données personnelles |
| Consentement exprès (art. 27) | Case à cocher obligatoire ; le serveur refuse un message sans consentement et enregistre la date du consentement (`consentAt`) | `web/src/components/ContactForm.tsx`, `cms/src/api/message-contact/` |
| Droits d'accès, rectification, opposition (art. 32 s., 40, 42) | Décrits sur la page Données personnelles, exercice par e-mail ou courrier, réponse sous un mois ; recours INPDP indiqué | Strapi → Pages → Données personnelles |
| Durée de conservation | **12 mois** à compter de la réception, suppression automatique chaque nuit ; une réclamation non « traitée » est conservée jusqu'à sa clôture | `CONTACT_RETENTION_MONTHS` (fichier `.env` de Strapi) |
| Sécurité (art. 18 s.) | Back-office non exposé sur Internet, HTTPS, accès restreint, anti-spam, limitation des envois | `deploy/`, `cms/src/` |
| Cookies | Aucun cookie, aucun stockage navigateur, aucun service tiers (vérifié par test automatique) ; page **Cookies** définitive | Strapi → Pages → Cookies |

**Si la durée de conservation change**, la modifier aux trois endroits : `CONTACT_RETENTION_MONTHS`, la mention du
formulaire (`privacyNotice`, 3 langues) et la page Données personnelles (3 langues) — ainsi que dans la déclaration INPDP.

## 2. Déclaration préalable à l'INPDP

- **Obligation** : tout traitement de données personnelles est soumis à une déclaration préalable (loi 2004-63, art. 7).
  Le traitement sans déclaration est puni d'un an d'emprisonnement et de 5 000 dinars d'amende (art. 90).
- **Dépôt** : formulaire papier ou électronique fourni par l'INPDP, signé par le représentant légal ; remis au siège de
  l'Instance contre récépissé, ou par lettre recommandée avec accusé de réception (décret 2007-3004, art. 3 et 4).
- **Délai** : l'INPDP dispose d'un mois ; son silence vaut acceptation (décret 2007-3004, art. 9). Une demande de
  complément suspend le délai.
- **À faire avant la mise en ligne du formulaire.** Une fois la référence obtenue, la reporter sur la page Données
  personnelles (section « Déclaration auprès de l'INPDP », texte « à compléter », dans les 3 langues).

### Fiche pré-remplie (informations demandées par l'article 8 du décret 2007-3004)

| Rubrique | Contenu proposé |
|---|---|
| Responsable du traitement | Monétique Tunisie, société anonyme — siège : Centre urbain Nord, Sana Center – Immeuble C – 1082 Tunis — représentant légal : *[à compléter]* — n° RNE : *[à compléter]* |
| Sous-traitant | Hébergeur du serveur du site : *[Topnet (Private Cloud) ou infrastructure SMT — selon le choix retenu]* |
| Agents | Personnes habilitées des services destinataires des messages et administrateurs du back-office *[liste nominative à compléter]* |
| Personnes concernées | Visiteurs du site qui utilisent le formulaire de contact |
| Finalité | Traitement des demandes de contact, d'information et des réclamations reçues via le site, et réponse à leurs auteurs |
| Catégories de traitement | Collecte par formulaire web, enregistrement, consultation, transmission interne par e-mail au service concerné, suppression automatique |
| Lieu et date | Serveur situé en Tunisie *[préciser]* — mise en service : *[date de mise en ligne]* |
| Données traitées et origine | Nom et prénom, e-mail, téléphone (facultatif), objet, message, date du consentement — fournies par la personne elle-même |
| Accès et destinataires | Services de Monétique Tunisie concernés par l'objet (routage automatique par objet) ; pour une réclamation, la banque concernée si nécessaire |
| Conservation | Base de données du back-office (PostgreSQL), en Tunisie — 12 mois après réception ; réclamations en cours jusqu'à clôture ; sauvegardes : *[durée à préciser]* |
| Sécurité | Back-office inaccessible depuis Internet (VPN / réseau interne), HTTPS, comptes nominatifs et droits par rôle, journalisation, sauvegardes, anti-spam et limitation des envois |
| Interconnexions | Aucune base de données interconnectée ; notifications envoyées par la messagerie interne de SMT |
| Engagements | Engagement de traitement conforme à la loi ; déclaration de nationalité tunisienne, résidence en Tunisie et absence d'antécédents judiciaires du responsable, du sous-traitant et de leurs agents *[à signer]* |

## 3. Points à trancher par la Direction juridique

1. **Destruction des données (art. 45)** : la loi prévoit un procès-verbal d'huissier, en présence d'un expert désigné
   par l'INPDP, lors de la destruction à l'expiration de la durée de conservation. Valider si la suppression
   automatique quotidienne convient, ou s'il faut la désactiver (`CONTACT_RETENTION_MONTHS=0`) au profit de
   destructions périodiques constatées.
2. **Délai d'information (art. 31)** : vérifier l'application au formulaire web de l'information « au moins un mois
   avant le traitement » prévue par le texte.
3. **Adresse d'exercice des droits** : la page et la mention utilisent `contact@monetiquetunisie.com`. Confirmer, ou
   créer une adresse dédiée (ex. `donnees.personnelles@…`) et la remplacer dans `cms/scripts/legal_pages.py`,
   `web/src/lib/i18n.ts` et Strapi.
4. **Hébergement** : la page indique que les données sont hébergées en Tunisie, sans transfert à l'étranger. C'est vrai
   avec Topnet ou l'infrastructure SMT ; à revoir si un autre hébergeur est retenu (un transfert hors de Tunisie exige
   une autorisation préalable de l'INPDP, art. 50 à 52).
5. **Sauvegardes** : les messages supprimés restent dans les sauvegardes jusqu'à leur expiration ; fixer cette durée
   et l'indiquer dans la déclaration.
6. **Mentions légales** : vérifier le nom du directeur général indiqué, et retirer la section « Espaces de
   discussions » (le site n'en comporte pas).
7. **Réforme en cours** : un projet de nouvelle loi organique sur les données personnelles est en discussion ; à suivre.
