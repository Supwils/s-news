"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Bookmark, Check, ExternalLink, RotateCcw, Search } from "lucide-react";

import { useLocale } from "@/components/locale-context";
import { InlineMarkdown } from "@/components/news-markdown";
import { NewspaperFooter } from "@/components/newspaper/footer";
import {
  articleId,
  loadDismissedIds,
  loadReadSet,
  loadReadingSession,
  saveDismissedIds,
  type ReadingSession,
} from "@/lib/reading-state";
import { NewspaperMasthead } from "@/components/newspaper/masthead";
import { SearchModal } from "@/components/search-modal";
import { localizePath } from "@/lib/locale-routing";
import { formatDisplayDate } from "@/lib/news-client";
import type { NewsPreview } from "@/lib/news";
import { TOPICS, getTopicMeta, isTopicKey, type TopicKey } from "@/lib/news-meta";
import { useShortcutLabel } from "@/lib/use-shortcut-label";

type NewsHomeProps = {
  /** Slim union of previews (see getHomePreviews) — NOT the full archive. */
  entries: NewsPreview[];
  /** True per-topic counts over the whole archive (for the topic chips). */
  topicCounts: Partial<Record<TopicKey, number>>;
  /** True total count over the whole archive. */
  totalCount: number;
};


type TopicFilter = TopicKey | "all";


const MONTHS_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const TOPIC_COLOR_VAR: Record<TopicKey, string> = {
  general: "var(--np-t-general)",
  finance: "var(--np-t-finance)",
  "ai-tech": "var(--np-t-ai-tech)",
  science: "var(--np-t-science)",
  crypto: "var(--np-t-crypto)",
  "energy-climate": "var(--np-t-energy-climate)",
  "auto-mobility": "var(--np-t-auto-mobility)",
  gaming: "var(--np-t-gaming)",
  "supply-chain": "var(--np-t-supply-chain)",
  "sports-health-nutrition": "var(--np-t-sports-health-nutrition)",
};

function articleHref(entry: NewsPreview, locale: "zh" | "en") {
  return localizePath(`/news/${entry.topic}/${entry.date}`, locale);
}

function stripInlineMarkdown(text: string) {
  return text
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/\*([^*\n]+?)\*/g, "$1")
    .replace(/`([^`\n]+?)`/g, "$1")
    .replace(/\[([^\]]+?)\]\([^)]+?\)/g, "$1");
}


export function NewsHome(props: NewsHomeProps) {
  const { entries, topicCounts, totalCount } = props;
  const locale = useLocale();
  const searchParams = useSearchParams();
  const topicParam = searchParams.get("topic");
  const activeTopic: TopicFilter = topicParam && isTopicKey(topicParam) ? topicParam : "all";

  const topicsWithLocale = useMemo(
    () => TOPICS.map((t) => getTopicMeta(t.key, locale)!),
    [locale],
  );

  const {
    todayDate,
    todayEntries,
    previousDate,
    previousEntries,
  } = useMemo(() => {
    const today = entries[0]?.date ?? null;
    const todayItems = today ? entries.filter((entry) => entry.date === today) : [];
    const previous = today
      ? entries.find((entry) => entry.date !== today)?.date ?? null
      : null;
    const previousItems = previous
      ? entries.filter((entry) => entry.date === previous)
      : [];

    return {
      todayDate: today,
      todayEntries: todayItems,
      previousDate: previous,
      previousEntries: previousItems,
    };
  }, [entries]);

  // Derive the sections for the current filter.
  const {
    leadEntry,
    briefEntries,
    briefMoreCount,
    tabloidBig,
    tabloidSmall,
    tabloidDate,
  } = useMemo(() => {
    if (activeTopic === "all") {
      const lead =
        todayEntries.find((e) => e.topic === "general") ?? todayEntries[0] ?? null;
      const briefPool = todayEntries.filter((e) => !lead || articleId(e) !== articleId(lead));
      const briefs = briefPool.slice(0, 5);
      const more = Math.max(0, todayEntries.length - 1 - briefs.length);

      const tabBig =
        previousEntries.find((e) => e.topic === "general") ?? previousEntries[0] ?? null;
      const tabSmallPool = previousEntries.filter(
        (e) => !tabBig || articleId(e) !== articleId(tabBig),
      );
      return {
        leadEntry: lead,
        briefEntries: briefs,
        briefMoreCount: more,
        tabloidBig: tabBig,
        tabloidSmall: tabSmallPool.slice(0, 4),
        tabloidDate: previousDate,
      };
    }

    const topicEntries = entries.filter((e) => e.topic === activeTopic);
    // `entries` is a slim union (≤ ~11 per topic), so derive the "more" count
    // from the true archive total for this topic, not the truncated slice.
    const topicTotal = topicCounts[activeTopic] ?? topicEntries.length;
    const lead = topicEntries[0] ?? null;
    const briefs = topicEntries.slice(1, 6);
    const tabBig = topicEntries[6] ?? null;
    const tabSmall = topicEntries.slice(7, 11);
    return {
      leadEntry: lead,
      briefEntries: briefs,
      briefMoreCount: Math.max(0, topicTotal - 1 - briefs.length),
      tabloidBig: tabBig,
      tabloidSmall: tabSmall,
      tabloidDate: tabBig?.date ?? null,
    };
  }, [activeTopic, entries, previousDate, previousEntries, todayEntries, topicCounts]);

  // localStorage-backed client state. Kept in a single object so we can hydrate
  // in one setState call.
  const [clientState, setClientState] = useState<{
    readSet: Set<string>;
    session: ReadingSession | null;
    dismissedIds: Set<string>;
  }>({ readSet: new Set(), session: null, dismissedIds: new Set() });
  const { readSet, session, dismissedIds } = clientState;
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration from browser storage
    setClientState({
      readSet: loadReadSet(),
      session: loadReadingSession(),
      dismissedIds: loadDismissedIds(),
    });
  }, []);

  const handleDismissContinue = useCallback(() => {
    setClientState((s) => {
      if (!s.session) return s;
      const next = new Set(s.dismissedIds);
      next.add(s.session.articleId);
      saveDismissedIds(next);
      return { ...s, dismissedIds: next };
    });
  }, []);

  // ⌘K / Ctrl+K is handled centrally by NewspaperMasthead (via onSearchClick),
  // which makes it work on every page, not just home.

  const continueBanner = session && !dismissedIds.has(session.articleId);
  const currentMonth = todayDate?.slice(0, 7) ?? null;

  return (
    <div className="np-root">
      <NewspaperMasthead
        active="today"
        date={todayDate ?? undefined}
        archiveMonth={currentMonth ?? undefined}
        onSearchClick={() => setSearchOpen(true)}
      />
      <SearchHero locale={locale} totalCount={totalCount} onClick={() => setSearchOpen(true)} />
      <TopicRail
        activeTopic={activeTopic}
        totalCount={totalCount}
        topicCounts={topicCounts}
        topics={topicsWithLocale}
        locale={locale}
        onSearchClick={() => setSearchOpen(true)}
      />

      {searchOpen ? (
        <SearchModal entries={entries} onClose={() => setSearchOpen(false)} />
      ) : null}

      <main className="mx-auto w-full np-home-main" style={{ maxWidth: 1280, padding: 40 }}>
        <HeroGrid
          lead={leadEntry}
          briefs={briefEntries}
          moreCount={briefMoreCount}
          locale={locale}
          activeTopic={activeTopic}
          currentMonth={currentMonth}
          todayDate={todayDate}
        />

        {continueBanner && session ? (
          <ContinueStrip session={session} onDismiss={handleDismissContinue} locale={locale} />
        ) : null}

        {tabloidBig ? (
          <YesterdayTabloid
            big={tabloidBig}
            small={tabloidSmall}
            date={tabloidDate}
            locale={locale}
            readSet={readSet}
            activeTopic={activeTopic}
          />
        ) : null}

        <NewspaperFooter />
      </main>
    </div>
  );
}

// --- Sub-components --------------------------------------------------------

function TopicRail({
  activeTopic,
  totalCount,
  topicCounts,
  topics,
  locale,
  onSearchClick,
}: {
  activeTopic: TopicFilter;
  totalCount: number;
  topicCounts: Partial<Record<TopicKey, number>>;
  topics: Array<{ key: TopicKey; shortLabel: string }>;
  locale: "zh" | "en";
  onSearchClick: () => void;
}) {
  const shortcutLabel = useShortcutLabel();
  return (
    <div
      id="topics"
      style={{
        background: "var(--np-paper-warm)",
        borderBottom: "1px solid var(--np-rule)",
        padding: "8px 16px",
      }}
    >
      <div
        className="mx-auto np-topic-rail"
        style={{ maxWidth: 1280 }}
      >
        <Link
          href={localizePath("/", locale)}
          className="np-chip"
          data-active={activeTopic === "all" || undefined}
          style={{ ["--_dot" as string]: "var(--np-ink)" } as CSSProperties}
        >
          <span className="np-chip-dot" />
          <span>{locale === "zh" ? "全部" : "All"}</span>
          <span className="np-chip-count">{totalCount}</span>
        </Link>

        {topics.map((t) => (
          <Link
            key={t.key}
            href={localizePath(`/?topic=${t.key}`, locale)}
            className="np-chip"
            data-active={activeTopic === t.key || undefined}
            style={{ ["--_dot" as string]: TOPIC_COLOR_VAR[t.key] } as CSSProperties}
          >
            <span className="np-chip-dot" />
            <span>{t.shortLabel}</span>
            <span className="np-chip-count">{topicCounts[t.key] ?? 0}</span>
          </Link>
        ))}

        <button
          type="button"
          className="np-search-trigger np-topic-rail-search"
          style={{ marginLeft: "auto" }}
          onClick={onSearchClick}
          aria-label={locale === "zh" ? "搜索归档" : "Search digests"}
          aria-keyshortcuts="Meta+K Control+K"
        >
          <Search size={12} aria-hidden />
          <span>
            {locale === "zh" ? "搜索归档" : "Search"}
          </span>
          <kbd
            style={{
              fontFamily: "inherit",
              fontSize: 10,
              padding: "1px 5px",
              border: "1px solid var(--np-rule)",
              color: "var(--np-ink3)",
              borderRadius: 2,
              marginLeft: 4,
            }}
          >
            {shortcutLabel}
          </kbd>
        </button>
      </div>
    </div>
  );
}

function SearchHero({
  locale,
  totalCount,
  onClick,
}: {
  locale: "zh" | "en";
  totalCount: number;
  onClick: () => void;
}) {
  const shortcutLabel = useShortcutLabel();
  return (
    <div className="np-search-hero">
      <button
        type="button"
        className="np-search-hero-button"
        onClick={onClick}
        aria-keyshortcuts="Meta+K Control+K"
      >
        <Search size={16} aria-hidden style={{ flexShrink: 0 }} />
        <span className="np-search-hero-text">
          {locale === "zh"
            ? `搜索 ${totalCount} 期日报 · 标题、正文、主题、日期`
            : `Search ${totalCount} digests · titles, body, topics, dates`}
        </span>
        <kbd className="np-search-hero-kbd">{shortcutLabel}</kbd>
      </button>
    </div>
  );
}

function HeroGrid({
  lead,
  briefs,
  moreCount,
  locale,
  activeTopic,
  currentMonth,
  todayDate,
}: {
  lead: NewsPreview | null;
  briefs: NewsPreview[];
  moreCount: number;
  locale: "zh" | "en";
  activeTopic: TopicFilter;
  currentMonth: string | null;
  todayDate: string | null;
}) {
  if (!lead) {
    return (
      <section style={{ paddingBottom: 40, borderBottom: "1px solid var(--np-rule)" }}>
        <p className="np-serif" style={{ fontSize: 28, color: "var(--np-ink2)", margin: 0 }}>
          {locale === "zh" ? "今日暂无新日报。" : "No issue published yet today."}
        </p>
      </section>
    );
  }

  const leadMeta = getTopicMeta(lead.topic, locale)!;
  const kickerLabel =
    locale === "zh" ? (activeTopic === "all" ? "今日头条" : leadMeta.label) : leadMeta.label.toUpperCase();
  const kickerTime = activeTopic === "all"
    ? (locale === "zh" ? "今日" : "TODAY")
    : (locale === "zh" ? formatDisplayDate(lead.date, locale) : lead.date);

  return (
    <section
      className="np-hero-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "1.3fr 1fr",
        gap: 48,
        paddingBottom: 40,
        borderBottom: "1px solid var(--np-rule)",
      }}
    >
      <LeadStory lead={lead} kickerLabel={kickerLabel} kickerTime={kickerTime} locale={locale} />

      <aside>
        <RuleLabel
          left={
            locale === "zh"
              ? activeTopic === "all"
                ? `今日简报 · 共 ${briefs.length + (lead ? 1 : 0)} 条`
                : `${leadMeta.label} · 最近 ${briefs.length + 1} 条`
              : activeTopic === "all"
                ? `TODAY'S BRIEFS · ${briefs.length + (lead ? 1 : 0)} STACKED`
                : `${leadMeta.label.toUpperCase()} · RECENT ${briefs.length + 1}`
          }
        />

        {briefs.length === 0 ? (
          <p className="np-sans" style={{ color: "var(--np-ink3)", fontSize: 14, padding: "20px 0" }}>
            {locale === "zh" ? "今日没有更多简报。" : "No more briefs for today."}
          </p>
        ) : (
          briefs.map((entry) => <StoryRow key={articleId(entry)} entry={entry} locale={locale} />)
        )}

        {moreCount > 0 ? (
          <Link
            href={
              activeTopic !== "all"
                ? localizePath(`/news/${activeTopic}`, locale)
                : todayDate && currentMonth
                  ? localizePath(`/archive/${currentMonth}`, locale)
                  : "#"
            }
            className="np-btn-ghost"
            style={{ marginTop: 18 }}
          >
            {locale === "zh"
              ? `查看${activeTopic === "all" ? "今日" : leadMeta.label}全部 ${briefs.length + moreCount + 1} 条 →`
              : `SEE ALL ${briefs.length + moreCount + 1} ${activeTopic === "all" ? "TODAY" : leadMeta.label.toUpperCase()} →`}
          </Link>
        ) : null}
      </aside>
    </section>
  );
}

function LeadStory({
  lead,
  kickerLabel,
  kickerTime,
  locale,
}: {
  lead: NewsPreview;
  kickerLabel: string;
  kickerTime: string;
  locale: "zh" | "en";
}) {
  return (
    <article>
      <Link href={articleHref(lead, locale)} style={{ display: "block" }}>
        <div className="np-mono" style={styles.kicker}>
          <span
            style={{
              width: 8,
              height: 8,
              background: "var(--np-ink-red)",
              display: "inline-block",
              marginRight: 2,
            }}
          />
          {`${locale === "zh" ? "头条" : "LEAD"} · ${kickerTime} · ${kickerLabel}`}
        </div>
        <h2
          className="np-serif np-lead-headline"
          style={{
            fontSize: 56,
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            fontWeight: 600,
            color: "var(--np-ink)",
            margin: "0 0 18px",
          }}
        >
          <InlineMarkdown content={lead.title} inline disableLinks />
        </h2>
        <div
          className="np-serif"
          style={{
            fontStyle: "italic",
            fontSize: 19,
            lineHeight: 1.55,
            color: "var(--np-ink2)",
            maxWidth: 640,
            margin: "0 0 20px",
          }}
        >
          <InlineMarkdown content={lead.description} disableLinks />
        </div>
        <div
          className="np-sans"
          style={{ fontSize: 14, color: "var(--np-ink3)", display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20 }}
        >
          <span>{formatDisplayDate(lead.date, locale)}</span>
          <span>·</span>
          <span>{locale === "zh" ? `${lead.readingMinutes} 分钟阅读` : `${lead.readingMinutes} min read`}</span>
          {lead.articleCount ? (
            <>
              <span>·</span>
              <span>{locale === "zh" ? `${lead.articleCount} 条要闻` : `${lead.articleCount} stories`}</span>
            </>
          ) : null}
        </div>

        <HeroPullQuoteCard lead={lead} locale={locale} kickerLabel={kickerLabel} />
      </Link>
    </article>
  );
}

/**
 * Hero card rendered with plain HTML + CSS (no external image, no edge
 * function). Surfaces today's framing (takeaway) as a large editorial
 * pull-quote — complementary to the H2 title above, not redundant.
 */
function HeroPullQuoteCard({
  lead,
  locale,
  kickerLabel,
}: {
  lead: NewsPreview;
  locale: "zh" | "en";
  kickerLabel: string;
}) {
  const accent = TOPIC_COLOR_VAR[lead.topic];
  const rawTakeaway = lead.takeaway ? stripInlineMarkdown(lead.takeaway) : "";
  const fallback =
    locale === "en"
      ? "Today's framing. A daily lens on what moved, what mattered, and what's next."
      : "今日定性。把今天发生的事、当下的影响和明日的走向，串成一句话。";
  const quote = rawTakeaway || fallback;
  const quoteFontSize = quote.length > 130 ? 22 : quote.length > 80 ? 26 : 30;

  return (
    <div
      className="np-hero-card"
      style={{
        ["--hero-accent" as string]: accent,
        position: "relative",
        border: "1px solid var(--np-rule)",
        background: "var(--np-paper-warm)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: 320,
      }}
    >
      {/* Top topic accent stripe */}
      <div style={{ height: 6, background: accent, flexShrink: 0 }} />

      {/* Right-edge accent shim */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 6,
          right: 0,
          bottom: 0,
          width: 3,
          background: accent,
          opacity: 0.18,
        }}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "24px 32px 22px",
          gap: 16,
        }}
      >
        {/* Row 1: kicker + wordmark */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            className="np-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: accent,
                display: "inline-block",
              }}
            />
            {kickerLabel}
          </span>
          <span
            className="np-mono"
            style={{
              fontSize: 13,
              letterSpacing: "0.18em",
              color: "var(--np-ink2)",
              fontWeight: 600,
            }}
          >
            S—NEWS
          </span>
        </div>

        {/* Row 2: pull-quote — the focal element */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            position: "relative",
          }}
        >
          <span
            aria-hidden
            className="np-serif"
            style={{
              position: "absolute",
              left: -8,
              top: -18,
              fontSize: 76,
              lineHeight: 1,
              color: accent,
              opacity: 0.32,
              fontWeight: 400,
              pointerEvents: "none",
            }}
          >
            &ldquo;
          </span>

          <blockquote
            className="np-serif"
            style={{
              margin: 0,
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: quoteFontSize,
              lineHeight: 1.35,
              letterSpacing: "-0.005em",
              color: "var(--np-ink)",
              paddingLeft: 22,
              borderLeft: `3px solid ${accent}`,
              maxWidth: 760,
            }}
          >
            {quote}
          </blockquote>
        </div>

        {/* Row 3: rule + meta */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ width: "100%", height: 1, background: "var(--np-rule)" }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <span
              className="np-mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--np-ink3)",
              }}
            >
              {locale === "en" ? "Today's framing" : "今日定性"}
              {lead.articleCount
                ? `  ·  ${lead.articleCount} ${locale === "en" ? "stories" : "条要闻"}`
                : ""}
              {`  ·  ${lead.readingMinutes} ${locale === "en" ? "min read" : "分钟阅读"}`}
            </span>
            <span
              className="np-mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.24em",
                color: "var(--np-ink3)",
              }}
            >
              DAILY DIGEST
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleLabel({ left }: { left: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
      <span
        className="np-mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "var(--np-ink3)",
        }}
      >
        {left}
      </span>
      <span style={{ flex: 1, height: 1, background: "var(--np-rule)" }} />
    </div>
  );
}

function StoryRow({ entry, locale }: { entry: NewsPreview; locale: "zh" | "en" }) {
  const meta = getTopicMeta(entry.topic, locale)!;
  return (
    <Link href={articleHref(entry, locale)} className="np-story-row">
      <div>
        <div
          className="np-mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: TOPIC_COLOR_VAR[entry.topic],
            fontWeight: 600,
          }}
        >
          {meta.shortLabel}
        </div>
        <div className="np-mono" style={{ fontSize: 11, color: "var(--np-ink3)", marginTop: 6 }}>
          {formatDisplayDate(entry.date, locale)}
        </div>
      </div>
      <div>
        <h3
          className="np-serif np-story-title"
          style={{
            fontSize: 22,
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            fontWeight: 600,
            color: "var(--np-ink)",
            margin: 0,
          }}
        >
          <InlineMarkdown content={entry.title} inline disableLinks />
        </h3>
        <div
          className="np-sans"
          style={{
            fontSize: 14,
            lineHeight: 1.65,
            color: "var(--np-ink2)",
            maxWidth: 560,
            marginTop: 8,
            marginBottom: 0,
          }}
        >
          <InlineMarkdown content={entry.description} disableLinks />
        </div>
      </div>
      <div
        className="np-mono"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
          fontSize: 11,
          color: "var(--np-ink3)",
          whiteSpace: "nowrap",
        }}
      >
        <span>{locale === "zh" ? `${entry.readingMinutes} 分钟` : `${entry.readingMinutes} min`}</span>
        <span className="np-story-go" style={{ color: "var(--np-ink)", opacity: 0.7 }}>
          {locale === "zh" ? "读 →" : "READ →"}
        </span>
      </div>
    </Link>
  );
}

function ContinueStrip({
  session,
  onDismiss,
  locale,
}: {
  session: ReadingSession;
  onDismiss: () => void;
  locale: "zh" | "en";
}) {
  const pct = Math.round(session.progress * 100);
  const meta = getTopicMeta(session.topic, locale);
  const label = meta?.label ?? session.topic;
  const body =
    locale === "zh"
      ? `昨日「${label}」读到 ${pct}% —— 回到原处继续。`
      : `Paused on ${label} at ${pct}%. Pick up where you left off.`;

  const href = localizePath(`/news/${session.topic}/${session.articleId.split(":")[1] ?? ""}`, locale);

  return (
    <section
      style={{
        padding: "24px 0",
        borderBottom: "1px solid var(--np-rule)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 24,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 999,
            background: "var(--np-ink)",
            color: "var(--np-paper)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <RotateCcw size={20} />
        </div>
        <div>
          <div
            className="np-mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--np-ink3)",
            }}
          >
            {locale === "zh" ? "继续阅读" : "CONTINUE READING"}
          </div>
          <div className="np-serif" style={{ fontSize: 20, color: "var(--np-ink)", marginTop: 4 }}>
            {body}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Link href={href} className="np-btn-primary">
          {locale === "zh" ? "继续阅读" : "Resume"}
        </Link>
        <button type="button" className="np-btn-secondary" onClick={onDismiss}>
          {locale === "zh" ? "稍后" : "Later"}
        </button>
      </div>
    </section>
  );
}

function YesterdayTabloid({
  big,
  small,
  date,
  locale,
  readSet,
  activeTopic,
}: {
  big: NewsPreview;
  small: NewsPreview[];
  date: string | null;
  locale: "zh" | "en";
  readSet: Set<string>;
  activeTopic: TopicFilter;
}) {
  const month = date?.slice(0, 7);
  const sectionLabel =
    activeTopic === "all"
      ? locale === "zh"
        ? "昨日"
        : "Yesterday"
      : locale === "zh"
        ? "更早"
        : "Earlier";

  const dateDisplay = date ? formatDisplayDate(date, locale) : "";

  return (
    <section style={{ padding: "40px 0 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 20,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h2
          className="np-serif"
          style={{
            fontSize: 34,
            letterSpacing: "-0.02em",
            fontWeight: 600,
            margin: 0,
            color: "var(--np-ink)",
          }}
        >
          {`${sectionLabel} · ${dateDisplay}`}
        </h2>
        {month ? (
          <Link
            href={localizePath(`/archive/${month}`, locale)}
            className="np-mono"
            style={{ fontSize: 12, color: "var(--np-ink3)", letterSpacing: "0.06em" }}
          >
            {locale === "zh"
              ? `查看 ${month} 全部 →`
              : `SEE ALL ${MONTHS_EN[Number(month.split("-")[1]) - 1]} ${month.split("-")[0]} →`}
          </Link>
        ) : null}
      </div>

      <div className="np-tabloid">
        <TabloidBig entry={big} locale={locale} isRead={readSet.has(articleId(big))} />

        {small.map((entry, idx) => {
          const top = idx < 2;
          const left = idx % 2 === 0;
          return (
            <TabloidSmall
              key={articleId(entry)}
              entry={entry}
              locale={locale}
              isRead={readSet.has(articleId(entry))}
              borderRight={left}
              borderBottom={top}
            />
          );
        })}
      </div>
    </section>
  );
}

function TabloidBig({
  entry,
  locale,
  isRead,
}: {
  entry: NewsPreview;
  locale: "zh" | "en";
  isRead: boolean;
}) {
  const meta = getTopicMeta(entry.topic, locale)!;
  return (
    <Link
      href={articleHref(entry, locale)}
      className="np-tabloid-big"
      data-read={isRead || undefined}
      style={{ opacity: isRead ? 0.78 : 1, display: "block" }}
    >
      <div
        className="np-mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: TOPIC_COLOR_VAR[entry.topic],
          fontWeight: 600,
        }}
      >
        {`${meta.shortLabel} · ${entry.readingMinutes} MIN`}
      </div>
      <h3
        className="np-serif np-story-title"
        style={{
          fontSize: 30,
          lineHeight: 1.12,
          letterSpacing: "-0.02em",
          fontWeight: 600,
          color: "var(--np-ink)",
          margin: "12px 0 12px",
        }}
      >
        <InlineMarkdown content={entry.title} inline disableLinks />
      </h3>
      <div
        className="np-sans"
        style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--np-ink2)", margin: 0 }}
      >
        <InlineMarkdown content={entry.description} disableLinks />
      </div>

      {entry.takeaway ? (
        <div
          style={{
            marginTop: 22,
            padding: "16px 18px",
            background: "var(--np-paper-warm)",
            borderLeft: "3px solid var(--np-ink)",
          }}
        >
          <div
            className="np-mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--np-ink3)",
              marginBottom: 8,
            }}
          >
            {locale === "zh" ? "今日定性" : "TAKEAWAY"}
          </div>
          <div
            className="np-serif"
            style={{ fontStyle: "italic", fontSize: 16, lineHeight: 1.55, color: "var(--np-ink)", margin: 0 }}
          >
            <InlineMarkdown content={entry.takeaway} disableLinks />
          </div>
        </div>
      ) : null}

      <div
        className="np-mono"
        style={{
          marginTop: 22,
          display: "flex",
          gap: 14,
          fontSize: 11,
          color: "var(--np-ink3)",
          letterSpacing: "0.08em",
        }}
      >
        {isRead ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Check size={12} /> READ
          </span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Check size={12} style={{ opacity: 0.3 }} />
            {locale === "zh" ? "未读" : "UNREAD"}
          </span>
        )}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Bookmark size={12} /> {locale === "zh" ? "收藏" : "SAVE"}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ExternalLink size={12} /> {locale === "zh" ? "原文" : "OPEN"}
        </span>
      </div>
    </Link>
  );
}

function TabloidSmall({
  entry,
  locale,
  isRead,
  borderRight,
  borderBottom,
}: {
  entry: NewsPreview;
  locale: "zh" | "en";
  isRead: boolean;
  borderRight: boolean;
  borderBottom: boolean;
}) {
  const meta = getTopicMeta(entry.topic, locale)!;
  return (
    <Link
      href={articleHref(entry, locale)}
      className="np-tabloid-small"
      data-read={isRead || undefined}
      style={{
        borderRight: borderRight ? "1px solid var(--np-rule-soft)" : "none",
        borderBottom: borderBottom ? "1px solid var(--np-rule-soft)" : "none",
        display: "block",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          className="np-mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: TOPIC_COLOR_VAR[entry.topic],
            fontWeight: 600,
          }}
        >
          {`${meta.shortLabel} · ${entry.readingMinutes} MIN`}
        </span>
        {isRead ? (
          <span
            className="np-mono"
            style={{ fontSize: 10, color: "var(--np-ink3)", letterSpacing: "0.2em" }}
          >
            READ
          </span>
        ) : null}
      </div>
      <h4
        className="np-serif np-story-title"
        style={{
          fontSize: 19,
          lineHeight: 1.22,
          letterSpacing: "-0.01em",
          fontWeight: 600,
          color: "var(--np-ink)",
          margin: "10px 0 8px",
        }}
      >
        <InlineMarkdown content={entry.title} inline disableLinks />
      </h4>
      <div
        className="np-sans"
        style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--np-ink2)", margin: 0 }}
      >
        <InlineMarkdown content={entry.description} disableLinks />
      </div>
    </Link>
  );
}

// --- shared inline style shards -------------------------------------------

const styles = {
  kicker: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "var(--np-ink-red)",
    marginBottom: 16,
    fontWeight: 600,
  } satisfies CSSProperties,
};
