"use client";

import { useEffect, useRef, useState } from "react";
import { AFRICA_MAP } from "@/lib/africa-map";

type Key = keyof typeof AFRICA_MAP.pins;

/** Noms reconnus (FR / EN / AR) pour chaque pays de la carte. Un pays inconnu reste dans la liste, sans épingle. */
const COUNTRIES: Record<Key, string[]> = {
  tn: ["tunisie", "tunisia", "تونس"],
  dz: ["algerie", "algeria", "الجزائر"],
  ly: ["libye", "libya", "ليبيا"],
  mr: ["mauritanie", "mauritania", "موريتانيا"],
  rw: ["rwanda", "رواندا"],
  cg: ["congo", "rdc", "rd congo", "republique democratique du congo", "dr congo", "democratic republic of the congo", "الكونغو", "جمهورية الكونغو الديمقراطية"],
  cv: ["cap-vert", "cap vert", "cape verde", "cabo verde", "الرأس الأخضر"],
};
/** Couleur de l'épingle de chaque pays (charte de la carte de référence). */
const PIN_COLOR: Record<Key, string> = {
  tn: "#ef4444", dz: "#84cc16", ly: "#c084fc", mr: "#fbbf24", rw: "#fb923c", cg: "#f472b6", cv: "#38bdf8",
};
const HUB: Key = "tn";
/** Placement des étiquettes (par défaut : centrée sous l'épingle) ; évite chevauchements et coupures au bord. */
const LABEL: Partial<Record<Key, { x: number; y: number; textAnchor: "start" }>> = {
  rw: { x: 9, y: -9, textAnchor: "start" }, // à droite (Congo est juste à côté)
  cv: { x: -6, y: 11, textAnchor: "start" }, // calée à gauche (bord de la carte)
};

// Palette de la carte (fond bleu nuit, pays, frontières, pays partenaires, relief, liaisons)
const C = { bg: "#08397a", relief: "#05264b", land: "#0b4f99", border: "#0a3f7d", partnerOn: "#2b86ea", arc: "#9fd4ff" };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const keyOf = (name: string) => (Object.keys(COUNTRIES) as Key[]).find((k) => COUNTRIES[k].some((n) => norm(n) === norm(name)));

const START_MS = 400; // délai avant la première liaison
const STEP_MS = 650; // écart entre deux liaisons
const DRAW_MS = 900; // durée du tracé d'une liaison

/** Courbe de Tunisie vers un pays, incurvée sur le côté, proportionnelle à la distance. */
function arcPath([x1, y1]: readonly number[], [x2, y2]: readonly number[]) {
  const k = 0.22;
  const cx = (x1 + x2) / 2 + (y2 - y1) * k;
  const cy = (y1 + y2) / 2 - (x2 - x1) * k;
  return `M${x1},${y1} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2},${y2}`;
}

/** Épingle de localisation, pointe en (0,0). */
const PIN_PATH = "M0,0C0,0-7,-7.5-7,-12.5A7,7 0 1 1 7,-12.5C7,-7.5 0,0 0,0Z";

/**
 * Carte « Expertise à l'international » (charte de la carte SMT : fond bleu nuit, relief, épingles colorées) :
 * les liaisons partent de Tunisie et se dessinent une à une ; à l'arrivée, le pays s'éclaire
 * et son épingle tombe avec le nom du pays.
 * - Démarre quand la carte entre à l'écran, une seule fois ; seule la Tunisie pulse ensuite.
 * - Animations réduites : état final affiché d'emblée, sans pulsation.
 * - Le dessin est décoratif (aria-hidden) ; la liste des pays est fournie aux lecteurs d'écran.
 */
export function InternationalMap({ tags }: { tags: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const items = tags.map((name) => ({ name, key: keyOf(name) }));
  const targets = items.filter((i) => i.key && i.key !== HUB);
  const hasHub = items.some((i) => i.key === HUB);
  const [reached, setReached] = useState(-1); // -1 = pas encore démarré
  const [drawing, setDrawing] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      setDrawing(targets.length);
      setReached(targets.length);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setReached(0);
        targets.forEach((_, i) => {
          timers.push(setTimeout(() => setDrawing(i + 1), START_MS + i * STEP_MS));
          timers.push(setTimeout(() => setReached(i + 1), START_MS + i * STEP_MS + DRAW_MS));
        });
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets.length]);

  const started = reached >= 0;
  const isOn = (key?: Key) => !!key && (key === HUB ? started : targets.findIndex((t) => t.key === key) < reached);
  const hub = AFRICA_MAP.pins[HUB];

  return (
    <div ref={ref} className="overflow-hidden rounded-2xl p-3 shadow-lg sm:p-5" style={{ background: C.bg }}>
      <ul className="sr-only">
        {items.map(({ name }) => <li key={name}>{name}</li>)}
      </ul>
      <svg viewBox={AFRICA_MAP.viewBox} className="mx-auto block h-auto w-full max-w-[520px]" aria-hidden="true" focusable="false">
        {/* Relief : copie du continent décalée vers le bas */}
        <path d={AFRICA_MAP.africa} fill={C.relief} transform="translate(2 9)" />
        <path d={AFRICA_MAP.africa} fill={C.land} />
        {items.map(({ key }) =>
          key && AFRICA_MAP.countries[key] ? (
            <path key={key} d={AFRICA_MAP.countries[key]!} fill={isOn(key) ? C.partnerOn : C.land} className="transition-[fill] duration-700" />
          ) : null,
        )}
        <path d={AFRICA_MAP.borders} fill="none" stroke={C.border} strokeWidth={0.7} strokeLinejoin="round" />

        {hasHub &&
          targets.map(({ key }, i) => (
            <path
              key={key}
              d={arcPath(hub, AFRICA_MAP.pins[key!])}
              pathLength={1}
              fill="none"
              stroke={C.arc}
              strokeOpacity={0.85}
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeDasharray="1"
              strokeDashoffset={i < drawing ? 0 : 1}
              className={reduced ? "" : "transition-[stroke-dashoffset] ease-out"}
              style={{ transitionDuration: `${DRAW_MS}ms` }}
            />
          ))}

        {hasHub && started && !reduced && (
          <circle cx={hub[0]} cy={hub[1]} r={5} className="map-pulse" fill="none" stroke={C.arc} strokeWidth={1.2} />
        )}

        {items.map(({ key, name }) => {
          if (!key) return null;
          const [x, y] = AFRICA_MAP.pins[key];
          const on = isOn(key);
          return (
            <g key={key} transform={`translate(${x} ${y})`} data-pin={key} data-on={on || undefined}>
              <g className={`transition-[opacity,translate] duration-500 ease-out ${on ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"}`}>
                <path d={PIN_PATH} fill={PIN_COLOR[key]} stroke="#ffffff" strokeOpacity={0.4} strokeWidth={0.6} />
                <circle cx={0} cy={-12.5} r={2.6} fill="#ffffff" />
                <text
                  {...(LABEL[key] ? { ...LABEL[key], direction: "ltr" } : { y: 11, textAnchor: "middle" })}
                  fill="#ffffff"
                  className="text-[15px] sm:text-[10.5px]" /* unités de la carte : plus grand sur mobile */
                  fontWeight={500}
                  stroke={C.bg}
                  strokeOpacity={0.55}
                  strokeWidth={2.5}
                  style={{ paintOrder: "stroke" }}
                >
                  {name}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
