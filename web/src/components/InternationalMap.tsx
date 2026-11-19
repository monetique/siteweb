"use client";

import { useEffect, useRef, useState } from "react";
import { AFRICA_MAP } from "@/lib/africa-map";

type Key = keyof typeof AFRICA_MAP.capitals;

/** Noms reconnus (FR / EN / AR) pour chaque pays de la carte. Un pays inconnu reste affiché en pastille, sans liaison. */
const COUNTRIES: Record<Key, string[]> = {
  tn: ["tunisie", "tunisia", "تونس"],
  dz: ["algerie", "algeria", "الجزائر"],
  ly: ["libye", "libya", "ليبيا"],
  mr: ["mauritanie", "mauritania", "موريتانيا"],
  rw: ["rwanda", "رواندا"],
  cg: ["congo", "republique du congo", "republic of the congo", "الكونغو"],
  cv: ["cap-vert", "cap vert", "cape verde", "cabo verde", "الرأس الأخضر"],
};
const HUB: Key = "tn";
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const keyOf = (name: string) => (Object.keys(COUNTRIES) as Key[]).find((k) => COUNTRIES[k].some((n) => norm(n) === norm(name)));

const START_MS = 400; // délai avant la première liaison
const STEP_MS = 650; // écart entre deux liaisons
const DRAW_MS = 900; // durée du tracé d'une liaison

/** Courbe de Tunis vers une capitale, incurvée sur le côté (vers l'intérieur des terres), proportionnelle à la distance. */
function arcPath([x1, y1]: readonly number[], [x2, y2]: readonly number[]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const k = 0.22; // courbure
  const cx = (x1 + x2) / 2 + dy * k;
  const cy = (y1 + y2) / 2 - dx * k;
  return `M${x1},${y1} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2},${y2}`;
}

/**
 * Carte « Expertise à l'international » : liaisons qui partent de Tunis et se dessinent une à une
 * vers la capitale de chaque pays ; la pastille du pays s'allume à l'arrivée de sa liaison.
 * - Démarre quand la carte entre à l'écran, une seule fois ; seul le point de Tunis pulse ensuite.
 * - Survol d'une pastille : son pays et sa liaison sont mis en avant.
 * - Animations réduites : tout est affiché d'emblée, sans pulsation.
 * - La carte est décorative (aria-hidden) : la liste des pays porte l'information.
 */
export function InternationalMap({ tags }: { tags: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const items = tags.map((name) => ({ name, key: keyOf(name) }));
  const targets = items.filter((i) => i.key && i.key !== HUB);
  const hasHub = items.some((i) => i.key === HUB);
  // reached = nombre de liaisons arrivées ; -1 = animation pas encore démarrée
  const [reached, setReached] = useState(-1);
  const [drawing, setDrawing] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [hover, setHover] = useState<Key | null>(null);

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
  const hub = AFRICA_MAP.capitals[HUB];

  return (
    <div ref={ref} className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm sm:p-6">
      <svg viewBox={AFRICA_MAP.viewBox} className="mx-auto block h-auto w-full max-w-[460px]" aria-hidden="true" focusable="false">
        <path d={AFRICA_MAP.africa} className="fill-surface-container stroke-outline-variant" strokeWidth={0.8} strokeLinejoin="round" />
        {items.map(({ key }) =>
          key && AFRICA_MAP.countries[key] ? (
            <path
              key={key}
              d={AFRICA_MAP.countries[key]!}
              strokeWidth={0.8}
              className={`stroke-white transition-[fill] duration-700 ${
                hover === key ? "fill-secondary/45" : isOn(key) ? "fill-secondary/25" : "fill-surface-container-high"
              }`}
            />
          ) : null,
        )}
        {hasHub &&
          targets.map(({ key }, i) => (
            <path
              key={key}
              d={arcPath(hub, AFRICA_MAP.capitals[key!])}
              pathLength={1}
              fill="none"
              strokeLinecap="round"
              strokeDasharray="1"
              strokeDashoffset={i < drawing ? 0 : 1}
              className={`stroke-secondary ${hover && hover !== key ? "opacity-30" : ""} ${reduced ? "" : "transition-[stroke-dashoffset,opacity] ease-out"}`}
              strokeWidth={hover === key ? 2.6 : 1.8}
              style={{ transitionDuration: `${DRAW_MS}ms, 300ms` }}
            />
          ))}
        {items.map(({ key }) =>
          key ? (
            <circle
              key={key}
              cx={AFRICA_MAP.capitals[key][0]}
              cy={AFRICA_MAP.capitals[key][1]}
              r={key === HUB ? 6 : 4.5}
              className={`fill-secondary stroke-white transition-opacity duration-300 ${isOn(key) ? "opacity-100" : "opacity-0"}`}
              strokeWidth={1.5}
            />
          ) : null,
        )}
        {hasHub && started && !reduced && (
          <circle cx={hub[0]} cy={hub[1]} r={6} className="map-pulse fill-none stroke-secondary" strokeWidth={1.5} />
        )}
      </svg>
      <ul className="mt-4 flex flex-wrap justify-center gap-2">
        {items.map(({ name, key }) => (
          <li
            key={name}
            onMouseEnter={() => key && setHover(key)}
            onMouseLeave={() => setHover(null)}
            data-on={isOn(key) || undefined}
            className={`rounded-full border px-4 py-1.5 text-label-md transition-colors duration-500 ${
              isOn(key) || !key
                ? "border-secondary/30 bg-surface-container text-secondary"
                : "border-outline-variant/40 bg-surface-container-lowest text-on-surface"
            }`}
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}
