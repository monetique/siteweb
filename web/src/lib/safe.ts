const LINE_SEP = new RegExp(String.fromCharCode(0x2028), "g");
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), "g");

/** Sérialise des données structurées JSON-LD sans permettre de sortir de la balise <script>. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(LINE_SEP, "\\u2028")
    .replace(PARA_SEP, "\\u2029");
}

/** N'autorise que les liens http(s), mailto:, tel:, relatifs et ancres (bloque javascript:, data:…). */
export function safeHref(url?: string | null): string {
  const u = (url ?? "").trim();
  if (/^(https?:|mailto:|tel:)/i.test(u) || u.startsWith("/") || u.startsWith("#")) return u;
  return "#";
}
