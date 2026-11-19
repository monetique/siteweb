"""QA crawl of every page in the sitemap: errors, network, SEO, a11y (axe), overflow."""
import json, re, sys
from playwright.sync_api import sync_playwright

import os, sys
BASE = os.environ.get('QA_BASE', sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3100').rstrip('/')
AXE = open(os.environ.get('AXE_PATH', os.path.join(os.path.dirname(__file__), 'node_modules/axe-core/axe.min.js'))).read()
import urllib.request
sitemap = urllib.request.urlopen(BASE + '/sitemap.xml', timeout=120).read().decode()
paths = sorted({re.sub(r'^https?://[^/]+', '', u) for u in re.findall(r'<loc>(.*?)</loc>', sitemap)})
paths += ['/cookies/', '/en/cookies/', '/ar/cookies/', '/page-inexistante/']
PLACEHOLDER = re.compile(r'lorem|ipsum|undefined|\bnull\b|NaN|\[object|TODO|tobemodified|xxx', re.I)

results = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, locale='fr-FR')
    for path in paths:
        pg = ctx.new_page()
        r = {'path': path, 'console': [], 'pageerror': [], 'failed': []}
        pg.on('console', lambda m, r=r: r['console'].append(m.text[:200]) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e, r=r: r['pageerror'].append(str(e)[:200]))
        pg.on('requestfailed', lambda q, r=r: r['failed'].append(f'{q.url[:120]} {q.failure}'))
        pg.on('response', lambda s, r=r: r['failed'].append(f'{s.status} {s.url[:120]}') if s.status >= 400 and 'page-inexistante' not in s.url else None)
        resp = pg.goto(BASE + path, wait_until='networkidle')
        r['status'] = resp.status if resp else None
        pg.wait_for_timeout(300)
        r.update(pg.evaluate('''() => {
          const q = s => document.querySelector(s);
          const text = document.body.innerText;
          const heads = [...document.querySelectorAll('h1,h2,h3,h4')].map(h => +h.tagName[1]);
          let skips = []; for (let i=1;i<heads.length;i++) if (heads[i]-heads[i-1]>1) skips.push(heads[i-1]+'>'+heads[i]);
          return {
            title: document.title,
            desc: q('meta[name=description]')?.content || '',
            canonical: q('link[rel=canonical]')?.href || '',
            ogTitle: q('meta[property="og:title"]')?.content || '',
            lang: document.documentElement.lang,
            dir: document.documentElement.dir,
            hreflang: [...document.querySelectorAll('link[rel=alternate][hreflang]')].length,
            wrongLangLinks: (() => { const L = location.pathname.match(/^\\/(en|ar)\\//)?.[1]; return [...document.querySelectorAll('header a[href^="/"], main a[href^="/"], footer a[href^="/"]')].filter(a => !a.hasAttribute('hreflang')).map(a => a.getAttribute('href')).filter(h => L ? !h.startsWith('/' + L + '/') : /^\\/(en|ar)\\//.test(h)).slice(0, 5); })(),
            arabicLeftovers: (() => { if (/^\\/ar\\//.test(location.pathname)) return []; const re = /[\\u0600-\\u06FF]/; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const out = []; let n; while ((n = w.nextNode())) { if (re.test(n.data) && !n.parentElement.closest('[hreflang],[lang="ar"],script,style')) out.push(n.data.trim().slice(0, 60)); } return out.slice(0, 5); })(),
            frenchLeftovers: (() => { if (!/^\\/(en|ar)\\//.test(location.pathname)) return []; const fr = /\\b(Toutes|Voir tous|En savoir plus|Nous contacter|Accueil|Lire l’article|Date limite|Consulter)\\b/; return [...document.querySelectorAll('main, header, footer')].flatMap(e => [...e.querySelectorAll('a,button,span,h1,h2,h3,p,th,label')]).map(e => e.childNodes.length === 1 ? e.textContent.trim() : '').filter(t => fr.test(t)).slice(0, 5); })(),
            h1: [...document.querySelectorAll('h1')].map(h => h.innerText.trim()),
            emptyHeadings: [...document.querySelectorAll('h1,h2,h3,h4')].filter(h => !h.innerText.trim()).length,
            headingSkips: [...new Set(skips)],
            imgNoAlt: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).map(i => i.src.slice(-60)),
            brokenImg: [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.slice(-60)),
            missingIcons: [...document.querySelectorAll('[data-icon-missing]')].map(e => e.dataset.iconMissing),
            emptyIconBoxes: [...document.querySelectorAll('div,span')].filter(e => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return b.width >= 32 && b.width <= 96 && Math.abs(b.width - b.height) < 2 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && e.children.length === 0 && !e.textContent.trim(); }).length,
            emptyLinks: [...document.querySelectorAll('a')].filter(a => !a.innerText.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""])')).map(a => a.getAttribute('href')),
            hashLinks: [...document.querySelectorAll('a[href="#"]')].map(a => a.innerText.trim()),
            textLen: text.length,
            placeholders: [...(text.match(/lorem|ipsum|\\bundefined\\b|\\bnull\\b|\\[object|\\bTODO\\b/gi) || []), ...(text.match(/\\bNaN\\b/g) || [])],
            jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent)['@type']; } catch(e) { return 'INVALID'; } }),
          };
        }'''))
        pg.add_script_tag(content=AXE)
        axe = pg.evaluate("async () => { const r = await axe.run(document, {runOnly: {type:'tag', values:['wcag2a','wcag2aa','wcag21aa']}}); return r.violations.map(v => ({id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, sample: v.nodes.slice(0,2).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary||'').slice(0,160))})); }")
        r['axe'] = axe
        over = {}
        for w in (360, 768, 1024):
            pg.set_viewport_size({'width': w, 'height': 800}); pg.wait_for_timeout(150)
            o = pg.evaluate('() => { const W = document.documentElement.clientWidth; const bad = [...document.querySelectorAll("body *")].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > W + 1 && getComputedStyle(e).position !== "fixed"; }).slice(0,3).map(e => e.tagName + "." + (e.className||"").toString().slice(0,50) + " w=" + Math.round(e.getBoundingClientRect().right)); return {sw: document.documentElement.scrollWidth, W, bad}; }')
            if o['sw'] > o['W'] + 1: over[w] = o
        r['overflow'] = over
        results.append(r)
        pg.close()
        print('.', end='', flush=True)
    b.close()
json.dump(results, open('/home/claude/qa/crawl.json', 'w'), ensure_ascii=False, indent=1)
print('\npages:', len(results))
