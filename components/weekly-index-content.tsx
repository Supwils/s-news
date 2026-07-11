"use client";

import Link from "next/link";

import { useLocale } from "@/components/locale-context";
import { NewspaperFooter } from "@/components/newspaper/footer";
import { NewspaperMasthead } from "@/components/newspaper/masthead";
import { localizePath } from "@/lib/locale-routing";
import { formatDisplayDate } from "@/lib/news-client";

type WeekSummary = {
  weekId: string;
  weekStart: string;
  weekEnd: string;
  digestCount: number;
  topicCount: number;
};

export function WeeklyIndexContent({ weeks }: { weeks: WeekSummary[] }) {
  const locale = useLocale();

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
              fontSize: 48,
              letterSpacing: "-0.02em",
              fontWeight: 600,
              margin: "12px 0 10px",
              color: "var(--color-text-primary)",
            }}
          >
            {locale === "zh" ? "周报" : "Weekly digests"}
          </h1>
          <p className="np-sans" style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text-secondary)", margin: 0 }}>
            {locale === "zh"
              ? "把每日日报按周汇总——每个主题的当周定性与要点一目了然。"
              : "The daily digests, gathered by week — each topic's framing and highlights at a glance."}
          </p>
        </section>

        {weeks.length === 0 ? (
          <section style={{ marginTop: 40 }}>
            <p className="np-sans" style={{ fontSize: 15, color: "var(--color-text-secondary)", margin: 0 }}>
              {locale === "zh" ? "暂时还没有可展示的周报。" : "No weekly digests yet."}
            </p>
          </section>
        ) : (
          <section style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
            {weeks.map((week) => {
              const [year, w] = week.weekId.split("-W");
              return (
                <Link
                  key={week.weekId}
                  href={localizePath(`/weekly/${week.weekId}`, locale)}
                  className="np-weekly-row"
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "16px 4px",
                    borderBottom: "1px solid var(--color-border-soft)",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <span
                      className="np-mono"
                      style={{ fontSize: 13, color: "var(--np-ink-red)", fontWeight: 600, whiteSpace: "nowrap" }}
                    >
                      {locale === "zh" ? `${year} · W${Number(w)}` : `${year} · W${Number(w)}`}
                    </span>
                    <span className="np-serif" style={{ fontSize: 17, color: "var(--color-text-primary)" }}>
                      {formatDisplayDate(week.weekStart, locale)} – {formatDisplayDate(week.weekEnd, locale)}
                    </span>
                  </span>
                  <span className="np-mono" style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {locale === "zh"
                      ? `${week.digestCount} 份 · ${week.topicCount} 主题`
                      : `${week.digestCount} digests · ${week.topicCount} topics`}
                  </span>
                </Link>
              );
            })}
          </section>
        )}

        <NewspaperFooter />
      </main>
    </div>
  );
}
