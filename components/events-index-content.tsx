"use client";

import Link from "next/link";
import { useState } from "react";

import { useLocale } from "@/components/locale-context";
import { NewspaperFooter } from "@/components/newspaper/footer";
import { NewspaperMasthead } from "@/components/newspaper/masthead";
import type { NewsEvent } from "@/lib/events";
import { localizePath } from "@/lib/locale-routing";
import { formatDisplayDate } from "@/lib/news-client";
import { getTopicMeta } from "@/lib/news-meta";

export type EventSummary = Omit<NewsEvent, "members">;

type EventsIndexContentProps = {
  /** Only the first window; the rest come from /api/events on demand. */
  events: EventSummary[];
  totalCount: number;
};

const STEP = 60;

/** Events already arrive sorted lastDate-desc; group them by that date. */
function groupByLastDate(events: EventSummary[]) {
  const groups: Array<{ date: string; events: EventSummary[] }> = [];
  for (const event of events) {
    const current = groups.at(-1);
    if (!current || current.date !== event.lastDate) {
      groups.push({ date: event.lastDate, events: [event] });
    } else {
      current.events.push(event);
    }
  }
  return groups;
}

export function EventsIndexContent({ events: initialEvents, totalCount }: EventsIndexContentProps) {
  const locale = useLocale();
  const [events, setEvents] = useState(initialEvents);
  const [visible, setVisible] = useState(initialEvents.length);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const shown = events.slice(0, visible);
  const remaining = totalCount - shown.length;
  const groups = groupByLastDate(shown);

  const handleMore = async () => {
    if (loading) return;
    if (events.length >= totalCount) {
      setVisible((count) => count + STEP);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/events?locale=${locale}`);
      if (!response.ok) throw new Error(`/api/events responded ${response.status}`);
      const payload = (await response.json()) as { events: EventSummary[] };
      setEvents(payload.events);
      setVisible((count) => count + STEP);
    } catch (error) {
      console.warn("[events] failed to load more", error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="np-root">
      <NewspaperMasthead active="events" />
      <main className="mx-auto w-full" style={{ maxWidth: 1120, padding: 40 }}>
        <section style={{ paddingBottom: 28, borderBottom: "2px solid var(--color-text-primary)" }}>
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
            {locale === "zh" ? "跨主题事件 · 电讯栏" : "Cross-topic events · The wire"}
          </p>
          <h1
            className="np-serif"
            style={{
              fontSize: 52,
              letterSpacing: "-0.02em",
              fontWeight: 600,
              margin: "12px 0 10px",
              color: "var(--color-text-primary)",
            }}
          >
            {locale === "zh" ? "事件" : "Events"}
          </h1>
          <p
            className="np-serif"
            style={{
              fontStyle: "italic",
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--color-text-secondary)",
              margin: 0,
              maxWidth: 640,
            }}
          >
            {locale === "zh"
              ? "同一件事，不同编辑台的多视角报道——由每日日报自动聚合。"
              : "One story, seen from several desks — clustered automatically from the daily digests."}
          </p>
          <p className="np-mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-text-muted)", margin: "14px 0 0" }}>
            {locale === "zh" ? `${totalCount} 个事件 · 按最近活动排序` : `${totalCount} EVENTS · NEWEST ACTIVITY FIRST`}
          </p>
        </section>

        {shown.length === 0 ? (
          <section style={{ marginTop: 40 }}>
            <p className="np-sans" style={{ fontSize: 15, color: "var(--color-text-secondary)", margin: 0 }}>
              {locale === "zh" ? "暂时还没有可展示的事件。" : "No events yet."}
            </p>
          </section>
        ) : (
          <section>
            {groups.map((group) => (
              <div key={group.date}>
                <div className="np-evt-datehead">
                  <span
                    className="np-serif"
                    style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)" }}
                  >
                    {formatDisplayDate(group.date, locale)}
                  </span>
                  <span className="np-mono" style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-text-muted)" }}>
                    {locale === "zh" ? `${group.events.length} 个事件` : `${group.events.length} EVENT${group.events.length > 1 ? "S" : ""}`}
                  </span>
                </div>

                {group.events.map((event) => (
                  <Link key={event.id} href={localizePath(`/events/${event.id}`, locale)} className="np-evt-row">
                    <span className="np-evt-ticks" aria-hidden>
                      {event.topics.map((topic) => (
                        <span key={topic} className="np-evt-tick" style={{ background: `var(--np-t-${topic})` }} />
                      ))}
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                      <span className="np-serif np-evt-title">{event.title}</span>
                      <span style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <span className="np-mono" style={{ fontSize: 11, color: "var(--color-text-muted)", letterSpacing: "0.06em" }}>
                          {event.topics
                            .map((topic) => getTopicMeta(topic, locale)?.shortLabel ?? topic)
                            .join(" · ")}
                          {" · "}
                          {locale === "zh" ? `${event.memberCount} 篇报道` : `${event.memberCount} reports`}
                        </span>
                        {event.dayCount > 1 ? (
                          <span className="np-mono np-evt-badge">
                            {locale === "zh"
                              ? `持续 ${event.dayCount} 天 · ${formatDisplayDate(event.firstDate, locale)} 起`
                              : `${event.dayCount}-DAY STORY · SINCE ${formatDisplayDate(event.firstDate, locale)}`}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ))}

            {remaining > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 28 }}>
                <button type="button" className="np-btn-secondary" onClick={handleMore} disabled={loading}>
                  {loading
                    ? locale === "zh"
                      ? "加载中…"
                      : "Loading…"
                    : locale === "zh"
                      ? `加载更多（剩余 ${remaining} 个）`
                      : `Load more (${remaining} remaining)`}
                </button>
                {failed ? (
                  <p className="np-sans" style={{ fontSize: 13, color: "var(--np-ink-red)", margin: 0 }}>
                    {locale === "zh" ? "加载失败，请重试。" : "Could not load more. Try again."}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        )}

        <NewspaperFooter />
      </main>
    </div>
  );
}
