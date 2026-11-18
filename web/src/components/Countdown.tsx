"use client";
import { useEffect, useState } from "react";
import { useDict } from "./LangProvider";

/** Compte à rebours jusqu'à la date limite (calculé dans le navigateur, donc toujours à jour). */
export function Countdown({ deadline }: { deadline: string }) {
  const d = useDict();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return null;
  const diff = new Date(deadline).getTime() - now;
  if (diff <= 0) return <span className="rounded-full bg-surface-container-high px-3 py-1 text-label-sm text-on-surface-variant">{d.deadlinePassed}</span>;
  const days = Math.floor(diff / 86_400_000), h = Math.floor((diff % 86_400_000) / 3_600_000), m = Math.floor((diff % 3_600_000) / 60_000);
  return (
    <div className="flex gap-2" dir="ltr" aria-label={d.remaining(days, h, m)}>
      {[[days, d.days], [h, d.hours], [m, d.minutes]].map(([v, l]) => (
        <div key={l} className="min-w-16 rounded-lg bg-primary-container px-3 py-2 text-center text-on-primary">
          <span className="block font-display text-headline-sm">{String(v).padStart(2, "0")}</span>
          <span className="text-[11px] uppercase text-on-primary-container">{l}</span>
        </div>
      ))}
    </div>
  );
}
