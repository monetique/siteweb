"""Noms d'institutions et d'entreprises conservés en français dans toutes les langues (consigne SMT)."""
import json, glob, sys
AR = [
 ("الشركة التونسية للكهرباء والغاز، والشركة الوطنية لاستغلال وتوزيع المياه، واتصالات تونس، وتوبنت، وشركة تونس للطرقات السيارة", "STEG وSONEDE وTunisie Telecom وTopnet وTunisie Autoroutes"),
 ("الوزارة الاتحادية الألمانية للتعاون الاقتصادي والتنمية (BMZ)", "ministère fédéral allemand de la Coopération économique et du Développement (BMZ)"),
 ("الوكالة الألمانية للتعاون الدولي (GIZ)", "GIZ"),
 ("وزارة الداخلية ووزارة المالية والبنك المركزي التونسي", "ministère de l'Intérieur وministère des Finances وBanque Centrale de Tunisie"),
 ("دار المصدّر (مركز النهوض بالصادرات)", "Maison de l'Exportateur (CEPEX)"),
 ("نزل ديار المدينة", "Hôtel Diar Lemdina"),
 ("قناة الوطنية الأولى", "El Wataniya 1"), ("الوطنية الأولى", "El Wataniya 1"),
 ("فضاء المواطن 2.0", "Espace Citoyen 2.0"),
 ("بفرع بنك تونس بالمركز العمراني الشمالي", "بفرع BT Centre Urbain Nord"),
 ("البنك المركزي التونسي", "Banque Centrale de Tunisie"),
 ("شركة نقديات تونس", "شركة Monétique Tunisie"), ("لنقديات تونس", "لـMonétique Tunisie"), ("بنقديات تونس", "بـMonétique Tunisie"), ("نقديات تونس", "Monétique Tunisie"),
]
EN = [
 ("German Federal Ministry for Economic Cooperation and Development (BMZ)", "ministère fédéral allemand de la Coopération économique et du Développement (BMZ)"),
 ("the Ministry of the Interior, the Ministry of Finance and the Central Bank of Tunisia", "the ministère de l'Intérieur, the ministère des Finances and the Banque Centrale de Tunisie"),
 ("Central Bank of Tunisia", "Banque Centrale de Tunisie"),
 ("Hotel Diar Lemdina", "Hôtel Diar Lemdina"),
]
def fix(en, ar):
    for a, b in EN: en = en.replace(a, b)
    for a, b in AR: ar = ar.replace(a, b)
    return en, ar
if __name__ == "__main__":
    for f in sorted(glob.glob("parts/*.json")):
        d = json.load(open(f))
        d = {k: list(fix(*v)) for k, v in d.items()}
        json.dump(d, open(f, "w"), ensure_ascii=False, indent=0)
        print(f, "ok")
