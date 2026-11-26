"""Génère model.json (drupal/web/modules/custom/smt_site/model/) et sa copie pour le site Next.js, (modèle de contenu Drupal) à partir des schémas Strapi du dossier cms/.

Règles :
- type de collection / unique Strapi -> type de contenu Drupal (node), nom machine = nom API avec « _ »
- composant Strapi -> type de paragraphe (shared.link -> link, blocks.hero -> hero…)
- champ « xxxYyy » -> champ Drupal « <bundle>_xxx_yyy » (préfixe = type, pour éviter les conflits)
- champ non traduit dans Strapi (localized: false) -> champ non traduisible dans Drupal
- le champ titre (title, name, question, fullName…) devient le titre Drupal
"""
import json, glob, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..', 'cms', 'src')
labels = json.load(open(os.path.join(ROOT, 'admin-labels.json')))
LBL, DESC = labels['labels'], labels['descriptions']
TITLE = {'page': 'title', 'actualite': 'title', 'appel_offres': 'title', 'solution': 'name', 'innovation': 'name',
         'faq': 'question', 'dirigeant': 'fullName', 'indicateur': 'name', 'partenaire': 'name',
         'global': 'siteName', 'message_contact': 'fullName'}
FILE_FIELDS = {'attachments', 'documents', 'favicon'}

def snake(s): return re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s).replace('-', '_').lower()
def comp_id(c): return snake(c.split('.', 1)[1])
def human(a): return LBL.get(a) or re.sub(r'_', ' ', snake(a)).capitalize()

def field(bundle, name, v, parent_localized=True):
    t = v['type']; f = {'name': f'{bundle}_{snake(name)}', 'strapi': name, 'label': human(name),
                        'description': DESC.get(name, ''), 'required': bool(v.get('required')),
                        'translatable': parent_localized and v.get('pluginOptions', {}).get('i18n', {}).get('localized', True) is not False}
    if len(f['name']) > 32: sys.exit(f"nom trop long : {f['name']}")
    m = {'string': 'string', 'uid': 'string', 'text': 'string_long', 'blocks': 'text_long', 'richtext': 'text_long',
         'integer': 'integer', 'decimal': 'decimal', 'boolean': 'boolean', 'email': 'email', 'date': 'date', 'datetime': 'datetime'}
    if t in m: f['type'] = m[t]
    elif t == 'enumeration': f.update(type='list_string', options=v['enum'], default=v.get('default'))
    elif t == 'media': f.update(type='file' if name in FILE_FIELDS else 'image', multiple=bool(v.get('multiple')))
    elif t == 'component': f.update(type='paragraphs', targets=[comp_id(v['component'])], multiple=bool(v.get('repeatable')))
    elif t == 'dynamiczone': f.update(type='paragraphs', targets=[comp_id(c) for c in v['components']], multiple=True)
    else: sys.exit(f'type non géré {t} ({bundle}.{name})')
    if 'default' in v and t in ('boolean', 'integer'): f['default'] = v['default']
    return f

model = {'node': {}, 'paragraph': {}}
for p in sorted(glob.glob(os.path.join(ROOT, 'api/*/content-types/*/schema.json'))):
    d = json.load(open(p)); b = snake(d['info']['singularName'])
    loc = d.get('pluginOptions', {}).get('i18n', {}).get('localized', False)
    tf = TITLE.get(b); fields = []
    for n, v in d['attributes'].items():
        if n == tf: continue
        fields.append(field(b, n, v, loc))
    model['node'][b] = {'label': d['info']['displayName'], 'description': d['info'].get('description', ''),
                        'strapi': d['info']['pluralName'], 'single': d.get('kind') == 'singleType', 'translatable': bool(loc),
                        'titleField': tf, 'titleLabel': human(tf) if tf else 'Titre', 'fields': fields}
for p in sorted(glob.glob(os.path.join(ROOT, 'components/*/*.json'))):
    d = json.load(open(p)); cat = p.split(os.sep)[-2]; b = comp_id(f"{cat}.{os.path.basename(p)[:-5]}")
    model['paragraph'][b] = {'label': d['info']['displayName'], 'strapi': f"{cat}.{os.path.basename(p)[:-5]}",
                             'fields': [field(b, n, v) for n, v in d['attributes'].items()]}
out = os.path.join(HERE, '..', 'web', 'modules', 'custom', 'smt_site', 'model', 'model.json')
json.dump(model, open(out, 'w'), ensure_ascii=False, indent=1)
# Copie utilisée par le site Next.js pour lire l'API Drupal (web/src/lib/cms/drupal-model.json)
web = os.path.join(HERE, '..', '..', 'web', 'src', 'lib', 'cms', 'drupal-model.json')
json.dump(model, open(web, 'w'), ensure_ascii=False, indent=1)
print(len(model['node']), 'types de contenu,', len(model['paragraph']), 'paragraphes,',
      sum(len(x['fields']) for g in model.values() for x in g.values()), 'champs')
