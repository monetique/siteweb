"""
Traductions du contenu de départ (anglais, arabe).

  python3 scripts/i18n_strings.py extract  -> data/i18n/source.fr.json : textes français à traduire (clé = empreinte du texte)
  python3 scripts/i18n_strings.py build    -> data/seed.en.json, data/seed.ar.json à partir de data/i18n/{en,ar}.json
  python3 scripts/i18n_strings.py status   -> textes encore non traduits par langue

Seuls les textes éditoriaux sont traduits : identifiants, adresses web, codes, dates, chiffres, noms propres
de personnes et de partenaires restent identiques dans toutes les langues.
"""
import hashlib, json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SEED = json.loads((ROOT / "data/seed.json").read_text("utf-8"))
I18N = ROOT / "data/i18n"
LANGS = ["en", "ar"]

SKIP_KEYS = {
    "slug", "url", "icon", "category", "__component", "style", "variant", "source", "type", "tenderStatus", "platform",
    "date", "deadline", "publicationDate", "order", "year", "value", "numericValue", "evolution", "columns", "count",
    "mime", "website", "reference", "emailContact", "emailCommercial", "phoneHeadquarters", "phoneCallCenter",
    "phoneGreenNumber", "mapUrl", "fullName", "format", "level", "isExternal", "showForm", "showMap", "showAllLink",
    "isHomepage", "showOnHomepage", "isFeatured", "isPartialYear", "offerValidityDays", "displayValue",
    "anchor", "imagePosition", "tone", "background", "layout", "imageFile", "imageAlt", "highlightUrl",
}
SKIP_SECTIONS = {"partenaires"}  # noms propres, type non traduit

def key(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]

def translatable(s: str) -> bool:
    if not re.search(r"[A-Za-zÀ-ÿ]{2}", s): return False
    if re.match(r"^(https?:|/|#|mailto:|tel:)", s): return False
    if re.fullmatch(r"[A-Z0-9 .\-/_]+", s) and len(s) < 12: return False  # sigles et codes (PCI DSS, SMT/AO/07/2025)
    return True

def walk(node, fn, k=None):
    if isinstance(node, dict):
        return {kk: (vv if kk in SKIP_KEYS else walk(vv, fn, kk)) for kk, vv in node.items()}
    if isinstance(node, list):
        return [walk(v, fn, k) for v in node]
    if isinstance(node, str) and translatable(node):
        return fn(node)
    return node

def extract():
    found = {}
    def collect(s):
        found[key(s)] = s
        return s
    for section, data in SEED.items():
        if section not in SKIP_SECTIONS: walk(data, collect)
    I18N.mkdir(exist_ok=True)
    (I18N / "source.fr.json").write_text(json.dumps(found, ensure_ascii=False, indent=1), "utf-8")
    words = sum(len(s.split()) for s in found.values())
    print(f"{len(found)} textes uniques, {words} mots -> data/i18n/source.fr.json")

def load(lang):
    p = I18N / f"{lang}.json"
    return json.loads(p.read_text("utf-8")) if p.exists() else {}

def build():
    for lang in LANGS:
        tr = load(lang)
        missing = set()
        def apply(s):
            k = key(s)
            if k in tr: return tr[k]
            missing.add(k); return s
        out = {sec: (data if sec in SKIP_SECTIONS else walk(data, apply)) for sec, data in SEED.items()}
        (ROOT / f"data/seed.{lang}.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), "utf-8")
        print(f"{lang} : {len(tr)} traductions, {len(missing)} textes restés en français -> data/seed.{lang}.json")

def status():
    src = json.loads((I18N / "source.fr.json").read_text("utf-8"))
    for lang in LANGS:
        tr = load(lang)
        miss = [k for k in src if k not in tr]
        print(f"{lang} : {len(src) - len(miss)}/{len(src)} traduits")

{"extract": extract, "build": build, "status": status}[sys.argv[1] if len(sys.argv) > 1 else "status"]()
