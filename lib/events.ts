import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

import { type Locale } from "@/data/copy";
import type { TopicKey } from "@/lib/news-meta";

/**
 * Reads the cross-topic events index and nothing else — no markdown is opened
 * here, so the /events routes stay out of the three corpus-bearing routes (see
 * verify-build-trace.mjs). The index is produced by scripts/build-events.mjs.
 *
 * Like the rollup index (and unlike the news index), a missing file is
 * non-fatal: prebuild always regenerates it, so degrade to "no events".
 */

export type EventMember = {
  topic: TopicKey;
  date: string;
  title: string;
  summaryLead: string;
};

export type NewsEvent = {
  id: string;
  title: string;
  firstDate: string;
  lastDate: string;
  dayCount: number;
  topics: TopicKey[];
  memberCount: number;
  members: EventMember[];
};

type EventsIndex = {
  version: number;
  generatedAt: string;
  blockCount: number;
  events: NewsEvent[];
};

const EVENTS_INDEX_PATHS: Record<Locale, string> = {
  zh: path.join(process.cwd(), ".generated", "events-index.json"),
  en: path.join(process.cwd(), ".generated", "events-index-en.json"),
};

const indexCache: Partial<Record<Locale, { mtimeMs: number; data: EventsIndex }>> = {};

const loadEventsIndex = cache(async (locale: Locale = "zh"): Promise<EventsIndex> => {
  const indexPath = EVENTS_INDEX_PATHS[locale];
  try {
    const stat = await fs.stat(indexPath);
    const cached = indexCache[locale];
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.data;
    }
    const raw = await fs.readFile(indexPath, "utf8");
    const data = JSON.parse(raw) as EventsIndex;
    indexCache[locale] = { mtimeMs: stat.mtimeMs, data };
    return data;
  } catch {
    indexCache[locale] = undefined;
    return { version: 1, generatedAt: "", blockCount: 0, events: [] };
  }
});

export async function getAllEventIds(locale: Locale = "zh") {
  const index = await loadEventsIndex(locale);
  return index.events.map((event) => event.id);
}

/** Slim summaries for the /events list — no members. */
export async function getEventSummaries(locale: Locale = "zh") {
  const index = await loadEventsIndex(locale);
  return index.events.map(({ members: _members, ...summary }) => summary);
}

export async function getEvent(id: string, locale: Locale = "zh") {
  const index = await loadEventsIndex(locale);
  return index.events.find((event) => event.id === id) ?? null;
}

/** Events touching a given digest (topic+date) — for cross-linking from detail pages. */
export async function getEventsForDigest(topic: TopicKey, date: string, locale: Locale = "zh") {
  const index = await loadEventsIndex(locale);
  return index.events.filter((event) =>
    event.members.some((member) => member.topic === topic && member.date === date),
  );
}
