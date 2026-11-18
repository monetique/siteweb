from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page()
    dialogs=[]; pg.on('dialog', lambda d: (dialogs.append(d.message), d.dismiss()))
    for path in ['/actualites/xss-qa/','/actualites/','/']:
        pg.goto('http://localhost:4321'+path, wait_until='networkidle'); pg.wait_for_timeout(400)
    pg.goto('http://localhost:4321/actualites/xss-qa/', wait_until='networkidle')
    link=pg.get_by_text('lien piégé')
    print('href du lien piégé :', link.get_attribute('href') if link.count() else 'absent')
    if link.count(): link.click(); pg.wait_for_timeout(500)
    print('window.__xss =', pg.evaluate('window.__xss'), '| alertes :', dialogs)
    b.close()
