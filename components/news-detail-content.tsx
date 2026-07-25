"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3, Command, FileText, Layers3 } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { InlineMarkdown } from "@/components/news-markdown";
import { NewspaperFooter } from "@/components/newspaper/footer";
import { NewspaperMasthead } from "@/components/newspaper/masthead";
import { QuickTopicLinks } from "@/components/quick-topic-links";
import { ReadingProgress } from "@/components/reading-progress";
import { useLocale } from "@/components/locale-context";
import { getCopy } from "@/data/copy";
import { localizePath } from "@/lib/locale-routing";
import { formatDisplayDate } from "@/lib/news-client";
import type { NewsEntry, NewsPreview } from "@/lib/news";
import { getTopicMeta, TOPICS, type TopicKey } from "@/lib/news-meta";

type NewsDetailViewEntry = Omit<NewsEntry, "filePath" | "content">;

/** Slim event link for the sidebar — full members live on the event page. */
export type DetailEventLink = {
  id: string;
  title: string;
  topics: TopicKey[];
  memberCount: number;
};

type NewsDetailContentProps = {
  topic: TopicKey;
  date: string;
  /** Already resolved for the current route's locale by the server page. */
  entry: NewsDetailViewEntry;
  /** Already resolved for the current route's locale by the server page. */
  articleBody: ReactNode;
  availableTopics: TopicKey[];
  related: NewsPreview[];
  /**
   * True on the /en route when no English translation exists and we are
   * rendering the Chinese original as a fallback.
   */
  isChineseFallback?: boolean;
  /** Cross-topic events this digest participates in (may be empty). */
  events?: DetailEventLink[];
  /** Nearest older issue of this topic in the current locale's index. */
  prevDate?: string | null;
  /** Nearest newer issue of this topic in the current locale's index. */
  nextDate?: string | null;
};

export function NewsDetailContent({
  topic,
  date,
  entry,
  articleBody,
  availableTopics,
  related,
  isChineseFallback = false,
  events = [],
  prevDate = null,
  nextDate = null,
}: NewsDetailContentProps) {
  const locale = useLocale();
  const router = useRouter();
  const activeEntry = entry;
  const activeBody = articleBody;
  const isShowingChineseFallback = isChineseFallback;
  const copy = getCopy(locale);
  const meta = getTopicMeta(topic, locale);
  const topicLabels = TOPICS.map((t) => ({ key: t.key, label: getTopicMeta(t.key, locale)!.label }));
  const topicHref = localizePath(`/news/${topic}`, locale);
  const homeHref = localizePath("/", locale);
  const archiveHref = localizePath(`/archive/${date.slice(0, 7)}`, locale);
  const prevHref = prevDate ? localizePath(`/news/${topic}/${prevDate}`, locale) : null;
  const nextHref = nextDate ? localizePath(`/news/${topic}/${nextDate}`, locale) : null;

  // ArrowLeft steps to the older issue, ArrowRight to the newer one — but
  // never while the reader is typing (search modal, forms) or chording a
  // browser/OS shortcut.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      if (event.key === "ArrowLeft" && prevHref) {
        router.push(prevHref);
      } else if (event.key === "ArrowRight" && nextHref) {
        router.push(nextHref);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prevHref, nextHref, router]);

  if (!meta) {
    return null;
  }

  return (
    <div className="np-root">
      <ReadingProgress article={{ topic, date, title: activeEntry.title }} />
      <NewspaperMasthead date={date} archiveMonth={date.slice(0, 7)} />
      <main className="mx-auto w-full" style={{ maxWidth: 1280, padding: 40 }}>
        <nav className="np-crumbs" aria-label="Breadcrumb">
          <Link href={homeHref}>{locale === "zh" ? "首页" : "Home"}</Link>
          <span className="np-crumbs-sep">/</span>
          <Link href={archiveHref}>{date.slice(0, 7)}</Link>
          <span className="np-crumbs-sep">/</span>
          <Link href={topicHref}>{meta.label}</Link>
          <span className="np-crumbs-sep">/</span>
          <span style={{ color: "var(--color-text-secondary)" }}>{formatDisplayDate(date, locale)}</span>
        </nav>

        <QuickTopicLinks
          date={date}
          currentTopic={topic}
          availableTopics={availableTopics}
          topicLabels={topicLabels}
          copy={{
            quickLinkHeading: copy.ui.detailPage.quickLinkHeading,
            quickLinkCurrent: copy.ui.detailPage.quickLinkCurrent,
            noNewsHint: copy.ui.detailPage.noNewsHint,
          }}
        />

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            margin: "24px 0",
          }}
        >
          <Link href={topicHref} className="np-btn-secondary">
            <ArrowLeft size={14} />
            {copy.ui.topicPage.backToTopic(meta.label)}
          </Link>
          <Link href={homeHref} className="np-btn-secondary">
            {copy.ui.topicPage.backHome}
          </Link>
        </div>

        <div
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
          style={{ marginTop: 8 }}
        >
          <article
            className="np-article-prose"
            style={{
              border: "1px solid var(--color-border)",
              padding: 32,
              background: "var(--color-surface)",
            }}
          >
            {isShowingChineseFallback ? (
              <div
                className="np-sans"
                style={{
                  marginBottom: 20,
                  padding: "12px 14px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-muted)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--color-text-secondary)",
                }}
              >
                English translation is not available for this digest yet. Showing the Chinese original.
              </div>
            ) : null}
            {activeBody}
          </article>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:h-fit">
            <section
              style={{
                border: "1px solid var(--color-border)",
                padding: 24,
                background: "var(--color-surface)",
              }}
            >
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
                {copy.ui.detailPage.issueDetails}
              </p>
              <h2
                className="np-serif"
                style={{
                  fontSize: 28,
                  letterSpacing: "-0.02em",
                  fontWeight: 600,
                  margin: "10px 0 10px",
                  color: "var(--color-text-primary)",
                }}
              >
                {formatDisplayDate(activeEntry.date, locale)}
              </h2>
              <p
                className="np-sans"
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.7,
                  color: "var(--color-text-secondary)",
                  margin: 0,
                }}
              >
                {meta.description}
              </p>

              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                <InfoRow icon={<Clock3 size={14} />} label={copy.ui.detailPage.minRead(activeEntry.readingMinutes)} />
                <InfoRow icon={<Layers3 size={14} />} label={`${activeEntry.sectionCount} ${copy.ui.newsCard.sections}`} />
                <InfoRow icon={<FileText size={14} />} label={`${activeEntry.articleCount} ${copy.ui.newsCard.stories}`} />
                <InfoRow icon={<Command size={14} />} label={meta.commandPath} mono />
              </div>
            </section>

            {activeEntry.highlights.length > 0 ? (
              <section
                style={{
                  border: "1px solid var(--color-border)",
                  padding: 24,
                  background: "var(--color-surface)",
                }}
              >
                <p
                  className="np-mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {copy.ui.detailPage.keyHighlights}
                </p>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                  {activeEntry.highlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="np-sans"
                      style={{
                        fontSize: 14,
                        lineHeight: 1.7,
                        color: "var(--color-text-secondary)",
                        paddingLeft: 14,
                        borderLeft: "2px solid var(--color-border-soft)",
                      }}
                    >
                      <InlineMarkdown content={highlight} />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {activeEntry.takeaway ? (
              <section
                style={{
                  border: "1px solid var(--color-border)",
                  padding: 24,
                  background: "var(--color-surface-muted)",
                  borderLeft: "3px solid var(--color-text-primary)",
                }}
              >
                <p
                  className="np-mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {copy.ui.detailPage.dailyFraming}
                </p>
                <div
                  className="np-serif"
                  style={{
                    marginTop: 10,
                    fontStyle: "italic",
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: "var(--color-text-primary)",
                  }}
                >
                  <InlineMarkdown content={activeEntry.takeaway} />
                </div>
              </section>
            ) : null}

            {events.length > 0 ? (
              <section
                style={{
                  border: "1px solid var(--color-border)",
                  padding: 24,
                  background: "var(--color-surface)",
                }}
              >
                <p
                  className="np-mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {locale === "zh" ? "跨主题事件" : "Cross-topic events"}
                </p>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                  {events.map((event) => (
                    <Link
                      key={event.id}
                      href={localizePath(`/events/${event.id}`, locale)}
                      style={{ display: "flex", flexDirection: "column", gap: 4 }}
                    >
                      <span
                        className="np-serif"
                        style={{ fontSize: 15, lineHeight: 1.5, color: "var(--color-text-primary)" }}
                      >
                        {event.title}
                      </span>
                      <span className="np-mono" style={{ fontSize: 10.5, color: "var(--color-text-muted)" }}>
                        {event.topics
                          .map((eventTopic) => getTopicMeta(eventTopic, locale)?.shortLabel ?? eventTopic)
                          .join(" · ")}
                        {" · "}
                        {locale === "zh" ? `${event.memberCount} 篇报道 →` : `${event.memberCount} reports →`}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>

        {prevHref || nextHref ? (
          <nav
            aria-label={locale === "zh" ? "相邻日报" : "Adjacent issues"}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 32,
            }}
          >
            {prevHref && prevDate ? (
              <Link href={prevHref} className="np-btn-secondary" rel="prev">
                <ArrowLeft size={14} />
                {copy.ui.detailPage.prevIssue} · {formatDisplayDate(prevDate, locale)}
              </Link>
            ) : (
              <span />
            )}
            {nextHref && nextDate ? (
              <Link href={nextHref} className="np-btn-secondary" rel="next">
                {formatDisplayDate(nextDate, locale)} · {copy.ui.detailPage.nextIssue}
                <ArrowRight size={14} />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}

        {related.length > 0 ? (
          <RelatedSection
            related={related}
            locale={locale}
            topicLabel={meta.label}
          />
        ) : null}

        <NewspaperFooter />
      </main>
    </div>
  );
}

function RelatedSection({
  related,
  locale,
  topicLabel,
}: {
  related: NewsPreview[];
  locale: "zh" | "en";
  topicLabel: string;
}) {
  return (
    <section style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--color-border)" }}>
      <p
        className="np-mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
          marginBottom: 16,
        }}
      >
        {locale === "zh"
          ? `${topicLabel} · 同主题其它日报`
          : `MORE FROM ${topicLabel.toUpperCase()}`}
      </p>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {related.map((entry) => (
          <Link
            key={`${entry.topic}:${entry.date}`}
            href={localizePath(`/news/${entry.topic}/${entry.date}`, locale)}
            className="np-card"
            style={{
              display: "block",
              padding: 18,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            <div
              className="np-mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
                marginBottom: 8,
              }}
            >
              {formatDisplayDate(entry.date, locale)}
            </div>
            <h3
              className="np-serif"
              style={{
                fontSize: 18,
                lineHeight: 1.25,
                letterSpacing: "-0.01em",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                margin: "0 0 8px",
              }}
            >
              <InlineMarkdown content={entry.title} inline disableLinks />
            </h3>
            <div
              className="np-sans"
              style={{
                fontSize: 13.5,
                lineHeight: 1.6,
                color: "var(--color-text-secondary)",
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              <InlineMarkdown content={entry.description} disableLinks />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  mono = false,
}: {
  icon: ReactNode;
  label: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        fontSize: 13,
        color: "var(--color-text-secondary)",
      }}
    >
      <span style={{ marginTop: 2, color: "var(--color-text-primary)" }}>{icon}</span>
      <span
        className={mono ? "np-mono" : "np-sans"}
        style={mono ? { fontSize: 12, wordBreak: "break-all" } : { lineHeight: 1.5 }}
      >
        {label}
      </span>
    </div>
  );
}
