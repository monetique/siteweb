"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Visuel de la bannière d'accueil : la photo, et par-dessus une courte animation sans son.
 *  - loop = false : jouée une seule fois, puis effacée en fondu (la photo, identique à sa dernière image, reste) ;
 *  - loop = true  : en continu, mise en pause quand la bannière n'est pas visible (hors écran, onglet caché).
 *
 * La photo reste seule affichée si le visiteur a demandé à réduire les animations, si la lecture automatique
 * est bloquée ou si la vidéo ne se charge pas.
 */
export function HeroVisual({ img, video, loop = false, className = "", imgClassName = "" }: {
  img: string; video?: string | null; loop?: boolean; className?: string; imgClassName?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"waiting" | "playing" | "fading" | "done">("waiting");

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setState("done"); return; }
    v.muted = true; // nécessaire à la lecture automatique dans tous les navigateurs
    const play = () => v.play().catch(() => setState("done"));
    if (!loop) { play(); return; }
    // En boucle : lecture uniquement quand la bannière est visible et l'onglet actif (économie de batterie et de données).
    let visible = false;
    const sync = () => (visible && !document.hidden ? play() : v.pause());
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.2 });
    io.observe(v);
    document.addEventListener("visibilitychange", sync);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [loop]);

  const media = `absolute inset-0 h-full w-full object-cover ${imgClassName}`;
  return (
    <div className={`relative ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="" /* illustration : le message est porté par le texte */ className={media} fetchPriority="high" />
      {video && state !== "done" && (
        <video
          ref={ref}
          src={video}
          muted
          playsInline
          loop={loop}
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          data-hero-video={state}
          onPlaying={() => setState("playing")}
          onEnded={() => { if (!loop) { setState("fading"); setTimeout(() => setState("done"), 700); } }}
          onError={() => setState("done")}
          className={`${media} transition-opacity duration-700 ${state === "playing" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
