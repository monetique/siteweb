"""Tests de sécurité de l'API Strapi (accès public, brouillons, rôles éditoriaux)."""
import os
ADMIN_EMAIL = os.environ.get('QA_ADMIN_EMAIL', 'admin@smt.local')
ADMIN_PASSWORD = os.environ['QA_ADMIN_PASSWORD']  # compte admin de RECETTE locale uniquement
import json, urllib.request, urllib.error

S = 'http://localhost:1337'
ok, ko = [], []
def check(name, cond, detail=''):
    (ok if cond else ko).append(f'{name}{" — " + str(detail) if detail != "" else ""}')

def req(method, path, body=None, token=None, headers=None):
    h = {'Content-Type': 'application/json', **(headers or {})}
    if token: h['Authorization'] = f'Bearer {token}'
    r = urllib.request.Request(S + path, method=method, data=json.dumps(body).encode() if body is not None else None, headers=h)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, resp.read().decode(), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(), dict(e.headers)

# --- Lecture/écriture publiques
for col in ['actualites', 'appels-offres', 'pages', 'solutions', 'innovations', 'partenaires', 'faqs']:
    st, _, _ = req('POST', f'/api/{col}', {'data': {'title': 'pirate', 'name': 'pirate', 'question': 'x'}})
    check(f'POST public /api/{col} refusé', st in (401, 403, 405), st)
st, body, _ = req('GET', '/api/actualites?pagination[pageSize]=1')
doc = json.loads(body)['data'][0]['documentId']
for m in ('PUT', 'DELETE'):
    st, _, _ = req(m, f'/api/actualites/{doc}', {'data': {'title': 'pirate'}})
    check(f'{m} public sur une actualité refusé', st in (401, 403, 405), st)
st, _, _ = req('PUT', '/api/global', {'data': {'siteName': 'pirate'}})
check('Modification publique des réglages globaux refusée', st in (401, 403, 405), st)
st, _, _ = req('GET', '/api/messages-contact')
check('Lecture publique des messages de contact refusée', st in (401, 403), st)
for path in ['/api/users', '/api/users/me', '/api/upload/files']:
    st, _, _ = req('GET', path)
    check(f'GET public {path} refusé', st in (401, 403), st)
st, _, _ = req('POST', '/api/upload')
check('Envoi de fichier public refusé', st in (400, 401, 403), st)
st, body, _ = req('POST', '/api/auth/local/register', {'username': 'qa-intrus', 'email': 'qa-intrus@example.com', 'password': 'Intrus123!'})
check('Inscription publique d’utilisateurs désactivée', st != 200, f'{st} {body[:80]}')

# --- Formulaire de contact
st, body, _ = req('POST', '/api/messages-contact', {'data': {'fullName': 'QA', 'email': 'qa@smt.tn', 'subject': 'paysmart', 'message': 'x' * 6000, 'elapsed': 9000, 'consent': True}})
check('Message > 5000 caractères refusé', st == 400, st)
st, body, _ = req('POST', '/api/messages-contact', {'data': {'fullName': 'QA', 'email': 'qa@smt.tn', 'subject': 'paysmart', 'message': 'sans case', 'elapsed': 9000}})
check('Message sans consentement exprès refusé (loi 2004-63, art. 27)', st == 400 and 'onsentement' in body, f'{st} {body[:50]}')
st, body, _ = req('POST', '/api/messages-contact', {'data': {'fullName': 'QA', 'email': 'qa@smt.tn', 'subject': 'inconnu', 'message': 'x', 'elapsed': 9000, 'consent': True}})
check('Objet hors liste refusé', st == 400, st)
st, body, _ = req('POST', '/api/messages-contact', {'data': {'fullName': '<script>alert(1)</script>', 'email': 'qa@smt.tn', 'subject': 'paysmart', 'message': 'test', 'elapsed': 9000, 'consent': True}})
check('Réponse publique sans donnée renvoyée', body.strip() == '{"ok":true}', body[:60])
codes = [req('POST', '/api/messages-contact', {'data': {'fullName': 'Flood', 'email': 'f@smt.tn', 'subject': 'paysmart', 'message': 'flood', 'elapsed': 9000, 'consent': True}})[0] for _ in range(25)]
# Filtre anti-spam côté serveur : réponse identique (le robot n'apprend rien), message non enregistré (voir journal Strapi « message écarté »)
for label, extra in [('envoi direct sans délai de saisie', {}), ('champ piège rempli', {'website': 'http://spam.example', 'elapsed': 9000}),
                     ('envoi en moins de 3 s', {'elapsed': 500}), ('plus de 3 liens', {'elapsed': 9000, 'message': 'http://a http://b http://c http://d'})]:
    payload = {'fullName': 'Robot QA', 'email': 'robot@example.com', 'subject': 'paysmart', 'message': 'spam', **extra}
    st, body, _ = req('POST', '/api/messages-contact', {'data': payload})
    check(f'Anti-spam : {label} → réponse neutre', st in (201, 429) and (st == 429 or body.strip() == '{"ok":true}'), f'{st} {body[:40]}')
check('Limitation des envois en rafale (25 messages d’affilée)', any(c == 429 for c in codes), f'codes : {sorted(set(codes))}')
st, _, h = req('OPTIONS', '/api/messages-contact', headers={'Origin': 'https://site-pirate.example', 'Access-Control-Request-Method': 'POST'})
check('CORS limité au domaine du site', h.get('Access-Control-Allow-Origin') not in ('*', 'https://site-pirate.example'), h.get('Access-Control-Allow-Origin'))

# --- En-têtes de sécurité
_, _, h = req('GET', '/api/solutions')
for header in ['X-Frame-Options', 'X-Content-Type-Options', 'Strict-Transport-Security', 'Content-Security-Policy']:
    check(f'En-tête {header} présent', any(k.lower() == header.lower() for k in h), '')
check('Pas de bannière X-Powered-By', not any(k.lower() == 'x-powered-by' for k in h), h.get('X-Powered-By', ''))

# --- Brouillons et rôles éditoriaux
st, body, _ = req('POST', '/admin/login', {'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD})
admin = json.loads(body)['data']['token']
st, body, _ = req('POST', '/content-manager/collection-types/api::actualite.actualite?locale=fr',
                  {'title': 'Brouillon QA confidentiel', 'slug': 'brouillon-qa-confidentiel', 'date': '2026-11-17', 'category': 'actualite'}, admin)
draft = json.loads(body).get('data', {}).get('documentId')
check('Création d’un brouillon (admin)', st in (200, 201) and draft, st)
st, body, _ = req('GET', '/api/actualites?filters[slug][$eq]=brouillon-qa-confidentiel')
check('Brouillon invisible dans l’API publique', json.loads(body)['data'] == [], body[:80])
st, body, _ = req('GET', '/api/actualites?status=draft&filters[slug][$eq]=brouillon-qa-confidentiel')
check('Brouillon invisible même avec ?status=draft', st in (401, 403) or json.loads(body).get('data') == [], f'{st} {body[:80]}')

roles = json.loads(req('GET', '/admin/roles', token=admin)[1])['data']
author = next(r for r in roles if r['code'] == 'strapi-author')
st, body, _ = req('POST', '/admin/users', {'firstname': 'Rédacteur', 'lastname': 'QA', 'email': 'redacteur.qa@smt.local', 'roles': [author['id']]}, admin)
uid = json.loads(body).get('data', {}).get('id') if st in (200, 201) else None
if uid is None:
    uid = next(u['id'] for u in json.loads(req('GET', '/admin/users?pageSize=50', token=admin)[1])['data']['results'] if u['email'] == 'redacteur.qa@smt.local')
req('PUT', f'/admin/users/{uid}', {'password': 'Redacteur2026!QA', 'isActive': True}, admin)
st, body, _ = req('POST', '/admin/login', {'email': 'redacteur.qa@smt.local', 'password': 'Redacteur2026!QA'})
red = json.loads(body)['data']['token'] if st == 200 else None
check('Connexion du Rédacteur', bool(red), st)
st, body, _ = req('POST', '/content-manager/collection-types/api::actualite.actualite?locale=fr',
                  {'title': 'Article du rédacteur QA', 'slug': 'article-redacteur-qa', 'date': '2026-11-17', 'category': 'actualite'}, red)
rdoc = json.loads(body).get('data', {}).get('documentId')
check('Le Rédacteur peut créer un brouillon', st in (200, 201) and rdoc, st)
st, body, _ = req('POST', f'/content-manager/collection-types/api::actualite.actualite/{rdoc}/actions/publish?locale=fr', {}, red)
check('Le Rédacteur ne peut PAS publier', st in (401, 403), f'{st} {body[:80]}')
st, body, _ = req('PUT', f'/content-manager/collection-types/api::actualite.actualite/{draft}?locale=fr', {'title': 'modif par rédacteur'}, red)
check('Le Rédacteur ne peut pas modifier le contenu d’un autre', st in (401, 403), st)
st, _, _ = req('GET', '/content-manager/collection-types/api::message-contact.message-contact', token=red)
check('Le Rédacteur n’a pas accès aux messages de contact', st in (401, 403), st)
st, _, _ = req('PUT', '/content-manager/single-types/api::global.global?locale=fr', {'siteName': 'x'}, red)
check('Le Rédacteur ne peut pas modifier les réglages globaux', st in (401, 403), st)
st, body, _ = req('POST', f'/content-manager/collection-types/api::actualite.actualite/{rdoc}/actions/publish?locale=fr', {}, admin)
check('Le Validateur / admin peut publier', st in (200, 201), st)

# nettoyage des données de test
for d in (draft, rdoc):
    if d: req('DELETE', f'/content-manager/collection-types/api::actualite.actualite/{d}?locale=*', token=admin)
req('DELETE', f'/admin/users/{uid}', token=admin)

print(f'OK {len(ok)} / KO {len(ko)}')
for k in ko: print('KO :', k)
for o in ok: print('ok :', o)
