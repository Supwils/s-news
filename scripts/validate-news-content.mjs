#!/usr/bin/env node

import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FRAMING_MARKER, SUMMARY_HEADING } from "../lib/markdown-extract.mjs";
import { LOCALES, TOPIC_FOLDERS } from "./news-topics.mjs";

const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = process.cwd();
const NEWS_ROOT = path.resolve(process.env.NEWS_ROOT ?? path.join(PROJECT_ROOT, "NEWS"));
const BASELINE_PATH = path.resolve(
  process.env.NEWS_CONTENT_BASELINE ?? path.join(SCRIPT_ROOT, "scripts", "news-content-baseline.json"),
);

/**
 * Three modes:
 *   baseline (default) — fail on any issue not present in the baseline. This is
 *                        what `prebuild` runs: legacy defects are grandfathered,
 *                        a newly generated digest that drifts from the template
 *                        fails the build.
 *   strict             — fail on any issue at all; the baseline is ignored.
 *   warn               — never fail; print everything. For surveying the corpus.
 *
 * `--update-baseline` rewrites the baseline from the current corpus.
 */
const MODE = process.env.NEWS_CONTENT_VALIDATION_MODE ?? "baseline";
const UPDATE_BASELINE = process.argv.includes("--update-baseline");

/**
 * `--files a.md b.md` validates exactly those files, strictly, ignoring the
 * baseline. Runners use it to gate the digest they just generated: a freshly
 * written file has no business being grandfathered.
 */
const FILE_ARGS = (() => {
  const index = process.argv.indexOf("--files");
  return index === -1 ? [] : process.argv.slice(index + 1).filter((arg) => !arg.startsWith("--"));
})();

const LOCALE_RULES = {
  zh: {
    summaryHeading: SUMMARY_HEADING.zh,
    framing: FRAMING_MARKER.zh,
    articleLabels: [
      { name: "summary label", pattern: /\*\*摘要：\*\*/ },
      { name: "links label", pattern: /\*\*链接：\*\*/ },
      { name: "commentary label", pattern: /(?:\*\*)?简评：\*\*/ },
    ],
  },
  en: {
    summaryHeading: SUMMARY_HEADING.en,
    framing: FRAMING_MARKER.en,
    articleLabels: [
      { name: "summary label", pattern: /\*\*Summary:\*\*/ },
      { name: "links label", pattern: /\*\*Links?:\*\*/ },
      { name: "commentary label", pattern: /\*\*Commentary:\*\*/ },
    ],
  },
};

async function readDirSafe(dir) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function splitArticleBlocks(content) {
  const matches = [...content.matchAll(/^###\s+.+$/gm)];
  if (matches.length === 0) return [];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? content.length;
    return content.slice(start, end);
  });
}

function validateArticleBlock(block, locale, fileLabel, articleIndex, errors) {
  const rules = LOCALE_RULES[locale];

  for (const label of rules.articleLabels) {
    if (!label.pattern.test(block)) {
      errors.push(`${fileLabel}: article ${articleIndex} is missing the ${label.name}`);
    }
  }

  if (!/\*\*Links?:\*\*[\s\S]*?\n-\s+\[[^\]]+\]\([^)]+\)/.test(block) && !/\*\*链接：\*\*[\s\S]*?\n-\s+\[[^\]]+\]\([^)]+\)/.test(block)) {
    errors.push(`${fileLabel}: article ${articleIndex} does not contain a markdown link list under the links section`);
  }
}

function validateContent(content, locale, fileLabel, errors) {
  const rules = LOCALE_RULES[locale];

  if (!/^#\s+.+$/m.test(content)) {
    errors.push(`${fileLabel}: missing top-level title`);
  }

  if (!/^>\s+.+$/m.test(content)) {
    errors.push(`${fileLabel}: missing blockquote description`);
  }

  if (!/^##\s+.+$/m.test(content)) {
    errors.push(`${fileLabel}: missing section headings`);
  }

  const articleBlocks = splitArticleBlocks(content);
  if (articleBlocks.length === 0) {
    errors.push(`${fileLabel}: missing article blocks`);
  }

  articleBlocks.forEach((block, index) => {
    validateArticleBlock(block, locale, fileLabel, index + 1, errors);
  });

  if (!rules.summaryHeading.test(content)) {
    errors.push(`${fileLabel}: missing summary heading`);
  }

  if (!rules.framing.test(content)) {
    errors.push(`${fileLabel}: missing daily framing marker`);
  }
}

async function validateLocaleDirectory(topic, locale, errors) {
  const dir = path.join(NEWS_ROOT, topic, locale);
  const entries = await readDirSafe(dir);

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    const filePath = path.join(dir, entry.name);
    const fileLabel = path.relative(PROJECT_ROOT, filePath);
    const content = await readFile(filePath, "utf8");
    validateContent(content, locale, fileLabel, errors);
  }
}

async function readBaseline() {
  try {
    const raw = await readFile(BASELINE_PATH, "utf8");
    return new Set(JSON.parse(raw).issues ?? []);
  } catch {
    return new Set();
  }
}

/** `NEWS/<topic>/<locale>/<file>.md` → the locale whose rules apply. */
function localeOfPath(filePath) {
  const segments = path.resolve(filePath).split(path.sep);
  const locale = segments[segments.length - 2];
  if (locale !== "zh" && locale !== "en") {
    throw new Error(`Cannot infer locale from ${filePath} (expected .../zh/ or .../en/).`);
  }
  return locale;
}

async function validateExplicitFiles(files) {
  const errors = [];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    validateContent(content, localeOfPath(file), path.relative(PROJECT_ROOT, file), errors);
  }
  errors.sort();

  if (errors.length > 0) {
    console.error(`NEWS content validation found ${errors.length} issue(s) in ${files.length} file(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`NEWS content validation passed for ${files.length} file(s).`);
}

async function main() {
  if (FILE_ARGS.length > 0) {
    await validateExplicitFiles(FILE_ARGS);
    return;
  }

  const errors = [];

  for (const topic of TOPIC_FOLDERS) {
    for (const locale of LOCALES) {
      await validateLocaleDirectory(topic, locale, errors);
    }
  }

  errors.sort();

  if (UPDATE_BASELINE) {
    await writeFile(BASELINE_PATH, `${JSON.stringify({ issues: errors }, null, 2)}\n`, "utf8");
    console.log(`Wrote ${errors.length} grandfathered issue(s) to ${path.relative(PROJECT_ROOT, BASELINE_PATH)}.`);
    return;
  }

  if (MODE === "warn") {
    for (const error of errors) console.warn(`- ${error}`);
    console.log(`NEWS content validation finished in warning mode: ${errors.length} issue(s).`);
    return;
  }

  if (MODE === "strict") {
    if (errors.length === 0) {
      console.log(`NEWS content validation passed (strict) for ${TOPIC_FOLDERS.length} topics under ${NEWS_ROOT}.`);
      return;
    }
    console.error(`NEWS content validation found ${errors.length} issue(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  // Baseline mode: only issues absent from the baseline are fatal. Baselined
  // issues that no longer reproduce are reported so the baseline can be
  // ratcheted down, but they never fail the build.
  const baseline = await readBaseline();
  const regressions = errors.filter((error) => !baseline.has(error));
  const fixed = [...baseline].filter((error) => !errors.includes(error));

  if (fixed.length > 0) {
    console.log(
      `${fixed.length} baselined issue(s) no longer reproduce — run \`pnpm validate:news-content:update-baseline\` to ratchet.`,
    );
  }

  if (regressions.length > 0) {
    console.error(`NEWS content validation found ${regressions.length} new issue(s) not in the baseline:`);
    for (const error of regressions) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(
    `NEWS content validation passed for ${TOPIC_FOLDERS.length} topics under ${NEWS_ROOT} (${baseline.size} legacy issue(s) grandfathered).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
