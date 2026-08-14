import type { Locale } from "@/data/copy";
import type { PipelineSummary, TopicSummary } from "@/lib/pipeline-metrics";

/**
 * The pipeline's own delivery record, published alongside what it delivers.
 *
 * The job has always known how it was doing and never said: the run manifest
 * was overwritten daily and gitignored, so months of duration, retry and
 * failure data went in the bin. Now it is committed, and an archive that asks
 * readers to trust an automated publisher can show its attendance instead of
 * asserting it.
 *
 * Server-rendered from the committed record — no client JS, same as the source
 * colophon on the digest pages.
 */

type RecentRun = {
  date: string;
  published: boolean;
  topics: number;
  total: number;
  measured: boolean;
};

type Props = {
  summary: PipelineSummary | null;
  topics: TopicSummary[];
  recent: RecentRun[];
  locale: Locale;
};

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function minutes(seconds: number | null, locale: Locale) {
  if (seconds === null) return locale === "en" ? "n/a" : "暂无";
  const m = Math.round(seconds / 60);
  return locale === "en" ? `${m} min` : `${m} 分钟`;
}

export function PipelineRecord({ summary, topics, recent, locale }: Props) {
  // No record yet is not an error state worth a box; render nothing.
  if (!summary) return null;

  const en = locale === "en";
  const missed = summary.runs - summary.published;

  const stats = [
    {
      label: en ? "Operating days" : "运行天数",
      value: String(summary.runs),
      note: `${summary.firstDate} → ${summary.lastDate}`,
    },
    {
      label: en ? "Days published" : "发布天数",
      value: pct(summary.publishRate),
      note: en ? `${summary.published} of ${summary.runs}, ${missed} missed` : `${summary.published}/${summary.runs}，缺 ${missed} 天`,
    },
    {
      label: en ? "Median run" : "运行耗时中位数",
      value: minutes(summary.medianDurationSec, locale),
      // Duration only exists for runs the job measured itself; the months
      // reconstructed from git know the date and the topics and nothing else.
      note: en
        ? `${summary.measuredRuns} measured run${summary.measuredRuns === 1 ? "" : "s"}`
        : `实测 ${summary.measuredRuns} 次`,
    },
    {
      label: en ? "Topic failure rate" : "主题失败率",
      value: summary.topicAttempts ? pct(summary.topicFailureRate) : en ? "n/a" : "暂无",
      note: summary.topicAttempts
        ? en
          ? `${summary.topicFailures} of ${summary.topicAttempts} attempts`
          : `${summary.topicFailures}/${summary.topicAttempts} 次尝试`
        : en
          ? "awaiting measured runs"
          : "等待实测数据",
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              padding: 20,
              borderRight: i < stats.length - 1 ? "1px solid var(--color-border)" : undefined,
            }}
          >
            <p
              className="np-mono"
              style={{
                margin: 0,
                fontSize: 10.5,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              {stat.label}
            </p>
            <p className="np-serif" style={{ margin: "8px 0 4px", fontSize: 28, letterSpacing: "-0.02em" }}>
              {stat.value}
            </p>
            <p className="np-mono" style={{ margin: 0, fontSize: 11, color: "var(--color-text-muted)" }}>
              {stat.note}
            </p>
          </div>
        ))}
      </div>

      {/* One cell per day, newest at the right: a full issue, a partial one, or
          a day nothing came out. The point is the gaps — they are why
          generation moved off a laptop that was not always awake at 09:00. */}
      {recent.length > 0 ? (
        <div style={{ marginTop: 20 }}>
          <p
            className="np-mono"
            style={{
              margin: "0 0 8px",
              fontSize: 10.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
            }}
          >
            {en ? `Last ${recent.length} days` : `最近 ${recent.length} 天`}
          </p>
          <div className="np-runstrip" role="img" aria-label={en ? `Delivery over the last ${recent.length} days: ${summary.published} published` : `最近 ${recent.length} 天的发布情况`}>
            {recent.map((run) => (
              <span
                key={run.date}
                className="np-runstrip-cell"
                data-state={!run.published ? "missed" : run.topics >= run.total ? "full" : "partial"}
                title={
                  run.published
                    ? `${run.date} · ${run.topics}/${run.total}`
                    : `${run.date} · ${en ? "nothing published" : "未发布"}`
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      {topics.length > 0 ? (
        <div style={{ marginTop: 20 }}>
          <p
            className="np-mono"
            style={{
              margin: "0 0 8px",
              fontSize: 10.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
            }}
          >
            {en ? "By topic (measured runs)" : "分主题（实测运行）"}
          </p>
          <ul className="np-mono" style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 12 }}>
            {topics.slice(0, 5).map((row) => (
              <li
                key={row.topic}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "6px 0",
                  borderTop: "1px solid var(--color-border-soft)",
                  color: "var(--color-text-secondary)",
                }}
              >
                <span>{row.topic}</span>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {en ? `${pct(row.failureRate)} failed · ${row.retries} retried` : `失败 ${pct(row.failureRate)} · 重试 ${row.retries} 次`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
