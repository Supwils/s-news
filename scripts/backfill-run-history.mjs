#!/usr/bin/env node

/**
 * Reconstruct the run history that was never recorded, from git.
 *
 * The pipeline ran for months before it kept any record of itself, so the only
 * surviving evidence is the content it committed. That is enough to answer the
 * question the archive's readers actually have — did an issue come out on this
 * day, and how many topics did it carry — and nothing more.
 *
 * What git cannot tell us is deliberately left out rather than guessed:
 * durations, retries, and the difference between a topic that failed and a topic
 * that was never attempted. Backfilled rows are marked `source: "backfilled"`
 * and `summarize()` keeps them out of every rate that would imply we know those
 * things.
 *
 * Idempotent: re-running rebuilds the same rows, and a measured record for a
 * date always wins (appendRun replaces by date, and this refuses to overwrite).
 *
 *   node scripts/backfill-run-history.mjs [--write]
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { appendRun } from "./pipeline-metrics-lib.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const METRICS_PATH = path.join(PROJECT_ROOT, "pipeline-metrics.json");
const WRITE = process.argv.includes("--write");

// `-c core.quotePath=false`: git escapes non-ASCII paths into `"NEWS/…\346\226"`
// by default, and every Chinese digest filename is non-ASCII. With the quoting
// on, a `^NEWS/` anchor fails on the opening quote and the whole zh corpus is
// skipped in silence — this backfill first reported 102 days when the corpus
// held 142, and looked entirely plausible doing it.
const git = (...args) =>
  execFileSync("git", ["-c", "core.quotePath=false", ...args], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

/** A day of the operating span with no digest at all: the job did not deliver. */
const MISSED_RUN = { total: 0, succeeded: [], failed: [], durationSec: null, topics: [] };

/**
 * Dates cut off from the rest of the corpus by more than this are not history.
 * One 2025-03-06 file — a template artifact, roadmap open item 7 — otherwise
 * stretches the operating span from four months to 526 days and turns the
 * publish rate into fiction.
 */
const ORPHAN_GAP_DAYS = 30;

const dayMs = 86_400_000;
const toDate = (iso) => new Date(`${iso}T00:00:00Z`);
const toIso = (d) => d.toISOString().slice(0, 10);

/**
 * Which topics have a digest dated `date`, per git's record of the tree.
 *
 * Read from the files themselves rather than from commit messages: the message
 * is the same every day, and a run that published seven topics looks identical
 * to one that published ten.
 */
const files = git("ls-files", "NEWS").split("\n").filter(Boolean);

const byDate = new Map();
for (const file of files) {
  // NEWS/<topic>/<locale>/<YYYY-MM-DD>_<name>.md
  const match = file.match(/^NEWS\/([^/]+)\/(zh|en)\/(\d{4}-\d{2}-\d{2})_/);
  if (!match) continue;
  const [, topic, , date] = match;
  if (!byDate.has(date)) byDate.set(date, new Set());
  byDate.get(date).add(topic);
}

const existing = (() => {
  try {
    return JSON.parse(readFileSync(METRICS_PATH, "utf8"));
  } catch {
    return { version: 1, runs: [] };
  }
})();

const measuredDates = new Set((existing.runs ?? []).filter((r) => r.source !== "backfilled").map((r) => r.date));

// Drop dates stranded far from the rest before deciding where the span starts.
const contentDates = [...byDate.keys()].sort();
const startIndex = contentDates.findIndex(
  (d, i) => i === contentDates.length - 1 || (toDate(contentDates[i + 1]) - toDate(d)) / dayMs <= ORPHAN_GAP_DAYS,
);
const orphans = contentDates.slice(0, Math.max(0, startIndex));
const active = contentDates.slice(Math.max(0, startIndex));

let runs = existing.runs ?? [];
let added = 0;
let missed = 0;

// Walk the calendar, not the corpus. Iterating only the days that produced
// content makes the publish rate 100% by construction — the days the job
// delivered nothing are exactly the ones missing from `byDate`.
for (let t = toDate(active[0]).getTime(); t <= toDate(active[active.length - 1]).getTime(); t += dayMs) {
  const date = toIso(new Date(t));
  if (measuredDates.has(date)) continue; // never overwrite a real measurement
  const topics = byDate.get(date);
  if (!topics) missed += 1;
  runs = appendRun(runs, {
    date,
    published: Boolean(topics),
    ...(topics
      ? { total: topics.size, succeeded: [...topics].sort(), failed: [], durationSec: null, topics: [] }
      : MISSED_RUN),
    source: "backfilled",
  });
  added += 1;
}

const spanDays = Math.round((toDate(active[active.length - 1]) - toDate(active[0])) / dayMs) + 1;
console.log(`backfill: ${added} day(s) reconstructed from ${files.length} committed files`);
console.log(`          operating span ${active[0]} → ${active[active.length - 1]} (${spanDays} days)`);
console.log(`          published ${active.length}, nothing published ${missed}`);
if (orphans.length > 0) {
  console.log(`          ignored ${orphans.length} orphan date(s) >${ORPHAN_GAP_DAYS}d from the corpus: ${orphans.join(", ")}`);
}
const perDay = active.map((d) => byDate.get(d).size);
console.log(`          ${perDay.filter((n) => n === 10).length}/${active.length} published days carried all 10 topics`);

if (!WRITE) {
  console.log("          (dry run — pass --write to update pipeline-metrics.json)");
  process.exit(0);
}

writeFileSync(METRICS_PATH, `${JSON.stringify({ ...existing, version: 1, runs }, null, 2)}\n`, "utf8");
console.log(`          wrote ${runs.length} runs → pipeline-metrics.json`);
