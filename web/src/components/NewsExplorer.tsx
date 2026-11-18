"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { NewsCard, type NewsItem } from "./NewsCard";
import { useDict } from "./LangProvider";

export type Tab = { key: string; label: string; groups?: string[]; status?: string };
const PAGE_SIZE = 9;

/** Liste filtrable (onglets + recherche + pagination) des actualités et appels d'offres. */
export function NewsExplorer({ items, tabs, title }: { items: NewsItem[]; tabs: Tab[]; title?: string }) {
  const d = useDict();
  const [tab, setTab] = useState(tabs[0].key);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const t = tabs.find((x) => x.key === tab)!;
    const q = query.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return items.filter((i) => {
      if (t.groups && !t.groups.includes(i.group)) return false;
      if (t.status && i.status !== t.status) return false;
      if (!q) return true;
      const hay = `${i.title} ${i.excerpt ?? ""} ${i.meta ?? ""} ${i.label}`.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
      return hay.includes(q);
    });
  }, [items, tabs, tab, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const count = (t: Tab) => items.filter((i) => (!t.groups || t.groups.includes(i.group)) && (!t.status || i.status === t.status)).length;

  return (
    <section className="w-full bg-surface py-16 lg:py-20">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-12">
        {title && <h2 className="mb-8 text-headline-lg-mobile lg:text-headline-lg">{title}</h2>}
        <div className="mb-10 flex flex-col gap-4 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label={d.filterPublications} className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button key={t.key} role="tab" type="button" aria-selected={tab === t.key}
                onClick={() => { setTab(t.key); setPage(1); }}
                className={`rounded-lg px-4 py-2 text-label-md transition-colors ${tab === t.key ? "bg-primary-container text-on-primary" : "bg-surface-container-low text-on-surface hover:bg-surface-container"}`}>
                {t.label} <span className="ms-1 opacity-60">{count(t)}</span>
              </button>
            ))}
          </div>
          <label className="relative block lg:w-80">
            <span className="sr-only">{d.searchPublication}</span>
            <Icon name="search" className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant" />
            <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={d.searchPlaceholder}
              className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-low py-2.5 ps-10 pe-4 text-body-md outline-none focus:border-secondary" />
          </label>
        </div>

        <p className="mb-6 text-body-sm text-on-surface-variant" aria-live="polite">
          {d.publications(filtered.length)}{pages > 1 ? d.pageOf(current, pages) : ""}
        </p>
        {shown.length ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{shown.map((i) => <NewsCard key={i.href} item={i} />)}</div>
        ) : (
          <p className="rounded-xl bg-surface-container-low p-8 text-center text-body-md text-on-surface-variant">{d.noResult}</p>
        )}

        {pages > 1 && (
          <nav aria-label={d.pagination} className="mt-10 flex items-center justify-center gap-2">
            <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label={d.prevPage}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/40 disabled:opacity-40"><Icon name="chevron_left" /></button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" onClick={() => setPage(n)} aria-current={n === current ? "page" : undefined}
                className={`h-10 w-10 rounded-lg text-label-md ${n === current ? "bg-secondary text-on-secondary" : "border border-outline-variant/40"}`}>{n}</button>
            ))}
            <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} aria-label={d.nextPage}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/40 disabled:opacity-40"><Icon name="chevron_right" /></button>
          </nav>
        )}
      </div>
    </section>
  );
}
