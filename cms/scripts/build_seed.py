"""Builds data/seed.json — the real content of monetiquetunisie.com (Nov. 2026) for the Strapi import.

Run:  python3 scripts/build_seed.py   then   npm run seed
"""
import json, pathlib, sys
from html.parser import HTMLParser

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from seed_content import SOLUTIONS, PARTNERS, FAQ, LEGAL  # noqa: E402

# ------------------------------------------------------------------ HTML -> Strapi "blocks" rich text
class _Blocks(HTMLParser):
    def __init__(self):
        super().__init__(); self.out = []; self.stack = []; self.marks = []; self.link = None; self.cur = None
    def _inline_target(self):
        if self.cur is None:
            self.cur = {"type": "paragraph", "children": []}; self.out.append(self.cur)
        return self.cur
    def _text(self, t):
        if not t: return
        node = {"type": "text", "text": t}
        for m in self.marks: node[m] = True
        tgt = self._inline_target()
        if self.link is not None: self.link["children"].append(node)
        else: tgt["children"].append(node)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'p': self.cur = {"type": "paragraph", "children": []}; self.out.append(self.cur)
        elif tag in ('h2', 'h3', 'h4'): self.cur = {"type": "heading", "level": int(tag[1]), "children": []}; self.out.append(self.cur)
        elif tag in ('ul', 'ol'):
            lst = {"type": "list", "format": "unordered" if tag == 'ul' else "ordered", "children": []}
            self.out.append(lst); self.stack.append(lst); self.cur = None
        elif tag == 'li':
            item = {"type": "list-item", "children": []}; self.stack[-1]["children"].append(item); self.cur = item
        elif tag in ('strong', 'b'): self.marks.append('bold')
        elif tag in ('em', 'i'): self.marks.append('italic')
        elif tag == 'a':
            self.link = {"type": "link", "url": a.get('href', '#'), "children": []}
            self._inline_target()["children"].append(self.link)
        elif tag == 'br': self._text('\n')
    def handle_endtag(self, tag):
        if tag in ('p', 'h2', 'h3', 'h4'): self.cur = None
        elif tag in ('ul', 'ol'): self.stack.pop(); self.cur = None
        elif tag == 'li': self.cur = None
        elif tag in ('strong', 'b', 'em', 'i') and self.marks: self.marks.pop()
        elif tag == 'a':
            if self.link is not None and not self.link["children"]: self.link["children"].append({"type": "text", "text": self.link["url"]})
            self.link = None
    def handle_data(self, d):
        if not d.strip() and self.cur is None: return
        self._text(d)

def blocks(html):
    if not html.lstrip().startswith('<'): html = ''.join(f'<p>{p}</p>' for p in html.split('\n\n'))
    b = _Blocks(); b.feed(html)
    for node in b.out:  # Strapi requires at least one text child
        if node["type"] in ("paragraph", "heading") and not node["children"]: node["children"].append({"type": "text", "text": ""})
    return b.out

def link(label, url, style='texte', ext=False, icon=None):
    d = {"label": label, "url": url, "style": style, "isExternal": ext}
    if icon: d["icon"] = icon
    return d

def kp(t, icon=None):
    return {"text": t, **({"icon": icon} if icon else {})}

# ------------------------------------------------------------------ global & navigation
GLOBAL = {
  "siteName": "Monétique Tunisie",
  "tagline": "Switch national monétique, mobile et agrégateur de facturier",
  "statusLabel": "Opérationnel",
  "accreditation": "Centre interbancaire agréé par la Banque Centrale de Tunisie",
  "address": "Centre urbain Nord, Sana Center, bloc C – 1082 Tunis",
  "mapUrl": "https://maps.google.com/?q=Sana+Center+Centre+Urbain+Nord+Tunis",
  "phoneHeadquarters": "+216 71 155 800",
  "phoneCallCenter": "+216 71 155 840",
  "phoneGreenNumber": "+216 80 100 115",
  "emailContact": "contact@monetiquetunisie.com",
  "emailCommercial": "direction.commerciale@monetiquetunisie.com",
  "socialLinks": [],
  "certifications": [kp("PCI DSS"), kp("Visa"), kp("Mastercard")],
  "defaultSeo": {"metaTitle": "Monétique Tunisie – Solutions de paiement digital",
                 "metaDescription": "Switch national monétique, mobile et agrégateur de facturier (Paysmart) : des solutions de paiement digital fiables et sécurisées en Tunisie et en Afrique."},
}

SOL_NAV = [("Carte Bancaire", "carte-bancaire", "credit_card"), ("Switch Monétique", "switch-monetique", "hub"),
           ("Switch Mobile", "switch-mobile", "smartphone"), ("Agrégateur de facturier", "agregateur-de-facturier", "receipt_long"),
           ("Certification", "certification", "verified"), ("Sécurité Fraude et Monitoring", "securite-fraude-et-monitoring", "shield"),
           ("Hébergement sécurisé", "hebergement-securise", "dns"), ("Assistance et conseil", "assistance-et-conseil", "support_agent")]

NAVIGATION = {
  "mainMenu": [
    {"label": "Monétique Tunisie", "url": "/monetique-tunisie", "children": []},
    {"label": "Expertise", "url": "/expertise", "children": []},
    {"label": "Solutions", "url": "/solutions", "children": [{"label": n, "url": f"/solutions/{s}", "icon": i} for n, s, i in SOL_NAV]},
    {"label": "Statistiques", "url": "/statistiques", "children": []},
    {"label": "Actualités", "url": "/actualites", "children": []},
    {"label": "Partenaires", "url": "/partenaires", "children": []},
    {"label": "FAQ", "url": "/faq", "children": []},
  ],
  "headerCta": link("Contact", "/contact", "primaire", icon="mail"),
  "footerColumns": [
    {"title": "Monétique Tunisie", "links": [link("À propos", "/monetique-tunisie"), link("Gouvernance", "/monetique-tunisie#gouvernance"),
                                            link("Partenaires", "/partenaires"), link("Statistiques", "/statistiques")]},
    {"title": "Expertise", "links": [link("Monétique", "/expertise#monetique"), link("E-commerce", "/expertise#ecommerce"),
                                    link("Mobile Payment", "/expertise#mobile-payment"), link("Sécurité", "/expertise#securite"),
                                    link("Formation & Conseil", "/expertise#formation-conseil")]},
    {"title": "Solutions", "links": [link(n, f"/solutions/{s}") for n, s, _ in SOL_NAV]},
    {"title": "Informations", "links": [link("Actualités", "/actualites"), link("Appels d'offres", "/appels-offres"), link("FAQ", "/faq"),
                                       link("Sécurité des paiements", "/protection-des-donnees"), link("Réclamations", "/contact")]},
  ],
  "legalLinks": [link("Mentions légales", "/mentions-legales"), link("Protection des données", "/protection-des-donnees"),
                 link("Cookies", "/cookies"), link("Accessibilité", "/contact")],
  "copyright": "© 2026 Monétique Tunisie (SMT). Tous droits réservés.",
}

# ------------------------------------------------------------------ people & statistics
DIRIGEANTS = [
  {"fullName": "M. Néji GHANDRI", "role": "Président du conseil d’administration", "order": 1},
  {"fullName": "M. Bilel DARNAOUI", "role": "Directeur Général", "order": 2},
  {"fullName": "Mme Samia REJEB", "role": "Directrice Générale Adjointe", "order": 3},
]

def v(period, year, value, display, evo, partial=False):
    return {"period": period, "year": year, "value": value, "displayValue": display, "evolution": evo, "isPartialYear": partial}

INDICATEURS = [
  {"name": "Nombre de cartes", "unit": "en millions", "icon": "credit_card", "order": 1, "showOnHomepage": True,
   "values": [v("2022", 2022, 6.582, "6,582", 8), v("2023", 2023, 7.053, "7,053", 7), v("2024", 2024, 5.490, "5,490", -22), v("Juin 2025", 2025, 5.782, "5,782", 5.3, True)]},
  {"name": "Nombre de GAB", "unit": "", "icon": "local_atm", "order": 2, "showOnHomepage": False,
   "values": [v("2022", 2022, 3039, "3 039", 1), v("2023", 2023, 3207, "3 207", 6), v("2024", 2024, 3305, "3 305", 3), v("Juin 2025", 2025, 3289, "3 289", -0.5, True)]},
  {"name": "Nombre de TPE", "unit": "", "icon": "point_of_sale", "order": 3, "showOnHomepage": True,
   "values": [v("2022", 2022, 32891, "32 891", 10), v("2023", 2023, 35300, "35 300", 7), v("2024", 2024, 39197, "39 197", 11), v("Juin 2025", 2025, 40600, "40 600", 3.6, True)]},
  {"name": "Nombre de commerçants", "unit": "", "icon": "storefront", "order": 4, "showOnHomepage": True,
   "values": [v("2022", 2022, 30697, "30 697", 11), v("2023", 2023, 32954, "32 954", 7), v("2024", 2024, 36290, "36 290", 10), v("Juin 2025", 2025, 40685, "40 685", 23.1, True)]},
  {"name": "Nombre d'opérations", "unit": "en millions", "icon": "swap_horizontal_circle", "order": 5, "showOnHomepage": True,
   "note": "Juin 2025 : évolution T2 2024 / T2 2025",
   "values": [v("2022", 2022, 126.225, "126,225", 25), v("2023", 2023, 138.854, "138,854", 10), v("2024", 2024, 151.534, "151,534", 9), v("Juin 2025", 2025, 77.7, "77,700", 9, True)]},
  {"name": "Volume d'affaires", "unit": "en millions de DT", "icon": "account_balance_wallet", "order": 6, "showOnHomepage": False,
   "note": "Juin 2025 : évolution T2 2024 / T2 2025",
   "values": [v("2022", 2022, 21022, "21,022", 35), v("2023", 2023, 23678, "23,678", 13), v("2024", 2024, 26275, "26,275", 11), v("Juin 2025", 2025, 13873, "13,873", 12, True)]},
  {"name": "Taux de disponibilité du switch national monétique", "unit": "%", "icon": "speed", "order": 7, "showOnHomepage": True,
   "values": [v("Avril 2025", 2025, 99.98, "99,98", None)]},
]

# ------------------------------------------------------------------ news
ACTUALITES = [
  {"title": "Simplifier vos paiements avec le Wallet", "slug": "simplifier-vos-paiements-avec-le-wallet", "date": "2025-02-18",
   "category": "actualite", "label": "Mobile Payment", "isFeatured": True,
   "excerpt": "Payez, envoyez et retirez votre argent instantanément depuis votre téléphone, sans transporter d’espèces ni faire la queue.",
   "content": "<p>تحب تسهل خلاصاتك وتتحكم في فلوسك خير؟</p><p>بالـWallet كل شيء يسهال، معادش تستحق بش تهز فلوس كاش و تشد الصف!</p><p>خلّص، ابعث، واجبد فلوسك بالوقت. الـWallet هو محفظة إلكترونية على تالفونك، تنجم تعمل بيه كل شيء.</p><p>مالا أدخل على Appstore ولا Playstore تلشرجي الـ Application Mobile payment إلّي حاجتك بيها في رمشة عين.</p>"},
  {"title": "Quel fantastique événement : Team building Monétique Tunisie !", "slug": "team-building-monetique-tunisie", "date": "2024-11-07",
   "category": "evenement", "label": "Vie interne",
   "excerpt": "Trois jours de jeux et de moments de camaraderie, de confiance et de communication, au service de nos valeurs de respect, d’intégrité et de responsabilité.",
   "content": "<p>Un véritable succès, riche en jeux qui ont mis en avant la bonne entente et la convivialité parmi les employés.</p><p>Au cours des trois jours de ce team building, nous avons vécu des moments de camaraderie, de confiance et de communication ouverte rendant les activités à la fois amusantes et enrichissantes.</p><p>L’esprit de collaboration et de créativité était palpable, reflétant la vision de notre société axée sur l’innovation et l’excellence.</p><p>Cet événement a renforcé nos valeurs fondamentales de respect, d’intégrité et de responsabilité, créant des souvenirs durables qui amélioreront nos relations et favoriseront une culture dynamique et inclusive au sein de notre société.</p>"},
  {"title": "Intervention de M. Bilel DARNAOUI au journal télévisé de 20h d’El Wataniya 1 : évolution des paiements par carte bancaire en Tunisie",
   "slug": "intervention-bilel-darnaoui-el-wataniya-1", "date": "2024-09-02", "category": "actualite", "label": "Médias",
   "excerpt": "Le Directeur Général de Monétique Tunisie revient sur l’évolution des paiements par carte bancaire en Tunisie.",
   "content": "<p>Le Directeur Général de Monétique Tunisie, M. Bilel DARNAOUI, est intervenu au journal télévisé de 20h d’El Wataniya 1 au sujet de l’évolution des paiements par carte bancaire en Tunisie.</p>"},
  {"title": "Monétique Tunisie à la 3ème édition du Forum International de la RSE", "slug": "forum-international-rse-3eme-edition", "date": "2024-05-09",
   "category": "evenement", "label": "RSE",
   "excerpt": "Sous le thème « Une rentabilité durable : la nouvelle équation de performance de l’entreprise », à Hammamet, en mai 2024.",
   "content": "<p>Monétique Tunisie à la 3ème édition du Forum International de la RSE sous le thème : « Une rentabilité durable : la nouvelle équation de performance de l’entreprise ».</p><p>Hôtel Diar Lemdina, Hammamet – Mai 2024.</p>"},
  {"title": "Pré-lancement officiel des plateformes nationales de digitalisation des services E-construction et EC 2.0",
   "slug": "pre-lancement-e-construction-ec-2-0", "date": "2024-04-23", "category": "evenement", "label": "E-payment",
   "excerpt": "Démonstration en temps réel du composant E-payment développé par Monétique Tunisie, dans le cadre du projet Digital4Reforms.",
   "content": "<p>Monétique Tunisie a participé au pré-lancement officiel des plateformes nationales de digitalisation des services E-construction et Espace Citoyen 2.0 qui s’est tenu le mardi 23 avril 2024.</p><p>Cet événement s’inscrit dans le cadre du projet Digital4Reforms, composante E-payment, mis en œuvre par la GIZ en coopération avec le gouvernement tunisien et financé par le ministère fédéral allemand de la Coopération économique et du Développement (BMZ), en partenariat avec le ministère de l’Intérieur, le ministère des Finances et la Banque Centrale de Tunisie.</p><p>Démonstration en temps réel du composant E-payment développé par Monétique Tunisie.</p>"},
  {"title": "Participation à la conférence de presse du Forum International de la RSE", "slug": "conference-de-presse-forum-rse", "date": "2024-01-31",
   "category": "evenement", "label": "RSE",
   "excerpt": "Monétique Tunisie a participé à la conférence de presse du Forum International de la RSE, le 31 janvier 2024 à la Maison de l’Exportateur (CEPEX).",
   "content": "<p>À son habitude et dans le cadre de son engagement concret envers la Responsabilité Sociétale des Entreprises (RSE), Monétique Tunisie a fièrement participé à la conférence de presse du Forum International de la RSE du 31 janvier 2024 à la Maison de l’Exportateur (CEPEX).</p><p>Passage au journal de 20h des représentants de Monétique Tunisie lors de la conférence de presse du Forum International de la RSE.</p>"},
]

BOC = "Bureau d’ordre central de Monétique Tunisie – Sana Center, Immeuble « C », Centre Urbain Nord, 1082 Tunis. Envoi par voie postale en recommandé ou par Rapid-Poste (DHL), ou remise directe contre récépissé, au nom du Directeur général."
RETRAIT_PAYANT = "Direction des achats et de la logistique – 5e étage, bureau n° 505, Sana Center, Immeuble « C », Centre Urbain Nord, 1082 Tunis. Se présenter muni de la carte d’identité nationale et du cachet de la société, contre un reçu justifiant le versement en espèces de la somme non récupérable sur le compte bancaire de la société ouvert à l’agence BT Centre Urbain Nord."
RETRAIT_GRATUIT = "Direction des achats et de la logistique – 5e étage, bureau n° 505, Sana Center, Immeuble « C », Centre Urbain Nord, 1082 Tunis, muni de la carte d’identité nationale et du cachet de la société, ou sur demande par e-mail à la direction des achats."

def ao(title, slug, pub, ref=None, deadline=None, cost="100 DT (non récupérables)", validity=120, articles="9 et 10", gratuit=False, extra="", summary=None):
    dl_txt = ""
    if deadline:
        d, h = deadline.split('T')
        y, m, j = d.split('-')
        dl_txt = f"<p>La date limite de réception des offres est fixée au {j}/{m}/{y} à {h[:2]}h00. La date consignée au cachet du bureau d’ordre central de Monétique Tunisie fait exclusivement foi. Toute offre incomplète ou parvenue après la date et l’horaire prescrits sera rejetée.</p>"
    content = (f"<p>La société Monétique Tunisie se propose de lancer un appel d’offres pour : <strong>{title}</strong>.</p>{extra}"
               f"<p>Les offres, dont la validité exigée est de {validity} jours à compter du lendemain de la date limite de réception, doivent être présentées conformément à l’article {articles} du cahier des charges.</p>{dl_txt}")
    return {"title": title, "slug": slug, "type": "appel_offres", "reference": ref, "publicationDate": pub,
            "deadline": (deadline + ":00+01:00") if deadline else None, "tenderStatus": "cloture",
            "issuer": "Direction des achats et de la logistique",
            "summary": summary or ("Cahier des charges " + ("à retirer gratuitement" if gratuit else "à retirer contre 100 DT") + " à la direction des achats et de la logistique."
                                   + (f" Date limite de réception des offres : {deadline[8:10]}/{deadline[5:7]}/{deadline[:4]} à {deadline[11:13]}h." if deadline else "")),
            "content": content, "documentRetrieval": RETRAIT_GRATUIT if gratuit else RETRAIT_PAYANT,
            "documentCost": "Gratuit" if gratuit else cost, "offerValidityDays": validity, "submissionAddress": BOC}

def candidature(title, slug, comite, tdr_url):
    return {"title": title, "slug": slug, "type": "appel_candidatures", "reference": None, "publicationDate": "2025-08-13",
            "deadline": "2025-08-28T13:00:00+01:00", "tenderStatus": "cloture", "issuer": "Direction Générale",
            "summary": f"Désignation d’un administrateur indépendant pour trois ans (2025-2027), appelé à présider le comité {comite}.",
            "content": f"<p>Dans le cadre du renforcement de sa gouvernance, et en application des nouvelles exigences légales édictées par la circulaire de la Banque Centrale de Tunisie n° 2024-05 du 13 février 2024, fixant les règles régissant l’activité de gestion des systèmes de paiement et de règlement-livraison de titres et notamment les articles 21 et 28, Monétique Tunisie se propose de désigner, par voie d’appel à candidatures, un administrateur indépendant pour une période de trois ans (2025-2027) qui sera appelé à présider le comité {comite}.</p><p>Le candidat doit remplir les conditions énumérées dans les « Termes de référence » et faire parvenir son dossier de candidature sous plis fermés recommandés avec accusé de réception ou par Rapid-Poste, ou les déposer directement, contre décharge, au bureau d’ordre du siège social, au plus tard le jeudi 28 août 2025 à 13h, date limite de réception des dossiers de candidature.</p><p><a href=\"{tdr_url}\">Télécharger les termes de référence (PDF)</a></p>",
            "documentRetrieval": f"Termes de référence téléchargeables : {tdr_url}", "documentCost": "Gratuit", "offerValidityDays": None,
            "submissionAddress": "Bureau d’ordre du siège social – Sana Center, Immeuble « C », Centre Urbain Nord, 1082 Tunis."}

APPELS = [
  ao("Acquisition, installation, configuration, paramétrage et mise en production d’une licence Oracle WebLogic", "licence-oracle-weblogic", "2025-08-26", deadline="2025-09-15T17:00"),
  candidature("Avis d’appel à candidatures pour le choix d’un administrateur indépendant – président du comité du développement stratégique",
              "administrateur-independant-comite-developpement-strategique", "du développement stratégique",
              "https://monetiquetunisie.com/wp-content/uploads/2025/08/Termes-de-Reference_-President-du-comite-du-developpement-strategique.pdf"),
  candidature("Avis d’appel à candidatures pour le choix d’un administrateur indépendant – président du comité d’audit et des risques",
              "administrateur-independant-comite-audit-risques", "d’audit et des risques",
              "https://monetiquetunisie.com/wp-content/uploads/2025/08/Termes-de-Reference_-President-du-comite-daudit-et-des-risques.pdf"),
  ao("Acquisition d’une solution de gestion électronique des documents (GED) et des archives", "solution-ged-archives", "2025-07-16", ref="SMT AO 07/2025", deadline="2025-08-06T13:00"),
  ao("Acquisition de solutions réseaux", "acquisition-solutions-reseaux", "2025-01-23", ref="SMT AO 02/2025", deadline="2025-02-10T17:00"),
  ao("Acquisition, installation et mise en service des firewalls installés au siège social de Monétique Tunisie", "firewalls-siege-social", "2024-11-27", ref="SMT AO 10/2024", deadline="2024-12-11T17:00"),
  ao("Choix d’un cabinet d’analyse des risques liés aux acquisitions de la SMT et d’audit des achats", "cabinet-analyse-risques-audit-achats", "2024-09-27",
     deadline="2024-10-22T17:00", validity=90, articles="9", gratuit=True),
  ao("Acquisition d’imprimés Pinmailer codes confidentiels", "imprimes-pinmailer-codes-confidentiels", "2024-08-19", ref="SMT AO 05/2024",
     deadline="2024-09-06T17:00", validity=90, articles="6", gratuit=True),
  ao("Acquisition et mise en place d’une solution de stockage", "solution-de-stockage", "2024-08-19", ref="SMT AO 04/2024", deadline="2024-09-05T17:00", validity=90, articles="9",
     extra="<p>Ce marché est composé d’un lot unique.</p>"),
]

# ------------------------------------------------------------------ pages (blocks)
def hero(title, sub, eyebrow=None, variant="sombre", ctas=None):
    return {"__component": "blocks.hero", "variant": variant, "title": title, "subtitle": sub, "eyebrow": eyebrow, "ctas": ctas or []}
def rich(title, html, eyebrow=None):
    return {"__component": "blocks.rich-text", "title": title, "eyebrow": eyebrow, "body": blocks(html)}
def ti(title, html, eyebrow=None, anchor=None, pos="droite", points=(), cta=None):
    return {"__component": "blocks.text-image", "title": title, "eyebrow": eyebrow, "anchor": anchor, "imagePosition": pos,
            "body": blocks(html), "keyPoints": [kp(p) for p in points], **({"cta": cta} if cta else {})}
def cta_band(title, text, label, url):
    return {"__component": "blocks.cta-band", "title": title, "text": text, "cta": link(label, url, "primaire")}

EXPERTISE = SOLUTIONS_TEXT = None
from seed_content import EXPERTISE  # noqa: E402

PAGES = [
  {"title": "Accueil", "slug": "accueil", "isHomepage": True,
   "seo": {"metaTitle": "Monétique Tunisie – Solutions de paiement digital",
           "metaDescription": "Switch national monétique, mobile et agrégateur de facturier (Paysmart), Monétique Tunisie accompagne banques, fintechs et commerçants en Tunisie et en Afrique."},
   "blocks": [
     hero("Solutions de paiement digital innovantes, fiables, sécurisées",
          "Nous accompagnons nos partenaires et clients dans leur croissance en leur fournissant des solutions de paiement de qualité supérieure, tout en contribuant au développement continu du paysage des paiements digitaux en Tunisie et en Afrique.",
          "Switch national monétique · Depuis 1989", "accueil",
          [link("Nos solutions", "/solutions", "primaire"), link("Expertise monétique", "/expertise", "secondaire")]),
     {"__component": "blocks.key-figures", "eyebrow": "Chiffres clés", "title": "Chiffres clés de la monétique en Tunisie", "subtitle": "Données à fin juin 2025",
      "source": "Source : Monétique Tunisie", "cta": link("Voir toutes les statistiques", "/statistiques"),
      "items": [{"value": "77,7", "unit": "M", "label": "Nombre d'opérations", "evolution": "+9 %", "note": "Évolution T2 2024 / T2 2025"},
                {"value": "5,782", "unit": "M", "label": "Nombre de cartes", "evolution": "+5,3 %"},
                {"value": "40 600", "label": "Nombre de TPE", "evolution": "+3,6 %"},
                {"value": "40 685", "label": "Nombre de commerçants", "evolution": "+23,1 %"},
                {"value": "99,98", "unit": "%", "label": "Disponibilité du switch national", "note": "Avril 2025"}]},
     {"__component": "blocks.solutions-list", "eyebrow": "Écosystème national interbancaire", "title": "Nos solutions de paiement digital",
      "subtitle": "Des solutions de paiement digital innovantes et sur mesure pour les banques, les établissements de paiement, les commerçants et les porteurs de carte."},
     {"__component": "blocks.cards-grid", "eyebrow": "Découvrez nos", "title": "Innovations", "columns": 3,
      "subtitle": "Des solutions modernes pour simplifier la réception du code PIN, l'acceptation des paiements et l'intégration des commerçants.",
      "cards": [
        {"icon": "pin", "eyebrow": "100 % digital", "title": "PIN Sender",
         "text": "Avec PIN Sender, Monétique Tunisie offre une alternative moderne et sécurisée à l’envoi traditionnel des codes PIN. Cette solution 100 % digitale permet la transmission instantanée du code confidentiel (PIN) par SMS dès la réception de la carte. En éliminant l’usage du papier et les contraintes logistiques, elle facilite l’accès au service tout en réduisant son impact sur l’environnement.",
         "bullets": [kp("Transmission instantanée sécurisée"), kp("Zéro papier, zéro contrainte logistique"), kp("Impact environnemental réduit")]},
        {"icon": "contactless", "eyebrow": "Tap to Pay / Tap to Phone", "title": "SoftPOS",
         "text": "Le SoftPOS, également connu sous le nom de Tap to Pay ou Tap to Phone, est une solution basée sur un logiciel qui transforme les smartphones et tablettes Android compatibles NFC en terminaux d’acceptation de paiement. Il représente une avancée significative dans le domaine des transactions électroniques, contrairement aux TPE classiques.",
         "bullets": [kp("Acceptation des cartes sans contact"), kp("Alternative logicielle aux TPE classiques"), kp("Smartphones et tablettes Android NFC")]},
        {"icon": "store", "eyebrow": "Facilitateur de paiement", "title": "PayFac",
         "text": "Un facilitateur de paiement, également appelé PayFac, est un prestataire de services qui permet aux commerçants de traiter les paiements par carte bancaire de manière rapide, efficace et sécurisée. Il agit comme un intermédiaire entre ses clients et les institutions financières et propose une solution de paiement facilement intégrable aux plateformes et aux systèmes de gestion existants.",
         "bullets": [kp("Paiements par carte rapides et sécurisés"), kp("Intermédiaire commerçants / institutions financières"), kp("Intégration facile aux plateformes existantes")]},
      ]},
     {"__component": "blocks.cta-band", "title": "Simplifier vos paiements avec le Wallet",
      "text": "Payez, envoyez et retirez votre argent depuis votre téléphone : téléchargez l’application de paiement mobile de votre banque.",
      "cta": link("Plus d'informations", "/actualites/simplifier-vos-paiements-avec-le-wallet", "primaire")},
     {"__component": "blocks.tag-list", "eyebrow": "International", "title": "Expertise à l’international",
      "body": blocks("<p>Monétique Tunisie dispose d’une expertise « monétique » particulièrement développée qu’elle a su mettre à profit de projets à forte valeur ajoutée, en Tunisie mais également au Maghreb (Algérie, Libye, Mauritanie) et en Afrique (Rwanda, Congo, Cap-Vert).</p><p>Monétique Tunisie est idéalement placée pour offrir des solutions parfaitement intégrées permettant de garantir un haut niveau de performance et de sécurité totale. Ainsi, Monétique Tunisie est partenaire de 14 banques africaines.</p>"),
      "tags": [kp(c) for c in ["Tunisie", "Algérie", "Libye", "Mauritanie", "Rwanda", "Congo", "Cap-Vert"]]},
     {"__component": "blocks.latest-news", "eyebrow": "Actualités", "title": "Actualités & appels d'offres", "source": "mixte", "count": 3},
     {"__component": "blocks.contact-section", "title": "Votre assistance à portée de main", "showForm": True, "showMap": False},
     {"__component": "blocks.partners-ribbon", "title": "Partenaires et clients", "showAllLink": True},
   ]},
  {"title": "Monétique Tunisie", "slug": "monetique-tunisie",
   "seo": {"metaTitle": "Mission, gouvernance et actionnaires",
           "metaDescription": "Fondée en 1989 par les banques tunisiennes et la poste nationale, Monétique Tunisie est le switch national monétique, mobile et agrégateur de facturier."},
   "blocks": [
     hero("Pionnière dans le secteur des solutions de paiement", "Switch national monétique, mobile et agrégateur de facturier, fondé en 1989 par les banques tunisiennes et la poste nationale.", "Monétique Tunisie"),
     rich("Des solutions de paiement digital innovantes et sur mesure", "<p>Fondée en 1989 par les banques tunisiennes et la poste nationale, Monétique Tunisie est une société anonyme de droit privé tunisien spécialisée dans les solutions de paiements digitaux en Tunisie. Pionnière dans le secteur des solutions de paiement, Monétique Tunisie est le switch national monétique, mobile et agrégateur de facturier.</p><p>La mission de Monétique Tunisie est de délivrer des solutions de paiement digital à la fois innovantes et sur mesure, conçues pour répondre précisément aux exigences de nos clients.</p><p>Notre engagement se traduit par la fourniture d'une expérience utilisateur transparente et efficace, soutenue par une veille technologique constante et une sécurité transactionnelle de premier ordre. Nous visons à être les partenaires de croissance de nos clients, en leur offrant des solutions de paiement digital de qualité supérieure, contribuant ainsi activement au développement et à l'évolution du secteur des paiements digitaux en Tunisie.</p>", "Notre mission"),
     rich("Accompagner l'essor de nos partenaires et clients", "<p>Accompagner l'essor de nos partenaires et clients en mettant à leur disposition des technologies de paiement avancées, sécurisées, et adaptées à leurs besoins spécifiques.</p><p>Chez Monétique Tunisie, nous sommes déterminés à innover constamment et à renforcer la sécurité de notre infrastructure, afin d'assurer la fiabilité et l'efficacité des transactions financières pour tous les acteurs économiques en Tunisie.</p>", "Notre objectif est clair !"),
     {"__component": "blocks.people-grid", "eyebrow": "Gouvernance", "title": "Direction & Conseil d’Administration", "anchor": "gouvernance"},
     rich("Actionnaires", "<p>Monétique Tunisie a été fondée par les banques tunisiennes et la poste nationale. Société anonyme au capital de 5 000 000 DT, elle est un centre interbancaire agréé par la Banque Centrale de Tunisie.</p>", "Gouvernance"),
     {"__component": "blocks.tag-list", "eyebrow": "International", "title": "Expertise à l’international",
      "body": blocks("<p>Monétique Tunisie a mis son expertise « monétique » au service de projets à forte valeur ajoutée en Tunisie, au Maghreb et en Afrique. Elle est partenaire de 14 banques africaines.</p>"),
      "tags": [kp(c) for c in ["Tunisie", "Algérie", "Libye", "Mauritanie", "Rwanda", "Congo", "Cap-Vert"]]},
     {"__component": "blocks.latest-news", "eyebrow": "Actualités", "title": "Dernières publications", "source": "mixte", "count": 3},
     cta_band("Découvrez nos solutions", "Carte bancaire, switch monétique et mobile, Paysmart, certification, sécurité, hébergement, assistance et conseil.", "Nos solutions", "/solutions"),
   ]},
  {"title": "Expertise", "slug": "expertise",
   "seo": {"metaTitle": "Expertise : monétique, e-commerce, mobile",
           "metaDescription": "Acteur majeur de la monétique en Tunisie : monétique, e-commerce (ClicToPay), paiement mobile, sécurité des paiements, formation et conseil."},
   "blocks": [hero("Acteur majeur dans le secteur de la monétique", "Monétique, e-commerce, paiement mobile, sécurité, formation et conseil : un savoir-faire au service des banques, des commerçants et des porteurs de carte.", "Expertise")]
             + [ti(e["title"], e["html"], e["eyebrow"], e["anchor"], e["pos"], e["points"]) for e in EXPERTISE]
             + [{"__component": "blocks.key-figures", "title": "Une infrastructure de référence", "items": [
                  {"value": "99,98", "unit": "%", "label": "Disponibilité du switch", "note": "Avril 2025"},
                  {"value": "5,782", "unit": "M", "label": "Cartes", "note": "Fin juin 2025"},
                  {"value": "40 600", "label": "TPE", "note": "Fin juin 2025"},
                  {"value": "PCI DSS", "label": "Certification renouvelée chaque année", "note": "Audits Visa & Mastercard"}]},
                cta_band("Un projet monétique, e-commerce ou de paiement mobile ?", "Notre direction commerciale accompagne banques, établissements de paiement, fintechs et commerçants.", "Nous contacter", "/contact"),
                {"__component": "blocks.partners-ribbon", "title": "Partenaires et clients", "showAllLink": True}]},
  {"title": "Solutions", "slug": "solutions",
   "seo": {"metaTitle": "Nos solutions de paiement digital", "metaDescription": "Carte bancaire, switch monétique, switch mobile, Paysmart, certification, sécurité, hébergement, assistance et conseil."},
   "blocks": [hero("Nos solutions de paiement digital", "Nous accompagnons nos partenaires et clients dans leur croissance en leur fournissant des solutions de paiement de qualité supérieure.", "Solutions"),
              {"__component": "blocks.solutions-list"},
              cta_band("Simplifier vos paiements avec le Wallet", "Payez, envoyez et retirez votre argent depuis votre téléphone.", "Lire l’article", "/actualites/simplifier-vos-paiements-avec-le-wallet")]},
  {"title": "Statistiques", "slug": "statistiques",
   "seo": {"metaTitle": "Statistiques de la monétique en Tunisie", "metaDescription": "Cartes, GAB, TPE, commerçants, opérations et volume d’affaires : les chiffres clés publiés par Monétique Tunisie (2022 – juin 2025)."},
   "blocks": [hero("Statistiques", "Les chiffres clés de la monétique en Tunisie : cartes, GAB, TPE, commerçants, opérations et volume d’affaires.", "Monétique Tunisie"),
              {"__component": "blocks.stats-table", "title": "Évolution du réseau national", "subtitle": "Période 2022 – juin 2025",
               "footnote": "*Juin 2025 : évolution T2 2024 / T2 2025 pour le nombre d'opérations et le volume d'affaires."},
              cta_band("Vous souhaitez en savoir plus sur nos chiffres ?", "Notre direction commerciale répond à vos demandes.", "Nous contacter", "/contact"),
              {"__component": "blocks.partners-ribbon", "title": "Partenaires et clients", "showAllLink": True}]},
  {"title": "Actualités", "slug": "actualites",
   "seo": {"metaTitle": "Actualités, évènements et appels d’offres", "metaDescription": "Les actualités, évènements, avis d’appels à candidatures et appels d’offres de Monétique Tunisie."},
   "blocks": [hero("Actualités & événements", "Retrouvez les actualités, les évènements, les avis d'appels à candidatures et les appels d'offres de Monétique Tunisie.", "Actualités & publications"),
              {"__component": "blocks.latest-news", "title": "Dernières publications", "source": "mixte", "count": 9},
              {"__component": "blocks.faq-list", "title": "Foire aux questions", "category": "carte_bancaire"}]},
  {"title": "Appels d'offres", "slug": "appels-offres", "parentLabel": "Actualités",
   "seo": {"metaTitle": "Appels d’offres et appels à candidatures", "metaDescription": "Les appels d’offres, consultations et appels à candidatures publiés par Monétique Tunisie : objet, date limite, retrait du cahier des charges."},
   "blocks": [hero("Appels d'offres", "Appels d'offres, consultations et appels à candidatures publiés par Monétique Tunisie.", "Achats & gouvernance"),
              {"__component": "blocks.latest-news", "title": "Avis publiés", "source": "appels_offres", "count": 9},
              cta_band("Une question sur une consultation ?", "La direction des achats et de la logistique vous renseigne : Sana Center, 5e étage, bureau 505.", "Nous contacter", "/contact")]},
  {"title": "Partenaires", "slug": "partenaires",
   "seo": {"metaTitle": "Nos partenaires et clients", "metaDescription": "Banques tunisiennes et étrangères, clients privatifs, réseaux internationaux, opérateurs et facturiers partenaires de Monétique Tunisie."},
   "blocks": [hero("Nos partenaires et clients", "Banques tunisiennes et étrangères, clients privatifs, réseaux internationaux, opérateurs et facturiers.", "Partenaires"),
              {"__component": "blocks.partners-grid"},
              cta_band("Devenir partenaire", "Notre direction commerciale est à votre écoute.", "Nous contacter", "/contact")]},
  {"title": "FAQ", "slug": "faq",
   "seo": {"metaTitle": "Foire aux questions", "metaDescription": "Carte bancaire, Wallet, Paysmart, achat sur Internet et glossaire : les réponses aux questions fréquentes."},
   "blocks": [hero("Foire aux questions", "Carte bancaire, Wallet, Paysmart, achat sur Internet et glossaire.", "Foire aux questions"),
              {"__component": "blocks.faq-list", "category": "toutes"},
              cta_band("Plus de questions ?", "Notre centre d’appel est disponible 7j/7 et 24h/24 au +216 71 155 840.", "Nous contacter", "/contact")]},
  {"title": "Contact", "slug": "contact",
   "seo": {"metaTitle": "Contactez Monétique Tunisie", "metaDescription": "Centre d’appel 7j/7 – 24h/24 : +216 71 155 840. Numéro vert : 80 100 115. Sana Center, Centre Urbain Nord, Tunis."},
   "blocks": [hero("Contactez-nous", "Switch national monétique, mobile et agrégateur de facturier. Notre centre d'appel est à votre écoute 7j/7 et 24h/24.", "Contact"),
              {"__component": "blocks.contact-section", "title": "Laissez-nous un message", "showForm": True, "showMap": True},
              {"__component": "blocks.cards-grid", "eyebrow": "Vos interlocuteurs", "title": "Comment pouvons-nous vous aider ?", "columns": 3, "cards": [
                {"icon": "support_agent", "title": "Centre d'appel 7j/7 – 24h/24", "text": "Pour toutes vos questions, demandes d'informations et besoins d'assistance technique : +216 71 155 840."},
                {"icon": "shield", "title": "Carte perdue ou volée", "text": "Faites opposition sans délai auprès de votre banque et du centre d'appel (+216 71 155 840), puis confirmez par lettre recommandée à votre banque."},
                {"icon": "verified", "title": "Banques, fintechs & commerçants", "text": "Solutions, partenariats, certification, e-commerce ClicToPay : direction.commerciale@monetiquetunisie.com."}]},
              cta_band("Porteurs de carte", "Une question sur votre carte ou une réclamation sur le domaine monétique ? Numéro vert : 80 100 115.", "Lire la FAQ", "/faq")]},
] + [{"title": t, "slug": s, "parentLabel": "Informations légales", "seo": {"metaTitle": t, "noIndex": s == "cookies"},
      "blocks": [hero(t, sub, badge)] + [rich(h, body) for h, body in secs]} for t, s, badge, sub, secs in LEGAL]

SOL_TITLES = {"hebergement-securise": "Hébergement sécurisé des serveurs", "securite-fraude-et-monitoring": "Sécurité, fraude et monitoring"}
NEWS_TITLES = {
  "simplifier-vos-paiements-avec-le-wallet": "Simplifier vos paiements avec le Wallet",
  "team-building-monetique-tunisie": "Team building Monétique Tunisie",
  "intervention-bilel-darnaoui-el-wataniya-1": "Bilel Darnaoui au JT d'El Wataniya 1",
  "forum-international-rse-3eme-edition": "3e Forum international de la RSE",
  "pre-lancement-e-construction-ec-2-0": "Pré-lancement E-construction et EC 2.0",
  "conference-de-presse-forum-rse": "Conférence de presse du Forum RSE",
}
TENDER_TITLES = {
  "licence-oracle-weblogic": "Appel d'offres : licence Oracle WebLogic",
  "administrateur-independant-comite-developpement-strategique": "Administrateur indépendant – stratégie",
  "administrateur-independant-comite-audit-risques": "Administrateur indépendant – audit et risques",
  "solution-ged-archives": "Appel d'offres : solution de GED",
  "acquisition-solutions-reseaux": "Appel d'offres : solutions réseaux",
  "firewalls-siege-social": "Appel d'offres : firewalls du siège",
  "cabinet-analyse-risques-audit-achats": "Appel d'offres : audit des achats",
  "imprimes-pinmailer-codes-confidentiels": "Appel d'offres : imprimés Pinmailer",
  "solution-de-stockage": "Appel d'offres : solution de stockage",
}
for a in ACTUALITES: a["seo"] = {"metaTitle": NEWS_TITLES[a["slug"]], "metaDescription": a["excerpt"][:170]}
for t in APPELS: t["seo"] = {"metaTitle": TENDER_TITLES[t["slug"]], "metaDescription": t["summary"][:170]}

SEED = {"global": GLOBAL, "navigation": NAVIGATION, "dirigeants": DIRIGEANTS, "indicateurs": INDICATEURS,
        "solutions": [{"name": s["name"], "slug": s["slug"], "icon": s["icon"], "tagline": s["tagline"], "order": i + 1,
                       "summary": s["tagline"],
                       "sections": [{"title": t, "body": blocks(txt)} for t, txt in s["sections"]],
                       "keyPoints": [kp(k) for k in s["keys"]],
                       **({"cta": link(s["cta"][0], s["cta"][1], "primaire", True)} if s.get("cta") else {}),
                       "seo": {"metaTitle": SOL_TITLES.get(s["slug"], s["name"]), "metaDescription": s["tagline"]}}
                      for i, s in enumerate(SOLUTIONS)],
        "partenaires": [{"name": n, "category": cat, "order": i + 1,
                         "showInRibbon": n in ("Visa", "Mastercard", "UnionPay", "Office National des Postes", "Ooredoo", "Orange", "Tunisie Telecom", "STEG", "SONEDE")}
                        for cat, names in PARTNERS.items() for i, n in enumerate(names)],
        "faqs": [{"question": q, "answer": blocks(a), "category": cat, "order": i + 1} for cat, items in FAQ.items() for i, (q, a) in enumerate(items)],
        "actualites": [{**a, "content": blocks(a["content"])} for a in ACTUALITES],
        "appelsOffres": [{**a, "content": blocks(a["content"])} for a in APPELS],
        "pages": PAGES}

def _check(node, path=''):
    LIM = {'metaTitle': 70, 'metaDescription': 170, 'excerpt': 400}
    if isinstance(node, dict):
        for k, val in node.items():
            if k in LIM and isinstance(val, str) and len(val) > LIM[k]:
                print(f'TROP LONG ({len(val)}/{LIM[k]}) {path}.{k}: {val[:60]}…')
            _check(val, f'{path}.{k}')
    elif isinstance(node, list):
        for i, x in enumerate(node): _check(x, f'{path}[{i}]')
_check(SEED)
for col, lim in (('solutions', 300), ('appelsOffres', 400)):
    for x in SEED[col]:
        if len(x.get('summary') or '') > lim: print('RÉSUMÉ TROP LONG', x.get('title') or x.get('name'))

out = HERE.parent / 'data' / 'seed.json'
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(SEED, ensure_ascii=False, indent=1), encoding='utf-8')
print({k: (len(v) if isinstance(v, list) else 1) for k, v in SEED.items()})
