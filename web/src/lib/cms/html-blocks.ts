/**
 * HTML (texte riche saisi dans Drupal, format « HTML de base ») -> blocs au format attendu par RichText.
 *
 * Analyseur volontairement restreint aux balises produites par l'éditeur : p, h2-h6, ul/ol/li, blockquote,
 * pre/code, strong/b, em/i, u, a, br. Toute autre balise est ignorée (son texte est conservé).
 */
type Text = { type: "text"; text: string; bold?: true; italic?: true; underline?: true; code?: true };
type Inline = Text | { type: "link"; url: string; children: Text[] };
export type Block =
  | { type: "paragraph"; children: Inline[] }
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; children: Inline[] }
  | { type: "list"; format: "ordered" | "unordered"; children: { type: "list-item"; children: Inline[] }[] }
  | { type: "quote"; children: Inline[] }
  | { type: "code"; children: Text[] };

type El = { tag: string; attrs: string; children: (El | string)[] };

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e.toLowerCase()] ?? m;
  });
const VOID = new Set(["br", "hr", "img", "input", "meta", "link", "source", "wbr"]);

function parse(html: string): El {
  const root: El = { tag: "#root", attrs: "", children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)/g;
  for (const m of html.matchAll(re)) {
    const top = stack[stack.length - 1];
    if (m[3] !== undefined) { top.children.push(decode(m[3])); continue; }
    if (!m[1]) continue;
    const tag = m[1].toLowerCase();
    if (m[0][1] === "/") {
      const i = stack.map((e) => e.tag).lastIndexOf(tag);
      if (i > 0) stack.length = i;
      continue;
    }
    const el: El = { tag, attrs: m[2] ?? "", children: [] };
    top.children.push(el);
    if (!VOID.has(tag) && !m[2]?.trim().endsWith("/")) stack.push(el);
  }
  return root;
}

const href = (attrs: string) => decode(/href\s*=\s*"([^"]*)"|href\s*=\s*'([^']*)'/i.exec(attrs)?.slice(1).find(Boolean) ?? "");

function inline(nodes: (El | string)[], fmt: Omit<Text, "type" | "text"> = {}): Inline[] {
  const out: Inline[] = [];
  for (const n of nodes) {
    if (typeof n === "string") { if (n) out.push({ type: "text", text: n, ...fmt }); continue; }
    switch (n.tag) {
      case "br": out.push({ type: "text", text: "\n", ...fmt }); break;
      case "strong": case "b": out.push(...inline(n.children, { ...fmt, bold: true })); break;
      case "em": case "i": out.push(...inline(n.children, { ...fmt, italic: true })); break;
      case "u": out.push(...inline(n.children, { ...fmt, underline: true })); break;
      case "code": out.push(...inline(n.children, { ...fmt, code: true })); break;
      case "a": out.push({ type: "link", url: href(n.attrs), children: inline(n.children, fmt).filter((c): c is Text => c.type === "text") }); break;
      default: out.push(...inline(n.children, fmt));
    }
  }
  return out;
}
const nonEmpty = (c: Inline[]) => (c.length ? c : [{ type: "text" as const, text: "" }]);

export function htmlToBlocks(html?: string | null): Block[] {
  if (!html?.trim()) return [];
  const blocks: Block[] = [];
  let loose: (El | string)[] = [];
  const flush = () => {
    const c = inline(loose);
    if (c.some((x) => x.type === "link" || x.text.trim())) blocks.push({ type: "paragraph", children: c });
    loose = [];
  };
  for (const n of parse(html).children) {
    if (typeof n === "string" || !["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "blockquote", "pre", "div"].includes(n.tag)) {
      loose.push(n);
      continue;
    }
    flush();
    if (n.tag === "p" || n.tag === "div") blocks.push({ type: "paragraph", children: nonEmpty(inline(n.children)) });
    else if (n.tag[0] === "h") blocks.push({ type: "heading", level: Number(n.tag[1]) as 1, children: nonEmpty(inline(n.children)) });
    else if (n.tag === "ul" || n.tag === "ol")
      blocks.push({
        type: "list", format: n.tag === "ol" ? "ordered" : "unordered",
        children: n.children.filter((c): c is El => typeof c !== "string" && c.tag === "li").map((li) => ({ type: "list-item", children: nonEmpty(inline(li.children)) })),
      });
    else if (n.tag === "blockquote") blocks.push({ type: "quote", children: nonEmpty(inline(n.children)) });
    else blocks.push({ type: "code", children: inline(n.children).filter((c): c is Text => c.type === "text") });
  }
  flush();
  return blocks;
}
