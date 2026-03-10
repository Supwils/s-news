"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Newspaper, Search } from "lucide-react";

import { NewsDeskIllustration } from "@/components/home/news-desk-illustration";
import { TodayPulse } from "@/components/home/today-pulse";
import { useLocale } from "@/components/locale-context";
import { getCopy } from "@/data/copy";
import { NewsCard } from "@/components/news-card";
import { RuntimeNavLink } from "@/components/runtime-nav-link";
import { TopicIcon } from "@/components/topic-icon";
import { formatDisplayDate, groupPreviewsByDate, searchEntries } from "@/lib/news-client";
import type { NewsPreview } from "@/lib/news";
import { TOPICS, getTopicMeta, type TopicKey } from "@/lib/news-meta";

type NewsHomeProps = {
  entries: NewsPreview[];
};

export function NewsHome({ entries }: NewsHomeProps) {
  const locale = useLocale();
  const copy = getCopy(locale);
  const topicsWithLocale = useMemo(
    () => TOPICS.map((t) => getTopicMeta(t.key, locale)!),
    [locale],
  );
  const [query, setQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState<TopicKey | "all">("all");

  const filtered = useMemo(
    () => searchEntries(entries, query, activeTopic, locale),
    [activeTopic, entries, locale, query],
  );

  const groups = useMemo(() => groupPreviewsByDate(filtered), [filtered]);
  const latestDate = entries[0]?.date;
  const latestEntries = latestDate ? entries.filter((entry) => entry.date === latestDate) : [];
  const archiveCount = groups.length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-(--color-bg-primary) text-(--color-text-primary)">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(193,166,111,0.22),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(96,161,255,0.18),_transparent_28%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.14),_transparent_25%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,_rgba(255,255,255,0.04),_transparent_18%),linear-gradient(to_right,_rgba(255,255,255,0.02)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(255,255,255,0.02)_1px,_transparent_1px)] bg-[size:auto,24px_24px,24px_24px] opacity-40" />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 mb-6 rounded-full border border-(--color-border) bg-[color-mix(in_srgb,var(--color-bg-primary)_75%,transparent)] px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-xl tracking-[0.18em] uppercase text-(--color-text-primary)">
                {copy.home.siteName}
              </p>
              <p className="text-xs uppercase tracking-[0.25em] text-(--color-text-muted)">
                {copy.home.headerSubtitle}
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-xs text-(--color-text-secondary)">
              <Link
                href="/about"
                className="rounded-full border border-(--color-border) px-3 py-1.5 transition hover:border-(--color-border-strong) hover:text-(--color-text-primary)"
              >
                {copy.home.nav.about}
              </Link>
              <RuntimeNavLink className="rounded-full border border-(--color-border) px-3 py-1.5 transition hover:border-(--color-border-strong) hover:text-(--color-text-primary)">
                {copy.home.nav.runtime}
              </RuntimeNavLink>
              <span className="rounded-full border border-(--color-border) px-3 py-1.5">{copy.home.nav.localFirst}</span>
              <span className="rounded-full border border-(--color-border) px-3 py-1.5">{copy.home.nav.dateArchive}</span>
            </nav>
          </div>
        </header>

        <main className="space-y-8 pb-12">
          <section className="relative overflow-hidden rounded-[32px] border border-(--color-border) bg-(--color-surface) p-6 shadow-(--shadow-hero) sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(184,137,45,0.85),rgba(47,126,232,0.8),transparent)] opacity-80" />

            <div className="grid gap-8 xl:grid-cols-[0.98fr_1.02fr] xl:items-center">
              <div className="max-w-4xl space-y-5">
                <div className="soft-reveal inline-flex items-center rounded-full border border-(--color-border) bg-(--color-surface-muted) px-3 py-1.5 text-[10px] uppercase tracking-[0.32em] text-(--color-accent-gold)">
                  {copy.home.hero.badge}
                </div>
                <h1 className="soft-reveal font-display text-4xl leading-none tracking-[-0.03em] text-(--color-text-primary) sm:text-5xl lg:text-7xl">
                  {copy.home.hero.titleLine1}
                  <br />
                  {copy.home.hero.titleLine2}
                </h1>
                <p
                  className="soft-reveal max-w-3xl text-base leading-8 text-(--color-text-secondary) sm:text-lg"
                  style={{ animationDelay: "80ms" }}
                >
                  {copy.home.hero.intro}
                </p>

                <div
                  className="soft-reveal mt-8 flex flex-wrap gap-3"
                  style={{ animationDelay: "140ms" }}
                >
                  <a
                    href={latestEntries.length > 0 ? "#latest-drop" : "#date-archive"}
                    className="inline-flex items-center gap-2 rounded-full border border-(--color-border-strong) bg-(--color-text-primary) px-5 py-3 text-sm font-medium !text-(--color-bg-primary) transition hover:opacity-90"
                  >
                    {copy.home.hero.ctaToday}
                  </a>
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-muted) px-5 py-3 text-sm font-medium text-(--color-text-primary) transition hover:border-(--color-border-strong)"
                  >
                    {copy.home.hero.ctaAbout}
                  </Link>
                  <RuntimeNavLink className="inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-muted) px-5 py-3 text-sm font-medium text-(--color-text-primary) transition hover:border-(--color-border-strong)">
                    {copy.home.hero.ctaRuntime}
                  </RuntimeNavLink>
                </div>
              </div>

              <div className="soft-reveal xl:justify-self-end xl:translate-x-2" style={{ animationDelay: "180ms" }}>
                <NewsDeskIllustration entryCount={entries.length} topicCount={TOPICS.length} />
              </div>
            </div>

            <div className="soft-reveal mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" style={{ animationDelay: "220ms" }}>
              <MetricCard label={copy.home.metrics.totalLabel} value={`${entries.length}`} hint={copy.home.metrics.totalHint} />
              <MetricCard
                label={copy.home.metrics.todayLabel}
                value={`${latestEntries.length}`}
                hint={latestDate ? formatDisplayDate(latestDate, locale) : copy.home.metrics.todayNoData}
              />
              <MetricCard label={copy.home.metrics.topicLabel} value={`${TOPICS.length}`} hint={topicsWithLocale.map((t) => t.shortLabel).join(" / ")} />
              <MetricCard label={copy.home.metrics.archiveLabel} value={`${archiveCount}`} hint={copy.home.metrics.archiveHint} />
            </div>
          </section>

          <TodayPulse latestEntries={latestEntries} latestDate={latestDate} />

          {latestEntries.length > 0 ? (
            <section
              id="latest-drop"
              className="rounded-[32px] border border-(--color-border) bg-(--color-surface)/95 p-5 shadow-(--shadow-card) sm:p-6 lg:p-8"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-(--color-text-muted)">{copy.home.todayStack.badge}</p>
                  <h2 className="mt-2 font-(--font-display) text-3xl leading-none tracking-[-0.03em] text-(--color-text-primary) sm:text-4xl">
                    {formatDisplayDate(latestDate!, locale)}{copy.home.todayStack.headlineSuffix}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-(--color-text-secondary) sm:text-base">
                    {copy.home.todayStack.body}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-(--color-border) px-4 py-2 text-sm text-(--color-text-secondary)">
                  <CalendarDays size={15} />
                  {copy.home.todayStack.countLabel} {latestEntries.length} {copy.home.todayStack.countSuffix}
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                {latestEntries.map((entry, index) => (
                  <div
                    key={`${entry.topic}-${entry.date}`}
                    className="soft-reveal"
                    style={{ animationDelay: `${index * 110}ms` }}
                  >
                    <NewsCard entry={entry} compact />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-[32px] border border-(--color-border) bg-(--color-surface)/95 p-5 shadow-(--shadow-card) sm:p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-muted) px-3 py-1.5 text-[10px] uppercase tracking-[0.32em] text-(--color-accent-gold)">
                  <Search size={12} />
                  {copy.home.signalFilter.badge}
                </div>
                <h2 className="font-display text-3xl leading-none tracking-[-0.03em] text-(--color-text-primary) sm:text-4xl">
                  {copy.home.signalFilter.titleLine1}
                  <br />
                  {copy.home.signalFilter.titleLine2}
                </h2>
                <p className="text-sm leading-8 text-(--color-text-secondary) sm:text-base">
                  {copy.home.signalFilter.body}
                </p>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <OverviewCard title={copy.home.signalFilter.cards[0].title} description={copy.home.signalFilter.cards[0].description} />
                  <OverviewCard title={copy.home.signalFilter.cards[1].title} description={copy.home.signalFilter.cards[1].description} />
                  <OverviewCard
                    title={copy.home.signalFilter.cards[2].title}
                    description={`${copy.home.signalFilter.cards[2].descriptionPrefix}${filtered.length}${copy.home.signalFilter.cards[2].descriptionSuffix}`}
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-(--color-border) bg-(--color-surface-muted)/70 p-5 sm:p-6">
                <label className="block">
                  <span className="sr-only">{copy.home.signalFilter.searchA11y}</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-3">
                    <Search size={16} className="text-(--color-text-muted)" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={copy.home.signalFilter.searchPlaceholder}
                      className="w-full bg-transparent text-sm text-(--color-text-primary) outline-none placeholder:text-(--color-text-muted)"
                    />
                  </div>
                </label>

                <div className="mt-4 flex flex-wrap gap-2">
                  <FilterButton
                    active={activeTopic === "all"}
                    onClick={() => setActiveTopic("all")}
                    topic="all"
                    label={copy.home.signalFilter.filterAllTopics}
                  />
                  {topicsWithLocale.map((topic) => (
                    <FilterButton
                      key={topic.key}
                      active={activeTopic === topic.key}
                      onClick={() => setActiveTopic(topic.key)}
                      topic={topic.key}
                      label={topic.label}
                    />
                  ))}
                </div>

                <p className="mt-4 text-sm leading-7 text-(--color-text-secondary)">
                  {copy.home.signalFilter.resultSummaryPrefix}
                  <span className="font-semibold text-(--color-text-primary)">{filtered.length}</span>
                  {copy.home.signalFilter.resultSummarySuffix}
                </p>
              </div>
            </div>
          </section>

          <section id="date-archive" className="space-y-8">
            {groups.map((group) => (
              <div key={group.date} className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-(--color-text-muted)">{copy.home.dateArchive.badge}</p>
                    <h2 className="font-(--font-display) text-3xl leading-none tracking-[-0.03em] text-(--color-text-primary)">
                      {formatDisplayDate(group.date, locale)}
                    </h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-(--color-border) px-3 py-1.5 text-xs text-(--color-text-secondary)">
                    <Newspaper size={14} />
                    {group.entries.length} {group.entries.length > 1 ? copy.home.dateArchive.issues : copy.home.dateArchive.issue}
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {group.entries.map((entry) => (
                    <NewsCard key={`${entry.topic}-${entry.date}`} entry={entry} />
                  ))}
                </div>
              </div>
            ))}
          </section>

          {groups.length === 0 ? (
            <section className="rounded-[32px] border border-dashed border-(--color-border-strong) bg-(--color-surface) p-8 text-center shadow-(--shadow-card)">
              <p className="text-sm uppercase tracking-[0.28em] text-(--color-text-muted)">{copy.home.noResults.badge}</p>
              <h2 className="mt-3 font-(--font-display) text-3xl text-(--color-text-primary)">
                {copy.home.noResults.heading}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-(--color-text-secondary)">
                {copy.home.noResults.body}
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center rounded-full border border-(--color-border-strong) px-4 py-2 text-sm font-medium text-(--color-text-primary) transition hover:bg-(--color-surface-muted)"
              >
                {copy.home.noResults.backLink}
              </Link>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[22px] border border-(--color-border) bg-(--color-surface-muted) p-4">
      <p className="text-[11px] uppercase tracking-[0.28em] text-(--color-text-muted)">{label}</p>
      <p className="font-display mt-3 text-3xl leading-none tracking-[-0.04em] text-(--color-text-primary)">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-(--color-text-secondary)">{hint}</p>
    </div>
  );
}

function OverviewCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-(--color-border) bg-(--color-surface-muted)/75 p-4 sm:p-5">
      <h3 className="text-lg font-semibold text-(--color-text-primary)">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-(--color-text-secondary)">{description}</p>
    </div>
  );
}

function FilterButton({
  active,
  label,
  topic,
  onClick,
}: {
  active: boolean;
  label: string;
  topic: TopicKey | "all";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-2 text-xs font-medium transition sm:text-sm",
        active
          ? "border-(--color-border-strong) bg-(--color-text-primary) text-(--color-bg-primary)"
          : "border-(--color-border) bg-(--color-surface-muted) text-(--color-text-secondary) hover:border-(--color-border-strong) hover:text-(--color-text-primary)",
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex items-center gap-2",
          active ? "text-(--color-bg-primary)" : "",
        ].join(" ")}
      >
        {topic === "all" ? (
          <span
            className="inline-grid h-[18px] w-[18px] grid-cols-2 gap-0.5 rounded-full border border-current/20 p-[3px]"
            aria-hidden="true"
          >
            <span className="rounded-full bg-current/70" />
            <span className="rounded-full bg-current/45" />
            <span className="rounded-full bg-current/45" />
            <span className="rounded-full bg-current/70" />
          </span>
        ) : (
          <TopicIcon topic={topic} size={18} variant={active ? "muted" : "outline"} />
        )}
        <span>{label}</span>
      </span>
    </button>
  );
}
