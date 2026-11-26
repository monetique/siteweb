"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Visuel de la bannière d'accueil : la photo, et par-dessus une courte animation jouée UNE seule fois
 * (sans son, sans boucle). À la fin, la vidéo s'efface en fondu et laisse la photo, identique à sa dernière image.
 *
 * La photo reste seule affichée si le visiteur a demandé à réduire les animations, si la lecture automatique
 * est bloquée ou si la vidéo ne se charge pas.
 */
export function HeroVisual({ img, video, className = "", imgClassName = "" }: { img: string; video?: string | null; className?: string; imgClassName?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"waiting" | "playing" | "fading" | "done">("waiting");

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setState("done"); return; }
    v.muted = true; // nécessaire à la lecture automatique dans tous les navigateurs
    v.play().catch(() => setState("done"));
  }, []);

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
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          data-hero-video={state}
          onPlaying={() => setState("playing")}
          onEnded={() => { setState("fading"); setTimeout(() => setState("done"), 700); }}
          onError={() => setState("done")}
          className={`${media} transition-opacity duration-700 ${state === "playing" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
