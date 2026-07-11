import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

import { type Locale } from "@/data/copy";
import { getTopicMeta, TOPICS, type TopicKey } from "@/lib/news-meta";

/**
 * Everything here answers from `.generated/news-index*.json` and never opens a
 * markdown file. That is deliberate: `lib/news-content.ts` owns the only code
 * that joins a dynamic path under `NEWS/`, and Turbopack traces that dynamic
 * join by pulling all 1770 digests into the bundle of every route that can
 * reach it. Keeping the reader in a separate module means only the three routes
 * that actually render an article body pay for the corpus.
 *
 * Consequence: the index must exist. It is built by `predev`, `prebuild`, and
 * `prestart`, and `build-news-index.mjs` refuses to write an empty one — so a
 * missing index is a broken setup, and failing loudly beats silently falling
 * back to a filesystem scan.
 */

export type NewsEntry = {
  topic: TopicKey;
  date: string;
  fileName: string;
  filePath: string;
  title: string;
  description: string;
  content: string;
  articleCount: number;
  sectionCount: number;
  readingMinutes: number;
  highlights: string[];
  takeaway?: string;
};

export type NewsPreview = Omit<NewsEntry, "content" | "filePath"> & {
  searchText: string;
};

/**
 * What a card actually renders. `searchText` is a derived blob only the search
 * surfaces use; list pages must never serialize it into their RSC payload.
 */
export type NewsCardEntry = Omit<NewsPreview, "searchText">;

export function toCardEntry({ searchText: _searchText, ...entry }: NewsPreview): NewsCardEntry {
  return entry;
}

export type IndexedNewsPreview = NewsPreview & {
  relativePath: string;
  archiveMonth: string;
};

type NewsIndex = {
  version: number;
  generatedAt: string;
  entries: IndexedNewsPreview[];
};

const TOPIC_ORDER = TOPICS.map((topic) => topic.key);
const NEWS_INDEX_PATHS: Record<Locale, string> = {
  zh: path.join(process.cwd(), ".generated", "news-index.json"),
  en: path.join(process.cwd(), ".generated", "news-index-en.json"),
};

const indexCache: Partial<Record<Locale, { mtimeMs: number; data: NewsIndex }>> = {};

function sortEntries<T extends { date: string; topic: TopicKey }>(entries: T[]) {
  return [...entries].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }

    return TOPIC_ORDER.indexOf(left.topic) - TOPIC_ORDER.indexOf(right.topic);
  });
}

function fromIndexedPreview(entry: IndexedNewsPreview): NewsPreview {
  const { relativePath: _relativePath, archiveMonth: _archiveMonth, ...preview } = entry;
  return preview;
}

// Request-scoped cache (via React.cache) on top of a long-lived process cache.
// React.cache dedupes calls within a single render; the mtime-keyed Map
// survives across renders inside the same Node process and avoids re-reading
// the index file when it hasn't changed.
const loadNewsIndex = cache(async (locale: Locale = "zh"): Promise<NewsIndex> => {
  const indexPath = NEWS_INDEX_PATHS[locale];
  try {
    const stat = await fs.stat(indexPath);
    const cached = indexCache[locale];
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.data;
    }

    const raw = await fs.readFile(indexPath, "utf8");
    const parsed = JSON.parse(raw) as NewsIndex;
    const data: NewsIndex = {
      ...parsed,
      entries: sortEntries(parsed.entries),
    };
    indexCache[locale] = { mtimeMs: stat.mtimeMs, data };
    return data;
  } catch (cause) {
    indexCache[locale] = undefined;
    throw new Error(
      `Missing or unreadable news index at ${indexPath}. Run \`pnpm build:news-index\` (predev/prebuild do this for you).`,
      { cause },
    );
  }
});

/** The raw indexed entry, including the fields the previews drop. */
export async function findIndexedEntry(topic: TopicKey, date: string, locale: Locale = "zh") {
  const index = await loadNewsIndex(locale);
  return index.entries.find((entry) => entry.topic === topic && entry.date === date) ?? null;
}

export async function getAllNewsPreviews(locale: Locale = "zh") {
  const index = await loadNewsIndex(locale);
  return index.entries.map(fromIndexedPreview);
}

export type HomePreviews = {
  /**
   * A slim union of previews — the latest few overall (covers the "today" and
   * "yesterday" sections plus the search modal's default list) and the latest
   * per topic (covers the `?topic=` filtered view). Far smaller than the full
   * archive, which would otherwise be serialized into the home page payload.
   */
  entries: NewsPreview[];
  /** True per-topic counts over the whole archive (chips show these). */
  topicCounts: Partial<Record<TopicKey, number>>;
  /** True total count over the whole archive. */
  totalCount: number;
};

const HOME_OVERALL_LIMIT = 30;
const HOME_PER_TOPIC_LIMIT = 11;

export async function getHomePreviews(locale: Locale = "zh"): Promise<HomePreviews> {
  const all = await getAllNewsPreviews(locale); // sorted date-desc, then topic order
  const totalCount = all.length;

  const topicCounts: Partial<Record<TopicKey, number>> = {};
  const perTopicSeen: Partial<Record<TopicKey, number>> = {};
  const keep = new Set<string>();
  const keyOf = (entry: NewsPreview) => `${entry.topic}:${entry.date}`;

  all.forEach((entry, index) => {
    topicCounts[entry.topic] = (topicCounts[entry.topic] ?? 0) + 1;

    const seen = perTopicSeen[entry.topic] ?? 0;
    if (index < HOME_OVERALL_LIMIT || seen < HOME_PER_TOPIC_LIMIT) {
      keep.add(keyOf(entry));
    }
    if (seen < HOME_PER_TOPIC_LIMIT) {
      perTopicSeen[entry.topic] = seen + 1;
    }
  });

  // Filtering `all` preserves the original date-desc ordering.
  const entries = all.filter((entry) => keep.has(keyOf(entry)));

  return { entries, topicCounts, totalCount };
}

export async function getEntryPreviewsByTopic(topic: TopicKey, locale: Locale = "zh") {
  const index = await loadNewsIndex(locale);
  return index.entries.filter((entry) => entry.topic === topic).map(fromIndexedPreview);
}

export async function getEntryPreviewsByMonth(month: string, locale: Locale = "zh") {
  const index = await loadNewsIndex(locale);
  return index.entries.filter((entry) => entry.archiveMonth === month).map(fromIndexedPreview);
}

export async function getArchiveMonths(locale: Locale = "zh") {
  const index = await loadNewsIndex(locale);
  return [...new Set(index.entries.map((entry) => entry.archiveMonth))].sort((left, right) =>
    right.localeCompare(left),
  );
}

export async function getAllNewsParams(locale: Locale = "zh") {
  const previews = await getAllNewsPreviews(locale);
  return previews.map((entry) => ({
    topic: entry.topic,
    date: entry.date,
  }));
}

export async function getTopicsWithNewsForDate(date: string, locale: Locale = "zh"): Promise<TopicKey[]> {
  const index = await loadNewsIndex(locale);
  return sortEntries(
    index.entries
      .filter((entry) => entry.date === date)
      .map((entry) => ({ topic: entry.topic, date: entry.date })),
  ).map((entry) => entry.topic);
}

export function groupEntriesByDate(entries: NewsEntry[]) {
  return sortEntries(entries).reduce<
    Array<{
      date: string;
      entries: NewsEntry[];
    }>
  >((groups, entry) => {
    const current = groups.at(-1);

    if (!current || current.date !== entry.date) {
      groups.push({ date: entry.date, entries: [entry] });
      return groups;
    }

    current.entries.push(entry);
    return groups;
  }, []);
}

export function toNewsPreview(entry: NewsEntry): NewsPreview {
  return {
    topic: entry.topic,
    date: entry.date,
    fileName: entry.fileName,
    title: entry.title,
    description: entry.description,
    articleCount: entry.articleCount,
    sectionCount: entry.sectionCount,
    readingMinutes: entry.readingMinutes,
    highlights: entry.highlights,
    takeaway: entry.takeaway,
    searchText: [
      entry.title,
      entry.description,
      entry.takeaway ?? "",
      ...entry.highlights,
    ]
      .join(" ")
      .toLowerCase(),
  };
}

export function groupPreviewsByDate(entries: NewsPreview[]) {
  return sortEntries(entries).reduce<
    Array<{
      date: string;
      entries: NewsPreview[];
    }>
  >((groups, entry) => {
    const current = groups.at(-1);

    if (!current || current.date !== entry.date) {
      groups.push({ date: entry.date, entries: [entry] });
      return groups;
    }

    current.entries.push(entry);
    return groups;
  }, []);
}

export function searchEntries(
  entries: NewsPreview[],
  query: string,
  topic: TopicKey | "all",
  locale: Locale = "zh",
) {
  const normalized = query.trim().toLowerCase();

  return entries.filter((entry) => {
    if (topic !== "all" && entry.topic !== topic) {
      return false;
    }

    if (!normalized) {
      return true;
    }

    const haystack = `${entry.searchText} ${(getTopicMeta(entry.topic, locale)?.label ?? "").toLowerCase()}`;

    return haystack.includes(normalized);
  });
}

const MONTH_NAMES_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDisplayDate(date: string, locale: Locale = "zh") {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    return date;
  }

  if (locale === "en") {
    return `${MONTH_NAMES_EN[month - 1]} ${day}, ${year}`;
  }
  return `${year}年${month}月${day}日`;
}
