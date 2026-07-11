"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { useLocale } from "@/components/locale-context";
import { localizePath } from "@/lib/locale-routing";
import { formatDisplayDate } from "@/lib/news-client";
import { TOPICS, getTopicMeta, isTopicKey, type TopicKey } from "@/lib/news-meta";
import {
  isTimeRange,
  TIME_RANGES,
  timeRangeFilters,
  timeRangeLabel,
  type TimeRange,
} from "@/lib/search-time-range";
import {
  loadPagefind,
  type PagefindFilters,
  type PagefindResultData,
  type PagefindRuntime,
  type Locale,
} from "@/lib/pagefind-client";

type SearchPageProps = {
  initialQuery: string;
  initialTopics: TopicKey[];
  initialLocaleScope: "current" | "all";
  initialTimeRange: TimeRange;
};

type Row = {
  id: string;
  url: string;
  topic: TopicKey;
  topicLabel: string;
  date: string;
  dateDisplay: string;
  locale: Locale;
  title: string;
  excerptHtml: string;
};

const PAGE_SIZE_INITIAL = 30;
const PAGE_SIZE_STEP = 30;

function dataToRow(d: PagefindResultData, currentLocale: Locale): Row {
  const topic = d.meta.topic as TopicKey;
  const locale = (d.meta.locale as Locale) ?? currentLocale;
  return {
    id: `${topic}:${d.meta.date}:${locale}`,
    url: d.url,
    topic,
    topicLabel: getTopicMeta(topic, currentLocale)?.shortLabel ?? topic,
    date: d.meta.date,
    dateDisplay: formatDisplayDate(d.meta.date, currentLocale),
    locale,
    title: d.meta.title,
    excerptHtml: d.excerpt,
  };
}

export function SearchPage({
  initialQuery,
  initialTopics,
  initialLocaleScope,
  initialTimeRange,
}: SearchPageProps) {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [selectedTopics, setSelectedTopics] = useState<TopicKey[]>(initialTopics);
  const [scope, setScope] = useState<"current" | "all">(initialLocaleScope);
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [runtime, setRuntime] = useState<PagefindRuntime | null>(null);
  const [runtimeChecked, setRuntimeChecked] = useState(false);
  const [totalResults, setTotalResults] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_INITIAL);
  const [loadingMore, setLoadingMore] = useState(false);
  const pendingResults = useRef<Array<{ data: () => Promise<PagefindResultData> }>>([]);
  const queryToken = useRef(0);
  // Marks the moment of the user's last keystroke in the input. The URL→state
  // sync effect ignores incoming searchParams within USER_EDIT_WINDOW_MS so
  // back/forward and external URL changes don't clobber an in-flight edit.
  const lastUserEditAt = useRef(0);
  const USER_EDIT_WINDOW_MS = 500;

  // Load Pagefind once
  useEffect(() => {
    let cancelled = false;
    void loadPagefind().then((pf) => {
      if (cancelled) return;
      setRuntime(pf);
      setRuntimeChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync filter state ⇄ URL.
  const syncUrl = useCallback(
    (nextQuery: string, nextTopics: TopicKey[], nextScope: "current" | "all", nextRange: TimeRange) => {
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      for (const t of nextTopics) params.append("topic", t);
      if (nextScope === "all") params.set("scope", "all");
      if (nextRange !== "all") params.set("range", nextRange);
      const base = localizePath("/search", locale);
      const qs = params.toString();
      router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
    },
    [router, locale],
  );

  // Debounced URL sync as user types — shareable / back-button-friendly URLs.
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if ((params.get("q") ?? "") === query.trim()) return; // no-op
      syncUrl(query, selectedTopics, scope, timeRange);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, selectedTopics, scope, timeRange, syncUrl]);

  // Run query whenever inputs change.
  useEffect(() => {
    if (!runtimeChecked) return;
    const normalized = query.trim();
    if (!normalized) {
      setRows([]);
      setTotalResults(null);
      setLoading(false);
      return;
    }
    if (!runtime) {
      setRows([]);
      setTotalResults(0);
      return;
    }

    const token = ++queryToken.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        // `{any: [...]}`, never a bare array: Pagefind ANDs array values, so
        // ticking two topic checkboxes used to return zero results.
        const filters: PagefindFilters = { ...timeRangeFilters(timeRange) };
        if (selectedTopics.length > 0) filters.topic = { any: selectedTopics };
        if (scope === "current") filters.locale = { any: [locale] };

        const response = await runtime.search(normalized, { filters });
        if (token !== queryToken.current) return;

        // Cache all result handles so "Load more" doesn't re-query Pagefind.
        pendingResults.current = response.results;
        const slice = response.results.slice(0, PAGE_SIZE_INITIAL);
        const data = await Promise.all(slice.map((r) => r.data()));
        if (token !== queryToken.current) return;

        setRows(data.map((d) => dataToRow(d, locale)));
        setTotalResults(response.results.length);
        setPageSize(PAGE_SIZE_INITIAL);
      } catch (err) {
        console.warn("[pagefind] search-page error", err);
        if (token === queryToken.current) {
          setRows([]);
          setTotalResults(0);
          pendingResults.current = [];
        }
      } finally {
        if (token === queryToken.current) setLoading(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [query, selectedTopics, scope, timeRange, runtime, runtimeChecked, locale]);

  const handleLoadMore = useCallback(async () => {
    const total = pendingResults.current.length;
    // `pageSize` only advances after the awaited `r.data()` calls resolve, so a
    // second click before then would slice — and append — the same page twice.
    if (loadingMore || pageSize >= total) return;
    const nextSize = Math.min(pageSize + PAGE_SIZE_STEP, total);
    const slice = pendingResults.current.slice(pageSize, nextSize);
    const token = queryToken.current;
    setLoadingMore(true);
    try {
      const data = await Promise.all(slice.map((r) => r.data()));
      if (token !== queryToken.current) return;
      setRows((prev) => [...prev, ...data.map((d) => dataToRow(d, locale))]);
      setPageSize(nextSize);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, pageSize, locale]);

  // Re-derive scope/topics if URL changes externally (back/forward). Skip if
  // the user just typed — they own the source of truth for USER_EDIT_WINDOW_MS.
  useEffect(() => {
    if (Date.now() - lastUserEditAt.current < USER_EDIT_WINDOW_MS) return;
    const qParam = searchParams.get("q") ?? "";
    const topicParams = searchParams.getAll("topic").filter(isTopicKey) as TopicKey[];
    const scopeParam: "current" | "all" = searchParams.get("scope") === "all" ? "all" : "current";
    const rangeParam = searchParams.get("range");
    const nextRange: TimeRange = isTimeRange(rangeParam) ? rangeParam : "all";
    if (qParam !== query) setQuery(qParam);
    if (
      topicParams.length !== selectedTopics.length ||
      topicParams.some((t, i) => selectedTopics[i] !== t)
    ) {
      setSelectedTopics(topicParams);
    }
    if (scopeParam !== scope) setScope(scopeParam);
    if (nextRange !== timeRange) setTimeRange(nextRange);
    // intentionally only depend on searchParams
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const topicsForLocale = useMemo(
    () =>
      TOPICS.map((t) => ({
        key: t.key,
        label: getTopicMeta(t.key, locale)?.shortLabel ?? t.key,
      })),
    [locale],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Cancel debounce and flush immediately on Enter.
    syncUrl(query, selectedTopics, scope, timeRange);
  };

  const toggleTopic = (key: TopicKey) => {
    const next = selectedTopics.includes(key)
      ? selectedTopics.filter((t) => t !== key)
      : [...selectedTopics, key];
    setSelectedTopics(next);
    syncUrl(query, next, scope, timeRange);
  };

  const setScopeAndSync = (next: "current" | "all") => {
    setScope(next);
    syncUrl(query, selectedTopics, next, timeRange);
  };

  const setTimeRangeAndSync = (next: TimeRange) => {
    setTimeRange(next);
    syncUrl(query, selectedTopics, scope, next);
  };

  const clearFilters = () => {
    setSelectedTopics([]);
    setScope("current");
    setTimeRange("all");
    syncUrl(query, [], "current", "all");
  };

  const emptyState =
    query.trim() && !loading
      ? rows.length === 0
        ? !runtime
          ? locale === "zh"
            ? "搜索引擎尚未加载完成。"
            : "Search engine still loading."
          : locale === "zh"
          ? "未匹配到任何日报。"
          : "No digests match this query."
        : null
      : null;

  return (
    <div className="np-search-page">
      <form className="np-search-page-header" onSubmit={handleSubmit}>
        <Search size={18} aria-hidden />
        <input
          className="np-search-page-input"
          type="text"
          placeholder={
            locale === "zh"
              ? "输入关键字搜索全部日报正文…"
              : "Search the full body of every digest…"
          }
          value={query}
          onChange={(e) => {
            lastUserEditAt.current = Date.now();
            setQuery(e.target.value);
          }}
          autoFocus
          aria-label={locale === "zh" ? "搜索框" : "Search query"}
        />
        <div className="np-search-page-scope">
          <button
            type="button"
            data-active={scope === "current" || undefined}
            onClick={() => setScopeAndSync("current")}
          >
            {locale === "zh" ? "当前语言" : "Current locale"}
          </button>
          <button
            type="button"
            data-active={scope === "all" || undefined}
            onClick={() => setScopeAndSync("all")}
          >
            {locale === "zh" ? "全部" : "All"}
          </button>
        </div>
      </form>

      <div className="np-search-page-body">
        <aside className="np-search-facets">
          <div className="np-search-facets-head">
            <span>{locale === "zh" ? "时间" : "Time"}</span>
          </div>
          <div className="np-search-page-scope" style={{ marginBottom: 20, flexWrap: "wrap" }}>
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                type="button"
                data-active={timeRange === range || undefined}
                onClick={() => setTimeRangeAndSync(range)}
              >
                {timeRangeLabel(range, locale)}
              </button>
            ))}
          </div>

          <div className="np-search-facets-head">
            <span>{locale === "zh" ? "主题" : "Topics"}</span>
            {selectedTopics.length > 0 || timeRange !== "all" || scope !== "current" ? (
              <button type="button" onClick={clearFilters} className="np-search-facets-clear">
                {locale === "zh" ? "清空" : "Clear"}
              </button>
            ) : null}
          </div>
          <ul className="np-search-facets-list">
            {topicsForLocale.map((t) => {
              const active = selectedTopics.includes(t.key);
              return (
                <li key={t.key}>
                  <label className="np-search-facets-item" data-active={active || undefined}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleTopic(t.key)}
                    />
                    <span>{t.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {runtimeChecked && !runtime ? (
            <div className="np-search-facets-note">
              {locale === "zh"
                ? "全文索引尚未构建完成；仅展示标题级匹配。"
                : "Full-text index missing; title-only matching."}
            </div>
          ) : null}
        </aside>

        <section className="np-search-results">
          {!query.trim() ? (
            <div className="np-search-empty">
              {locale === "zh"
                ? "输入关键字开始搜索；支持中英文混合、按主题与语言过滤。"
                : "Type a query to search; supports bilingual content with topic and locale filters."}
            </div>
          ) : loading ? (
            <div className="np-search-empty">
              {locale === "zh" ? "搜索中…" : "Searching…"}
            </div>
          ) : emptyState ? (
            <div className="np-search-empty">{emptyState}</div>
          ) : (
            <>
              <div className="np-search-results-meta">
                {locale === "zh"
                  ? `约 ${totalResults ?? rows.length} 条结果`
                  : `~${totalResults ?? rows.length} results`}
              </div>
              <ul className="np-search-results-list">
                {rows.map((row) => (
                  <li key={row.id}>
                    <Link href={row.url} className="np-search-result">
                      <div className="np-search-result-meta">
                        <span>{row.topicLabel}</span>
                        <span>·</span>
                        <span>{row.dateDisplay}</span>
                        {scope === "all" ? (
                          <>
                            <span>·</span>
                            <span style={{ textTransform: "uppercase" }}>{row.locale}</span>
                          </>
                        ) : null}
                      </div>
                      <div className="np-search-result-title">{row.title}</div>
                      <div
                        className="np-search-result-excerpt"
                        dangerouslySetInnerHTML={{ __html: row.excerptHtml }}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
              {totalResults != null && totalResults > rows.length ? (
                <div className="np-search-results-more">
                  <button
                    type="button"
                    className="np-search-load-more"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore
                      ? locale === "zh"
                        ? "加载中…"
                        : "Loading…"
                      : locale === "zh"
                        ? `加载更多（剩余 ${totalResults - rows.length} 条）`
                        : `Load more (${totalResults - rows.length} remaining)`}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
