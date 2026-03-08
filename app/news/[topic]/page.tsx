import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { NewsCard } from "@/components/news-card";
import { copy } from "@/data/copy";
import { getEntryPreviewsByTopic } from "@/lib/news";
import { getTopicMeta, isTopicKey } from "@/lib/news-meta";

type TopicPageProps = {
  params: Promise<{ topic: string }>;
};

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { topic } = await params;

  if (!isTopicKey(topic)) {
    return {};
  }

  const meta = getTopicMeta(topic);

  return {
    title: `${meta?.label ?? copy.ui.topicPage.defaultTitle} | ${copy.about.siteName}`,
    description: meta?.description,
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { topic } = await params;

  if (!isTopicKey(topic)) {
    notFound();
  }

  const meta = getTopicMeta(topic);
  const entries = await getEntryPreviewsByTopic(topic);

  if (!meta) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-(--color-bg-primary) px-4 py-6 text-(--color-text-primary) sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-(--color-border) px-4 py-2 text-sm text-(--color-text-secondary) transition hover:border-(--color-border-strong) hover:text-(--color-text-primary)"
        >
          <ArrowLeft size={16} />
          {copy.ui.topicPage.backHome}
        </Link>

        <section className="rounded-[32px] border border-(--color-border) bg-(--color-surface) p-6 shadow-(--shadow-card) sm:p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-(--color-text-muted)">{copy.ui.topicPage.badge}</p>
          <h1 className="font-display mt-3 text-4xl leading-none tracking-[-0.04em] sm:text-5xl">
            {meta.label}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-(--color-text-secondary)">
            {meta.description}
          </p>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {entries.map((entry) => (
            <NewsCard key={`${entry.topic}-${entry.date}`} entry={entry} />
          ))}
        </section>
      </div>
    </main>
  );
}
