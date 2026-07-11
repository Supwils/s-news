import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

import { type Locale } from "@/data/copy";
import type { TopicKey } from "@/lib/news-meta";

/**
 * Reads the weekly rollup index and nothing else — no markdown file is ever
 * opened here, so the weekly routes never join the three routes that carry the
 * NEWS corpus (see verify-build-trace.mjs). The index is a build artifact
 * produced by scripts/build-rollups.mjs from the daily index.
 */

export type WeekTopicRollup = {
  topic: TopicKey;
  digestCount: number;
  dates: string[];
  framings: Array<{ date: string; takeaway: string }>;
  highlights: Array<{ date: string; text: string }>;
};

export type WeekRollup = {
  weekId: string;
  weekStart: string;
  weekEnd: string;
  digestCount: number;
  topics: WeekTopicRollup[];
};

type RollupIndex = {
  version: number;
  generatedAt: string;
  weeks: WeekRollup[];
};

const ROLLUP_INDEX_PATHS: Record<Locale, string> = {
  zh: path.join(process.cwd(), ".generated", "rollup-index.json"),
  en: path.join(process.cwd(), ".generated", "rollup-index-en.json"),
};

const indexCache: Partial<Record<Locale, { mtimeMs: number; data: RollupIndex }>> = {};

/**
 * Unlike the news index, a missing rollup index is not fatal: rollups are a
 * derived nicety, and prebuild always regenerates them. Degrade to "no weeks"
 * so the weekly routes render an empty state instead of 500ing.
 */
const loadRollupIndex = cache(async (locale: Locale = "zh"): Promise<RollupIndex> => {
  const indexPath = ROLLUP_INDEX_PATHS[locale];
  try {
    const stat = await fs.stat(indexPath);
    const cached = indexCache[locale];
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.data;
    }
    const raw = await fs.readFile(indexPath, "utf8");
    const data = JSON.parse(raw) as RollupIndex;
    indexCache[locale] = { mtimeMs: stat.mtimeMs, data };
    return data;
  } catch {
    indexCache[locale] = undefined;
    return { version: 1, generatedAt: "", weeks: [] };
  }
});

export async function getAllWeekIds(locale: Locale = "zh") {
  const index = await loadRollupIndex(locale);
  return index.weeks.map((week) => week.weekId);
}

/** Slim previews for the /weekly index: no framings/highlights, just the shape. */
export async function getWeekSummaries(locale: Locale = "zh") {
  const index = await loadRollupIndex(locale);
  return index.weeks.map((week) => ({
    weekId: week.weekId,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    digestCount: week.digestCount,
    topicCount: week.topics.length,
  }));
}

export async function getWeekRollup(weekId: string, locale: Locale = "zh") {
  const index = await loadRollupIndex(locale);
  return index.weeks.find((week) => week.weekId === weekId) ?? null;
}
