"""Test de bout en bout de la reconstruction automatique."""
import json, time, urllib.request, re, subprocess, os
S='http://localhost:1337'; SITE='http://127.0.0.1:8080'; B='http://127.0.0.1:4000'
SEC=os.environ['REBUILD_WEBHOOK_SECRET']
def _login():
    r=urllib.request.Request(S+'/admin/login',data=json.dumps({'email':os.environ.get('QA_ADMIN_EMAIL','admin@smt.local'),'password':os.environ['QA_ADMIN_PASSWORD']}).encode(),headers={'Content-Type':'application/json'})
    return json.load(urllib.request.urlopen(r))['data']['token']
TOK=_login()
CM=f'{S}/content-manager/collection-types/api::actualite.actualite'
def req(m,u,body=None,h=None):
    r=urllib.request.Request(u,method=m,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json',**(h or {})})
    try:
        with urllib.request.urlopen(r,timeout=30) as x: return x.status,x.read().decode()
    except urllib.error.HTTPError as e: return e.code,e.read().decode()
adm={'Authorization':f'Bearer {TOK}'}
status=lambda: json.loads(req('GET',B+'/status')[1])
def wait_build(after, timeout=300):
    t=time.time()
    while time.time()-t<timeout:
        st=status()
        h=[x for x in st['history'] if x['at']>after]
        if h and st['status']=='idle': return h[0], st
        time.sleep(3)
    raise SystemExit('timeout')
def page(path): return req('GET',SITE+path)[0]
res=[]
def check(name,cond,info=''): res.append(cond); print(('ok' if cond else 'KO'),':',name,'—',info)
now=lambda: time.strftime('%Y-%m-%dT%H:%M:%S',time.gmtime())

# 1. Publication d'une actualité → visible sur le site sans intervention
slug='qa-reconstruction-auto'
c,b=req('POST',CM+'?locale=fr',{'title':'QA – Reconstruction automatique','slug':slug,'date':'2026-11-18','category':'actualite','excerpt':'Article de test publié pour vérifier la mise à jour automatique du site.'},adm)
doc=json.loads(b)['data']['documentId']; check('Brouillon créé',c in(200,201),c)
time.sleep(12); check('Brouillon NON publié sur le site', page(f'/actualites/{slug}/')==404)
t0=now(); c,_=req('POST',f'{CM}/{doc}/actions/publish?locale=fr',{},adm); check('Publication par le validateur',c==200,c)
h,st=wait_build(t0); check('Build déclenché par le webhook et réussi',h['ok'],f"{h.get('pages')} pages en {h.get('seconds')}s · déclencheur : {st['lastTrigger']['reason']}")
check('Article visible sur le site',page(f'/actualites/{slug}/')==200)
html=req('GET',SITE+'/actualites/')[1]; check('Article listé dans Actualités','QA – Reconstruction automatique' in html)
check('Article dans le sitemap',slug in req('GET',SITE+'/sitemap.xml')[1])

# 2. Publications rapprochées → un seul build
t0=now()
for i in range(3):
    req('PUT',f'{CM}/{doc}?locale=fr',{'excerpt':f'Modification rapide n°{i+1} pour tester le regroupement des publications.'},adm)
    req('POST',f'{CM}/{doc}/actions/publish?locale=fr',{},adm); time.sleep(1)
h,st=wait_build(t0); n=len([x for x in st['history'] if x['at']>t0]); check('3 publications rapprochées → 1 seul build',n==1,f'{n} build(s)')
check('Dernière modification en ligne','Modification rapide n°3' in req('GET',SITE+f'/actualites/{slug}/')[1])

# 3. Message de contact → aucun build
t0=now(); req('POST',SITE+'/api/messages-contact',{'data':{'fullName':'QA','email':'qa@exemple.tn','subject':'paysmart','message':'Pas de reconstruction attendue.'}})
time.sleep(20); check('Message de contact ne déclenche pas de build',status()['status']=='idle' and not [x for x in status()['history'] if x['at']>t0])

# 4. Dépublication → l'article disparaît
t0=now(); req('POST',f'{CM}/{doc}/actions/unpublish?locale=fr',{},adm)
h,_=wait_build(t0); check('Dépublication → build',h['ok']); check('Article retiré du site',page(f'/actualites/{slug}/')==404)

# 5. Strapi indisponible pendant un build → échec contrôlé, site inchangé
cur=status()['current']; t0=now()
subprocess.run(['pkill','-STOP','-f','strapi start'])   # Strapi gelé : l'API ne répond plus
req('POST',B+'/rebuild',{'event':'test-panne'},{'Authorization':f'Bearer {SEC}'})
try:
    h,st=wait_build(t0,120)
finally:
    subprocess.run(['pkill','-CONT','-f','strapi start'])
check('Build en échec détecté (Strapi indisponible)',not h['ok'],(h.get('error') or '')[:90].replace('\n',' '))
check('Site en ligne inchangé après l’échec',st['current']==cur and page('/')==200 and page('/actualites/')==200,st['current'])

# 6. Retour arrière
rels=st['releases']; c,b=req('POST',B+'/rollback',{},{'Authorization':f'Bearer {SEC}'})
check('Retour arrière vers la version précédente',c==200 and json.loads(b)['current']==rels[rels.index(cur)-1],b)
check('Site toujours servi après retour arrière',page('/')==200)

# nettoyage : suppression de l'article puis reconstruction propre
time.sleep(3); t0=now(); req('DELETE',f'{CM}/{doc}?locale=fr',None,adm)
h,st=wait_build(t0); check('Suppression → build propre remis en ligne',h['ok'] and page(f'/actualites/{slug}/')==404,st['current'])
print(f'\n{sum(res)} / {len(res)} réussis')
