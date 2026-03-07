import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { NewsCard } from "@/components/news-card";
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
    title: `${meta?.label ?? "日报"} | S-News`,
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
    <main className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-6 text-[var(--color-text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft size={16} />
          返回首页
        </Link>

        <section className="rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Topic archive</p>
          <h1 className="font-display mt-3 text-4xl leading-none tracking-[-0.04em] sm:text-5xl">
            {meta.label}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
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
