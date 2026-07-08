import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

import { getCopy, type Locale } from "@/data/copy";
import {
  countArticles,
  countSections,
  extractDescription,
  extractHighlights,
  extractTakeaway,
  extractTitle,
  getReadingMinutes,
} from "@/lib/markdown-extract.mjs";
import { getTopicMeta, TOPICS, type TopicKey, type TopicMeta } from "@/lib/news-meta";

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

type IndexedNewsPreview = NewsPreview & {
  relativePath: string;
  archiveMonth: string;
};

type NewsIndex = {
  version: number;
  generatedAt: string;
  entries: IndexedNewsPreview[];
};

const TOPIC_ORDER = TOPICS.map((topic) => topic.key);
const NEWS_ROOT = path.join(process.cwd(), "NEWS");
const NEWS_INDEX_PATHS: Record<Locale, string> = {
  zh: path.join(process.cwd(), ".generated", "news-index.json"),
  en: path.join(process.cwd(), ".generated", "news-index-en.json"),
};

const indexCache: Partial<Record<Locale, { mtimeMs: number; data: NewsIndex }>> = {};

async function readDirectorySafe(directory: string) {
  try {
    return await fs.readdir(directory);
  } catch {
    return [];
  }
}

function sortEntries<T extends { date: string; topic: TopicKey }>(entries: T[]) {
  return [...entries].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }

    return TOPIC_ORDER.indexOf(left.topic) - TOPIC_ORDER.indexOf(right.topic);
  });
}

type NewsFallbacks = { untitled: string; noDescription: string };

function getRelativeNewsPath(topic: TopicMeta, locale: Locale, fileName: string) {
  return path.posix.join("NEWS", topic.folder, locale, fileName);
}

function resolveRelativeNewsPath(relativePath: string) {
  // `relativePath` is always rooted at the NEWS directory (see getRelativeNewsPath),
  // e.g. "NEWS/general/zh/2026-07-06_….md". Resolve it under the NEWS_ROOT constant
  // instead of process.cwd() so Turbopack scopes its static file-trace glob to
  // NEWS/** rather than the entire project root (which would pull node_modules, .git,
  // .next, etc. into the serverless bundle — the "overly broad pattern" warning).
  const segments = relativePath.split("/");
  const withinNews = segments[0] === "NEWS" ? segments.slice(1) : segments;
  return path.join(NEWS_ROOT, ...withinNews);
}

function toIndexedPreview(entry: NewsEntry, topic: TopicMeta, locale: Locale): IndexedNewsPreview {
  return {
    ...toNewsPreview(entry),
    relativePath: getRelativeNewsPath(topic, locale, entry.fileName),
    archiveMonth: entry.date.slice(0, 7),
  };
}

function fromIndexedPreview(entry: IndexedNewsPreview): NewsPreview {
  const { relativePath: _relativePath, archiveMonth: _archiveMonth, ...preview } = entry;
  return preview;
}

// Request-scoped cache (via React.cache) on top of a long-lived process cache.
// React.cache dedupes calls within a single render; the mtime-keyed Map
// survives across renders inside the same Node process and avoids re-reading
// the index file when it hasn't changed.
const loadNewsIndex = cache(async (locale: Locale = "zh"): Promise<NewsIndex | null> => {
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
  } catch {
    indexCache[locale] = undefined;
    return null;
  }
});

async function readTopicEntries(topic: TopicMeta, fallbacks: NewsFallbacks, locale: Locale = "zh") {
  const directory = path.join(NEWS_ROOT, topic.folder, locale);
  const files = (await readDirectorySafe(directory)).filter((file) => file.endsWith(".md"));

  const entries = await Promise.all(
    files.map(async (fileName) => {
      const filePath = path.join(directory, fileName);
      const content = await fs.readFile(filePath, "utf8");
      const date = fileName.slice(0, 10);

      const entry: NewsEntry = {
        topic: topic.key,
        date,
        fileName,
        filePath,
        content,
        title: extractTitle(content, fallbacks.untitled),
        description: extractDescription(content, fallbacks.noDescription),
        articleCount: countArticles(content),
        sectionCount: countSections(content),
        readingMinutes: getReadingMinutes(content),
        highlights: extractHighlights(content, locale),
        takeaway: extractTakeaway(content, locale),
      };

      return entry;
    }),
  );

  return sortEntries(entries);
}

async function readEntryFromTopicByDate(topic: TopicMeta, date: string, fallbacks: NewsFallbacks, locale: Locale = "zh") {
  const directory = path.join(NEWS_ROOT, topic.folder, locale);
  const files = await readDirectorySafe(directory);
  const fileName = files.find((file) => file.startsWith(`${date}_`) && file.endsWith(".md"));

  if (!fileName) {
    return null;
  }

  const filePath = path.join(directory, fileName);
  const content = await fs.readFile(filePath, "utf8");

  return {
    topic: topic.key,
    date,
    fileName,
    filePath,
    content,
    title: extractTitle(content, fallbacks.untitled),
    description: extractDescription(content, fallbacks.noDescription),
    articleCount: countArticles(content),
    sectionCount: countSections(content),
    readingMinutes: getReadingMinutes(content),
    highlights: extractHighlights(content, locale),
    takeaway: extractTakeaway(content, locale),
  } satisfies NewsEntry;
}

export async function getAllNewsEntries(locale: Locale = "zh") {
  const fallbacks = getCopy(locale).news;
  const nested = await Promise.all(
    TOPICS.map((topic) => readTopicEntries(getTopicMeta(topic.key, locale)!, fallbacks, locale)),
  );
  return sortEntries(nested.flat());
}

export async function getAllNewsPreviews(locale: Locale = "zh") {
  const index = await loadNewsIndex(locale);
  if (index) {
    return index.entries.map(fromIndexedPreview);
  }

  const entries = await getAllNewsEntries(locale);
  return entries.map(toNewsPreview);
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

export async function getEntriesByTopic(topic: TopicKey, locale: Locale = "zh") {
  const meta = getTopicMeta(topic, locale);
  if (!meta) {
    return [];
  }

  const fallbacks = getCopy(locale).news;
  return readTopicEntries(meta, fallbacks, locale);
}

export async function getEntryPreviewsByTopic(topic: TopicKey, locale: Locale = "zh") {
  const index = await loadNewsIndex(locale);
  if (index) {
    return index.entries
      .filter((entry) => entry.topic === topic)
      .map(fromIndexedPreview);
  }

  const entries = await getEntriesByTopic(topic, locale);
  return entries.map(toNewsPreview);
}

export async function getEntryPreviewsByMonth(month: string, locale: Locale = "zh") {
  const index = await loadNewsIndex(locale);
  if (index) {
    return index.entries
      .filter((entry) => entry.archiveMonth === month)
      .map(fromIndexedPreview);
  }

  const entries = await getAllNewsEntries(locale);
  return entries
    .filter((entry) => entry.date.startsWith(`${month}-`))
    .map(toNewsPreview);
}

export async function getArchiveMonths(locale: Locale = "zh") {
  const index = await loadNewsIndex(locale);
  if (index) {
    return [...new Set(index.entries.map((entry) => entry.archiveMonth))].sort((left, right) => right.localeCompare(left));
  }

  const entries = await getAllNewsPreviews(locale);
  return [...new Set(entries.map((entry) => entry.date.slice(0, 7)))].sort((left, right) => right.localeCompare(left));
}

export async function getNewsEntry(topic: TopicKey, date: string, locale: Locale = "zh") {
  const meta = getTopicMeta(topic, locale);
  if (!meta) {
    return null;
  }

  const index = await loadNewsIndex(locale);
  const indexedEntry = index?.entries.find((entry) => entry.topic === topic && entry.date === date);
  if (indexedEntry) {
    const filePath = resolveRelativeNewsPath(indexedEntry.relativePath);
    const content = await fs.readFile(filePath, "utf8");
    return {
      ...fromIndexedPreview(indexedEntry),
      filePath,
      content,
    } satisfies NewsEntry;
  }

  const fallbacks = getCopy(locale).news;
  return readEntryFromTopicByDate(meta, date, fallbacks, locale);
}

export async function getAllNewsParams() {
  const previews = await getAllNewsPreviews();
  return previews.map((entry) => ({
    topic: entry.topic,
    date: entry.date,
  }));
}

export async function getTopicsWithNewsForDate(date: string, locale: Locale = "zh"): Promise<TopicKey[]> {
  const index = await loadNewsIndex(locale);
  if (index) {
    return sortEntries(
      index.entries
        .filter((entry) => entry.date === date)
        .map((entry) => ({ topic: entry.topic, date: entry.date })),
    ).map((entry) => entry.topic);
  }

  const results = await Promise.all(
    TOPICS.map(async (t) => ({ key: t.key, has: !!(await getNewsEntry(t.key, date, locale)) })),
  );
  return results.filter((r) => r.has).map((r) => r.key);
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

export async function getIndexedNewsPreviewsForBuild(locale: Locale = "zh") {
  const fallbacks = getCopy(locale).news;
  const nested = await Promise.all(
    TOPICS.map(async (topicDef) => {
      const topic = getTopicMeta(topicDef.key, locale)!;
      const entries = await readTopicEntries(topic, fallbacks, locale);
      return entries.map((entry) => toIndexedPreview(entry, topic, locale));
    }),
  );

  return sortEntries(nested.flat());
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
