/**
 * Shared markdown extraction utilities for both Node scripts and Next.js runtime.
 *
 * Authored as ESM .mjs so build-news-index.mjs (Node) and lib/news.ts
 * (Next.js TS) can both consume it without a bundler. A .d.mts sibling
 * provides typing for the TS side.
 *
 * The patterns below are the single source of truth for the digest template.
 * scripts/validate-news-content.mjs imports them rather than keeping its own
 * copies, so a template change can never leave the extractor and the validator
 * disagreeing about what a valid digest looks like.
 */

/** Digests are authored in several editors; both apostrophe forms occur. */
const APOSTROPHE = "[’']";

export const SUMMARY_HEADING = {
  zh: /^##\s+今日小结\s*$/m,
  en: new RegExp(`^##\\s+Today${APOSTROPHE}s\\s+Summary\\s*$`, "m"),
};

/**
 * The "daily framing" line. Authors have used several equivalent forms:
 *   **总体定性：** … / **总体定性**：… / **今日定性：**… / **定性**：… /
 *   **简评（总体定性）：** …
 */
const ZH_FRAMING_SOURCE = "\\*\\*(?:简评（)?(?:总体定性|今日定性|定性)(?:）)?(?:：\\*\\*|\\*\\*：)";

export const FRAMING_MARKER = {
  zh: new RegExp(ZH_FRAMING_SOURCE),
  en: /\*\*Daily Framing:\*\*/,
};

/** Same markers, capturing the framing sentence in group 1. */
const TAKEAWAY_INLINE = {
  zh: new RegExp(`${ZH_FRAMING_SOURCE}\\s*(.+)`),
  en: /\*\*Daily Framing:\*\*\s*(.+)/,
};

export function countMatches(content, pattern) {
  return content.match(pattern)?.length ?? 0;
}

export function extractTitle(content, fallback) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

export function extractDescription(content, fallback) {
  return content.match(/^>\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

/**
 * The summary section's body, heading line excluded. Excluding the heading is
 * what keeps extractTakeaway's fallback from returning "## 今日小结" (plus the
 * bullet list glued to it) as if it were prose.
 */
function getSummaryBlock(content, locale) {
  const heading = content.match(SUMMARY_HEADING[locale]);
  if (heading?.index === undefined) return null;
  const bodyStart = heading.index + heading[0].length;
  return content.slice(bodyStart).split(/\n---/)[0] ?? "";
}

export function extractTakeaway(content, locale = "zh") {
  const inline = content.match(TAKEAWAY_INLINE[locale]);
  if (inline?.[1]) return inline[1].trim();

  const summaryBlock = getSummaryBlock(content, locale);
  if (!summaryBlock) return undefined;

  const prose = summaryBlock
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !paragraph.startsWith("- ") && !paragraph.startsWith("#") && !paragraph.includes("\n- "));

  return prose.pop()?.trim() || undefined;
}

export function extractHighlights(content, locale = "zh") {
  const summaryBlock = getSummaryBlock(content, locale);
  if (!summaryBlock) return [];

  return summaryBlock
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim())
    .slice(0, 4);
}

export function getReadingMinutes(content) {
  return Math.max(3, Math.ceil(content.replace(/\s+/g, "").length / 900));
}

export function countArticles(content) {
  return countMatches(content, /^###\s+/gm);
}

export function countSections(content) {
  return countMatches(content, /^##\s+/gm);
}
