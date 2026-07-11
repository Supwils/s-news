#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  countArticles,
  countSections,
  extractDescription,
  extractHighlights,
  extractTakeaway,
  extractTitle,
  getReadingMinutes,
} from "../lib/markdown-extract.mjs";
import { digestDateFromFileName, LOCALES, TOPIC_FOLDERS } from "./news-topics.mjs";

// Resolve relative to this script, not the caller's CWD — robust against hooks
// or wrappers that cd elsewhere before exec. (build-search-index.mjs already
// did this; an index written to the wrong .generated/ is an empty site.)
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NEWS_ROOT = path.join(PROJECT_ROOT, "NEWS");
const OUTPUT_DIR = path.join(PROJECT_ROOT, ".generated");

const TOPIC_ORDER = TOPIC_FOLDERS;

function sortEntries(entries) {
  return [...entries].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }
    return TOPIC_ORDER.indexOf(left.topic) - TOPIC_ORDER.indexOf(right.topic);
  });
}

async function readDirectorySafe(directory) {
  try {
    return await readdir(directory);
  } catch {
    return [];
  }
}

async function buildIndex(locale, skipped) {
  const isEn = locale === "en";
  const fallbackTitle = isEn ? "Untitled digest" : "未命名日报";
  const fallbackDesc = isEn ? "No summary for this digest." : "本日报暂无摘要说明。";

  const entries = [];

  for (const topic of TOPIC_FOLDERS) {
    const directory = path.join(NEWS_ROOT, topic, locale);
    const files = (await readDirectorySafe(directory)).filter((file) => file.endsWith(".md"));

    for (const fileName of files) {
      const date = digestDateFromFileName(fileName);
      if (!date) {
        // A file without a YYYY-MM-DD_ prefix would otherwise become an entry
        // with date "draft.md", a nonsense archiveMonth, and a 404ing detail URL.
        skipped.push(path.posix.join("NEWS", topic, locale, fileName));
        continue;
      }

      const filePath = path.join(directory, fileName);
      const content = await readFile(filePath, "utf8");

      const title = extractTitle(content, fallbackTitle);
      const description = extractDescription(content, fallbackDesc);
      const takeaway = extractTakeaway(content, locale);
      const highlights = extractHighlights(content, locale);

      entries.push({
        topic,
        date,
        fileName,
        relativePath: path.posix.join("NEWS", topic, locale, fileName),
        archiveMonth: date.slice(0, 7),
        title,
        description,
        articleCount: countArticles(content),
        sectionCount: countSections(content),
        readingMinutes: getReadingMinutes(content),
        highlights,
        takeaway,
        searchText: [title, description, takeaway ?? "", ...highlights].join(" ").toLowerCase(),
      });
    }
  }

  return {
    version: 2,
    locale,
    generatedAt: new Date().toISOString(),
    entries: sortEntries(entries),
  };
}

await mkdir(OUTPUT_DIR, { recursive: true });

const skipped = [];
const [zhIndex, enIndex] = await Promise.all([
  buildIndex(LOCALES[0], skipped),
  buildIndex(LOCALES[1], skipped),
]);

for (const file of skipped) {
  console.warn(`skipped (not a YYYY-MM-DD_*.md digest): ${file}`);
}

// An empty index means NEWS/ was unreadable or missing. Writing it and exiting 0
// ships a site with no content and no failing signal.
if (zhIndex.entries.length === 0) {
  console.error(`No digests found under ${NEWS_ROOT}. Refusing to write an empty index.`);
  process.exit(1);
}

const zhPath = path.join(OUTPUT_DIR, "news-index.json");
const enPath = path.join(OUTPUT_DIR, "news-index-en.json");

await Promise.all([
  writeFile(zhPath, `${JSON.stringify(zhIndex, null, 2)}\n`, "utf8"),
  writeFile(enPath, `${JSON.stringify(enIndex, null, 2)}\n`, "utf8"),
]);

console.log(`zh: ${zhIndex.entries.length} entries → ${path.relative(PROJECT_ROOT, zhPath)}`);
console.log(`en: ${enIndex.entries.length} entries → ${path.relative(PROJECT_ROOT, enPath)}`);
