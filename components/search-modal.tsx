"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@/components/locale-context";
import { localizePath } from "@/lib/locale-routing";
import { formatDisplayDate } from "@/lib/news-client";
import type { NewsPreview } from "@/lib/news";
import { getTopicMeta, type TopicKey } from "@/lib/news-meta";
import { loadPagefind, type PagefindResultData, type PagefindRuntime } from "@/lib/pagefind-client";

type SearchModalProps = {
  entries: NewsPreview[];
  onClose: () => void;
};

const MAX_RESULTS = 20;

type DisplayRow = {
  key: string;
  href: string;
  topicLabel: string;
  date: string;
  title: string;
  excerptHtml?: string;
};

function buildHref(entry: { topic: TopicKey; date: string }, locale: "zh" | "en") {
  return localizePath(`/news/${entry.topic}/${entry.date}`, locale);
}

function fallbackRows(
  entries: NewsPreview[],
  query: string,
  locale: "zh" | "en",
): DisplayRow[] {
  const normalized = query.trim().toLowerCase();
  const source = normalized
    ? entries.filter((entry) => {
        const topicLabel = (getTopicMeta(entry.topic, locale)?.label ?? "").toLowerCase();
        return (
          entry.searchText.includes(normalized) ||
          topicLabel.includes(normalized) ||
          entry.date.includes(normalized)
        );
      })
    : entries;
  return source.slice(0, MAX_RESULTS).map((entry) => ({
    key: `${entry.topic}:${entry.date}`,
    href: buildHref(entry, locale),
    topicLabel: getTopicMeta(entry.topic, locale)?.shortLabel ?? entry.topic,
    date: formatDisplayDate(entry.date, locale),
    title: entry.title,
  }));
}

function pagefindRowsFromData(data: PagefindResultData[], locale: "zh" | "en"): DisplayRow[] {
  return data
    .filter((d) => d?.meta?.locale === locale)
    .slice(0, MAX_RESULTS)
    .map((d) => {
      const topic = d.meta.topic as TopicKey;
      return {
        key: `${topic}:${d.meta.date}`,
        href: d.url,
        topicLabel: getTopicMeta(topic, locale)?.shortLabel ?? topic,
        date: formatDisplayDate(d.meta.date, locale),
        title: d.meta.title,
        excerptHtml: d.excerpt,
      };
    });
}

export function SearchModal({ entries, onClose }: SearchModalProps) {
  const locale = useLocale();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [runtime, setRuntime] = useState<PagefindRuntime | null>(null);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [remoteRows, setRemoteRows] = useState<DisplayRow[] | null>(null);
  const queryToken = useRef(0);

  useEffect(() => {
    // Remember the element that opened the modal so we can return focus on
    // close — keyboard users otherwise lose their place.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      // Defer to next frame so React's unmount finishes first.
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        requestAnimationFrame(() => previouslyFocused.focus());
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadPagefind().then((pf) => {
      if (cancelled) return;
      setRuntime(pf);
      setRuntimeReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pagefind-backed live search; debounced via query token to avoid races.
  // Effect body intentionally never calls setState synchronously — only the
  // async then-branch updates state once the search resolves for this query.
  useEffect(() => {
    if (!runtime) return;
    const normalized = query.trim();
    if (!normalized) return;
    const token = ++queryToken.current;
    const timer = setTimeout(async () => {
      try {
        const response = await runtime.search(normalized, {
          filters: { locale: { any: [locale] } },
        });
        if (token !== queryToken.current) return;
        const data = await Promise.all(
          response.results.slice(0, MAX_RESULTS * 2).map((r) => r.data()),
        );
        if (token !== queryToken.current) return;
        setRemoteRows(pagefindRowsFromData(data, locale));
      } catch (err) {
        console.warn("[pagefind] search error", err);
        if (token === queryToken.current) setRemoteRows([]);
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [query, runtime, locale]);

  const results = useMemo<DisplayRow[]>(() => {
    if (runtime && query.trim()) {
      // remoteRows is keyed implicitly by `query`: when a new query arrives,
      // the previous remoteRows briefly shows under the new query string. The
      // 80ms debounce keeps that window tight enough not to be visible.
      return remoteRows ?? [];
    }
    return fallbackRows(entries, query, locale);
  }, [entries, locale, query, runtime, remoteRows]);

  const handleNavigate = (row: DisplayRow) => {
    onClose();
    router.push(row.href);
  };

  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((idx) => Math.min(idx + 1, results.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((idx) => Math.max(idx - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      const target = results[activeIndex];
      if (target) {
        event.preventDefault();
        handleNavigate(target);
      }
      return;
    }
    if (event.key === "Tab" && panelRef.current) {
      // Focus trap: keep keyboard navigation inside the dialog.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'input, button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const isPagefindEmpty =
    !!runtime && !!query.trim() && remoteRows !== null && remoteRows.length === 0;

  return (
    <div
      className="np-search-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={locale === "zh" ? "搜索日报" : "Search digests"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div ref={panelRef} className="np-search-panel" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="np-search-input"
          placeholder={
            locale === "zh"
              ? "搜索标题、正文、主题或日期 (YYYY-MM-DD)…"
              : "Search titles, body, topics, or dates (YYYY-MM-DD)…"
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          aria-label={locale === "zh" ? "搜索关键词" : "Search query"}
          role="combobox"
          aria-controls="np-search-listbox"
          aria-expanded={results.length > 0}
          aria-activedescendant={
            results.length > 0 ? `np-search-row-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
        />

        <div
          className="np-search-list"
          role="listbox"
          id="np-search-listbox"
          aria-label={locale === "zh" ? "搜索结果" : "Search results"}
        >
          {results.length === 0 ? (
            <div className="np-search-empty">
              {isPagefindEmpty
                ? locale === "zh"
                  ? "未匹配到任何日报。"
                  : "No digests match this query."
                : locale === "zh"
                ? "没有匹配的日报。"
                : "No matching digests."}
            </div>
          ) : (
            results.map((row, idx) => (
              <Link
                key={row.key}
                id={`np-search-row-${idx}`}
                href={row.href}
                role="option"
                aria-selected={idx === activeIndex}
                className="np-search-row"
                data-active={idx === activeIndex || undefined}
                onClick={() => onClose()}
              >
                <div className="np-search-row-meta">
                  {`${row.topicLabel} · ${row.date}`}
                </div>
                <div className="np-search-row-title">{row.title}</div>
                {row.excerptHtml ? (
                  <div
                    className="np-search-row-excerpt"
                    dangerouslySetInnerHTML={{ __html: row.excerptHtml }}
                  />
                ) : null}
              </Link>
            ))
          )}
        </div>

        <div className="np-search-hint">
          <span>↑↓ {locale === "zh" ? "选择" : "navigate"}</span>
          <span>↵ {locale === "zh" ? "打开" : "open"}</span>
          <span>esc {locale === "zh" ? "关闭" : "close"}</span>
          <span style={{ marginLeft: "auto", opacity: 0.7 }}>
            {runtimeReady
              ? runtime
                ? locale === "zh"
                  ? "全文索引"
                  : "full-text"
                : locale === "zh"
                ? "简化模式"
                : "lite mode"
              : locale === "zh"
              ? "加载中…"
              : "loading…"}
          </span>
        </div>
      </div>
    </div>
  );
}
