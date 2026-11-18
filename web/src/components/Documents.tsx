import { mediaUrl, type Media } from "@/lib/strapi";
import { Icon } from "./Icon";

export function Documents({ files, title = "Documents" }: { files?: Media[] | null; title?: string }) {
  if (!files?.length) return null;
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
      <h2 className="mb-4 font-sans text-label-md uppercase tracking-wider">{title}</h2>
      <ul className="space-y-2">
        {files.map((f) => (
          <li key={f.url}>
            <a href={mediaUrl(f) ?? "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3 text-body-sm hover:bg-surface-container">
              <Icon name={f.mime?.includes("pdf") ? "picture_as_pdf" : "description"} className="text-secondary" />
              <span className="flex-1">{f.alternativeText || f.name}</span>
              {f.size ? <span className="text-label-sm text-on-surface-variant">{Math.round(f.size)} Ko</span> : null}
              <Icon name="download" className="text-[18px] text-secondary" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
