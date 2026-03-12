"use client";

import Link from "next/link";
import { useState } from "react";
import { Layers3 } from "lucide-react";

import { TopicIcon } from "@/components/topic-icon";
import type { TopicKey } from "@/lib/news-meta";

type QuickTopicLinksProps = {
  date: string;
  currentTopic: TopicKey;
  availableTopics: TopicKey[];
  topicLabels: { key: TopicKey; label: string }[];
  copy: {
    quickLinkHeading: string;
    quickLinkCurrent: string;
    noNewsHint: string;
  };
};

export function QuickTopicLinks({
  date,
  currentTopic,
  availableTopics,
  topicLabels,
  copy,
}: QuickTopicLinksProps) {
  const [noNewsMessage, setNoNewsMessage] = useState(false);

  const labelMap = new Map(topicLabels.map((t) => [t.key, t.label]));

  return (
    <section className="rounded-[28px] border border-(--color-border) bg-(--color-surface) p-4 shadow-(--shadow-card) sm:p-5">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-(--color-text-muted)">
          <Layers3 size={16} aria-hidden />
          {copy.quickLinkHeading}
        </span>
        <div className="flex flex-wrap gap-2">
          {topicLabels.map(({ key }) => {
            const label = labelMap.get(key) ?? key;
            const isCurrent = key === currentTopic;
            const hasNews = availableTopics.includes(key);

            if (isCurrent) {
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 rounded-full border border-(--color-border-strong) bg-(--color-surface-muted) px-3 py-1.5 text-sm text-(--color-text-secondary)"
                  aria-current="page"
                >
                  <TopicIcon topicKey={key} className="size-4 shrink-0" />
                  <span>{label}</span>
                  <span className="text-xs text-(--color-text-muted)">({copy.quickLinkCurrent})</span>
                </span>
              );
            }

            if (hasNews) {
              return (
                <Link
                  key={key}
                  href={`/news/${key}/${date}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-(--color-border) px-3 py-1.5 text-sm text-(--color-text-secondary) transition hover:border-(--color-border-strong) hover:text-(--color-text-primary)"
                >
                  <TopicIcon topicKey={key} className="size-4 shrink-0" />
                  {label}
                </Link>
              );
            }

            return (
              <button
                key={key}
                type="button"
                onClick={() => setNoNewsMessage(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-(--color-border-soft) px-3 py-1.5 text-sm text-(--color-text-muted) transition hover:border-(--color-border) hover:text-(--color-text-secondary) cursor-pointer"
                title={copy.noNewsHint}
              >
                <TopicIcon topicKey={key} className="size-4 shrink-0 opacity-60" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
      {noNewsMessage && (
        <p
          className="mt-3 rounded-2xl border border-(--color-border-soft) bg-(--color-surface-muted) px-4 py-2.5 text-sm text-(--color-text-secondary)"
          role="status"
        >
          {copy.noNewsHint}
        </p>
      )}
    </section>
  );
}
