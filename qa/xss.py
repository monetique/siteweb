"""XSS stockée : un compte éditorial compromis injecte du code dans une actualité."""
import os
ADMIN_EMAIL = os.environ.get('QA_ADMIN_EMAIL', 'admin@smt.local')
ADMIN_PASSWORD = os.environ['QA_ADMIN_PASSWORD']  # compte admin de RECETTE locale uniquement
import json, urllib.request, sys
S='http://localhost:1337'
def req(m,p,b=None,t=None):
    h={'Content-Type':'application/json', **({'Authorization':f'Bearer {t}'} if t else {})}
    r=urllib.request.Request(S+p,method=m,data=json.dumps(b).encode() if b is not None else None,headers=h)
    with urllib.request.urlopen(r) as x: return json.loads(x.read() or b'{}')
import os
if os.path.exists(os.path.join(__import__('tempfile').gettempdir(),'qa_tok')): tok=open(os.path.join(__import__('tempfile').gettempdir(),'qa_tok')).read().strip()
else:
    tok=req('POST','/admin/login',{'email':ADMIN_EMAIL,'password':ADMIN_PASSWORD})['data']['token']; open(os.path.join(__import__('tempfile').gettempdir(),'qa_tok'),'w').write(tok)
if sys.argv[1]=='create':
    payload='</script><script>window.__xss=1;alert(1)</script>'
    d=req('POST','/content-manager/collection-types/api::actualite.actualite?locale=fr',{
      'title':'XSS QA '+payload,'slug':'xss-qa','date':'2026-11-17','category':'actualite','label':'<img src=x onerror=alert("xss-label")>',
      'excerpt':'<img src=x onerror="window.__xss=2">',
      'content':[{'type':'paragraph','children':[{'type':'text','text':'Clic : '},{'type':'link','url':'https://exemple.tn','children':[{'type':'text','text':'lien piégé'}]},
                 {'type':'text','text':' <script>window.__xss=4</script>'}]}]},tok)['data']['documentId']
    req('POST',f'/content-manager/collection-types/api::actualite.actualite/{d}/actions/publish?locale=fr',{},tok)
    open('/tmp/qa_xss','w').write(d); print('créée',d)
else:
    d=open('/tmp/qa_xss').read(); req('DELETE',f'/content-manager/collection-types/api::actualite.actualite/{d}?locale=*',t=tok); print('supprimée')
