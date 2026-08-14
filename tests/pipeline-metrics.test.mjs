import test from "node:test";
import assert from "node:assert/strict";

import { appendRun, byTopic, MAX_RUNS, summarize } from "../scripts/pipeline-metrics-lib.mjs";

const run = (date, over = {}) => ({
  date,
  published: true,
  total: 10,
  succeeded: [],
  failed: [],
  durationSec: 2000,
  topics: [],
  ...over,
});

test("appendRun keeps runs in date order", () => {
  const runs = [run("2026-08-10"), run("2026-08-12")];
  assert.deepEqual(
    appendRun(runs, run("2026-08-11")).map((r) => r.date),
    ["2026-08-10", "2026-08-11", "2026-08-12"],
  );
});

test("appendRun replaces a day rather than duplicating it", () => {
  // Re-running a day is normal: a failed morning run gets retried, a manual run
  // follows a bad one. Two rows for one date would double-count it in every rate.
  const runs = [run("2026-08-12", { published: false })];
  const out = appendRun(runs, run("2026-08-12", { published: true }));
  assert.equal(out.length, 1);
  assert.equal(out[0].published, true);
});

test("appendRun drops the oldest runs past the cap", () => {
  let runs = [];
  for (let i = 1; i <= 12; i += 1) runs = appendRun(runs, run(`2026-08-${String(i).padStart(2, "0")}`), 10);
  assert.equal(runs.length, 10);
  assert.equal(runs[0].date, "2026-08-03");
  assert.ok(MAX_RUNS > 365, "the cap should hold more than a year");
});

test("summarize reports publish rate over every run", () => {
  const s = summarize([run("2026-08-10"), run("2026-08-11", { published: false }), run("2026-08-12")]);
  assert.equal(s.runs, 3);
  assert.equal(s.published, 2);
  assert.equal(Number(s.publishRate.toFixed(3)), 0.667);
  assert.equal(s.firstDate, "2026-08-10");
  assert.equal(s.lastDate, "2026-08-12");
});

test("summarize excludes backfilled runs from topic and duration rates", () => {
  // A backfilled record knows from git which topics were published, but not
  // whether a missing one failed or was never attempted. Averaging it in would
  // report confidence the data does not support.
  const s = summarize([
    run("2026-08-10", { source: "backfilled", total: 10, failed: ["a", "b"], durationSec: 0 }),
    run("2026-08-11", { total: 10, failed: ["a"], durationSec: 1800 }),
  ]);
  assert.equal(s.runs, 2, "backfilled runs still count as runs");
  assert.equal(s.measuredRuns, 1);
  assert.equal(s.topicAttempts, 10, "only the measured run contributes attempts");
  assert.equal(s.topicFailures, 1);
  assert.equal(s.medianDurationSec, 1800);
});

test("summarize returns null with no runs at all", () => {
  assert.equal(summarize([]), null);
  assert.equal(summarize(undefined), null);
});

test("summarize reports the slowest run separately from the median", () => {
  // One stalled topic drags the mean far more than it drags a typical day.
  const s = summarize([
    run("2026-08-10", { durationSec: 1800 }),
    run("2026-08-11", { durationSec: 2000 }),
    run("2026-08-12", { durationSec: 9000 }),
  ]);
  assert.equal(s.medianDurationSec, 2000);
  assert.equal(s.slowestDurationSec, 9000);
});

test("byTopic ranks the least reliable topic first and counts retries", () => {
  const runs = [
    run("2026-08-10", {
      topics: [
        { topic: "general", status: "ok", attempts: 1, durationSec: 300 },
        { topic: "crypto", status: "failed", attempts: 2, durationSec: 1200 },
      ],
    }),
    run("2026-08-11", {
      topics: [
        { topic: "general", status: "ok", attempts: 2, durationSec: 320 },
        { topic: "crypto", status: "ok", attempts: 1, durationSec: 400 },
      ],
    }),
  ];
  const rows = byTopic(runs);
  assert.equal(rows[0].topic, "crypto");
  assert.equal(rows[0].failureRate, 0.5);
  assert.equal(rows[0].retries, 1);
  assert.equal(rows[1].topic, "general");
  assert.equal(rows[1].failureRate, 0);
  assert.equal(rows[1].retries, 1, "a retry that eventually succeeded is still a retry");
  assert.equal(rows[1].medianDurationSec, 310);
});
