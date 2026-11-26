"use client";

import { useCallback, useEffect, useRef } from "react";
import { L as NextLink } from "@/components/LangProvider";
import { Icon } from "./Icon";

export type JourneyItem = { slug: string; name: string; tagline?: string; icon?: string };

/** Durée d'un passage de la carte et nombre de passages (l'animation ne boucle pas). */
const LAP_MS = 11000;
const LAPS = 2;
/** Distance (px) à partir de laquelle la carte « allume » un pictogramme. */
const LIT_RADIUS = 34;
/** Marge entre le chemin et le bord de la section, et rayon des demi-tours. */
const EDGE = 12;
const TURN = 30;
const C = { line: "#81cfff", card: "#0d1b33", stripe: "#00658d", chip: "#fac775", check: "#00658d" };

type Node = { el: HTMLElement; x: number; y: number };

/**
 * Section « Nos solutions » en trajet : chemin pointillé en S, une carte bancaire Monétique Tunisie
 * le parcourt deux fois et allume chaque pictogramme au passage. Sur mobile : liste verticale.
 */
export function SolutionsJourney({ items, labels, learnMore }: { items: JourneyItem[]; labels: string[]; learnMore: string }) {
  const cols = items.length % 4 === 0 ? 4 : 3;
  const rows: JourneyItem[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));

  const wrap = useRef<HTMLDivElement>(null);
  const pathSvg = useRef<SVGSVGElement>(null);
  const cardSvg = useRef<SVGSVGElement>(null);
  const route = useRef<SVGPathElement>(null);
  const card = useRef<SVGGElement>(null);
  const check = useRef<SVGGElement>(null);
  const nodes = useRef<Node[]>([]);
  const progress = useRef(1); // 0 → LAPS : position de la carte (1 tour = 1)
  const raf = useRef(0);

  /** Place la carte à une fraction du chemin et allume le pictogramme le plus proche. */
  const place = useCallback((p: number) => {
    const path = route.current, g = card.current;
    if (!path || !g) return;
    const len = path.getTotalLength();
    const done = p >= LAPS;
    const at = done ? len : (p % 1) * len;
    const a = path.getPointAtLength(at), b = path.getPointAtLength(Math.min(len, at + 1));
    let angle = done ? 0 : (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    if (angle > 90) angle -= 180; else if (angle < -90) angle += 180; // la carte reste lisible dans les deux sens
    g.setAttribute("transform", `translate(${a.x} ${a.y}) rotate(${angle})`);
    for (const n of nodes.current) n.el.dataset.lit = String(!done && Math.hypot(n.x - a.x, n.y - a.y) < LIT_RADIUS);
  }, []);

  /** Recalcule le chemin à partir de la position réelle des pictogrammes (toutes largeurs, LTR et RTL). */
  const draw = useCallback(() => {
    const box = wrap.current, path = route.current;
    if (!box || !path) return;
    const b = box.getBoundingClientRect();
    if (!b.width || !window.matchMedia("(min-width: 768px)").matches) return;
    for (const s of [pathSvg.current, cardSvg.current]) s?.setAttribute("viewBox", `0 0 ${b.width} ${b.height}`);
    const grid = [...box.querySelectorAll<HTMLElement>("[data-journey-row]")].map((row) =>
      [...row.querySelectorAll<HTMLElement>("[data-journey-node]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { el, x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
      }));
    if (!grid.length || !grid[0].length) return;
    const W = b.width, dirOf = (ns: Node[]) => (ns.length > 1 ? Math.sign(ns[ns.length - 1].x - ns[0].x) : 1) || 1;
    let d = `M${dirOf(grid[0]) > 0 ? EDGE : W - EDGE} ${grid[0][0].y}`;
    grid.forEach((ns, r) => {
      const y = ns[0].y, dir = dirOf(ns);
      d += ` H${ns[ns.length - 1].x}`;
      if (r < grid.length - 1) {
        const ny = grid[r + 1][0].y, ex = dir > 0 ? W - EDGE : EDGE, k = dir;
        d += ` H${ex - k * TURN} C${ex + k * 8} ${y},${ex + k * 8} ${ny},${ex - k * TURN} ${ny}`;
      } else {
        const endX = dir > 0 ? W - EDGE - 24 : EDGE + 24;
        d += ` H${endX - dir * 14}`;
        check.current?.setAttribute("transform", `translate(${endX} ${y})`);
      }
    });
    path.setAttribute("d", d);
    nodes.current = grid.flat();
    place(progress.current);
  }, [place]);

  useEffect(() => {
    const box = wrap.current;
    if (!box) return;
    draw();
    const ro = new ResizeObserver(() => draw());
    ro.observe(box);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Lancement une seule fois, quand la section devient visible.
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting) || reduced) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => {
        progress.current = Math.min(LAPS, (t - t0) / LAP_MS);
        place(progress.current);
        if (progress.current < LAPS) raf.current = requestAnimationFrame(step);
      };
      progress.current = 0;
      raf.current = requestAnimationFrame(step);
    }, { threshold: 0.35 });
    io.observe(box);
    return () => { ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf.current); };
  }, [draw, place]);

  const nodeCls = "journey-node relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[1.5px] border-secondary bg-surface-container-lowest text-[24px] text-secondary shadow-[0_0_0_6px_var(--color-surface-container-low)] transition-[background-color,color,transform] duration-300 group-hover:scale-105 group-hover:bg-secondary group-hover:text-white group-focus-visible:bg-secondary group-focus-visible:text-white data-[lit=true]:scale-105 data-[lit=true]:bg-secondary data-[lit=true]:text-white";
  const label = (text?: string) => text ? <span className="rounded-lg bg-secondary-fixed px-3 py-1 text-label-sm text-on-secondary-container">{text}</span> : null;

  return (
    <>
      {/* Ordinateur et tablette : trajet en S */}
      <div ref={wrap} className="relative hidden px-10 md:block" data-journey>
        <svg ref={pathSvg} className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
          <path ref={route} fill="none" stroke={C.line} strokeWidth={2} strokeDasharray="6 7" strokeLinecap="round" />
          <g ref={check}>
            <circle r={10} fill={C.check} />
            <path d="M-6 0 l4 4 l8 -8" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" />
          </g>
        </svg>
        {rows.map((row, r) => (
          <div key={r}>
            <div className={`relative z-10 mb-4 flex ${r % 2 ? "justify-end" : "justify-start"}`}>{label(labels[r])}</div>
            <ol data-journey-row className={`relative z-10 mb-8 flex gap-4 ${r % 2 ? "flex-row-reverse" : ""}`} start={r * cols + 1}>
              {row.map((s) => (
                <li key={s.slug} className="min-w-0" style={{ flex: `0 0 calc((100% - ${(cols - 1)}rem) / ${cols})` }}>
                  <NextLink href={`/solutions/${s.slug}`} className="cursor-card group flex flex-col items-center rounded-xl text-center outline-none">
                    <span data-journey-node className={nodeCls}><Icon name={s.icon} /></span>
                    <h3 className="mt-3 min-h-[2.7em] text-[1.0625rem] font-bold leading-snug text-primary-container">{s.name}</h3>
                    <p className="mb-2 min-h-[3em] text-body-sm text-on-surface-variant">{s.tagline}</p>
                    <span className="text-label-md text-secondary underline underline-offset-4">{learnMore}</span>
                  </NextLink>
                </li>
              ))}
            </ol>
          </div>
        ))}
        <svg ref={cardSvg} className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" aria-hidden="true">
          <g ref={card} data-journey-card>
            <rect x={-15} y={-10} width={30} height={20} rx={4} fill={C.card} />
            <text x={-12.5} y={-5.6} fill="#fff" style={{ fontSize: "3.4px", fontWeight: 500 }} direction="ltr">Monétique Tunisie</text>
            <rect x={-15} y={-4} width={30} height={3.5} fill={C.stripe} />
            <rect x={-11} y={2.5} width={6} height={4.5} rx={1} fill={C.chip} />
          </g>
        </svg>
      </div>

      {/* Mobile : liste verticale, même ligne pointillée */}
      <div className="md:hidden">
        {rows.map((row, r) => (
          <div key={r}>
            <div className="mb-3 ms-[4.5rem]">{label(labels[r])}</div>
            <ol className="mb-2">
              {row.map((s, i) => {
                const last = r === rows.length - 1 && i === row.length - 1;
                return (
                  <li key={s.slug} className="relative pb-6">
                    {!last && <span aria-hidden="true" className="absolute start-7 top-14 bottom-0 border-s-2 border-dashed" style={{ borderColor: C.line }} />}
                    <NextLink href={`/solutions/${s.slug}`} className="group flex gap-4 rounded-xl outline-none">
                      <span className={nodeCls}><Icon name={s.icon} /></span>
                      <span className="pt-1">
                        <h3 className="text-[1.0625rem] font-bold leading-snug text-primary-container">{s.name}</h3>
                        <p className="mt-1 mb-1 text-body-sm text-on-surface-variant">{s.tagline}</p>
                        <span className="text-label-md text-secondary underline underline-offset-4">{learnMore}</span>
                      </span>
                    </NextLink>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </>
  );
}
