/**
 * How many sources one digest cites, and how many of them the link checker
 * could not reach.
 *
 * Kept apart from `lib/link-health.ts` deliberately: that module reads the
 * report off disk and memoizes with React's `cache`, so it drags `node:fs` and
 * React into anything that touches it. This is a pure function over text, and
 * staying pure is what lets it be tested directly.
 */

// The checker's own extractor, not a copy of it. The strip counts the same URLs
// the report was built from; a second regex would drift and the two would
// disagree about how many sources a digest has.
import { extractUrls } from "../scripts/link-health-lib.mjs";

export type SourceHealth = {
  /** Distinct URLs cited by the digest. */
  total: number;
  reachable: number;
  /** Cited URLs the reader will follow to a Web Archive snapshot instead. */
  archived: number;
};

/**
 * Matching is on the raw URL because that is what both sides hold: the report's
 * keys come from `extractUrls`, which only strips trailing prose punctuation,
 * and the renderer looks up the same unmodified href. Normalizing on one side
 * only would silently classify every `www.` host as reachable.
 */
export function summarizeSources(markdown: string, deadLinks: ReadonlySet<string>): SourceHealth {
  const urls = extractUrls(markdown) as string[];
  const archived = urls.filter((url) => deadLinks.has(url)).length;
  return { total: urls.length, reachable: urls.length - archived, archived };
}
