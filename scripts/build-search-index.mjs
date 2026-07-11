#!/usr/bin/env node
/**
 * Build a Pagefind static search index from NEWS/**\/*.md.
 *
 * Output: public/pagefind/  (gitignored static asset, served at /pagefind/*)
 *
 * Each NEWS markdown becomes one Pagefind record with full body indexed
 * (not just title/highlights, unlike .generated/news-index*.json), CJK
 * segmentation handled by Pagefind for zh records, and topic/locale/year/month
 * filters for facets.
 *
 * Failure of this script must NOT block the rest of the build pipeline —
 * package.json's build script wraps this in a tolerant prebuild. The
 * SearchModal degrades to its legacy .includes() path when /pagefind/ assets
 * are missing.
 */

import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createIndex, close as closePagefind } from "pagefind";

import { digestDateFromFileName, LOCALES, TOPIC_FOLDERS } from "./news-topics.mjs";

// Resolve relative to this script, not the caller's CWD — robust against hooks
// or wrappers that cd elsewhere before exec.
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NEWS_ROOT = path.join(PROJECT_ROOT, "NEWS");
const OUT_DIR = path.join(PROJECT_ROOT, "public", "pagefind");

const TOPICS = TOPIC_FOLDERS;

function extractTitle(markdown) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
}

function extractDescription(markdown) {
  return markdown.match(/^>\s+(.+)$/m)?.[1]?.trim() ?? "";
}

// Strip markdown formatting so Pagefind tokenizes prose, not syntax.
// Keep heading text (without #), keep link labels (drop URLs), drop bare URLs.
function markdownToSearchable(markdown) {
  return (
    markdown
      // images: ![alt](url) -> alt
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      // inline links: [text](url) -> text  (URLs are noise for search)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // bare urls — keep the hostname (so "techcrunch" / "bloomberg.com"
      // matches), drop the path. Stop at the first '/' '#' '?' '\s'.
      .replace(/https?:\/\/([^\/\s#?]+)\S*/g, " $1 ")
      // raw html — should never appear in our markdown but defends the
      // dangerouslySetInnerHTML excerpt rendering against future drift.
      .replace(/<[^>]+>/g, " ")
      // bold/italic
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // headings: keep text, drop leading #s
      .replace(/^#{1,6}\s+/gm, "")
      // horizontal rules
      .replace(/^---+\s*$/gm, " ")
      // list markers
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      // blockquote markers
      .replace(/^>\s?/gm, "")
      // code fences and inline code (drop content too — almost always not interesting here)
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      // collapse whitespace
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

async function listMarkdown(topic, locale) {
  const dir = path.join(NEWS_ROOT, topic, locale);
  try {
    const files = await readdir(dir);
    return files.filter((f) => f.endsWith(".md")).map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

function urlFor(topic, date, locale) {
  return locale === "en" ? `/en/news/${topic}/${date}` : `/news/${topic}/${date}`;
}

async function main() {
  const started = Date.now();

  // Clean any prior output so stale records can't survive a topic removal.
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const { index, errors: createErrors } = await createIndex({
    forceLanguage: undefined, // let per-record `language` decide
    keepIndexUrl: false,
  });
  if (createErrors?.length) {
    console.error("pagefind createIndex errors:", createErrors);
  }
  if (!index) {
    throw new Error("pagefind createIndex returned no index");
  }

  let added = 0;
  let skipped = 0;

  for (const topic of TOPICS) {
    for (const locale of LOCALES) {
      const files = await listMarkdown(topic, locale);
      for (const filePath of files) {
        const fileName = path.basename(filePath);
        const date = digestDateFromFileName(fileName);
        if (!date) {
          // Same guard as build-news-index.mjs: a non-digest filename would
          // otherwise become a search record pointing at a URL that 404s.
          skipped++;
          continue;
        }

        const raw = await readFile(filePath, "utf8");

        const title = extractTitle(raw);
        const description = extractDescription(raw);
        const body = markdownToSearchable(raw);

        if (!title || !body) {
          skipped++;
          continue;
        }

        // Use a single addCustomRecord per document — full control over content,
        // meta, filters, and language. Pagefind handles CJK segmentation via
        // the per-record `language` field.
        const contentForIndex = `${title}\n\n${description}\n\n${body}`;

        const { errors: addErrors } = await index.addCustomRecord({
          url: urlFor(topic, date, locale),
          content: contentForIndex,
          language: locale,
          meta: {
            title,
            description: description || title,
            date,
            topic,
            locale,
          },
          filters: {
            topic: [topic],
            locale: [locale],
            year: [date.slice(0, 4)],
            month: [date.slice(0, 7)],
          },
          sort: {
            date,
          },
        });
        if (addErrors?.length) {
          console.error(`pagefind addCustomRecord errors for ${filePath}:`, addErrors);
          skipped++;
          continue;
        }

        added++;
      }
    }
  }

  const { errors: writeErrors, outputPath } = await index.writeFiles({
    outputPath: OUT_DIR,
  });
  if (writeErrors?.length) {
    console.error("pagefind writeFiles errors:", writeErrors);
  }

  await closePagefind();

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `pagefind: indexed ${added} docs (skipped ${skipped}) in ${elapsed}s → ${path.relative(PROJECT_ROOT, outputPath ?? OUT_DIR)}`,
  );
}

try {
  await main();
} catch (err) {
  console.error("build-search-index failed:", err);
  process.exit(1);
}
