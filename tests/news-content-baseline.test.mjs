import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const PROJECT_ROOT = process.cwd();
const SCRIPT_PATH = path.join(PROJECT_ROOT, "scripts", "validate-news-content.mjs");

const BROKEN_DIGEST = ["# Broken digest", "", "### 1. A story", "", "**Summary:** nothing else."].join("\n");

async function fixtureWithBrokenDigest() {
  const root = await mkdtemp(path.join(tmpdir(), "swil-news-baseline-"));
  const dir = path.join(root, "general", "en");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "2026-05-01_general-digest.md"), BROKEN_DIGEST, "utf8");
  return root;
}

function runValidator(newsRoot, baselinePath) {
  return execFileSync("node", [SCRIPT_PATH], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      NEWS_ROOT: newsRoot,
      NEWS_CONTENT_BASELINE: baselinePath,
      NEWS_CONTENT_VALIDATION_MODE: "baseline",
    },
    encoding: "utf8",
  });
}

test("baseline mode fails on an issue that is not grandfathered", async () => {
  const newsRoot = await fixtureWithBrokenDigest();
  const emptyBaseline = path.join(newsRoot, "baseline.json");
  await writeFile(emptyBaseline, JSON.stringify({ issues: [] }), "utf8");

  assert.throws(
    () => runValidator(newsRoot, emptyBaseline),
    (error) => {
      assert.equal(error.status, 1);
      assert.match(error.stderr, /new issue\(s\) not in the baseline/);
      return true;
    },
  );
});

test("baseline mode passes once the issues are grandfathered", async () => {
  const newsRoot = await fixtureWithBrokenDigest();
  const baselinePath = path.join(newsRoot, "baseline.json");

  execFileSync("node", [SCRIPT_PATH, "--update-baseline"], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, NEWS_ROOT: newsRoot, NEWS_CONTENT_BASELINE: baselinePath },
    encoding: "utf8",
  });

  const output = runValidator(newsRoot, baselinePath);
  assert.match(output, /NEWS content validation passed/);
});
