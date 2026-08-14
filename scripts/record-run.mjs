#!/usr/bin/env node

/**
 * record-run.mjs [--published true|false]
 *
 * Fold this run's `.generated/daily-run.json` into the committed
 * `pipeline-metrics.json`.
 *
 * The manifest is overwritten every run and lives under a gitignored directory,
 * so 139 runs of duration, retry and failure data went straight in the bin. This
 * moves the record somewhere durable, using the same local → git → deploy path
 * as link-health.json, and nothing else: no database, no metrics service.
 *
 * Called from daily-news-and-commit.sh *before* the content commit, so the
 * record rides that commit and does not trigger a second deploy. That is also
 * why the record stops at generation: deploy and warm status are only known
 * afterwards, and recording them would cost a commit per day to say the deploy
 * worked — which a failed job already says louder.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { appendRun } from "./pipeline-metrics-lib.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = path.join(PROJECT_ROOT, ".generated", "daily-run.json");
const METRICS_PATH = path.join(PROJECT_ROOT, "pipeline-metrics.json");

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

const manifest = readJson(MANIFEST_PATH, null);
if (!manifest?.date) {
  // Nothing to record is not a failure: the daily job must not die at the last
  // step because a manifest is missing.
  console.warn("[record-run] no usable .generated/daily-run.json — skipping");
  process.exit(0);
}

const metrics = readJson(METRICS_PATH, { version: 1, runs: [] });

const run = {
  date: manifest.date,
  // Whether an issue actually came out. `succeeded.length` alone cannot say so:
  // the run may have cleared the per-topic bar and still refused to publish.
  published: argValue("--published") !== "false",
  total: manifest.total ?? 0,
  succeeded: manifest.succeeded ?? [],
  failed: manifest.failed ?? [],
  durationSec: manifest.durationSec ?? null,
  topics: manifest.topics ?? [],
  source: "measured",
};

const updated = { ...metrics, version: 1, runs: appendRun(metrics.runs ?? [], run) };
writeFileSync(METRICS_PATH, `${JSON.stringify(updated, null, 2)}\n`, "utf8");

console.log(
  `[record-run] ${run.date}: ${run.succeeded.length}/${run.total} topics, ${run.durationSec ?? "?"}s, published=${run.published} → pipeline-metrics.json (${updated.runs.length} runs)`,
);
