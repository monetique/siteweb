"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Mot qui défile dans le titre de la bannière d'accueil (« sécurisées » → « innovantes » → « fiables »).
 * - La largeur suit le mot affiché (transition douce) : pas de trou quand le mot n'est pas en fin de titre
 *   (ex. anglais « Secure digital payment solutions »). Avant hydratation : largeur du mot le plus long.
 * - Les lecteurs d'écran lisent la liste complète une fois (le mot animé leur est masqué).
 * - Animation suspendue au survol ; mot fixe si l'utilisateur a demandé moins d'animations.
 */
export function RotatingWord({ words, interval = 2800 }: { words: string[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [width, setWidth] = useState<number | null>(null);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const measure = () => setWidth(refs.current[index]?.offsetWidth ?? null);
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [index]);

  useEffect(() => {
    if (words.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setIndex((i) => {
        setPrevious(i);
        return (i + 1) % words.length;
      });
    }, interval);
    return () => clearInterval(id);
  }, [words.length, interval, paused]);

  if (!words.length) return null;
  return (
    <>
      <span className="sr-only">{words.join(", ")}</span>
      <span
        aria-hidden="true"
        className="relative inline-grid overflow-hidden pb-[0.08em] align-bottom text-secondary transition-[width] duration-500 ease-out motion-reduce:transition-none"
        style={width ? { width } : undefined}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {words.map((w, k) => (
          <span
            key={w}
            ref={(el) => { refs.current[k] = el; }}
            data-active={k === index || undefined}
            className={`col-start-1 row-start-1 justify-self-start whitespace-nowrap transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
              k === index ? "translate-y-0 opacity-100" : k === previous ? "-translate-y-[60%] opacity-0" : "translate-y-[60%] opacity-0"
            }`}
          >
            {w}
          </span>
        ))}
      </span>
    </>
  );
}
