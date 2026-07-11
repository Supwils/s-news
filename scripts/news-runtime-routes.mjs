import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Which routes read a digest from disk at request time.
 *
 * The corpus (~31 MB of markdown under NEWS/) must be bundled into exactly those
 * routes' serverless functions and no others. Getting this wrong is invisible
 * locally — every page a developer visits is prerendered — and breaks in
 * production the first time an on-demand page needs a file that was never
 * shipped. So the list is discovered from the imports rather than hand-written,
 * and `verify-build-trace.mjs` asserts the built output matches.
 *
 * NEWS stays on the filesystem; nothing here assumes a database.
 */

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = path.join(PROJECT_ROOT, "app");

/** The only module allowed to open a markdown file. */
export const MARKDOWN_READER = "@/lib/news-content";

export const NEWS_CORPUS_GLOB = "NEWS/**/*.md";

/** Route entry points in the App Router. */
const ROUTE_FILES = new Set(["page.tsx", "page.ts", "route.ts", "route.tsx"]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (ROUTE_FILES.has(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

/** `app/en/news/[topic]/[date]/page.tsx` → `/en/news/[topic]/[date]` */
function fileToRoute(file) {
  const relative = path.relative(APP_DIR, path.dirname(file));
  const segments = relative
    .split(path.sep)
    .filter(Boolean)
    // Route groups like `(marketing)` do not appear in the URL.
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));

  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

/**
 * `outputFileTracingExcludes`/`Includes` keys are prefix globs in which `[` and
 * `]` open a character class — an unescaped `[topic]` matches nothing at all,
 * silently. Escaping is what makes a dynamic route addressable.
 */
export function toTracingKey(route) {
  return route.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

/** Routes whose entry file imports the markdown reader, sorted for stable output. */
export function findRoutesNeedingMarkdown() {
  return walk(APP_DIR)
    .filter((file) => readFileSync(file, "utf8").includes(MARKDOWN_READER))
    .map(fileToRoute)
    .sort();
}

/**
 * Any module outside `app/` that imports the reader would pull the corpus into
 * every route that transitively imports *it*, defeating the discovery above.
 * `lib/news-content.ts` itself is the only expected match.
 */
export function findUnexpectedReaderImporters() {
  const offenders = [];
  for (const dir of ["lib", "components", "data"]) {
    const root = path.join(PROJECT_ROOT, dir);
    let entries;
    try {
      entries = readdirSync(root, { withFileTypes: true, recursive: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(ts|tsx|mjs)$/.test(entry.name)) continue;
      const full = path.join(entry.parentPath ?? root, entry.name);
      if (full.endsWith(path.join("lib", "news-content.ts"))) continue;
      if (readFileSync(full, "utf8").includes(MARKDOWN_READER)) {
        offenders.push(path.relative(PROJECT_ROOT, full));
      }
    }
  }
  return offenders.sort();
}
