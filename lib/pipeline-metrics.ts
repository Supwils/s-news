import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

import {
  byTopic,
  summarize,
  type PipelineRun,
  type PipelineSummary,
  type TopicSummary,
} from "../scripts/pipeline-metrics-lib.mjs";

/**
 * Reads the committed run record and exposes what the site renders from it.
 *
 * Same shape of contract as lib/link-health.ts: the file is produced
 * out-of-band by the daily job, carried in git, and read at build time. A
 * missing or malformed file degrades to "no history" — the section simply does
 * not render, and the build never breaks over it.
 */

export type { PipelineRun, PipelineSummary, TopicSummary };

const METRICS_PATH = path.join(process.cwd(), "pipeline-metrics.json");

const readRuns = cache(async (): Promise<PipelineRun[]> => {
  try {
    const parsed = JSON.parse(await fs.readFile(METRICS_PATH, "utf8")) as { runs?: PipelineRun[] };
    return Array.isArray(parsed.runs) ? parsed.runs : [];
  } catch {
    return [];
  }
});

export const getPipelineSummary = cache(async (): Promise<PipelineSummary | null> => summarize(await readRuns()));

export const getPipelineByTopic = cache(async (): Promise<TopicSummary[]> => byTopic(await readRuns()));

/**
 * The most recent `days` runs, oldest first — the input for a strip chart.
 *
 * Returned as a plain shape rather than the full record so a client component
 * can hold it without carrying every run's topic array into the payload.
 */
export const getRecentRuns = cache(async (days = 90) => {
  const runs = await readRuns();
  return runs.slice(-days).map((run) => ({
    date: run.date,
    published: run.published,
    topics: run.succeeded?.length ?? 0,
    total: run.total ?? 0,
    measured: run.source !== "backfilled",
  }));
});
