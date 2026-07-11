#!/usr/bin/env node

/**
 * Cross-topic event index.
 *
 * The same story (a strike on Iran, an OPEC+ decision) lands in several topics'
 * digests as unrelated `### ` blocks; nothing connects them, so the site reads
 * as ten parallel newspapers. This clusters article blocks into events —
 * mechanically, no model call — using the signals calibrated in events-lib.mjs:
 * same-day cross-topic text similarity, shared source URLs, and day-to-day
 * continuation.
 *
 * Reads NEWS/ markdown at BUILD time (scripts are not traced into any route
 * bundle) and writes `.generated/events-index{,-en}.json`, which is all the
 * /events routes ever read — the "only three routes carry the corpus" invariant
 * is untouched.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { clusterEvents, eventId, eventTitle, splitArticleBlocks } from "./events-lib.mjs";
import { LOCALES, TOPIC_FOLDERS } from "./news-topics.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, ".generated");

const INDEX_FILE = { zh: "news-index.json", en: "news-index-en.json" };
const OUTPUT_FILE = { zh: "events-index.json", en: "events-index-en.json" };

const TOPIC_ORDER = TOPIC_FOLDERS;
const VERBOSE = process.argv.includes("--report");

async function collectBlocks(locale) {
  const index = JSON.parse(
    await readFile(path.join(OUTPUT_DIR, INDEX_FILE[locale]), "utf8"),
  );
  const blocks = [];
  for (const entry of index.entries) {
    const content = await readFile(path.join(PROJECT_ROOT, entry.relativePath), "utf8");
    for (const block of splitArticleBlocks(content)) {
      blocks.push({ ...block, topic: entry.topic, date: entry.date });
    }
  }
  return blocks;
}

function toEvent(members) {
  const sorted = [...members].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      TOPIC_ORDER.indexOf(a.topic) - TOPIC_ORDER.indexOf(b.topic) ||
      a.index - b.index,
  );
  const dates = [...new Set(sorted.map((m) => m.date))].sort();
  const topics = [...new Set(sorted.map((m) => m.topic))].sort(
    (a, b) => TOPIC_ORDER.indexOf(a) - TOPIC_ORDER.indexOf(b),
  );
  return {
    id: eventId(sorted),
    title: eventTitle(sorted),
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
    dayCount: dates.length,
    topics,
    memberCount: sorted.length,
    members: sorted.map((m) => ({
      topic: m.topic,
      date: m.date,
      title: m.title,
      summaryLead: m.summaryLead,
    })),
  };
}

async function buildEventsIndex(locale) {
  const blocks = await collectBlocks(locale);
  const clusters = clusterEvents(blocks);
  const events = clusters
    .map(toEvent)
    // Only cross-topic events are published: the product value is "one story
    // through several topics' lenses". A single-topic chain is already visible
    // on its topic page and would only dilute the events list.
    .filter((event) => event.topics.length > 1)
    // Newest activity first; richer events win ties.
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.memberCount - a.memberCount);

  return {
    version: 1,
    locale,
    generatedAt: new Date().toISOString(),
    blockCount: blocks.length,
    events,
  };
}

await mkdir(OUTPUT_DIR, { recursive: true });

for (const locale of LOCALES) {
  const started = Date.now();
  const index = await buildEventsIndex(locale);
  const outPath = path.join(OUTPUT_DIR, OUTPUT_FILE[locale]);
  await writeFile(outPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");

  const multiDay = index.events.filter((e) => e.dayCount > 1).length;
  console.log(
    `${locale}: ${index.events.length} cross-topic events (${multiDay} multi-day) ` +
      `from ${index.blockCount} blocks in ${((Date.now() - started) / 1000).toFixed(1)}s → ${path.relative(PROJECT_ROOT, outPath)}`,
  );

  if (VERBOSE) {
    console.log(`  top events by span (${locale}):`);
    const bySpan = [...index.events].sort(
      (a, b) => b.dayCount - a.dayCount || b.memberCount - a.memberCount,
    );
    for (const event of bySpan.slice(0, 10)) {
      console.log(
        `    ${event.firstDate}..${event.lastDate} ×${event.memberCount} [${event.topics.join(",")}] ${event.title.slice(0, 48)}`,
      );
    }
  }
}
