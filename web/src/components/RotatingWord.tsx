"use client";

import { useEffect, useState } from "react";

type Segmenter = new (l?: string, o?: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> };

/** Découpe en caractères visibles (gère les accents combinés et l'arabe). */
const letters = (word: string): string[] => {
  const Seg = (Intl as unknown as { Segmenter?: Segmenter }).Segmenter;
  return Seg ? Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(word), (s) => s.segment) : Array.from(word);
};

const TYPE_MS = 90; // écriture d'une lettre
const ERASE_MS = 45; // effacement d'une lettre
const HOLD_MS = 2200; // mot complet affiché
const GAP_MS = 350; // pause entre l'effacement et la réécriture

/**
 * Mot du titre de la bannière d'accueil, effet « machine à écrire » :
 * le mot s'efface lettre par lettre, puis le suivant s'écrit lettre par lettre
 * (« sécurisées » → « innovantes » → « fiables » → …).
 * - Rendu initial (sans JavaScript) : premier mot complet.
 * - Lecteurs d'écran : liste complète lue une fois, le mot animé leur est masqué.
 * - Pause au survol ; mot fixe, sans curseur, si l'utilisateur a demandé moins d'animations.
 */
export function RotatingWord({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(() => letters(words[0] ?? "").length);
  const [erasing, setErasing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setAnimated(words.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [words.length]);

  useEffect(() => {
    if (!animated || paused) return;
    const total = letters(words[index]).length;
    let delay: number;
    let step: () => void;
    if (!erasing && count < total) {
      delay = TYPE_MS;
      step = () => setCount((c) => c + 1);
    } else if (!erasing) {
      delay = HOLD_MS;
      step = () => setErasing(true);
    } else if (count > 0) {
      delay = ERASE_MS;
      step = () => setCount((c) => c - 1);
    } else {
      delay = GAP_MS;
      step = () => {
        setErasing(false);
        setIndex((i) => (i + 1) % words.length);
      };
    }
    const id = setTimeout(step, delay);
    return () => clearTimeout(id);
  }, [animated, paused, erasing, count, index, words]);

  if (!words.length) return null;
  const shown = letters(words[index]).slice(0, count).join("");
  return (
    <>
      <span className="sr-only">{words.join(", ")}</span>
      <span
        aria-hidden="true"
        data-word={words[index]}
        className="whitespace-nowrap text-secondary"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* caractère invisible si le mot est vide : la ligne garde sa hauteur */}
        <span data-typed>{shown || "​"}</span>
        {animated && <span className="typing-caret" />}
      </span>
    </>
  );
}
