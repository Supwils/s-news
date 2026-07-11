"use client";

import Link from "next/link";

import { useLocale } from "@/components/locale-context";
import { NewspaperFooter } from "@/components/newspaper/footer";
import { NewspaperMasthead } from "@/components/newspaper/masthead";
import type { NewsEvent } from "@/lib/events";
import { localizePath } from "@/lib/locale-routing";
import { formatDisplayDate } from "@/lib/news-client";
import { getTopicMeta } from "@/lib/news-meta";

export function EventPageContent({ event }: { event: NewsEvent }) {
  const locale = useLocale();

  // Members arrive date-asc from the index; group them by date for the timeline.
  const byDate: Array<{ date: string; members: NewsEvent["members"] }> = [];
  for (const member of event.members) {
    const current = byDate.at(-1);
    if (!current || current.date !== member.date) {
      byDate.push({ date: member.date, members: [member] });
    } else {
      current.members.push(member);
    }
  }

  return (
    <div className="np-root">
      <NewspaperMasthead active="events" />
      <main className="mx-auto w-full" style={{ maxWidth: 980, padding: 40 }}>
        <section style={{ paddingBottom: 26, borderBottom: "2px solid var(--color-text-primary)" }}>
          <p
            className="np-mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--np-ink-red)",
              fontWeight: 600,
            }}
          >
            {locale === "zh" ? "跨主题事件" : "Cross-topic event"}
          </p>
          <h1
            className="np-serif"
            style={{
              fontSize: 38,
              lineHeight: 1.22,
              letterSpacing: "-0.02em",
              fontWeight: 600,
              margin: "14px 0 14px",
              color: "var(--color-text-primary)",
              maxWidth: 780,
            }}
          >
            {event.title}
          </h1>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <span className="np-mono" style={{ fontSize: 11.5, letterSpacing: "0.08em", color: "var(--color-text-secondary)" }}>
              {event.dayCount > 1
                ? `${formatDisplayDate(event.firstDate, locale)} – ${formatDisplayDate(event.lastDate, locale)}`
                : formatDisplayDate(event.firstDate, locale)}
            </span>
            <span aria-hidden style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {event.topics.map((topic) => (
                <span key={topic} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, background: `var(--np-t-${topic})` }} />
                  <span className="np-mono" style={{ fontSize: 10.5, letterSpacing: "0.1em", color: "var(--color-text-muted)" }}>
                    {getTopicMeta(topic, locale)?.shortLabel ?? topic}
                  </span>
                </span>
              ))}
            </span>
            <span className="np-mono" style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              {locale === "zh" ? `${event.memberCount} 篇报道` : `${event.memberCount} reports`}
            </span>
          </div>

          <div style={{ marginTop: 18 }}>
            <Link href={localizePath("/events", locale)} className="np-btn-ghost">
              {locale === "zh" ? "← 全部事件" : "← All events"}
            </Link>
          </div>
        </section>

        <section className="np-evt-rail" style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 36 }}>
          {byDate.map((group) => (
            <div key={group.date} className="np-evt-node">
              <h2
                className="np-mono"
                style={{
                  fontSize: 12,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--np-ink-red)",
                  fontWeight: 600,
                  margin: "0 0 14px",
                }}
              >
                {formatDisplayDate(group.date, locale)}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {group.members.map((member, index) => {
                  const meta = getTopicMeta(member.topic, locale);
                  const colorVar = `var(--np-t-${member.topic})`;
                  return (
                    <Link
                      key={`${member.topic}-${index}`}
                      href={localizePath(`/news/${member.topic}/${member.date}`, locale)}
                      className="np-evt-clipping"
                      style={{ borderLeftColor: colorVar, display: "block" }}
                    >
                      <p
                        className="np-mono"
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: colorVar,
                          fontWeight: 600,
                          margin: "0 0 6px",
                        }}
                      >
                        {meta?.shortLabel ?? member.topic}
                        <span style={{ color: "var(--color-text-muted)", fontWeight: 400, marginLeft: 10 }}>
                          {locale === "zh" ? "版面视角" : "desk view"}
                        </span>
                      </p>
                      <p
                        className="np-serif"
                        style={{ fontSize: 18, lineHeight: 1.45, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}
                      >
                        {member.title}
                      </p>
                      {member.summaryLead ? (
                        <p
                          className="np-sans"
                          style={{ fontSize: 13.5, lineHeight: 1.68, color: "var(--color-text-secondary)", margin: "8px 0 0" }}
                        >
                          {member.summaryLead}
                          {member.summaryLead.length >= 160 ? "…" : ""}
                        </p>
                      ) : null}
                      <p className="np-mono" style={{ fontSize: 10.5, letterSpacing: "0.1em", color: "var(--color-text-muted)", margin: "10px 0 0" }}>
                        {locale === "zh" ? "阅读当日日报 →" : "READ THE DAY'S DIGEST →"}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <NewspaperFooter />
      </main>
    </div>
  );
}
