"use client";

import { TopicIcon } from "@/components/topic-icon";
import { useLocale } from "@/components/locale-context";
import { getCopy } from "@/data/copy";
import { formatDisplayDate } from "@/lib/news-client";
import type { NewsPreview } from "@/lib/news";
import { TOPICS, getTopicMeta } from "@/lib/news-meta";

type TodayPulseProps = {
  latestEntries: NewsPreview[];
  latestDate?: string;
  className?: string;
};

export function TodayPulse({ latestEntries, latestDate, className }: TodayPulseProps) {
  const locale = useLocale();
  const copy = getCopy(locale);

  if (latestEntries.length === 0) {
    return null;
  }

  const visibleTopics = TOPICS.filter((topic) =>
    latestEntries.some((entry) => entry.topic === topic.key),
  ).slice(0, 5).map((t) => getTopicMeta(t.key, locale)!);

  const topicLabel =
    visibleTopics.length > 0
      ? `${visibleTopics.map((topic) => topic.shortLabel).join(locale === "zh" ? "、" : ", ")} ${copy.home.todayPulse.topicReadySuffix}`
      : copy.home.todayPulse.fallbackLead;

  return (
    <section
      className={[
        "overflow-hidden rounded-[28px] border border-(--color-border) bg-(--color-surface)/95 p-5 shadow-(--shadow-card) sm:p-6",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-(--color-text-muted)">{copy.home.todayPulse.badge}</p>
          <h2 className="mt-2 font-display text-3xl leading-none tracking-[-0.03em] text-(--color-text-primary) sm:text-4xl">
            {copy.home.todayPulse.heading}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-(--color-text-secondary) sm:text-base">
            {topicLabel}{copy.home.todayPulse.bodySuffix}
          </p>
        </div>

        <div className="rounded-full border border-(--color-border) bg-(--color-surface-muted) px-4 py-2 text-sm text-(--color-text-secondary)">
          {latestDate ? formatDisplayDate(latestDate, locale) : copy.home.todayPulse.latestLabel}
        </div>
      </div>

      <div className="mt-6 rounded-[22px] border border-(--color-border) bg-(--color-surface-muted)/80 px-4 py-5 sm:px-5">
        <div className="relative min-h-[68px] overflow-visible sm:min-h-[74px]">
          <div className="absolute inset-x-4 top-3 h-px bg-(--color-border-strong)" />
          <div className="pulse-sheen absolute left-0 top-0 h-6 w-28" aria-hidden="true" />

          <div className="relative flex min-h-[68px] items-start justify-between gap-3 pt-0.5 sm:min-h-[74px]">
            {visibleTopics.map((topic, index) => (
              <div key={topic.key} className="flex min-w-0 flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-2.5">
                  <span
                    className="pulse-node flex h-3 w-3 rounded-full border border-(--color-border) bg-(--color-surface)"
                    style={{
                      animationDelay: `${index * 180}ms`,
                      backgroundColor: `color-mix(in srgb, ${topic.accent} 20%, var(--color-surface))`,
                      borderColor: `color-mix(in srgb, ${topic.accent} 30%, var(--color-border))`,
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className="inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) px-2.5 py-1 text-xs text-(--color-text-secondary)"
                  >
                    <TopicIcon topic={topic.key} size={18} variant="muted" />
                    {topic.shortLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
