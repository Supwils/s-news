/**
 * The one list of topics the Node scripts agree on.
 *
 * Kept in sync with lib/news-meta.ts by tests/news-topics.test.mjs — that test
 * is the reason a topic added to the TS side can no longer be silently missing
 * from the generated index and the search index.
 */

export const TOPIC_FOLDERS = [
  "general",
  "finance",
  "ai-tech",
  "science",
  "crypto",
  "energy-climate",
  "auto-mobility",
  "gaming",
  "supply-chain",
  "sports-health-nutrition",
];

export const LOCALES = ["zh", "en"];

/** Digest filenames are `YYYY-MM-DD_<slug>.md`; anything else is not a digest. */
export const DIGEST_FILE_RE = /^(\d{4}-\d{2}-\d{2})_.+\.md$/;

/** Returns the ISO date encoded in a digest filename, or null when it isn't one. */
export function digestDateFromFileName(fileName) {
  return DIGEST_FILE_RE.exec(fileName)?.[1] ?? null;
}
