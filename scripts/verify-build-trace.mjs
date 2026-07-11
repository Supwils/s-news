#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findRoutesNeedingMarkdown, findUnexpectedReaderImporters } from "./news-runtime-routes.mjs";

/**
 * Asserts that the built serverless functions carry the digest corpus if and
 * only if they render an article body.
 *
 * Two failure modes this catches, both of which are invisible in `pnpm dev`:
 *
 *   too few — an on-demand page (e.g. /en/news/<zh-only article>) 500s in
 *             production because its markdown was never bundled;
 *   too many — every function drags 31 MB of markdown, inflating cold starts.
 *
 * Runs as `postbuild`. NEWS/ lives on the filesystem, so this invariant is the
 * thing standing between a green build and a broken deployment.
 */

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_APP_DIR = path.join(PROJECT_ROOT, ".next", "server", "app");

/**
 * Routes with no serverless function of their own. Next still emits a trace for
 * them, but nothing is deployed as a function, so an exclusion there would save
 * nothing and their trace is not worth asserting on.
 */
const STATIC_ROUTES_WITHOUT_FUNCTIONS = new Set(["/", "/en"]);

function collectTraceFiles(dir, found = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTraceFiles(full, found);
    } else if (entry.name.endsWith(".nft.json")) {
      found.push(full);
    }
  }
  return found;
}

/** `.next/server/app/en/news/[topic]/[date]/page.js.nft.json` → `/en/news/[topic]/[date]` */
function traceFileToRoute(file) {
  const relative = path.relative(SERVER_APP_DIR, path.dirname(file));
  return relative === "" ? "/" : `/${relative.split(path.sep).join("/")}`;
}

function tracesMarkdown(file) {
  const trace = JSON.parse(readFileSync(file, "utf8"));
  return (trace.files ?? []).some((entry) => entry.includes("NEWS/") && entry.endsWith(".md"));
}

function fail(lines) {
  console.error("Build trace verification FAILED.\n");
  for (const line of lines) console.error(`  ${line}`);
  console.error("");
  process.exit(1);
}

const traceFiles = collectTraceFiles(SERVER_APP_DIR);
if (traceFiles.length === 0) {
  fail([
    `No .nft.json traces under ${path.relative(PROJECT_ROOT, SERVER_APP_DIR)}.`,
    "Did `next build` run? This script is a postbuild step.",
  ]);
}

const offenders = findUnexpectedReaderImporters();
if (offenders.length > 0) {
  fail([
    "These modules import lib/news-content.ts outside of app/:",
    ...offenders.map((file) => `- ${file}`),
    "",
    "Anything importing the markdown reader drags all 1770 digests into every",
    "route that transitively imports it. Read from lib/news.ts (the generated",
    "index) instead, or move the caller into an app/ route.",
  ]);
}

const expected = new Set(findRoutesNeedingMarkdown());
const actual = new Set(
  traceFiles
    .filter(tracesMarkdown)
    .map(traceFileToRoute)
    .filter((route) => !STATIC_ROUTES_WITHOUT_FUNCTIONS.has(route)),
);

const missing = [...expected].filter((route) => !actual.has(route));
const unexpected = [...actual].filter((route) => !expected.has(route));

if (missing.length > 0 || unexpected.length > 0) {
  const lines = [];
  if (missing.length > 0) {
    lines.push(
      "These routes read a digest from disk but their function has NO markdown.",
      "They will 500 in production on the first on-demand render:",
      ...missing.map((route) => `- ${route}`),
      "",
      "Check the escaping of outputFileTracingIncludes keys in next.config.ts —",
      "an unescaped [param] is a glob character class and matches nothing.",
      "",
    );
  }
  if (unexpected.length > 0) {
    lines.push(
      "These routes bundle the 31 MB corpus but never read a digest:",
      ...unexpected.map((route) => `- ${route}`),
      "",
      "Something now imports lib/news-content.ts transitively. Find it and have",
      "it read the generated index via lib/news.ts instead.",
      "",
    );
  }
  fail(lines);
}

console.log(
  `Build trace verified: ${expected.size} route(s) carry the digest corpus, ${
    traceFiles.length - actual.size
  } do not.`,
);
