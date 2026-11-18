"use client";

import { BlocksRenderer, type BlocksContent } from "@strapi/blocks-react-renderer";
import NextLink from "next/link";
import { safeHref } from "@/lib/safe";

/** Affiche le texte riche (champ « blocks ») saisi dans Strapi. */
export function RichText({ content, className = "" }: { content?: BlocksContent | null; className?: string }) {
  if (!content?.length) return null;
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
