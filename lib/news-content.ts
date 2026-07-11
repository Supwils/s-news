import { promises as fs } from "node:fs";
import path from "node:path";

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
import { findIndexedEntry, type NewsEntry } from "@/lib/news";
import { getTopicMeta, type TopicKey, type TopicMeta } from "@/lib/news-meta";

/**
 * The only module that opens a markdown file.
 *
 * `resolveRelativeNewsPath` and `readEntryFromTopicByDate` join a dynamic path
 * under `NEWS/`, which Turbopack can only satisfy by tracing all 1770 digests
 * (~31 MB) into the bundle of every route that transitively imports this file.
 * Keep that list to the three routes that render an article body — the detail
 * pages and `/api/news/[topic]/[date]`. Everything else reads the generated
 * index via `lib/news.ts` and stays slim.
 */

const NEWS_ROOT = path.join(process.cwd(), "NEWS");

type NewsFallbacks = { untitled: string; noDescription: string };

function resolveRelativeNewsPath(relativePath: string) {
  // `relativePath` is rooted at the NEWS directory, e.g.
  // "NEWS/general/zh/2026-07-06_….md". Resolving it under NEWS_ROOT rather than
  // process.cwd() scopes Turbopack's file-trace glob to NEWS/** instead of the
  // entire project root.
  const segments = relativePath.split("/");
  if (segments.includes("..")) {
    throw new Error(`Refusing to resolve news path outside NEWS/: ${relativePath}`);
  }
  const withinNews = segments[0] === "NEWS" ? segments.slice(1) : segments;
  return path.join(NEWS_ROOT, ...withinNews);
}

function buildEntry(
  topic: TopicKey,
  date: string,
  fileName: string,
  filePath: string,
  content: string,
  fallbacks: NewsFallbacks,
  locale: Locale,
): NewsEntry {
  return {
    topic,
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
}

/** Directory scan for a digest the index doesn't know about (or no longer matches). */
async function readEntryFromTopicByDate(
  topic: TopicMeta,
  date: string,
  fallbacks: NewsFallbacks,
  locale: Locale,
) {
  const directory = path.join(NEWS_ROOT, topic.folder, locale);

  let files: string[];
  try {
    files = await fs.readdir(directory);
  } catch {
    return null;
  }

  const fileName = files.find((file) => file.startsWith(`${date}_`) && file.endsWith(".md"));
  if (!fileName) {
    return null;
  }

  const filePath = path.join(directory, fileName);
  const content = await fs.readFile(filePath, "utf8");
  return buildEntry(topic.key, date, fileName, filePath, content, fallbacks, locale);
}

export async function getNewsEntry(topic: TopicKey, date: string, locale: Locale = "zh") {
  const meta = getTopicMeta(topic, locale);
  if (!meta) {
    return null;
  }

  const indexedEntry = await findIndexedEntry(topic, date, locale);
  if (indexedEntry) {
    try {
      const filePath = resolveRelativeNewsPath(indexedEntry.relativePath);
      const content = await fs.readFile(filePath, "utf8");
      const { relativePath: _relativePath, archiveMonth: _archiveMonth, searchText: _searchText, ...preview } =
        indexedEntry;
      return { ...preview, filePath, content } satisfies NewsEntry;
    } catch {
      // The index outlived the file (deleted or renamed since the last build).
      // Fall through to a directory scan so the page 404s instead of 500ing.
    }
  }

  const fallbacks = getCopy(locale).news;
  return readEntryFromTopicByDate(meta, date, fallbacks, locale);
}
