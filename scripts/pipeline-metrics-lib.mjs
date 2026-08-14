/**
 * The daily pipeline's own run record.
 *
 * The job has always known how each run went — which topics succeeded, how long
 * each took, how many needed a retry — and has always thrown it away:
 * `.generated/daily-run.json` is overwritten every run and gitignored, so 139
 * runs left nothing behind. Nobody could answer "how often does a topic fail"
 * without reading logs that rotate after 30 days.
 *
 * So the record is committed, exactly like link-health.json: written by the
 * job, carried in git, read at build time. No database, no service, and the
 * site can render its own reliability history.
 *
 * Pure functions only. The script writes, the site reads, and both go through
 * here so they cannot disagree about the shape.
 */

/** Two years of daily runs. Past that the file grows without anyone reading it. */
export const MAX_RUNS = 730;

/**
 * Append `run`, replacing any existing record for the same date.
 *
 * Re-running a day is normal — a failed morning run gets retried, and a manual
 * run follows a bad one. The later record is the one that describes what was
 * actually published, so it wins rather than producing two rows for one day.
 */
export function appendRun(runs, run, cap = MAX_RUNS) {
  const kept = (runs ?? []).filter((r) => r.date !== run.date);
  kept.push(run);
  kept.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return kept.slice(-cap);
}

const isMeasured = (run) => run.source !== "backfilled";

/**
 * Headline reliability numbers.
 *
 * `publishRate` counts runs that cleared the publish threshold, which is the
 * question a reader of the archive actually has — did an issue come out. Topic
 * rates come only from measured runs: a backfilled record knows from git which
 * topics were published, but not whether a missing one failed or was never
 * attempted, and averaging those together would quietly overstate confidence.
 */
export function summarize(runs) {
  const all = runs ?? [];
  if (all.length === 0) return null;

  const measured = all.filter(isMeasured);
  const published = all.filter((r) => r.published).length;
  const topicAttempts = measured.reduce((n, r) => n + (r.total ?? 0), 0);
  const topicFailures = measured.reduce((n, r) => n + (r.failed?.length ?? 0), 0);
  const durations = measured.map((r) => r.durationSec).filter((d) => typeof d === "number" && d > 0);

  return {
    runs: all.length,
    measuredRuns: measured.length,
    firstDate: all[0].date,
    lastDate: all[all.length - 1].date,
    published,
    publishRate: all.length ? published / all.length : 0,
    topicAttempts,
    topicFailures,
    topicFailureRate: topicAttempts ? topicFailures / topicAttempts : 0,
    medianDurationSec: median(durations),
    // A single stalled topic drags the mean far more than it drags the day, so
    // the slowest run is reported alongside rather than folded in.
    slowestDurationSec: durations.length ? Math.max(...durations) : null,
  };
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

/** Per-topic reliability, for spotting a topic that fails more than the rest. */
export function byTopic(runs) {
  const table = new Map();
  for (const run of (runs ?? []).filter(isMeasured)) {
    for (const t of run.topics ?? []) {
      if (!table.has(t.topic)) table.set(t.topic, { topic: t.topic, runs: 0, failures: 0, retries: 0, durations: [] });
      const row = table.get(t.topic);
      row.runs += 1;
      if (t.status !== "ok") row.failures += 1;
      if ((t.attempts ?? 1) > 1) row.retries += 1;
      if (typeof t.durationSec === "number" && t.durationSec > 0) row.durations.push(t.durationSec);
    }
  }
  return [...table.values()]
    .map(({ durations, ...row }) => ({
      ...row,
      failureRate: row.runs ? row.failures / row.runs : 0,
      medianDurationSec: median(durations),
    }))
    .sort((a, b) => b.failureRate - a.failureRate || a.topic.localeCompare(b.topic));
}
