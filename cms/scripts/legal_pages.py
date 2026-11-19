"""Pages « Données personnelles » et « Cookies » (contenu FR de référence, traduit via i18n_strings.py).

Cadre : loi organique n° 2004-63 du 27 juillet 2004 (information préalable art. 31, consentement art. 27,
droits d'accès art. 32 s., rectification art. 40, opposition art. 42, déclaration préalable art. 7) et
décret n° 2007-3004 du 27 novembre 2007. Texte à valider par la Direction juridique avant mise en ligne
(voir docs/donnees-personnelles.md).
"""

CONTACT_EMAIL = "contact@monetiquetunisie.com"  # adresse d'exercice des droits — à confirmer par SMT
RETENTION_MONTHS = 12  # doit correspondre à CONTACT_RETENTION_MONTHS côté Strapi


def t(text, **marks):
    return {"type": "text", "text": text, **marks}


def p(*children):
    return {"type": "paragraph", "children": [t(c) if isinstance(c, str) else c for c in children]}


def a(url, text):
    return {"type": "link", "url": url, "children": [t(text)]}


def ul(*items):
    return {"type": "list", "format": "unordered",
            "children": [{"type": "list-item", "children": [t(i) if isinstance(i, str) else i for i in (it if isinstance(it, tuple) else (it,))]} for it in items]}


def section(title, *body):
    return {"__component": "blocks.rich-text", "title": title, "eyebrow": None, "body": list(body)}


def hero(title, subtitle, eyebrow="Informations légales"):
    return {"__component": "blocks.hero", "variant": "sombre", "title": title, "subtitle": subtitle, "eyebrow": eyebrow, "ctas": []}


DONNEES_PERSONNELLES = {
    "title": "Données personnelles",
    "slug": "donnees-personnelles",
    "parentLabel": "Informations légales",
    "seo": {"metaTitle": "Données personnelles", "metaDescription": "Comment Monétique Tunisie traite les données personnelles recueillies sur son site, notamment via le formulaire de contact, et comment exercer vos droits.", "noIndex": False},
    "blocks": [
        hero("Données personnelles", "Comment nous traitons les informations que vous nous confiez sur ce site, et comment exercer vos droits."),
        section("Responsable du traitement",
                p("Monétique Tunisie, société anonyme dont le siège social est situé Centre urbain Nord, Sana Center – Immeuble C – 1082 Tunis."),
                p("Pour toute question relative à vos données personnelles : ", a(f"mailto:{CONTACT_EMAIL}", CONTACT_EMAIL), ".")),
        section("Données recueillies et finalité",
                p("Le site ne recueille des données personnelles qu’au travers du formulaire de contact :"),
                ul("vos nom et prénom ;", "votre adresse e-mail ;", "votre numéro de téléphone (facultatif) ;", "l’objet de votre demande et votre message."),
                p("Ces données servent uniquement à traiter votre demande (information, réclamation, contact commercial) et à vous répondre. Elles ne sont ni utilisées à des fins publicitaires, ni vendues, ni cédées."),
                p("Les champs marqués d’un astérisque sont obligatoires : sans eux, nous ne pouvons pas traiter votre demande.")),
        section("Consentement",
                p("L’envoi du formulaire suppose votre accord exprès, donné en cochant la case prévue à cet effet. Vous pouvez retirer votre consentement à tout moment en nous écrivant ; ce retrait vaut demande de suppression de votre message.")),
        section("Destinataires",
                ul("les personnes habilitées des services de Monétique Tunisie concernés par l’objet de votre demande ;",
                   "pour une réclamation, et seulement si son traitement l’exige, la banque concernée ;",
                   "le prestataire technique qui héberge le site, tenu à la confidentialité et agissant sur nos seules instructions.")),
        section("Durée de conservation",
                p(f"Les messages sont conservés {RETENTION_MONTHS} mois à compter de leur réception, puis supprimés automatiquement. Une réclamation encore en cours peut être conservée jusqu’à sa clôture.")),
        section("Sécurité",
                p("Les données sont hébergées en Tunisie et ne font l’objet d’aucun transfert hors du territoire. Les échanges avec le site sont chiffrés (HTTPS), l’outil de gestion des messages n’est pas accessible depuis Internet et seules les personnes habilitées y ont accès.")),
        section("Vos droits",
                p("Conformément à la loi organique n° 2004-63 du 27 juillet 2004 portant sur la protection des données à caractère personnel, vous disposez :"),
                ul("d’un droit d’accès à vos données et d’en obtenir une copie ;",
                   "d’un droit de rectification, de mise à jour ou de suppression des données inexactes, incomplètes ou traitées de façon illicite ;",
                   "d’un droit d’opposition pour des raisons valables, légitimes et sérieuses ;",
                   "du droit de retirer votre consentement à tout moment."),
                p("Pour les exercer, écrivez à ", a(f"mailto:{CONTACT_EMAIL}", CONTACT_EMAIL), " ou par courrier à l’adresse du siège. Nous vous répondons dans un délai d’un mois."),
                p("Vous pouvez également saisir l’Instance nationale de protection des données personnelles (INPDP) : ", a("https://www.inpdp.nat.tn", "www.inpdp.nat.tn"), ".")),
        section("Déclaration auprès de l’INPDP",
                p("Le traitement des données recueillies sur ce site est déclaré auprès de l’INPDP, conformément à l’article 7 de la loi organique n° 2004-63. Référence de la déclaration : à compléter.")),
        section("Cookies",
                p("Le site ne dépose aucun cookie publicitaire ni de mesure d’audience. Pour le détail, consultez la page ", a("/cookies", "Cookies"), ".")),
    ],
}

COOKIES = {
    "title": "Cookies",
    "slug": "cookies",
    "parentLabel": "Informations légales",
    "seo": {"metaTitle": "Cookies", "metaDescription": "Le site de Monétique Tunisie ne dépose aucun cookie publicitaire, de mesure d’audience ou de réseaux sociaux.", "noIndex": False},
    "blocks": [
        hero("Cookies", "Ce site ne vous suit pas : aucun cookie publicitaire, aucune mesure d’audience."),
        section("Aucun cookie déposé",
                p("La consultation du site de Monétique Tunisie ne dépose aucun cookie sur votre appareil : ni cookie publicitaire, ni cookie de mesure d’audience, ni cookie de réseaux sociaux. Le site n’enregistre rien non plus dans la mémoire de votre navigateur."),
                p("Aucun bandeau de consentement n’est donc affiché : il n’y a rien à accepter ni à refuser.")),
        section("Aucun service tiers",
                p("Les polices de caractères, les images et les cartes sont servies par le site lui-même. Aucun contenu n’est chargé depuis un service extérieur (régie publicitaire, réseau social, outil de statistiques ou de cartographie) susceptible de déposer ses propres cookies."),
                p("Le lien « Itinéraire » de la page Contact ouvre un service de cartographie dans un nouvel onglet : ce service applique alors sa propre politique de cookies.")),
        section("Liens vers d’autres sites",
                p("Les sites de nos partenaires, accessibles depuis nos pages, appliquent leur propre politique de cookies, sur laquelle Monétique Tunisie n’a aucune maîtrise.")),
        section("Évolution de cette politique",
                p("Si un outil de mesure d’audience devait être ajouté, cette page serait mise à jour et votre accord serait demandé avant tout dépôt de cookie non indispensable."),
                p("Pour toute question : ", a(f"mailto:{CONTACT_EMAIL}", CONTACT_EMAIL), ". Voir aussi la page ", a("/donnees-personnelles", "Données personnelles"), ".")),
    ],
}

# Paragraphe ajouté à la section « Politique de protection des données » des mentions légales
MENTIONS_POINTER = p("Le détail des traitements (finalités, durée de conservation, destinataires) et la façon d’exercer vos droits figurent sur la page ",
                     a("/donnees-personnelles", "Données personnelles"), ".")


def apply(seed):
    """Ajoute / remplace les pages légales dans un seed (dict) et met à jour les liens légaux."""
    pages = seed["pages"]
    for page in (DONNEES_PERSONNELLES, COOKIES):
        idx = next((i for i, x in enumerate(pages) if x["slug"] == page["slug"]), None)
        if idx is None:
            pos = next((i for i, x in enumerate(pages) if x["slug"] == "cookies"), len(pages))
            pages.insert(pos, page)
        else:
            pages[idx] = page
    ml = next(x for x in pages if x["slug"] == "mentions-legales")
    for b in ml["blocks"]:
        if b.get("title") == "Politique de protection des données" and MENTIONS_POINTER not in b["body"]:
            b["body"].append(MENTIONS_POINTER)
    for holder in (seed.get("global", {}), seed.get("navigation", {})):
        for link in holder.get("legalLinks") or []:
            if link["url"] == "/protection-des-donnees":
                link["label"], link["url"] = "Données personnelles", "/donnees-personnelles"
    return seed
