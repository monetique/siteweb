/**
 * Génère web/src/lib/africa-map.ts : contour de l'Afrique, pays partenaires et capitales projetés en SVG
 * (carte « Expertise à l'international »). Données Natural Earth (domaine public) via world-atlas.
 * À relancer seulement pour ajouter un pays partenaire (PARTNERS + CAP ci-dessous, puis COUNTRIES dans
 * components/InternationalMap.tsx) :
 *   mkdir /tmp/carte && cd /tmp/carte && npm init -y && npm i world-atlas@2 topojson-client@3 topojson-simplify@3 d3-geo@3
 *   cp <dépôt>/web/scripts/gen-africa-map.mjs . && node gen-africa-map.mjs 50m 0.3
 * Le script écrit directement web/src/lib/africa-map.ts si WEB_DIR pointe vers le dossier web du dépôt.
 */
import fs from 'node:fs';
import { feature, merge } from 'topojson-client';
import { geoMercator, geoPath } from 'd3-geo';
import { presimplify, simplify, quantile } from 'topojson-simplify';
const res = process.argv[2] || '50m';
let t = JSON.parse(fs.readFileSync(`node_modules/world-atlas/countries-${res}.json`, 'utf8'));
t = presimplify(t); t = simplify(t, quantile(t, Number(process.argv[3] || 0.5)));
const AF = new Set('788 012 024 072 108 120 132 140 148 174 178 180 204 226 231 232 262 266 270 288 324 384 404 426 430 434 450 454 466 478 480 504 508 516 562 566 624 646 678 686 690 694 706 710 716 728 729 732 748 768 800 818 834 854 894'.split(' '));
const geoms = t.objects.countries.geometries.filter((g) => AF.has(g.id) || g.properties.name === 'Somaliland');
const africa = merge(t, geoms);
const PARTNERS = { tn: '788', dz: '012', ly: '434', mr: '478', rw: '646', cg: '178', cv: '132' };
const all = feature(t, { type: 'GeometryCollection', geometries: geoms });
// Cadre : Afrique continentale + Cap-Vert (les îles australes lointaines sont hors champ)
const BOX = { type: 'MultiPoint', coordinates: [[-25.5, 37.8], [51.5, 37.8], [-25.5, -35], [51.5, -35]] };
const W = 480, PAD = 14;
const fit = geoMercator().fitWidth(W - 2 * PAD, BOX);
const [[, y0], [, y1]] = geoPath(fit).bounds(BOX);
const H = Math.ceil(y1 - y0 + 2 * PAD);
const proj = geoMercator().fitExtent([[PAD, PAD + 6], [W - PAD, H - PAD + 6]], BOX);
const path = geoPath(proj).digits(1);
const out = { viewBox: `0 0 ${W} ${H + 12}`, africa: path(africa), countries: {}, capitals: {} };
for (const [k, id] of Object.entries(PARTNERS)) {
  const g = geoms.find((x) => x.id === id); out.countries[k] = g ? path(feature(t, g)) : null;
}
const CAP = { tn: [10.18, 36.81], dz: [3.06, 36.75], ly: [13.19, 32.89], mr: [-15.98, 18.08], rw: [30.06, -1.95], cg: [15.28, -4.27], cv: [-23.51, 14.93] };
for (const [k, c] of Object.entries(CAP)) out.capitals[k] = proj(c).map((v) => Math.round(v * 10) / 10);
console.log(res, 'africa', out.africa.length, 'chars;', Object.entries(out.countries).map(([k, v]) => k + ':' + (v ? v.length : 'MISSING')).join(' '), JSON.stringify(out.capitals));
fs.writeFileSync(`africa-${res}.json`, JSON.stringify(out));
if (process.env.WEB_DIR) {
  fs.writeFileSync(`${process.env.WEB_DIR}/src/lib/africa-map.ts`,
    '/* Fichier généré par web/scripts/gen-africa-map.mjs (données Natural Earth, domaine public) — ne pas modifier à la main. */\n' +
    `export const AFRICA_MAP = ${JSON.stringify(out, null, 1)} as const;\n`);
}
