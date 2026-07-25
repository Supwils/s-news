import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * The daily pipeline is bash, runs unattended, and its first reader is a
 * launchd log nobody opens until the news is missing. Everything asserted here
 * is something that already cost a day of content.
 */

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS_DIR = path.join(PROJECT_ROOT, "scripts");

const shellScripts = readdirSync(SCRIPTS_DIR)
  .filter((file) => file.endsWith(".sh"))
  .sort();

/**
 * Script source with whole-line comments removed. These assertions are about
 * what the scripts *do*; the comments explain the history and are free to name
 * the very constructs being asserted against.
 */
const read = (file) =>
  readFileSync(path.join(SCRIPTS_DIR, file), "utf8")
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");

test("every pipeline script parses", () => {
  assert.ok(shellScripts.length >= 10, `expected the topic runners, found ${shellScripts.length}`);
  for (const script of shellScripts) {
    try {
      execFileSync("bash", ["-n", path.join(SCRIPTS_DIR, script)], { stdio: "pipe" });
    } catch (error) {
      assert.fail(`bash -n failed for scripts/${script}:\n${error.stderr?.toString() ?? error.message}`);
    }
  }
});

test("the agent timeout is measured against a clock that survives sleep", () => {
  const source = read("news-agent.sh");

  // `alarm(2)` and GNU `timeout` both arm ITIMER_REAL, which stops counting
  // while macOS is asleep. On 2026-07-24 the host slept four minutes into the
  // run and a 30-minute timeout sat through a five-hour stall.
  assert.doesNotMatch(
    source,
    /\balarm\b/,
    "news-agent.sh must not arm an interval timer for its timeout — a sleeping host freezes it",
  );
  assert.match(
    source,
    /date \+%s/,
    "the watchdog must compare wall-clock timestamps",
  );
});

test("a network failure does not buy a second full-length attempt", () => {
  const source = read("run_all_news.sh");
  assert.match(
    source,
    /ENOTFOUND/,
    "run_all_news.sh must recognise an unreachable API and stop retrying into it",
  );
});

test("the daily content commit is limited to NEWS/", () => {
  const source = read("daily-news-and-commit.sh");

  // `git add -A NEWS/` bounds staging, not committing: `git commit` writes the
  // whole index, which is how 4985d86 shipped two unrelated doc renames.
  assert.match(
    source,
    /git commit -m "feat\(content\): adding daily news" -- NEWS\//,
    "the content commit must carry a NEWS/ pathspec",
  );
});

test("the cache warmup waits for a probe, never a fixed sleep", () => {
  const source = read("daily-news-and-commit.sh");

  assert.match(source, /await-deploy\.sh/, "the job must verify the deploy before warming");
  assert.doesNotMatch(
    source,
    /WARM_DEPLOY_WAIT/,
    "a flat sleep cannot outlast a Vercel build; warming ran against the previous deployment for as long as it existed",
  );
});

test("warm-cache reports its miss rate instead of always exiting 0", () => {
  const source = read("warm-cache.sh");
  assert.match(source, /WARM_MAX_FAIL_PCT/, "warm-cache.sh must fail when the warmup mostly missed");
});

test("each locale's warm list comes from that locale's own index", () => {
  const source = read("warm-cache.sh");

  // 360 Chinese entries across 40 dates have no English issue. Deriving the
  // English list as "/en" + a Chinese path only survived because the window was
  // two days; at 45 it would warm hundreds of 404s and trip the gate above.
  assert.match(source, /news-index-en\.json/, "the English list must read the English index");
  assert.doesNotMatch(
    source,
    /"\/en"\s*\+\s*p\b/,
    "the English list must not be the Chinese list with a prefix",
  );
});

test("warm-cache identifies itself so its own traffic is filterable", () => {
  const source = read("warm-cache.sh");
  assert.match(source, /WARM_USER_AGENT/);
  assert.match(source, /-A "\$WARM_USER_AGENT"/, "every warm request must carry the agent");
});
