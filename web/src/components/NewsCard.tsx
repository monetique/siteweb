import NextLink from "next/link";
import { formatDate, TENDER_STATUS } from "@/lib/format";
import { Icon } from "./Icon";

export type NewsItem = { kind: "actu" | "ao"; title: string; href: string; date: string; label: string; excerpt?: string; meta?: string; cover?: string | null; group: string; status?: string; deadline?: string };

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2 text-label-sm">
        <span className={`rounded px-2 py-0.5 text-eyebrow uppercase ${item.kind === "ao" ? "bg-primary-container text-secondary-fixed" : "bg-surface-container text-secondary"}`}>{item.label}</span>
        <span className="flex items-center gap-1 text-on-surface-variant"><Icon name="calendar_today" className="text-[14px]" />{formatDate(item.date)}</span>
        {item.status && <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.status === "ouvert" ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-high text-on-surface-variant"}`}>{TENDER_STATUS[item.status]}</span>}
      </div>
      {item.meta && <span className="mt-3 text-label-sm text-on-surface-variant">{item.meta}</span>}
      <h3 className={`${item.meta ? "mt-1" : "mt-4"} text-headline-sm text-[1.05rem]`}>
        <NextLink href={item.href} className="hover:text-secondary">{item.title}</NextLink>
      </h3>
      {item.excerpt && <p className="mt-3 line-clamp-3 flex-1 text-body-sm text-on-surface-variant">{item.excerpt}</p>}
      {item.deadline && <p className="mt-3 flex items-center gap-1.5 text-label-sm text-on-surface-variant"><Icon name="event_busy" className="text-[16px]" />Date limite : {formatDate(item.deadline)}</p>}
      <NextLink href={item.href} className="mt-5 inline-flex items-center gap-1 text-label-md text-secondary" aria-label={`${item.kind === "ao" ? "Consulter l'avis" : "Lire l'article"} : ${item.title}`}>
        {item.kind === "ao" ? "Consulter l'avis" : "Lire l'article"} <Icon name="arrow_forward" className="text-[16px]" />
      </NextLink>
    </article>
  );
}

