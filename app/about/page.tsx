import Link from "next/link";
import { BookOpenText, Command, Search, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { NewsDeskIllustration } from "@/components/home/news-desk-illustration";
import { copy } from "@/data/copy";
import { TopicIcon } from "@/components/topic-icon";
import { getAllNewsPreviews, formatDisplayDate } from "@/lib/news";
import { TOPICS } from "@/lib/news-meta";

export default async function AboutPage() {
  const entries = await getAllNewsPreviews();
  const latestDate = entries[0]?.date;
  const latestEntries = latestDate ? entries.filter((entry) => entry.date === latestDate) : [];
  const archiveDays = new Set(entries.map((entry) => entry.date)).size;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(193,166,111,0.22),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(96,161,255,0.18),_transparent_28%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.14),_transparent_25%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,_rgba(255,255,255,0.04),_transparent_18%),linear-gradient(to_right,_rgba(255,255,255,0.02)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(255,255,255,0.02)_1px,_transparent_1px)] bg-[size:auto,24px_24px,24px_24px] opacity-40" />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 mb-6 rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg-primary)_75%,transparent)] px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-xl tracking-[0.18em] uppercase text-[var(--color-text-primary)]">
                {copy.about.siteName}
              </p>
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
                {copy.about.headerSubtitle}
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <Link
                href="/"
                className="rounded-full border border-[var(--color-border)] px-3 py-1.5 transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
              >
                {copy.about.nav.home}
              </Link>
              <span className="rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] px-3 py-1.5">
                {copy.about.nav.about}
              </span>
              <Link
                href="/runtime"
                className="rounded-full border border-[var(--color-border)] px-3 py-1.5 transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
              >
                {copy.about.nav.runtime}
              </Link>
            </nav>
          </div>
        </header>

        <main className="space-y-8 pb-12">
          <section className="relative overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-hero)] sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(184,137,45,0.85),rgba(47,126,232,0.8),transparent)] opacity-80" />

            <div className="grid gap-8 xl:grid-cols-[1.04fr_0.96fr] xl:items-center">
              <div className="max-w-4xl space-y-6">
                <SectionBadge icon={<BookOpenText size={12} />} label={copy.about.hero.badge} />
                <h1 className="font-display text-4xl leading-none tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-5xl lg:text-7xl">
                  {copy.about.hero.titleLine1}
                  <br />
                  {copy.about.hero.titleLine2}
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[var(--color-text-secondary)] sm:text-lg">
                  {copy.about.hero.intro}
                </p>
              </div>

              <div className="xl:justify-self-end">
                <NewsDeskIllustration entryCount={entries.length} topicCount={TOPICS.length} className="max-w-[460px]" />
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label={copy.about.metrics.totalLabel} value={`${entries.length}`} hint={copy.about.metrics.totalHint} />
              <MetricCard
                label={copy.about.metrics.todayLabel}
                value={`${latestEntries.length}`}
                hint={latestDate ? formatDisplayDate(latestDate) : copy.about.metrics.todayNoData}
              />
              <MetricCard label={copy.about.metrics.topicLabel} value={`${TOPICS.length}`} hint={copy.about.metrics.topicHint} />
              <MetricCard label={copy.about.metrics.archiveLabel} value={`${archiveDays}`} hint={copy.about.metrics.archiveHint} />
            </div>
          </section>

          <section className="rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-5 shadow-[var(--shadow-card)] sm:p-6 lg:p-8">
            <div className="max-w-3xl">
              <SectionBadge icon={<Sparkles size={12} />} label={copy.about.editorial.badge} />
              <h2 className="mt-4 font-display text-3xl leading-none tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-4xl">
                {copy.about.editorial.heading}
              </h2>
              <p className="mt-4 text-sm leading-8 text-[var(--color-text-secondary)] sm:text-base">
                {copy.about.editorial.body}
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {copy.about.editorial.cards.map((card) => (
                <InfoCard key={card.title} title={card.title} description={card.description} />
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-5 shadow-[var(--shadow-card)] sm:p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div className="space-y-4">
                <SectionBadge icon={<Search size={12} />} label={copy.about.signalFilter.badge} />
                <h2 className="font-display text-3xl leading-none tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-4xl">
                  {copy.about.signalFilter.heading}
                </h2>
                <p className="text-sm leading-8 text-[var(--color-text-secondary)] sm:text-base">
                  {copy.about.signalFilter.body}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {copy.about.signalFilter.cards.map((card) => (
                  <InfoCard key={card.title} title={card.title} description={card.description} />
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-5 shadow-[var(--shadow-card)] sm:p-6 lg:p-8">
            <div className="max-w-3xl">
              <SectionBadge icon={<Command size={12} />} label={copy.about.runbook.badge} />
              <h2 className="mt-4 font-display text-3xl leading-none tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-4xl">
                {copy.about.runbook.heading}
              </h2>
              <p className="mt-4 text-sm leading-8 text-[var(--color-text-secondary)] sm:text-base">
                {copy.about.runbook.body}
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {copy.about.runbook.flowCards.map((card) => (
                <FlowCard key={card.step} step={card.step} title={card.title} description={card.description} />
              ))}
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {TOPICS.map((topic) => (
                <div
                  key={topic.key}
                  className="rounded-[24px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]/70 p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <TopicIcon topic={topic.key} size={24} variant="badge" className="mt-0.5" />
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
                          {topic.shortLabel}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">{topic.label}</h3>
                      </div>
                    </div>
                    <span
                      className="mt-1 h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: topic.accent }}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">{topic.description}</p>
                  <code className="mt-4 block overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-primary)]">
                    {topic.scriptPath ? `./${topic.scriptPath}` : `@${topic.commandPath}`}
                  </code>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-sm uppercase tracking-[0.28em] text-[var(--color-text-muted)]">{copy.about.cta.label}</p>
                <h2 className="mt-2 font-display text-3xl leading-none tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-4xl">
                  {copy.about.cta.heading}
                </h2>
                <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  {copy.about.cta.body}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-text-primary)] px-5 py-3 text-sm font-medium !text-[var(--color-bg-primary)] transition hover:opacity-90"
                >
                  {copy.about.cta.backHome}
                </Link>
                <Link
                  href="/runtime"
                  className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-3 text-sm font-medium text-[var(--color-text-primary)] transition hover:border-[var(--color-border-strong)]"
                >
                  {copy.about.cta.toRuntime}
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-[10px] uppercase tracking-[0.35em] text-[var(--color-accent-gold)]">
      {icon}
      {label}
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-text-muted)]">{label}</p>
      <p className="font-display mt-3 text-3xl leading-none tracking-[-0.04em] text-[var(--color-text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{hint}</p>
    </div>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)]/75 p-4 sm:p-5">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
}

function FlowCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-surface)_88%,transparent),color-mix(in_srgb,var(--color-surface-muted)_92%,transparent))] p-4 sm:p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-text-muted)]">{step}</p>
      <h3 className="mt-3 text-xl font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
}
