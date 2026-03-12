import { promises as fs } from "node:fs";
import path from "node:path";

import { getCopy, type Locale } from "@/data/copy";
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

const TOPIC_ORDER = TOPICS.map((topic) => topic.key);
const NEWS_ROOT = path.join(process.cwd(), "NEWS");

function countMatches(content: string, pattern: RegExp) {
  return content.match(pattern)?.length ?? 0;
}

function extractTitle(content: string, fallback: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

function extractDescription(content: string, fallback: string) {
  return content.match(/^>\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

function extractTakeaway(content: string) {
  // 优先：带标签的总体定性/今日定性（支持冒号在粗体内或外）
  const match = content.match(/\*\*(总体定性|今日定性)(：\*\*|\*\*：)\s*(.+)/);
  if (match?.[3]) return match[3].trim();

  // 回退：取 ## 今日小结 下最后一段非 bullet 的段落作为定性
  const summaryHeading = content.match(/^##\s+今日小结$/m);
  if (summaryHeading?.index === undefined) return undefined;
  const summaryBlock = content.slice(summaryHeading.index).split(/\n---/)[0] ?? "";
  const paragraphs = summaryBlock.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const lastNonBullet = paragraphs.filter((p) => !p.startsWith("- ")).pop();
  return lastNonBullet?.trim() || undefined;
}

function extractHighlights(content: string) {
  const summaryHeading = content.match(/^##\s+今日小结$/m);
  if (summaryHeading?.index === undefined) {
    return [];
  }

  const summaryBlock = content.slice(summaryHeading.index).split(/\n---/)[0] ?? "";

  return summaryBlock
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim())
    .slice(0, 4);
}

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

function getReadingMinutes(content: string) {
  return Math.max(3, Math.ceil(content.replace(/\s+/g, "").length / 900));
}

type NewsFallbacks = { untitled: string; noDescription: string };

async function readTopicEntries(topic: TopicMeta, fallbacks: NewsFallbacks) {
  const directory = path.join(NEWS_ROOT, topic.folder);
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
        articleCount: countMatches(content, /^###\s+/gm),
        sectionCount: countMatches(content, /^##\s+/gm),
        readingMinutes: getReadingMinutes(content),
        highlights: extractHighlights(content),
        takeaway: extractTakeaway(content),
      };

      return entry;
    }),
  );

  return sortEntries(entries);
}

export async function getAllNewsEntries(locale: Locale = "zh") {
  const fallbacks = getCopy(locale).news;
  const nested = await Promise.all(
    TOPICS.map((topic) => readTopicEntries(getTopicMeta(topic.key, locale)!, fallbacks)),
  );
  return sortEntries(nested.flat());
}

export async function getAllNewsPreviews(locale: Locale = "zh") {
  const entries = await getAllNewsEntries(locale);
  return entries.map(toNewsPreview);
}

export async function getEntriesByTopic(topic: TopicKey, locale: Locale = "zh") {
  const meta = getTopicMeta(topic, locale);
  if (!meta) {
    return [];
  }

  const fallbacks = getCopy(locale).news;
  return readTopicEntries(meta, fallbacks);
}

export async function getEntryPreviewsByTopic(topic: TopicKey, locale: Locale = "zh") {
  const entries = await getEntriesByTopic(topic, locale);
  return entries.map(toNewsPreview);
}

export async function getNewsEntry(topic: TopicKey, date: string, locale: Locale = "zh") {
  const entries = await getEntriesByTopic(topic, locale);
  return entries.find((entry) => entry.date === date) ?? null;
}

/** Returns topic keys that have a news entry for the given date (same-day quick links). */
export async function getTopicsWithNewsForDate(date: string, locale: Locale = "zh"): Promise<TopicKey[]> {
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
