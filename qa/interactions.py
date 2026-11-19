"""Scénarios d'interaction utilisateur sur le site statique."""
import os, sys, re
from playwright.sync_api import sync_playwright, expect

# Usage : python3 interactions.py [URL]  (défaut : build statique servi sur 4321 ; dev : http://localhost:3100)
B = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get('QA_BASE', 'http://localhost:4321')).rstrip('/')
NOT_FOUND = '/404.html' if ':4321' in B else '/page-inexistante/'
ok, ko = [], []
def check(name, cond, detail=''):
    (ok if cond else ko).append(f'{name}{" — " + detail if detail else ""}')

with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={'width': 1440, 'height': 900})

    # 1. Navigation principale : chaque entrée du menu mène à la bonne page et est surlignée
    pg.goto(B + '/', wait_until='networkidle')
    for label, path in [('Monétique Tunisie', '/monetique-tunisie/'), ('Expertise', '/expertise/'), ('Statistiques', '/statistiques/'),
                        ('Actualités', '/actualites/'), ('Partenaires', '/partenaires/'), ('FAQ', '/faq/')]:
        pg.locator('nav[aria-label="Navigation principale"]').get_by_role('link', name=label, exact=True).click()
        pg.wait_for_url(f'**{path}'); pg.wait_for_timeout(200)
        cur = pg.locator('nav[aria-label="Navigation principale"] [aria-current=page]').first.inner_text()
        check(f'Menu « {label} »', label in cur, f'surligné : {cur!r}')

    # 2. Sous-menu Solutions au survol et au clavier
    pg.goto(B + '/', wait_until='networkidle')
    pg.locator('nav[aria-label="Navigation principale"] >> text=Solutions').first.hover(); pg.wait_for_timeout(300)
    check('Sous-menu Solutions au survol', pg.get_by_role('link', name='Switch Mobile').first.is_visible())
    pg.mouse.move(10, 600); pg.wait_for_timeout(200)
    pg.locator('nav[aria-label="Navigation principale"] >> text=Solutions').first.focus(); pg.keyboard.press('Tab'); pg.wait_for_timeout(200)
    focused = pg.evaluate('document.activeElement.innerText')
    check('Sous-menu Solutions au clavier (Tab)', 'Toutes nos solutions' in focused, f'focus sur {focused!r}')
    pg.get_by_role('link', name='Switch Mobile').first.click(); pg.wait_for_url('**/solutions/switch-mobile/')
    check('Lien sous-menu → fiche Switch Mobile', pg.locator('h1').inner_text() == 'Switch Mobile')

    # 2 quater. Bannière d'accueil : mot animé du titre, image, encadré cliquable
    pg.goto(B + '/', wait_until='networkidle')
    seen = []
    for _ in range(3):
        seen.append(pg.locator('h1 [data-active]').inner_text()); pg.wait_for_timeout(2900)
    check('Titre : « Solutions de paiement digital » + mot animé', pg.locator('h1').inner_text().startswith('Solutions de paiement digital') and seen == ['sécurisées', 'innovantes', 'fiables'], ' → '.join(seen))
    check('Titre : les 3 mots lus par les lecteurs d’écran', pg.locator('h1 .sr-only').inner_text() == 'sécurisées, innovantes, fiables')
    check('Bannière : image chargée', pg.evaluate("(() => { const i = document.querySelector('main section img'); return !!i && i.complete && i.naturalWidth > 0 })()"))
    pg.locator('main section a[href*="monetique-tunisie"]').first.click(); pg.wait_for_url('**/monetique-tunisie/')
    check('Encadré « Leader… » → page Monétique Tunisie', pg.url.endswith('/monetique-tunisie/'), pg.url)

    # 2 ter. Bandeau : heures des pays de l'expertise internationale, décalage par rapport à Tunis
    pg.goto(B + '/', wait_until='networkidle'); pg.wait_for_timeout(300)
    clocks = pg.eval_on_selector_all('header ul[aria-label] li', 'e => e.map(l => l.innerText.replace(/\\s+/g, " ").trim())')
    from datetime import datetime, timezone
    from zoneinfo import ZoneInfo
    def hm(tz): return datetime.now(timezone.utc).astimezone(ZoneInfo(tz)).strftime('%H:%M')
    exp = [f'{n} {hm(tz)}' for n, tz in [('Alger', 'Africa/Algiers'), ('Tripoli', 'Africa/Tripoli'), ('Nouakchott', 'Africa/Nouakchott'),
                                          ('Kigali', 'Africa/Kigali'), ('Brazzaville', 'Africa/Brazzaville'), ('Praia', 'Atlantic/Cape_Verde')]]
    check('Bandeau : 6 horloges des capitales à l’heure', clocks == exp, ' | '.join(clocks))

    # 2 bis. Sous-menu Expertise : lien direct vers chaque section (ancre), y compris depuis la même page
    nav = pg.locator('nav[aria-label="Navigation principale"]')
    sec_top = lambda a: pg.evaluate(f'document.getElementById("{a}").getBoundingClientRect().top')
    pg.goto(B + '/', wait_until='networkidle')
    nav.get_by_role('link', name='Expertise', exact=True).hover(); pg.wait_for_timeout(300)
    check('Sous-menu Expertise au survol (5 sections + vue d’ensemble)', pg.get_by_role('link', name='Toute notre expertise').is_visible() and nav.locator('a[href*="/expertise#"], a[href*="/expertise/#"]').count() == 5)
    nav.locator('a[href*="#securite"]').click(); pg.wait_for_url('**/expertise/#securite'); pg.wait_for_timeout(800)
    check('Expertise → « Sécurité » : section affichée sous l’en-tête', 80 < sec_top('securite') < 300, f'top={sec_top("securite"):.0f}px')
    pg.mouse.move(700, 600); pg.wait_for_timeout(300)
    check('Menu Expertise refermé après le clic', not pg.get_by_role('link', name='Toute notre expertise').is_visible())
    nav.get_by_role('link', name='Expertise', exact=True).hover(); pg.wait_for_timeout(300)
    nav.locator('a[href*="#monetique"]').click(); pg.wait_for_timeout(1000)
    check('Expertise → « Monétique » depuis la même page', pg.url.endswith('#monetique') and 80 < sec_top('monetique') < 300, f'top={sec_top("monetique"):.0f}px')
    pg.mouse.move(700, 600); pg.wait_for_timeout(300)
    check('Menu refermé après une ancre sur la même page', not pg.get_by_role('link', name='Toute notre expertise').is_visible())

    # 3. Lien d'évitement et retour en haut
    pg.goto(B + '/expertise/', wait_until='networkidle'); pg.keyboard.press('Tab')
    check('Lien « Aller au contenu » au premier Tab', pg.evaluate('document.activeElement.innerText') == 'Aller au contenu')
    pg.mouse.wheel(0, 3000); pg.wait_for_timeout(500)
    btn = pg.get_by_label('Retour en haut de page')
    check('Bouton retour en haut visible après défilement', btn.is_visible())
    btn.click(); pg.wait_for_timeout(1200)
    check('Retour en haut fonctionne', pg.evaluate('window.scrollY') < 50)

    # 4. Ancres de l'expertise
    pg.goto(B + '/expertise/#securite', wait_until='networkidle'); pg.wait_for_timeout(600)
    top = pg.evaluate('document.getElementById("securite").getBoundingClientRect().top')
    check('Ancre #securite visible sous l’en-tête fixe', 80 < top < 300, f'top={top:.0f}px')

    # 5. Liste filtrable des actualités
    pg.goto(B + '/actualites/', wait_until='networkidle')
    live = pg.locator('p[aria-live=polite]')
    check('Actualités : 15 publications au total', live.inner_text().startswith('15'), live.inner_text())
    pg.get_by_role('tab', name='Évènements').click(); check('Filtre Évènements = 4', live.inner_text().startswith('4 '), live.inner_text())
    pg.get_by_role('tab', name='Toutes').click()
    pg.fill('input[type=search]', 'smt ao 05'); check('Recherche par référence « SMT AO 05 »', live.inner_text().startswith('1 '), live.inner_text())
    pg.fill('input[type=search]', 'evenement'); check('Recherche insensible aux accents (« evenement »)', not live.inner_text().startswith('0'), live.inner_text())
    pg.fill('input[type=search]', 'zzzz'); check('Recherche sans résultat → message', pg.get_by_text('Aucune publication ne correspond').is_visible())
    pg.fill('input[type=search]', ''); pg.get_by_role('button', name='2', exact=True).click(); pg.wait_for_timeout(200)
    check('Pagination page 2', 'page 2 sur 2' in live.inner_text(), live.inner_text())
    pg.locator('article a').first.click(); pg.wait_for_load_state('networkidle')
    check('Carte → page de détail', pg.locator('h1').count() == 1 and '/actualites/' in pg.url or '/appels-offres/' in pg.url, pg.url)

    # 6. FAQ : accordéons et sommaire
    pg.goto(B + '/faq/', wait_until='networkidle')
    d = pg.locator('details').nth(1)
    check('FAQ : 2e question fermée par défaut', d.get_attribute('open') is None)
    d.locator('summary').click(); check('FAQ : ouverture au clic', d.get_attribute('open') is not None)
    pg.get_by_role('link', name='Glossaire').click(); pg.wait_for_timeout(500)
    check('FAQ : lien rubrique Glossaire', pg.url.endswith('#faq-glossaire'))

    # 7. Formulaire de contact : validation navigateur, envoi, erreur serveur
    pg.goto(B + '/contact/', wait_until='networkidle')
    pg.get_by_role('button', name='Envoyer').click(); pg.wait_for_timeout(300)
    check('Formulaire vide bloqué (champs requis)', pg.locator('form [aria-live=polite]').inner_text().strip() == '')
    pg.fill('input[name=fullName]', 'QA Test'); pg.fill('input[name=email]', 'pas-un-email'); pg.select_option('select[name=subject]', 'paysmart'); pg.fill('textarea[name=message]', 'Test QA')
    pg.get_by_role('button', name='Envoyer').click(); pg.wait_for_timeout(300)
    check('E-mail invalide bloqué', pg.evaluate('document.querySelector("input[name=email]").validity.valid') is False)
    pg.fill('input[name=email]', 'qa@smt.tn'); pg.get_by_role('button', name='Envoyer').click(); pg.wait_for_timeout(1500)
    check('Envoi valide → confirmation', 'bien été transmis' in pg.locator('form [aria-live=polite]').inner_text())
    check('Formulaire vidé après envoi', pg.input_value('input[name=fullName]') == '')
    pg.route('**/api/messages-contact', lambda r: r.fulfill(status=500, body='{}'))
    pg.fill('input[name=fullName]', 'QA Erreur'); pg.fill('input[name=email]', 'qa@smt.tn'); pg.select_option('select[name=subject]', 'paysmart'); pg.fill('textarea[name=message]', 'x')
    pg.get_by_role('button', name='Envoyer').click(); pg.wait_for_timeout(1000)
    check('Erreur serveur → message d’erreur avec contact de secours', 'échoué' in pg.locator('form [aria-live=polite]').inner_text())

    # 8. Mobile : menu, sous-menu, fermeture à la navigation
    m = br.new_page(viewport={'width': 375, 'height': 812})
    m.goto(B + '/', wait_until='networkidle')
    check('Mobile : menu principal masqué', not m.locator('nav[aria-label="Navigation principale"]').is_visible())
    m.get_by_label('Ouvrir le menu').click()
    check('Mobile : menu ouvert', m.locator('#menu-mobile').is_visible())
    m.locator('#menu-mobile summary', has_text='Solutions').click(); m.locator('#menu-mobile').get_by_role('link', name='Certification').click(); m.wait_for_url('**/solutions/certification/'); m.wait_for_timeout(300)
    check('Mobile : menu refermé après navigation', m.locator('#menu-mobile').count() == 0)

    # 9. Page 404 générée
    pg.goto(B + NOT_FOUND, wait_until='networkidle')
    check('Page 404 personnalisée (trilingue)', 'Page introuvable' in pg.locator('body').inner_text() and 'Page not found' in pg.locator('body').inner_text())

    # 10. Liens externes et mailto/tel
    pg.goto(B + '/appels-offres/administrateur-independant-comite-audit-risques/', wait_until='networkidle')
    ext = pg.locator('article a[href^="http"]').first
    check('Lien PDF externe ouvert dans un nouvel onglet', ext.get_attribute('target') == '_blank' and 'noopener' in (ext.get_attribute('rel') or ''))
    pg.goto(B + '/', wait_until='networkidle')
    check('Liens tel: au format international', all(h.startswith('tel:+216') for h in pg.eval_on_selector_all('a[href^="tel:"]', 'e => e.map(a => a.getAttribute("href"))')))

    # 11. Versions anglaise et arabe
    pg.goto(B + '/solutions/switch-mobile/', wait_until='networkidle')
    pg.locator('header a[hreflang=en]').click(); pg.wait_for_url('**/en/solutions/switch-mobile/'); pg.wait_for_load_state('networkidle')
    check('Sélecteur EN conserve la page', pg.evaluate('document.documentElement.lang') == 'en', pg.url)
    pg.locator('header a[hreflang=ar]').click(); pg.wait_for_url('**/ar/solutions/switch-mobile/'); pg.wait_for_load_state('networkidle')
    check('Sélecteur AR → lang=ar, dir=rtl', pg.evaluate('[document.documentElement.lang, document.documentElement.dir]') == ['ar', 'rtl'])
    check('AR : texte aligné à droite', pg.evaluate('getComputedStyle(document.querySelector("main h1")).textAlign') in ('start', 'right'))
    pg.locator('header nav').nth(1).get_by_role('link', name='الإحصائيات', exact=True).click(); pg.wait_for_url('**/ar/statistiques/')
    check('AR : menu reste dans la langue', pg.url.endswith('/ar/statistiques/'), pg.url)
    nums = pg.eval_on_selector_all('table td span[dir=ltr]', 'e => e.slice(0, 3).map(x => x.innerText)')
    check('AR : chiffres non inversés', all(re.fullmatch(r'[\d\s.,+%-]+', n or '') for n in nums) and len(nums) > 0, str(nums))
    pg.locator('header a[hreflang=fr]').click(); pg.wait_for_url('**/statistiques/')
    check('Retour FR à la racine', '/ar/' not in pg.url and pg.evaluate('document.documentElement.lang') == 'fr', pg.url)
    pg.goto(B + '/en/actualites/', wait_until='networkidle')
    live = pg.locator('p[aria-live=polite]')
    pg.get_by_role('tab', name='Events').click(); check('EN : filtre « Events »', live.inner_text().startswith('4 '), live.inner_text())
    pg.goto(B + '/ar/contact/', wait_until='networkidle'); pg.unroute('**/api/messages-contact')
    pg.fill('input[name=fullName]', 'QA عربي'); pg.fill('input[name=email]', 'qa@smt.tn'); pg.select_option('select[name=subject]', 'paysmart'); pg.fill('textarea[name=message]', 'اختبار')
    pg.locator('form button[type=submit]').click(); pg.wait_for_timeout(1500)
    check('AR : formulaire envoyé, confirmation en arabe', 'شكرًا' in pg.locator('form [aria-live=polite]').inner_text(), pg.locator('form [aria-live=polite]').inner_text())
    m.goto(B + '/ar/', wait_until='networkidle'); m.locator('button[aria-controls=menu-mobile]').click()
    check('AR mobile : menu ouvert', m.locator('#menu-mobile').is_visible())
    m.locator('#menu-mobile').get_by_role('link', name='الأخبار').click(); m.wait_for_url('**/ar/actualites/')
    check('AR mobile : navigation dans la langue', m.url.endswith('/ar/actualites/'), m.url)
    pg.goto(B + '/ar/', wait_until='networkidle')
    pg.locator('header nav').nth(1).get_by_role('link', name='الخبرة', exact=True).hover(); pg.wait_for_timeout(300)
    pg.locator('header nav').nth(1).locator('a[href*="#securite"]').click(); pg.wait_for_url('**/ar/expertise/#securite'); pg.wait_for_timeout(800)
    check('AR : sous-menu الخبرة → section الأمن', 80 < sec_top('securite') < 300, pg.url)
    m.goto(B + '/expertise/', wait_until='networkidle'); m.locator('button[aria-controls=menu-mobile]').click()
    if not m.locator('#menu-mobile a[href*="#ecommerce"]').is_visible(): m.locator('#menu-mobile summary', has_text='Expertise').click()
    m.locator('#menu-mobile a[href*="#ecommerce"]').click(); m.wait_for_timeout(1000)
    check('Mobile : Expertise → E-commerce, menu refermé', m.locator('#menu-mobile').count() == 0 and m.url.endswith('#ecommerce'), m.url)
    hl = pg.eval_on_selector_all('link[rel=alternate][hreflang]', 'e => e.map(l => l.hreflang).sort()')
    check('Balises hreflang fr/en/ar/x-default', hl == ['ar', 'en', 'fr', 'x-default'], str(hl))
    br.close()

print(f'OK {len(ok)} / KO {len(ko)}')
for k in ko: print('KO :', k)
for o in ok: print('ok :', o)
