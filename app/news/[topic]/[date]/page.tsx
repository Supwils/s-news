import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock3, Command, FileText, Layers3 } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { InlineMarkdown, NewsMarkdown } from "@/components/news-markdown";
import { getCopy } from "@/data/copy";
import { getLocaleFromCookie } from "@/lib/get-locale";
import { formatDisplayDate, getNewsEntry } from "@/lib/news";
import { getTopicMeta, isTopicKey } from "@/lib/news-meta";

type NewsDetailPageProps = {
  params: Promise<{ topic: string; date: string }>;
};

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { topic, date } = await params;

  if (!isTopicKey(topic)) {
    return {};
  }

  const locale = await getLocaleFromCookie();
  const entry = await getNewsEntry(topic, date, locale);

  if (!entry) {
    return {};
  }

  return {
    title: `${entry.title} | S-News`,
    description: entry.description,
  };
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { topic, date } = await params;

  if (!isTopicKey(topic)) {
    notFound();
  }

  const locale = await getLocaleFromCookie();
  const copy = getCopy(locale);
  const entry = await getNewsEntry(topic, date, locale);
  const meta = getTopicMeta(topic, locale);

  if (!entry || !meta) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-(--color-bg-primary) px-4 py-6 text-(--color-text-primary) sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1380px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={topic ? `/news/${topic}` : "/"}
            className="inline-flex items-center gap-2 rounded-full border border-(--color-border) px-4 py-2 text-sm text-(--color-text-secondary) transition hover:border-(--color-border-strong) hover:text-(--color-text-primary)"
          >
            <ArrowLeft size={16} />
            {copy.ui.topicPage.backToTopic(meta.label)}
          </Link>

          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-(--color-border) px-4 py-2 text-sm text-(--color-text-secondary) transition hover:border-(--color-border-strong) hover:text-(--color-text-primary)"
          >
            {copy.ui.topicPage.backHome}
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <article className="rounded-[36px] border border-(--color-border) bg-(--color-surface) p-6 shadow-(--shadow-card) sm:p-8 lg:p-10">
            <NewsMarkdown content={entry.content} />
          </article>

          <aside className="space-y-5 xl:sticky xl:top-6 xl:h-fit">
            <section className="rounded-[32px] border border-(--color-border) bg-(--color-surface) p-5 shadow-(--shadow-card) sm:p-6">
              <p className="text-sm uppercase tracking-[0.28em] text-(--color-text-muted)">{copy.ui.detailPage.issueDetails}</p>
              <h2 className="font-display mt-3 text-3xl leading-none tracking-[-0.03em]">
                {formatDisplayDate(entry.date, locale)}
              </h2>
              <p className="mt-3 text-sm leading-7 text-(--color-text-secondary)">{meta.description}</p>

              <div className="mt-5 space-y-3 text-sm text-(--color-text-secondary)">
                <InfoRow icon={<Clock3 size={15} />} label={copy.ui.detailPage.minRead(entry.readingMinutes)} />
                <InfoRow icon={<Layers3 size={15} />} label={`${entry.sectionCount} ${copy.ui.newsCard.sections}`} />
                <InfoRow icon={<FileText size={15} />} label={`${entry.articleCount} ${copy.ui.newsCard.stories}`} />
                <InfoRow icon={<Command size={15} />} label={meta.commandPath} mono />
              </div>
            </section>

            {entry.highlights.length > 0 ? (
              <section className="rounded-[32px] border border-(--color-border) bg-(--color-surface) p-5 shadow-(--shadow-card) sm:p-6">
                <p className="text-sm uppercase tracking-[0.28em] text-(--color-text-muted)">{copy.ui.detailPage.keyHighlights}</p>
                <div className="mt-4 space-y-3">
                  {entry.highlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="rounded-2xl border border-(--color-border-soft) bg-(--color-surface-muted) px-4 py-3 text-sm leading-7 text-(--color-text-secondary)"
                    >
                      <InlineMarkdown content={highlight} />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {entry.takeaway ? (
              <section className="rounded-[32px] border border-(--color-border) bg-(--color-surface) p-5 shadow-(--shadow-card) sm:p-6">
                <p className="text-sm uppercase tracking-[0.28em] text-(--color-text-muted)">{copy.ui.detailPage.dailyFraming}</p>
                <div className="mt-4 text-base leading-8 text-(--color-text-primary)">
                  <InlineMarkdown content={entry.takeaway} />
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
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
    <div className="flex items-start gap-3 rounded-2xl border border-(--color-border-soft) bg-(--color-surface-muted) px-4 py-3">
      <span className="mt-1 text-(--color-text-primary)">{icon}</span>
      <span className={mono ? "text-xs font-medium break-all font-mono" : ""}>{label}</span>
    </div>
  );
}
