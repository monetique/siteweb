"use client";

import { BlocksRenderer, type BlocksContent } from "@strapi/blocks-react-renderer";
import { L as NextLink } from "@/components/LangProvider";
import { safeHref } from "@/lib/safe";

/** Numéros de téléphone (+216 71 155 840, (+216) 71…, 80 100 115) : isolés en gauche-à-droite
 *  pour qu'un texte arabe ne les affiche pas à l'envers. Sans effet visible en français/anglais. */
const PHONE = /(?:\(?\+\d{3}\)?\s?)?\b\d{2}(?:\s\d{3}){2}\b/g;
export const isolatePhones = (text: string) => text.replace(/[\u2066\u2069]/g, "").replace(PHONE, "\u2066$&\u2069");

type Node = { type?: string; text?: string; children?: Node[] };
const isolateNode = (n: Node): Node =>
  n.type === "text" && typeof n.text === "string"
    ? { ...n, text: isolatePhones(n.text) }
    : n.children ? { ...n, children: n.children.map(isolateNode) } : n;

/** Affiche le texte riche (champ « blocks ») saisi dans Strapi. */
export function RichText({ content, className = "" }: { content?: BlocksContent | null; className?: string }) {
  if (!content?.length) return null;
  content = (content as Node[]).map(isolateNode) as BlocksContent;
  return (
    <div className={`prose-smt ${className}`}>
      <BlocksRenderer
        content={content}
        blocks={{
          link: ({ children, url }) => {
            const href = safeHref(url);
            return href.startsWith("/") ? <NextLink href={href}>{children}</NextLink> : <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
          },
        }}
      />
    </div>
  );
}
