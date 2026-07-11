#!/usr/bin/env node

/**
 * Weekly rollups, synthesized mechanically from the daily index.
 *
 * A daily digest loses most of its value within days; "what happened this week"
 * barely decays, and it is the archive's most wasted asset. The inputs already
 * exist and are already LLM-quality: every digest carries a `takeaway` (the day's
 * framing — "what kind of day this was") and up to four `highlights`. Stacking a
 * week of those IS the week in review, so this needs no web search and no model
 * call — it is a pure, deterministic build artifact derived from
 * `.generated/news-index*.json`.
 *
 * Output `.generated/rollup-index*.json` is read only by the weekly routes, which
 * therefore never open a markdown file — the "only three routes read the corpus"
 * invariant (verify-build-trace.mjs) is untouched. A richer, model-written rollup
 * can later override a week by writing to ROLLUPS/ without changing this baseline.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isoWeekId, isoWeekRange } from "../lib/iso-week.mjs";
import { LOCALES, TOPIC_FOLDERS } from "./news-topics.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, ".generated");

const INDEX_FILE = { zh: "news-index.json", en: "news-index-en.json" };
const OUTPUT_FILE = { zh: "rollup-index.json", en: "rollup-index-en.json" };

const TOPIC_ORDER = TOPIC_FOLDERS;
const MAX_WEEK_HIGHLIGHTS = 6;

async function readIndex(locale) {
  const raw = await readFile(path.join(OUTPUT_DIR, INDEX_FILE[locale]), "utf8");
  return JSON.parse(raw).entries ?? [];
}

/** entries → Map<weekId, Map<topic, entries[]>>, all sorted date-desc within. */
function groupByWeekAndTopic(entries) {
  const weeks = new Map();
  for (const entry of entries) {
    const week = isoWeekId(entry.date);
    if (!weeks.has(week)) weeks.set(week, new Map());
    const byTopic = weeks.get(week);
    if (!byTopic.has(entry.topic)) byTopic.set(entry.topic, []);
    byTopic.get(entry.topic).push(entry);
  }
  return weeks;
}

function buildTopicRollup(topic, entries) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  // One framing line per day: the spine of "what happened", newest first.
  const framings = sorted
    .filter((entry) => entry.takeaway)
    .map((entry) => ({ date: entry.date, takeaway: entry.takeaway }));

  // A spread of the week's highlights, one per day before doubling up, so a
  // single busy digest doesn't crowd out the rest of the week.
  const highlights = [];
  for (let round = 0; highlights.length < MAX_WEEK_HIGHLIGHTS; round += 1) {
    let added = false;
    for (const entry of sorted) {
      const highlight = entry.highlights?.[round];
      if (highlight) {
        highlights.push({ date: entry.date, text: highlight });
        added = true;
        if (highlights.length >= MAX_WEEK_HIGHLIGHTS) break;
      }
    }
    if (!added) break;
  }

  return {
    topic,
    digestCount: sorted.length,
    dates: sorted.map((entry) => entry.date),
    framings,
    highlights,
  };
}

async function buildRollupIndex(locale) {
  const weeks = groupByWeekAndTopic(await readIndex(locale));

  const weekEntries = [...weeks.entries()]
    .sort((a, b) => b[0].localeCompare(a[0])) // week id desc
    .map(([weekId, byTopic]) => {
      const { weekStart, weekEnd } = isoWeekRange(weekId);
      const topics = [...byTopic.entries()]
        .sort((a, b) => TOPIC_ORDER.indexOf(a[0]) - TOPIC_ORDER.indexOf(b[0]))
        .map(([topic, entries]) => buildTopicRollup(topic, entries));

      return {
        weekId,
        weekStart,
        weekEnd,
        digestCount: topics.reduce((sum, t) => sum + t.digestCount, 0),
        topics,
      };
    });

  return { version: 1, locale, generatedAt: new Date().toISOString(), weeks: weekEntries };
}

await mkdir(OUTPUT_DIR, { recursive: true });

for (const locale of LOCALES) {
  const index = await buildRollupIndex(locale);
  const outPath = path.join(OUTPUT_DIR, OUTPUT_FILE[locale]);
  await writeFile(outPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  console.log(`${locale}: ${index.weeks.length} weeks → ${path.relative(PROJECT_ROOT, outPath)}`);
}
