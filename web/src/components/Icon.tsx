import icons from "@/lib/icons.json";

const ICONS = icons as Record<string, string>;

/** Icône Material Symbols en SVG inline (taille = taille de police, couleur = couleur du texte). */
export function Icon({ name, className = "" }: { name?: string | null; className?: string }) {
  if (!name || !ICONS[name]) return null;
  return (
    <svg viewBox="0 -960 960 960" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false"
      className={`icon inline-block shrink-0 ${className}`} dangerouslySetInnerHTML={{ __html: ICONS[name] }} />
  );
}
