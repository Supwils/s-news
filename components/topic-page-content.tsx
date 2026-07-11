"use client";

import { useState } from "react";

import { NewsCard } from "@/components/news-card";
import { useLocale } from "@/components/locale-context";
import { NewspaperFooter } from "@/components/newspaper/footer";
import { NewspaperMasthead } from "@/components/newspaper/masthead";
import { getCopy } from "@/data/copy";
import { TOPIC_CARDS_STEP, TOPIC_INITIAL_CARDS } from "@/lib/list-windows";
import type { NewsCardEntry } from "@/lib/news";
import { getTopicMeta, type TopicKey } from "@/lib/news-meta";
import { useMoreEntries } from "@/lib/use-more-entries";

type TopicPageContentProps = {
  topic: TopicKey;
  /** Only the first TOPIC_INITIAL_CARDS entries, resolved for this route's locale. */
  entries: NewsCardEntry[];
  /** Every digest in this topic, including the ones not passed above. */
  totalEntries: number;
};


export function TopicPageContent({ topic, entries, totalEntries }: TopicPageContentProps) {
  const locale = useLocale();
  const copy = getCopy(locale);
  const meta = getTopicMeta(topic, locale);
  const { entries: allEntries, fetchRest, loading, failed } = useMoreEntries(entries, { locale, topic });
  const [visibleCount, setVisibleCount] = useState(TOPIC_INITIAL_CARDS);

  if (!meta) {
    return null;
  }

  const visibleEntries = allEntries.slice(0, visibleCount);
  const remaining = totalEntries - visibleEntries.length;

  const handleLoadMore = async () => {
    // Only reveal more once the data behind them has arrived.
    if (await fetchRest()) {
      setVisibleCount((count) => count + TOPIC_CARDS_STEP);
    }
  };

  return (
    <div className="np-root">
      <NewspaperMasthead active="topics" />
      <main className="mx-auto w-full" style={{ maxWidth: 1280, padding: 40 }}>
        <section style={{ paddingBottom: 28, borderBottom: "1px solid var(--color-border)" }}>
          <p
            className="np-mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                background: meta.accent,
                borderRadius: 999,
                marginRight: 8,
                verticalAlign: "1px",
              }}
            />
            {copy.ui.topicPage.badge}
          </p>
          <h1
            className="np-serif"
            style={{
              fontSize: 56,
              letterSpacing: "-0.02em",
              lineHeight: 1.02,
              fontWeight: 600,
              margin: "12px 0 12px",
              color: "var(--color-text-primary)",
            }}
          >
            {meta.label}
          </h1>
          <p
            className="np-serif"
            style={{
              fontStyle: "italic",
              fontSize: 18,
              lineHeight: 1.55,
              maxWidth: 640,
              color: "var(--color-text-secondary)",
              margin: 0,
            }}
          >
            {meta.description}
          </p>
          <p
            className="np-mono"
            style={{
              marginTop: 18,
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
            }}
          >
            {totalEntries} {locale === "en" ? "ISSUES ARCHIVED" : "份归档"}
          </p>
        </section>

        {totalEntries === 0 ? (
          <section style={{ marginTop: 32 }}>
            <p className="np-sans" style={{ fontSize: 15, lineHeight: 1.7, color: "var(--color-text-secondary)", margin: 0 }}>
              {locale === "en"
                ? "No English digests have been archived for this topic yet."
                : "该主题下暂时还没有可展示的日报。"}
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-2" style={{ marginTop: 32 }}>
              {visibleEntries.map((entry) => (
                <NewsCard key={`${entry.topic}-${entry.date}`} entry={entry} />
              ))}
            </section>
            {remaining > 0 ? (
              <div style={{ marginTop: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <button type="button" className="np-btn-secondary" onClick={handleLoadMore} disabled={loading}>
                  {loading
                    ? locale === "en"
                      ? "Loading…"
                      : "加载中…"
                    : locale === "en"
                      ? `Load more (${remaining} remaining)`
                      : `加载更多（剩余 ${remaining} 篇）`}
                </button>
                {failed ? (
                  <p className="np-sans" style={{ fontSize: 13, color: "var(--np-ink-red)", margin: 0 }}>
                    {locale === "en" ? "Could not load more. Try again." : "加载失败，请重试。"}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        )}

        <NewspaperFooter />
      </main>
    </div>
  );
}
