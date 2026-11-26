"""Contrôles de sécurité du back-office Drupal (API publique, formulaire de contact, rôles).

    DRUPAL_URL=http://127.0.0.1:8080 DRUSH="vendor/bin/drush" python3 qa/drupal_security.py

DRUSH (lancé depuis le dossier drupal/) sert à vérifier l'enregistrement des messages et les droits des rôles.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request

B = os.environ.get('DRUPAL_URL', 'http://127.0.0.1:8080').rstrip('/')
DRUSH = os.environ.get('DRUSH', 'vendor/bin/drush')
DRUPAL_DIR = os.environ.get('DRUPAL_DIR', '.')
ok = ko = 0


def check(label, cond, detail=''):
    global ok, ko
    if cond: ok += 1; print(f'ok : {label}' + (f' — {detail}' if detail else ''))
    else: ko += 1; print(f'KO : {label} — {detail}')


def req(method, path, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', **(headers or {})}
    r = urllib.request.Request(B + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            return resp.status, resp.read().decode(), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(), dict(e.headers)


def drush(php):
    out = subprocess.run([DRUSH, 'php:eval', php], cwd=DRUPAL_DIR, capture_output=True, text=True, timeout=120)
    return out.stdout.strip()


def reset_flood():
    """Remet à zéro la limitation d'envois (sinon les contrôles successifs du test se bloquent entre eux)."""
    drush("\\Drupal::database()->delete('flood')->condition('event','smt_site.contact')->execute();")


def count_msgs():
    return int(drush("echo \\Drupal::entityQuery('node')->accessCheck(FALSE)->condition('type','message_contact')->count()->execute();") or 0)


# --- API publique en lecture seule, ressources sensibles absentes
st, body, _ = req('GET', '/jsonapi')
res = sorted(json.loads(body)['links']) if st == 200 else []
check('Index JSON:API accessible en lecture', st == 200, st)
check('Aucune ressource utilisateur, rôle ou configuration exposée',
      not [r for r in res if r.split('--')[0] not in ('self', 'node', 'paragraph', 'file')], [r for r in res if r.split('--')[0] not in ('self', 'node', 'paragraph', 'file')][:5])
check('Messages de contact absents de l’API', 'node--message_contact' not in res)
for path in ['/jsonapi/node/message_contact', '/jsonapi/user/user', '/jsonapi/user_role/user_role']:
    st, _, _ = req('GET', path)
    check(f'GET public {path} refusé', st in (403, 404), st)
for col in ['page', 'actualite', 'solution', 'innovation', 'faq']:
    st, _, _ = req('POST', f'/jsonapi/node/{col}', {'data': {'type': f'node--{col}', 'attributes': {'title': 'pirate'}}},
                   {'Content-Type': 'application/vnd.api+json'})
    check(f'Écriture publique /jsonapi/node/{col} refusée', st in (401, 403, 405), st)
st, body, _ = req('GET', '/jsonapi/node/page')
check('Seuls les contenus publiés sont listés', st == 200 and all(d['attributes'].get('status', True) for d in json.loads(body)['data']))
st, _, _ = req('GET', '/user/register')
check('Création de compte publique désactivée', st in (403, 404), st)

# --- Formulaire de contact
base = {'fullName': 'Test QA', 'email': 'qa@example.com', 'subject': 'carte_bancaire', 'phone': '+216 71 000 000',
        'consent': True, 'website': '', 'elapsed': 5000}
reset_flood()
before = count_msgs()
st, body, _ = req('POST', '/api/messages-contact', {'data': {**base, 'message': f'Message légitime {time.time()}'}})
check('Message légitime accepté (201, sans donnée renvoyée)', st == 201 and json.loads(body) == {'ok': True}, f'{st} {body[:60]}')
check('Message légitime enregistré', count_msgs() == before + 1)
nid = drush("$ids=\\Drupal::entityQuery('node')->accessCheck(FALSE)->condition('type','message_contact')->sort('nid','DESC')->range(0,1)->execute(); echo reset($ids);")
info = json.loads(drush(f"$n=\\Drupal\\node\\Entity\\Node::load({nid}); echo json_encode(['status'=>(int)$n->isPublished(),'st'=>$n->get('message_contact_status')->value,'consent'=>$n->get('message_contact_consent_at')->value]);") or '{}')
check('Message non publié, statut « nouveau », consentement daté', info.get('status') == 0 and info.get('st') == 'nouveau' and bool(info.get('consent')), info)
st, _, _ = req('GET', f'/node/{nid}')
check('Message illisible par le public', st in (403, 404), st)
st, body, _ = req('GET', f'/jsonapi/node/page?filter[drupal_internal__nid]={nid}')
check('Message absent même en filtrant les pages par identifiant', st == 200 and not json.loads(body)['data'])
for label, extra in [('champ piège rempli', {'website': 'http://spam'}), ('envoi trop rapide', {'elapsed': 500}),
                     ('trop de liens', {'message': ' '.join(['http://x.tn'] * 5)})]:
    reset_flood()
    n0 = count_msgs()
    st, body, _ = req('POST', '/api/messages-contact', {'data': {**base, 'message': f'spam {label} {time.time()}', **extra}})
    check(f'Anti-spam ({label}) : réponse neutre, rien enregistré', st == 201 and count_msgs() == n0, st)
reset_flood()
st, _, _ = req('POST', '/api/messages-contact', {'data': {**base, 'consent': False, 'message': f'sans consentement {time.time()}'}})
check('Sans consentement : refusé (400)', st == 400, st)
reset_flood()
n0 = count_msgs()
st, _, _ = req('POST', '/api/messages-contact', {'data': {**base, 'message': f'objet invalide {time.time()}', 'subject': 'n_importe_quoi'}})
check('Objet hors liste : refusé, rien enregistré', st == 400 and count_msgs() == n0, st)
reset_flood()
n0 = count_msgs()
st, _, _ = req('POST', '/api/messages-contact', {'data': {**base, 'message': f'statut forcé {time.time()}', 'status': 'traite', 'internalNote': 'x'}})
forced = drush("$ids=\\Drupal::entityQuery('node')->accessCheck(FALSE)->condition('type','message_contact')->sort('nid','DESC')->range(0,1)->execute(); $n=\\Drupal\\node\\Entity\\Node::load(reset($ids)); echo $n->get('message_contact_status')->value.'|'.$n->get('message_contact_internal_note')->value;")
check('Champs internes ignorés (statut, note)', st == 201 and count_msgs() == n0 + 1 and forced == 'nouveau|', f'{st} {forced}')
reset_flood()
dup = {**base, 'message': f'doublon {time.time()}'}
req('POST', '/api/messages-contact', {'data': dup})
n0 = count_msgs()
st, _, _ = req('POST', '/api/messages-contact', {'data': dup})
check('Doublon en moins de 10 min : ignoré (réponse neutre)', st == 201 and count_msgs() == n0, st)
reset_flood()
codes = [req('POST', '/api/messages-contact', {'data': {**base, 'message': f'rafale {i} {time.time()}'}})[0] for i in range(6)]
check('Limitation : 5 envois / 15 min par adresse IP (429 ensuite)', codes[:5] == [201] * 5 and codes[5] == 429, codes)
reset_flood()
st, _, h = req('OPTIONS', '/api/messages-contact', headers={'Origin': 'https://pirate.example', 'Access-Control-Request-Method': 'POST'})
check('CORS : origine inconnue non autorisée', 'Access-Control-Allow-Origin' not in h, h.get('Access-Control-Allow-Origin'))

# --- Rôles et circuit de validation
perms = json.loads(drush("$o=[]; foreach(['redacteur','validateur','anonymous'] as $r){$o[$r]=\\Drupal\\user\\Entity\\Role::load($r)->getPermissions();} echo json_encode($o);") or '{}')
red, val, anon = perms.get('redacteur', []), perms.get('validateur', []), perms.get('anonymous', [])
check('Rédacteur : peut soumettre à validation', 'use smt_validation transition submit_review' in red)
check('Rédacteur : ne peut pas publier', 'use smt_validation transition publish' not in red)
check('Rédacteur : n’accède pas aux messages de contact', 'manage smt contact messages' not in red)
check('Validateur : peut publier et archiver', {'use smt_validation transition publish', 'use smt_validation transition archive'} <= set(val))
check('Validateur : traite les messages de contact', 'manage smt contact messages' in val)
check('Public : lecture seule des contenus', set(anon) <= {'access content', 'use text format restricted_html'}, anon)
print(f'\nOK {ok} / KO {ko}')
sys.exit(1 if ko else 0)
