"use client";

import { ArrowUpRight } from "lucide-react";

import { SelectableLink } from "@/components/SelectableLink";

import { useLocale } from "@/components/locale-context";
import { InlineMarkdown } from "@/components/news-markdown";
import { getCopy } from "@/data/copy";
import { localizePath } from "@/lib/locale-routing";
import { formatDisplayDate } from "@/lib/news-client";
import { getTopicMeta } from "@/lib/news-meta";
import type { NewsCardEntry } from "@/lib/news";

type NewsCardProps = {
  entry: NewsCardEntry;
  compact?: boolean;
  className?: string;
};

export function NewsCard({ entry, compact = false, className }: NewsCardProps) {
  const locale = useLocale();
  const copy = getCopy(locale);
  const topic = getTopicMeta(entry.topic, locale);

  if (!topic) {
    return null;
  }

  const newsHref = localizePath(`/news/${entry.topic}/${entry.date}`, locale);

  return (
    <SelectableLink
      href={newsHref}
      className="block cursor-pointer"
      aria-label={copy.ui.newsCard.viewEntry(entry.title)}
    >
      <article
        className={[
          "group relative np-card",
          className ?? "",
        ].join(" ")}
        style={{
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div className="select-text flex items-start justify-between gap-4">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            <span
              className="np-mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: topic.accent,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: topic.accent,
                }}
              />
              {topic.shortLabel}
            </span>

            <h3
              className="np-serif"
              style={{
                fontSize: 22,
                lineHeight: 1.25,
                letterSpacing: "-0.01em",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                margin: 0,
              }}
            >
              <InlineMarkdown content={entry.title} inline disableLinks />
            </h3>
            <div
              className="np-sans"
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--color-text-secondary)",
                maxWidth: 640,
              }}
            >
              <InlineMarkdown content={entry.description} disableLinks />
            </div>
          </div>

          <span
            aria-hidden
            className="hidden sm:inline-flex np-card-arrow"
            style={{
              border: "1px solid var(--color-border)",
              padding: 8,
              color: "var(--color-text-primary)",
            }}
          >
            <ArrowUpRight size={15} />
          </span>
        </div>

        <div
          className="np-mono"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 18,
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "var(--color-text-muted)",
            paddingTop: 12,
            borderTop: "1px solid var(--color-border-soft)",
          }}
        >
          <span>{formatDisplayDate(entry.date, locale)}</span>
          <span>·</span>
          <span>{entry.readingMinutes} {copy.ui.newsCard.min}</span>
          <span>·</span>
          <span>{entry.sectionCount} {copy.ui.newsCard.sections}</span>
          <span>·</span>
          <span>{entry.articleCount} {copy.ui.newsCard.stories}</span>
        </div>

        {!compact && entry.highlights.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {entry.highlights.slice(0, 3).map((highlight) => (
              <div
                key={highlight}
                className="np-sans"
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: "var(--color-text-secondary)",
                  paddingLeft: 14,
                  borderLeft: "2px solid var(--color-border-soft)",
                }}
              >
                <InlineMarkdown content={highlight} disableLinks />
              </div>
            ))}
          </div>
        ) : null}

        {entry.takeaway ? (
          <div
            className="np-serif"
            style={{
              fontStyle: "italic",
              fontSize: 14.5,
              lineHeight: 1.6,
              color: "var(--color-text-primary)",
              paddingLeft: 14,
              borderLeft: "3px solid var(--color-text-primary)",
            }}
          >
            <InlineMarkdown content={entry.takeaway} disableLinks />
          </div>
        ) : null}
      </article>
    </SelectableLink>
  );
}
