"use client";

import Link from "next/link";

import { InlineMarkdown } from "@/components/news-markdown";
import { useLocale } from "@/components/locale-context";
import { NewspaperFooter } from "@/components/newspaper/footer";
import { NewspaperMasthead } from "@/components/newspaper/masthead";
import { localizePath } from "@/lib/locale-routing";
import { formatDisplayDate } from "@/lib/news-client";
import { getTopicMeta } from "@/lib/news-meta";
import type { WeekRollup } from "@/lib/rollups";

type WeeklyPageContentProps = {
  week: WeekRollup;
  previousWeekId: string | null;
  nextWeekId: string | null;
};

function weekTitle(week: WeekRollup, locale: "zh" | "en") {
  const [year, w] = week.weekId.split("-W");
  const range = `${formatDisplayDate(week.weekStart, locale)} – ${formatDisplayDate(week.weekEnd, locale)}`;
  return locale === "zh"
    ? { kicker: `${year} 年 · 第 ${Number(w)} 周`, range }
    : { kicker: `Week ${Number(w)}, ${year}`, range };
}

export function WeeklyPageContent({ week, previousWeekId, nextWeekId }: WeeklyPageContentProps) {
  const locale = useLocale();
  const { kicker, range } = weekTitle(week, locale);

  return (
    <div className="np-root">
      <NewspaperMasthead active="weekly" />
      <main className="mx-auto w-full" style={{ maxWidth: 1280, padding: 40 }}>
        <section style={{ paddingBottom: 28, borderBottom: "1px solid var(--color-border)" }}>
          <p
            className="np-mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
            }}
          >
            {locale === "zh" ? "本周回顾" : "Week in review"}
          </p>
          <h1
            className="np-serif"
            style={{
              fontSize: 44,
              letterSpacing: "-0.02em",
              fontWeight: 600,
              margin: "12px 0 8px",
              color: "var(--color-text-primary)",
            }}
          >
            {kicker}
          </h1>
          <p className="np-sans" style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>
            {range} ·{" "}
            {locale === "zh"
              ? `${week.digestCount} 份日报 · ${week.topics.length} 个主题`
              : `${week.digestCount} digests · ${week.topics.length} topics`}
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
            {nextWeekId ? (
              <Link href={localizePath(`/weekly/${nextWeekId}`, locale)} className="np-btn-secondary">
                {locale === "zh" ? "← 更新的一周" : "← Newer week"}
              </Link>
            ) : null}
            {previousWeekId ? (
              <Link href={localizePath(`/weekly/${previousWeekId}`, locale)} className="np-btn-secondary">
                {locale === "zh" ? "更早的一周 →" : "Older week →"}
              </Link>
            ) : null}
            <Link href={localizePath("/weekly", locale)} className="np-btn-ghost">
              {locale === "zh" ? "全部周报" : "All weeks"}
            </Link>
          </div>
        </section>

        <section style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 44 }}>
          {week.topics.map((topicRollup, sectionIndex) => {
            const meta = getTopicMeta(topicRollup.topic, locale);
            if (!meta) return null;
            const colorVar = `var(--np-t-${topicRollup.topic})`;

            return (
              <article key={topicRollup.topic}>
                <header
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 14,
                    paddingBottom: 10,
                    borderBottom: `2px solid ${colorVar}`,
                    marginBottom: 16,
                  }}
                >
                  <span className="np-mono np-wk-deskno" aria-hidden>
                    {String(sectionIndex + 1).padStart(2, "0")}
                  </span>
                  <h2
                    className="np-serif"
                    style={{ fontSize: 26, fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}
                  >
                    <Link href={localizePath(`/news/${topicRollup.topic}`, locale)} style={{ color: "inherit" }}>
                      {meta.label}
                    </Link>
                  </h2>
                  <span className="np-mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-text-muted)" }}>
                    {locale === "zh" ? `${topicRollup.digestCount} 份` : `${topicRollup.digestCount} DIGESTS`}
                  </span>
                </header>

                {topicRollup.framings.length > 0 ? (
                  <div style={{ marginBottom: 18 }}>
                    <p
                      className="np-mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--color-text-muted)",
                        marginBottom: 8,
                      }}
                    >
                      {locale === "zh" ? "每日定性" : "Daily framing"}
                    </p>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                      {topicRollup.framings.map((framing) => (
                        <li key={framing.date} style={{ display: "flex", gap: 12 }}>
                          <Link
                            href={localizePath(`/news/${topicRollup.topic}/${framing.date}`, locale)}
                            className="np-mono"
                            style={{ fontSize: 11, color: colorVar, whiteSpace: "nowrap", paddingTop: 3 }}
                          >
                            {formatDisplayDate(framing.date, locale)}
                          </Link>
                          <span
                            className="np-serif"
                            style={{ fontSize: 15, lineHeight: 1.6, color: "var(--color-text-primary)" }}
                          >
                            <InlineMarkdown content={framing.takeaway} inline />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {topicRollup.highlights.length > 0 ? (
                  <div>
                    <p
                      className="np-mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--color-text-muted)",
                        marginBottom: 8,
                      }}
                    >
                      {locale === "zh" ? "本周要点" : "This week's highlights"}
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                      {topicRollup.highlights.map((highlight, index) => (
                        <li
                          key={`${highlight.date}-${index}`}
                          className="np-sans"
                          style={{ fontSize: 14, lineHeight: 1.6, color: "var(--color-text-secondary)" }}
                        >
                          <InlineMarkdown content={highlight.text} inline />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        <NewspaperFooter />
      </main>
    </div>
  );
}
