"""Generates the Strapi 5 content model for monetiquetunisie.com (SMT)."""
import json, os

import pathlib
ROOT = str(pathlib.Path(__file__).resolve().parent.parent / 'src')
L = {"i18n": {"localized": True}}      # localized field
NL = {"i18n": {"localized": False}}    # shared across locales

def f(type_, localized=True, **kw):
    d = {"type": type_, **kw}
    d["pluginOptions"] = L if localized else NL
    return d

def media(multiple=False, types=("images",), localized=False, **kw):
    return {"type": "media", "multiple": multiple, "allowedTypes": list(types), "pluginOptions": L if localized else NL, **kw}

def comp(name, repeatable=False, localized=True, **kw):
    return {"type": "component", "component": name, "repeatable": repeatable, "pluginOptions": L if localized else NL, **kw}

def enum(values, localized=False, **kw):
    return {"type": "enumeration", "enum": values, "pluginOptions": L if localized else NL, **kw}

def write(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)

# ---------------------------------------------------------------- components
COMPONENTS = {
 'shared.seo': ("SEO", "search", {
    "metaTitle": {"type": "string", "maxLength": 70},
    "metaDescription": {"type": "text", "maxLength": 170},
    "shareImage": {"type": "media", "multiple": False, "allowedTypes": ["images"]},
    "noIndex": {"type": "boolean", "default": False}}),
 'shared.link': ("Lien", "link", {
    "label": {"type": "string", "required": True},
    "url": {"type": "string", "required": True},
    "isExternal": {"type": "boolean", "default": False},
    "style": {"type": "enumeration", "enum": ["primaire", "secondaire", "texte"], "default": "texte"},
    "icon": {"type": "string"}}),
 'shared.social-link': ("Réseau social", "earth", {
    "platform": {"type": "enumeration", "enum": ["facebook", "linkedin", "youtube", "x", "instagram"], "required": True},
    "url": {"type": "string", "required": True}}),
 'shared.key-point': ("Point clé", "check", {
    "text": {"type": "string", "required": True},
    "icon": {"type": "string"}}),
 'navigation.sub-item': ("Sous-menu", "bulletList", {
    "label": {"type": "string", "required": True},
    "url": {"type": "string", "required": True},
    "icon": {"type": "string"}}),
 'navigation.menu-item': ("Entrée de menu", "bulletList", {
    "label": {"type": "string", "required": True},
    "url": {"type": "string", "required": True},
    "children": {"type": "component", "component": "navigation.sub-item", "repeatable": True}}),
 'navigation.footer-column': ("Colonne de pied de page", "layout", {
    "title": {"type": "string", "required": True},
    "links": {"type": "component", "component": "shared.link", "repeatable": True}}),
 'content.section': ("Section de texte", "file", {
    "title": {"type": "string", "required": True},
    "body": {"type": "blocks"}}),
 'stats.value': ("Valeur statistique", "chartBubble", {
    "period": {"type": "string", "required": True},
    "year": {"type": "integer"},
    "value": {"type": "decimal", "required": True},
    "displayValue": {"type": "string"},
    "evolution": {"type": "decimal"},
    "isPartialYear": {"type": "boolean", "default": False}}),
 # ---------------- page blocks (dynamic zone)
 'blocks.hero': ("Bannière", "landscape", {
    "variant": {"type": "enumeration", "enum": ["sombre", "claire", "accueil"], "default": "sombre"},
    "eyebrow": {"type": "string"},
    "title": {"type": "string", "required": True},
    "subtitle": {"type": "text"},
    "image": {"type": "media", "multiple": False, "allowedTypes": ["images"]},
    "ctas": {"type": "component", "component": "shared.link", "repeatable": True}}),
 'blocks.rich-text': ("Texte riche", "pencil", {
    "eyebrow": {"type": "string"},
    "title": {"type": "string"},
    "body": {"type": "blocks"}}),
 'blocks.text-image': ("Texte + visuel", "picture", {
    "anchor": {"type": "string"},
    "eyebrow": {"type": "string"},
    "title": {"type": "string", "required": True},
    "body": {"type": "blocks"},
    "image": {"type": "media", "multiple": False, "allowedTypes": ["images"]},
    "imagePosition": {"type": "enumeration", "enum": ["droite", "gauche"], "default": "droite"},
    "keyPoints": {"type": "component", "component": "shared.key-point", "repeatable": True},
    "cta": {"type": "component", "component": "shared.link", "repeatable": False}}),
 'blocks.figure': ("Chiffre", "chartCircle", {
    "value": {"type": "string", "required": True},
    "unit": {"type": "string"},
    "label": {"type": "string", "required": True},
    "evolution": {"type": "string"},
    "note": {"type": "string"}}),
 'blocks.key-figures': ("Chiffres clés", "chartPie", {
    "eyebrow": {"type": "string"},
    "title": {"type": "string"},
    "subtitle": {"type": "text"},
    "items": {"type": "component", "component": "blocks.figure", "repeatable": True},
    "source": {"type": "string"},
    "cta": {"type": "component", "component": "shared.link", "repeatable": False}}),
 'blocks.card': ("Carte", "apps", {
    "icon": {"type": "string"},
    "eyebrow": {"type": "string"},
    "title": {"type": "string", "required": True},
    "text": {"type": "text"},
    "bullets": {"type": "component", "component": "shared.key-point", "repeatable": True},
    "link": {"type": "component", "component": "shared.link", "repeatable": False}}),
 'blocks.cards-grid': ("Grille de cartes", "grid", {
    "eyebrow": {"type": "string"},
    "title": {"type": "string"},
    "subtitle": {"type": "text"},
    "columns": {"type": "integer", "default": 3, "min": 2, "max": 4},
    "cards": {"type": "component", "component": "blocks.card", "repeatable": True}}),
 'blocks.tag-list': ("Liste d'étiquettes", "hashtag", {
    "eyebrow": {"type": "string"},
    "title": {"type": "string"},
    "body": {"type": "blocks"},
    "tags": {"type": "component", "component": "shared.key-point", "repeatable": True}}),
 'blocks.cta-band': ("Bandeau d'appel à l'action", "cursor", {
    "title": {"type": "string", "required": True},
    "text": {"type": "text"},
    "cta": {"type": "component", "component": "shared.link", "repeatable": False}}),
 'blocks.solutions-list': ("Liste des solutions", "puzzle", {
    "eyebrow": {"type": "string"},
    "title": {"type": "string"},
    "subtitle": {"type": "text"}}),
 'blocks.latest-news': ("Dernières publications", "feather", {
    "eyebrow": {"type": "string"},
    "title": {"type": "string"},
    "source": {"type": "enumeration", "enum": ["actualites", "appels_offres", "mixte"], "default": "mixte"},
    "count": {"type": "integer", "default": 3, "min": 1, "max": 9}}),
 'blocks.partners-ribbon': ("Bandeau partenaires", "handHeart", {
    "title": {"type": "string"},
    "showAllLink": {"type": "boolean", "default": True}}),
 'blocks.partners-grid': ("Grille des partenaires", "handHeart", {
    "title": {"type": "string"},
    "intro": {"type": "text"}}),
 'blocks.faq-list': ("Liste FAQ", "question", {
    "title": {"type": "string"},
    "category": {"type": "enumeration", "enum": ["toutes", "carte_bancaire", "wallet", "paysmart", "achat_internet", "glossaire"], "default": "toutes"}}),
 'blocks.people-grid': ("Dirigeants", "user", {
    "eyebrow": {"type": "string"},
    "title": {"type": "string"},
    "anchor": {"type": "string"}}),
 'blocks.stats-table': ("Tableau statistiques", "chartBar", {
    "title": {"type": "string"},
    "subtitle": {"type": "text"},
    "footnote": {"type": "string"}}),
 'blocks.contact-section': ("Coordonnées + formulaire", "envelop", {
    "title": {"type": "string"},
    "showForm": {"type": "boolean", "default": True},
    "showMap": {"type": "boolean", "default": False}}),
}

for uid, (display, icon, attrs) in COMPONENTS.items():
    cat, name = uid.split('.')
    write(f'{ROOT}/components/{cat}/{name}.json', {
        "collectionName": f"components_{cat}_{name.replace('-', '_')}",
        "info": {"displayName": display, "icon": icon},
        "options": {}, "attributes": attrs})

BLOCKS = [k for k in COMPONENTS if k.startswith('blocks.') and k not in ('blocks.figure', 'blocks.card')]

# ---------------------------------------------------------------- content types
def ct(api, kind, singular, plural, display, desc, attributes, draft=True, localized=True):
    schema = {
        "kind": kind,
        "collectionName": plural.replace('-', '_'),
        "info": {"singularName": singular, "pluralName": plural, "displayName": display, "description": desc},
        "options": {"draftAndPublish": draft},
        "pluginOptions": {"i18n": {"localized": localized}},
        "attributes": attributes,
    }
    base = f'{ROOT}/api/{api}'
    write(f'{base}/content-types/{singular}/schema.json', schema)
    for part, factory in (('controllers', 'createCoreController'), ('services', 'createCoreService'), ('routes', 'createCoreRouter')):
        os.makedirs(f'{base}/{part}', exist_ok=True)
        target = f'{base}/{part}/{singular}.ts'
        if os.path.exists(target) and 'createCore' not in open(target).read().split('export default')[1][:60]:
            continue
        if os.path.exists(target) and part == 'controllers' and api == 'message-contact':
            continue
        with open(target, 'w') as fh:
            fh.write(f"import {{ factories }} from '@strapi/strapi';\n\nexport default factories.{factory}('api::{api}.{singular}');\n")

# Single types
ct('global', 'singleType', 'global', 'globals', 'Réglages globaux',
   "Identité, coordonnées et SEO par défaut, partagés par tout le site", {
    "siteName": f("string", required=True, default="Monétique Tunisie"),
    "tagline": f("string"),
    "logo": media(),
    "favicon": media(),
    "statusLabel": f("string", default="Opérationnel"),
    "accreditation": f("string"),
    "address": f("text"),
    "mapUrl": f("string", localized=False),
    "phoneHeadquarters": f("string", localized=False),
    "phoneCallCenter": f("string", localized=False),
    "phoneGreenNumber": f("string", localized=False),
    "emailContact": f("email", localized=False),
    "emailCommercial": f("email", localized=False),
    "socialLinks": comp('shared.social-link', repeatable=True, localized=False),
    "certifications": comp('shared.key-point', repeatable=True),
    "defaultSeo": comp('shared.seo'),
   }, draft=False)

ct('navigation', 'singleType', 'navigation', 'navigations', 'Navigation',
   "Menu principal, bouton d'action et pied de page", {
    "mainMenu": comp('navigation.menu-item', repeatable=True),
    "headerCta": comp('shared.link'),
    "footerColumns": comp('navigation.footer-column', repeatable=True),
    "legalLinks": comp('shared.link', repeatable=True),
    "copyright": f("string"),
   }, draft=False)

# Collections
ct('page', 'collectionType', 'page', 'pages', 'Page',
   "Pages composées de blocs : accueil, Monétique Tunisie, expertise, contact, pages légales", {
    "title": f("string", required=True),
    "slug": {"type": "uid", "targetField": "title", "required": True, "pluginOptions": L},
    "isHomepage": f("boolean", localized=False, default=False),
    "parentLabel": f("string"),
    "blocks": {"type": "dynamiczone", "components": BLOCKS, "pluginOptions": L},
    "seo": comp('shared.seo'),
   })

ct('actualite', 'collectionType', 'actualite', 'actualites', 'Actualité',
   "Actualités, évènements et annonces", {
    "title": f("string", required=True),
    "slug": {"type": "uid", "targetField": "title", "required": True, "pluginOptions": L},
    "date": f("date", localized=False, required=True),
    "category": enum(["actualite", "evenement", "annonce"], default="actualite"),
    "label": f("string"),
    "excerpt": f("text", maxLength=400),
    "cover": media(),
    "content": f("blocks"),
    "attachments": media(multiple=True, types=("files", "images")),
    "isFeatured": f("boolean", localized=False, default=False),
    "seo": comp('shared.seo'),
   })

ct('appel-offres', 'collectionType', 'appel-offres', 'appels-offres', "Appel d'offres",
   "Appels d'offres, consultations et appels à candidatures", {
    "title": f("string", required=True),
    "slug": {"type": "uid", "targetField": "title", "required": True, "pluginOptions": L},
    "type": enum(["appel_offres", "consultation", "appel_candidatures"], default="appel_offres"),
    "reference": f("string", localized=False),
    "publicationDate": f("date", localized=False, required=True),
    "deadline": f("datetime", localized=False),
    "tenderStatus": enum(["ouvert", "cloture", "attribue", "infructueux", "annule"], default="ouvert"),
    "issuer": f("string"),
    "summary": f("text", maxLength=400),
    "content": f("blocks"),
    "documentRetrieval": f("text"),
    "documentCost": f("string"),
    "offerValidityDays": f("integer", localized=False),
    "submissionAddress": f("text"),
    "documents": media(multiple=True, types=("files",)),
    "seo": comp('shared.seo'),
   })

ct('solution', 'collectionType', 'solution', 'solutions', 'Solution',
   "Fiches solutions (carte bancaire, switch, Paysmart…)", {
    "name": f("string", required=True),
    "slug": {"type": "uid", "targetField": "name", "required": True, "pluginOptions": L},
    "icon": f("string", localized=False),
    "tagline": f("string"),
    "summary": f("text", maxLength=300),
    "sections": comp('content.section', repeatable=True),
    "keyPoints": comp('shared.key-point', repeatable=True),
    "cta": comp('shared.link'),
    "order": f("integer", localized=False, default=0),
    "seo": comp('shared.seo'),
   })

ct('partenaire', 'collectionType', 'partenaire', 'partenaires', 'Partenaire',
   "Banques, clients privatifs, réseaux et facturiers", {
    "name": f("string", localized=False, required=True),
    "logo": media(),
    "category": enum(["banque_tunisienne", "banque_etrangere", "client_privatif", "partenaire_technologique", "operateur_facturier"], required=True),
    "website": f("string", localized=False),
    "showInRibbon": f("boolean", localized=False, default=False),
    "order": f("integer", localized=False, default=0),
   }, localized=False)

ct('faq', 'collectionType', 'faq', 'faqs', 'Question FAQ',
   "Foire aux questions et glossaire", {
    "question": f("string", required=True),
    "answer": f("blocks", required=True),
    "category": enum(["carte_bancaire", "wallet", "paysmart", "achat_internet", "glossaire"], required=True),
    "order": f("integer", localized=False, default=0),
   })

ct('indicateur', 'collectionType', 'indicateur', 'indicateurs', 'Indicateur statistique',
   "Chiffres clés publiés (cartes, GAB, TPE, commerçants, opérations, volume d'affaires)", {
    "name": f("string", required=True),
    "unit": f("string"),
    "icon": f("string", localized=False),
    "values": comp('stats.value', repeatable=True, localized=False),
    "note": f("string"),
    "showOnHomepage": f("boolean", localized=False, default=False),
    "order": f("integer", localized=False, default=0),
   })

ct('dirigeant', 'collectionType', 'dirigeant', 'dirigeants', 'Dirigeant',
   "Gouvernance : président, direction générale", {
    "fullName": f("string", localized=False, required=True),
    "role": f("string", required=True),
    "photo": media(),
    "bio": f("text"),
    "order": f("integer", localized=False, default=0),
   })

ct('message-contact', 'collectionType', 'message-contact', 'messages-contact', 'Message de contact',
   "Messages reçus via le formulaire du site", {
    "fullName": {"type": "string", "required": True, "maxLength": 120},
    "phone": {"type": "string", "maxLength": 30},
    "email": {"type": "email", "required": True},
    "subject": {"type": "enumeration", "enum": ["carte_bancaire", "switch_monetique", "switch_mobile_wallet", "ecommerce_clictopay", "paysmart", "certification", "formation_conseil", "reclamation_autre"], "required": True},
    "message": {"type": "text", "required": True, "maxLength": 5000},
    "status": {"type": "enumeration", "enum": ["nouveau", "en_cours", "traite"], "default": "nouveau"},
    "internalNote": {"type": "text", "private": True},
   }, draft=False, localized=False)

print('components:', len(COMPONENTS), 'blocks:', len(BLOCKS))

# ---------------------------------------------------------------- French labels for the admin
LBL = {
 # common
 'title': 'Titre', 'slug': 'Adresse (URL)', 'seo': 'Référencement (SEO)', 'order': "Ordre d'affichage",
 'name': 'Nom', 'icon': 'Icône (Material Symbols)', 'eyebrow': 'Sur-titre', 'subtitle': 'Sous-titre',
 'body': 'Texte', 'image': 'Image', 'cta': 'Bouton', 'ctas': 'Boutons', 'label': 'Libellé', 'url': 'Lien (URL)',
 'text': 'Texte', 'summary': 'Résumé', 'content': 'Contenu', 'category': 'Catégorie', 'date': 'Date',
 'excerpt': 'Chapô', 'cover': 'Image de couverture', 'attachments': 'Pièces jointes', 'isFeatured': 'Mettre à la une',
 'type': 'Type', 'reference': 'Référence', 'publicationDate': 'Date de publication', 'deadline': 'Date limite de dépôt',
 'tenderStatus': 'Statut', 'issuer': 'Direction émettrice', 'documentRetrieval': 'Retrait du cahier des charges',
 'documentCost': 'Coût du cahier des charges', 'offerValidityDays': 'Validité des offres (jours)',
 'submissionAddress': 'Adresse de dépôt des offres', 'documents': 'Documents (cahier des charges, termes de référence)',
 'tagline': 'Accroche', 'sections': 'Sections', 'keyPoints': 'Points clés', 'logo': 'Logo', 'website': 'Site web',
 'showInRibbon': 'Afficher dans le bandeau partenaires', 'question': 'Question', 'answer': 'Réponse', 'unit': 'Unité',
 'values': 'Valeurs par période', 'note': 'Note', 'showOnHomepage': "Afficher sur l'accueil", 'fullName': 'Nom complet',
 'role': 'Fonction', 'photo': 'Photo', 'bio': 'Biographie', 'phone': 'Téléphone', 'email': 'E-mail', 'subject': 'Objet',
 'message': 'Message', 'status': 'Statut de traitement', 'internalNote': 'Note interne', 'isHomepage': "Page d'accueil",
 'parentLabel': "Rubrique (fil d'Ariane)", 'blocks': 'Blocs de la page', 'siteName': 'Nom du site', 'favicon': "Icône d'onglet",
 'statusLabel': 'Statut du switch (bandeau)', 'accreditation': 'Mention d’agrément', 'address': 'Adresse', 'mapUrl': 'Lien itinéraire',
 'phoneHeadquarters': 'Téléphone standard', 'phoneCallCenter': "Centre d'appel", 'phoneGreenNumber': 'Numéro vert',
 'emailContact': 'E-mail de contact', 'emailCommercial': 'E-mail direction commerciale', 'socialLinks': 'Réseaux sociaux',
 'certifications': 'Certifications affichées', 'defaultSeo': 'SEO par défaut', 'mainMenu': 'Menu principal',
 'headerCta': "Bouton de l'en-tête", 'footerColumns': 'Colonnes du pied de page', 'legalLinks': 'Liens légaux',
 'copyright': 'Mention de copyright', 'metaTitle': 'Titre SEO', 'metaDescription': 'Description SEO', 'shareImage': 'Image de partage',
 'noIndex': 'Ne pas indexer', 'isExternal': 'Lien externe', 'style': 'Style', 'platform': 'Réseau', 'children': 'Sous-menus',
 'links': 'Liens', 'period': 'Période', 'year': 'Année', 'value': 'Valeur', 'displayValue': 'Valeur affichée',
 'evolution': 'Évolution (%)', 'isPartialYear': 'Période partielle', 'variant': 'Style', 'anchor': 'Ancre (#)',
 'imagePosition': "Position de l'image", 'items': 'Chiffres', 'source': 'Source', 'columns': 'Colonnes', 'cards': 'Cartes',
 'bullets': 'Puces', 'link': 'Lien', 'tags': 'Étiquettes', 'count': 'Nombre d’éléments', 'showAllLink': 'Lien « Voir tous »',
 'footnote': 'Note de bas de tableau', 'intro': 'Introduction', 'showForm': 'Afficher le formulaire', 'showMap': 'Afficher la carte',
}
DESC = {
 'slug': 'Générée depuis le titre. Ne pas modifier après publication.',
 'icon': 'Nom d’icône Material Symbols, ex. credit_card, hub, smartphone.',
 'label': 'Étiquette affichée au-dessus du titre (ex. Gouvernance, Mobile Payment).',
 'deadline': 'Date et heure limites de réception des offres (heure de Tunis).',
 'tenderStatus': 'Passer à « clôturé » après la date limite.',
 'isFeatured': 'Affiche cette actualité en grand en tête de la page Actualités.',
 'displayValue': 'Format affiché, ex. « 5,782 » ou « 40 600 ». Laisser vide pour utiliser la valeur.',
 'isPartialYear': 'Cocher pour une période en cours (ex. juin 2025).',
 'excerpt': 'Résumé court affiché dans les listes (400 caractères max).',
}
write(f'{ROOT}/admin-labels.json', {"labels": LBL, "descriptions": DESC,
      "mainFields": {"api::page.page": "title", "api::actualite.actualite": "title", "api::appel-offres.appel-offres": "title",
                     "api::solution.solution": "name", "api::partenaire.partenaire": "name", "api::faq.faq": "question",
                     "api::indicateur.indicateur": "name", "api::dirigeant.dirigeant": "fullName",
                     "api::message-contact.message-contact": "fullName"}})
