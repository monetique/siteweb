import icons from "@/lib/icons.json";

const ICONS = icons as Record<string, string>;

/** Icône Material Symbols en SVG inline (taille = taille de police, couleur = couleur du texte). */
export function Icon({ name, className = "" }: { name?: string | null; className?: string }) {
  if (!name) return null;
  // Icône inconnue : marqueur invisible, détecté par les tests QA (et signalé en développement).
  if (!ICONS[name]) {
    if (process.env.NODE_ENV === "development") console.warn(`[icons] icône « ${name} » absente de icons.json — relancer npm run icons`);
    return <span data-icon-missing={name} hidden />;
  }
  return (
    <svg viewBox="0 -960 960 960" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false"
      className={`icon inline-block shrink-0 ${className}`} dangerouslySetInnerHTML={{ __html: ICONS[name] }} />
  );
}
