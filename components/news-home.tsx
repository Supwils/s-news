"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Command, Newspaper, Search, Sparkles } from "lucide-react";

import { formatDisplayDate, groupPreviewsByDate, searchEntries } from "@/lib/news-client";
import { TOPICS, type TopicKey } from "@/lib/news-meta";
import type { NewsPreview } from "@/lib/news";
import { NewsCard } from "@/components/news-card";

type NewsHomeProps = {
  entries: NewsPreview[];
};

export function NewsHome({ entries }: NewsHomeProps) {
  const [query, setQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState<TopicKey | "all">("all");

  const filtered = useMemo(
    () => searchEntries(entries, query, activeTopic),
    [activeTopic, entries, query],
  );

  const groups = useMemo(() => groupPreviewsByDate(filtered), [filtered]);
  const latestDate = entries[0]?.date;
  const latestEntries = latestDate ? entries.filter((entry) => entry.date === latestDate) : [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(193,166,111,0.22),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(96,161,255,0.18),_transparent_28%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.14),_transparent_25%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,_rgba(255,255,255,0.04),_transparent_18%),linear-gradient(to_right,_rgba(255,255,255,0.02)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(255,255,255,0.02)_1px,_transparent_1px)] bg-[size:auto,24px_24px,24px_24px] opacity-40" />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 mb-6 rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg-primary)_75%,transparent)] px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-xl tracking-[0.18em] uppercase text-[var(--color-text-primary)]">
                S-News
              </p>
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
                Cursor-native daily intelligence desk
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <span className="rounded-full border border-[var(--color-border)] px-3 py-1.5">本地优先</span>
              <span className="rounded-full border border-[var(--color-border)] px-3 py-1.5">Markdown 存档</span>
              <span className="rounded-full border border-[var(--color-border)] px-3 py-1.5">Cursor 生成</span>
            </nav>
          </div>
        </header>

        <main className="space-y-8 pb-12">
          <section className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-hero)] sm:p-8 lg:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-[10px] uppercase tracking-[0.35em] text-[var(--color-accent-gold)]">
                <Sparkles size={12} />
                Editorial intelligence system
              </div>

              <div className="mt-6 max-w-4xl space-y-5">
                <h1 className="font-display text-4xl leading-none tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-5xl lg:text-7xl">
                  把 Cursor 生成的日报，变成一份真正值得每天打开的信息界面。
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[var(--color-text-secondary)] sm:text-lg">
                  S-News 是一个为多主题日报设计的本地优先阅读器。通用、金融与 AI 科技内容按日期归档、按主题筛选、按全文线索检索，让你的命令产出从文件夹升级为完整产品。
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="已归档日报" value={`${entries.length}`} hint="跨主题总量" />
                <MetricCard label="今日可读主题" value={`${latestEntries.length}`} hint={latestDate ? formatDisplayDate(latestDate) : "暂无数据"} />
                <MetricCard label="主题分类" value={`${TOPICS.length}`} hint="通用 / 金融 / AI 科技" />
                <MetricCard
                  label="最新更新"
                  value={latestDate ? latestDate.replaceAll("-", ".") : "--"}
                  hint="本地文件实时读取"
                />
              </div>
            </div>

            <aside className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
                <div className="flex items-center gap-3 text-[var(--color-text-primary)]">
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                    <Search size={18} />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-text-muted)]">Signal filter</p>
                    <h2 className="mt-1 text-lg font-semibold">搜索与主题过滤</h2>
                  </div>
                </div>

                <label className="mt-5 block">
                  <span className="sr-only">搜索日报</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
                    <Search size={16} className="text-[var(--color-text-muted)]" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="搜索标题、摘要、简评或主题…"
                      className="w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                    />
                  </div>
                </label>

                <div className="mt-4 flex flex-wrap gap-2">
                  <FilterButton
                    active={activeTopic === "all"}
                    onClick={() => setActiveTopic("all")}
                    label="全部主题"
                  />
                  {TOPICS.map((topic) => (
                    <FilterButton
                      key={topic.key}
                      active={activeTopic === topic.key}
                      onClick={() => setActiveTopic(topic.key)}
                      label={topic.label}
                    />
                  ))}
                </div>

                <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)]">
                  当前命中 <span className="font-semibold text-[var(--color-text-primary)]">{filtered.length}</span> 份日报，
                  按日期倒序展示。
                </p>
              </div>

              <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                    <Command size={18} />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-text-muted)]">Runbook</p>
                    <h2 className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">生成日报方式</h2>
                  </div>
                </div>

                <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--color-text-secondary)]">
                  {TOPICS.map((topic) => (
                    <div key={topic.key} className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]/70 p-4">
                      <p className="font-medium text-[var(--color-text-primary)]">{topic.label}</p>
                      <p className="mt-1">{topic.description}</p>
                      <code className="mt-3 block overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-primary)]">
                        {topic.scriptPath ? `./${topic.scriptPath}` : `@${topic.commandPath}`}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </section>

          {latestEntries.length > 0 ? (
            <section className="rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-5 shadow-[var(--shadow-card)] sm:p-6 lg:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Latest drop</p>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-none tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-4xl">
                    {formatDisplayDate(latestDate!)} 的信息面板
                  </h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)]">
                  <CalendarDays size={15} />
                  今日已生成 {latestEntries.length} 份日报
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                {latestEntries.map((entry) => (
                  <NewsCard key={`${entry.topic}-${entry.date}`} entry={entry} compact />
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-8">
            {groups.map((group) => (
              <div key={group.date} className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Date archive</p>
                    <h2 className="font-[family-name:var(--font-display)] text-3xl leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
                      {formatDisplayDate(group.date)}
                    </h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
                    <Newspaper size={14} />
                    {group.entries.length} issue{group.entries.length > 1 ? "s" : ""}
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
            <section className="rounded-[32px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-card)]">
              <p className="text-sm uppercase tracking-[0.28em] text-[var(--color-text-muted)]">No results</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--color-text-primary)]">
                没有找到匹配内容
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--color-text-secondary)]">
                可以清空搜索关键词、切回全部主题，或先通过脚本生成新的日报文件。
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)]"
              >
                回到全部视图
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
    <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-text-muted)]">{label}</p>
      <p className="font-display mt-3 text-3xl leading-none tracking-[-0.04em] text-[var(--color-text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{hint}</p>
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-2 text-xs font-medium transition sm:text-sm",
        active
          ? "border-[var(--color-border-strong)] bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
