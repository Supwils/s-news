#!/usr/bin/env node

/**
 * Link-health checker for the archive's external URLs.
 *
 * The product promises "可追溯 / traceable". Tens of thousands of external links
 * will rot over a year, so this HEAD-requests every distinct URL and records a
 * verdict. Dead links then render with a marker and a Web Archive fallback (see
 * lib/link-health.ts + components/news-markdown-block.tsx).
 *
 * IMPORTANT — never wire this into `prebuild`. The build must not depend on the
 * public internet. This runs on its own schedule (scripts/run-check-links.sh),
 * and its output is COMMITTED (not a `.generated` artifact) so the deploy sees
 * it — the same local → git → deploy flow as NEWS content. A missing output
 * file simply turns the feature off; the build never breaks.
 *
 * Flags:
 *   --sample N   check only the first N distinct URLs (smoke test)
 *   --dry-run    extract and report counts, make no requests
 *   --limit N    alias for --sample
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chunk, classifyStatus, extractUrls } from "./link-health-lib.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NEWS_ROOT = path.join(PROJECT_ROOT, "NEWS");
const OUTPUT_PATH = path.join(PROJECT_ROOT, "link-health.json");

const CONCURRENCY = Number(process.env.LINK_CHECK_CONCURRENCY ?? 24);
const TIMEOUT_MS = Number(process.env.LINK_CHECK_TIMEOUT_MS ?? 12000);

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}
const DRY_RUN = process.argv.includes("--dry-run");
const SAMPLE = Number(argValue("--sample") ?? argValue("--limit") ?? 0) || 0;

async function walkMarkdown(dir, files = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkMarkdown(full, files);
    else if (entry.name.endsWith(".md")) files.push(full);
  }
  return files;
}

async function collectUrls() {
  const files = await walkMarkdown(NEWS_ROOT);
  const urls = new Set();
  for (const file of files) {
    for (const url of extractUrls(await readFile(file, "utf8"))) urls.add(url);
  }
  return [...urls].sort();
}

/** One request: HEAD, falling back to GET when a host rejects HEAD. */
async function probe(url) {
  const attempt = async (method) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "swil-news-link-checker/1.0 (+https://github.com/swil-news)" },
      });
      return response.status;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const headStatus = await attempt("HEAD");
    // Some CDNs answer HEAD with 403/405 but serve GET fine.
    if (headStatus === 403 || headStatus === 405 || headStatus === 501) {
      try {
        return await attempt("GET");
      } catch {
        return headStatus;
      }
    }
    return headStatus;
  } catch (error) {
    return error?.name === "AbortError" ? "timeout" : "network-error";
  }
}

async function main() {
  const allUrls = await collectUrls();
  const urls = SAMPLE > 0 ? allUrls.slice(0, SAMPLE) : allUrls;

  console.log(`link-health: ${allUrls.length} distinct URLs${SAMPLE ? ` (checking first ${urls.length})` : ""}`);

  if (DRY_RUN) {
    console.log("link-health: --dry-run, no requests made.");
    return;
  }

  const links = {};
  const tally = { ok: 0, dead: 0, unknown: 0 };
  let done = 0;

  for (const batch of chunk(urls, CONCURRENCY)) {
    await Promise.all(
      batch.map(async (url) => {
        const status = await probe(url);
        const verdict = classifyStatus(status);
        links[url] = { status, verdict };
        tally[verdict] += 1;
        done += 1;
      }),
    );
    process.stderr.write(`\r  checked ${done}/${urls.length} · ok ${tally.ok} dead ${tally.dead} unknown ${tally.unknown}`);
  }
  process.stderr.write("\n");

  // `checkedAt` is passed in rather than read from the clock so a scheduled run
  // and a manual one produce comparable, reproducible output; falls back to now.
  const checkedAt = process.env.LINK_CHECK_TIMESTAMP ?? new Date().toISOString();

  const output = {
    version: 1,
    checkedAt,
    counts: { total: urls.length, ...tally },
    // Only `dead` links are stored — the render path only needs those, and it
    // keeps a 17k-URL corpus from bloating the committed file with "ok" noise.
    dead: Object.fromEntries(
      Object.entries(links)
        .filter(([, info]) => info.verdict === "dead")
        .map(([url, info]) => [url, { status: info.status }]),
    ),
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(
    `link-health: ok ${tally.ok} · dead ${tally.dead} · unknown ${tally.unknown} → ${path.relative(PROJECT_ROOT, OUTPUT_PATH)}`,
  );
}

await main();
