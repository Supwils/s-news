import { promises as fs } from "node:fs";
import path from "node:path";

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

function extractTitle(content: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "未命名日报";
}

function extractDescription(content: string) {
  return content.match(/^>\s+(.+)$/m)?.[1]?.trim() ?? "本日报暂无摘要说明。";
}

function extractTakeaway(content: string) {
  const match = content.match(/\*\*(总体定性|今日定性)：\*\*\s*(.+)/);
  return match?.[2]?.trim();
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

async function readTopicEntries(topic: TopicMeta) {
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
        title: extractTitle(content),
        description: extractDescription(content),
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

export async function getAllNewsEntries() {
  const nested = await Promise.all(TOPICS.map((topic) => readTopicEntries(topic)));
  return sortEntries(nested.flat());
}

export async function getAllNewsPreviews() {
  const entries = await getAllNewsEntries();
  return entries.map(toNewsPreview);
}

export async function getEntriesByTopic(topic: TopicKey) {
  const meta = getTopicMeta(topic);
  if (!meta) {
    return [];
  }

  return readTopicEntries(meta);
}

export async function getEntryPreviewsByTopic(topic: TopicKey) {
  const entries = await getEntriesByTopic(topic);
  return entries.map(toNewsPreview);
}

export async function getNewsEntry(topic: TopicKey, date: string) {
  const entries = await getEntriesByTopic(topic);
  return entries.find((entry) => entry.date === date) ?? null;
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

export function searchEntries(entries: NewsPreview[], query: string, topic: TopicKey | "all") {
  const normalized = query.trim().toLowerCase();

  return entries.filter((entry) => {
    if (topic !== "all" && entry.topic !== topic) {
      return false;
    }

    if (!normalized) {
      return true;
    }

    const haystack = `${entry.searchText} ${(getTopicMeta(entry.topic)?.label ?? "").toLowerCase()}`;

    return haystack.includes(normalized);
  });
}

export function formatDisplayDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    return date;
  }

  return `${year}年${month}月${day}日`;
}
