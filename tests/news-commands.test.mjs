import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { FRAMING_MARKER, SUMMARY_HEADING } from "../lib/markdown-extract.mjs";

/**
 * The generation prompts and the content validator are two halves of one
 * contract, and nothing used to hold them together.
 *
 * Every defect grandfathered in scripts/news-content-baseline.json traces to a
 * template that described a machine-checked marker in prose instead of showing
 * it literally:
 *   - no command ever wrote `**Links:**`, so the model invented `**Sources:**`
 *     (81 of 103 defects);
 *   - 8 of 10 described the framing line as `**总体定性**——…` prose. The two that
 *     showed `**总体定性：**` literally have zero framing defects;
 *   - all 10 embedded the literal placeholder `基于年月日整理`, which shipped
 *     verbatim in NEWS/ai-tech/zh/2025-03-06_….md.
 *
 * These assertions fail the moment a template stops showing a marker the
 * validator requires. Cheap here; a quarantined topic and a day with no news
 * otherwise.
 */

const COMMANDS_DIR = path.join(process.cwd(), ".cursor", "commands");

async function commandFiles() {
  const entries = await readdir(COMMANDS_DIR);
  return entries.filter((name) => name.endsWith("-news.md")).sort();
}

/** Literal markers `scripts/validate-news-content.mjs` enforces on every digest. */
const REQUIRED_LITERALS = [
  "**摘要：**",
  "**链接：**",
  "**简评：**",
  "## 今日小结",
  "**总体定性：**",
  "**Summary:**",
  "**Links:**",
  "**Commentary:**",
  "**Daily Framing:**",
];

test("every command file exists and there are ten of them", async () => {
  assert.equal((await commandFiles()).length, 10);
});

test("every command shows the machine-checked markers literally", async () => {
  for (const name of await commandFiles()) {
    const source = await readFile(path.join(COMMANDS_DIR, name), "utf8");
    for (const literal of REQUIRED_LITERALS) {
      assert.ok(source.includes(literal), `${name} never shows the literal ${literal}`);
    }
  }
});

test("the English summary heading is spelled with an ASCII apostrophe", async () => {
  for (const name of await commandFiles()) {
    const source = await readFile(path.join(COMMANDS_DIR, name), "utf8");
    assert.ok(source.includes("## Today's Summary"), `${name} is missing "## Today's Summary"`);
    assert.ok(
      !source.includes("## Today’s Summary"),
      `${name} uses the curly apostrophe U+2019, which cost 22 digests their highlights`,
    );
  }
});

test("the markers a command shows actually satisfy the extractor's regexes", async () => {
  for (const name of await commandFiles()) {
    const source = await readFile(path.join(COMMANDS_DIR, name), "utf8");
    assert.ok(SUMMARY_HEADING.zh.test(source), `${name}: zh summary heading regex does not match`);
    assert.ok(SUMMARY_HEADING.en.test(source), `${name}: en summary heading regex does not match`);
    assert.ok(FRAMING_MARKER.zh.test(source), `${name}: zh framing regex does not match`);
    assert.ok(FRAMING_MARKER.en.test(source), `${name}: en framing regex does not match`);
  }
});

test("no command embeds an unparameterized date placeholder", async () => {
  for (const name of await commandFiles()) {
    const source = await readFile(path.join(COMMANDS_DIR, name), "utf8");
    assert.ok(
      !source.includes("基于年月日整理"),
      `${name} embeds the literal placeholder "基于年月日整理", which gets copied into published digests`,
    );
  }
});

test("commands forbid the label the model kept inventing", async () => {
  for (const name of await commandFiles()) {
    const source = await readFile(path.join(COMMANDS_DIR, name), "utf8");
    assert.ok(source.includes("**Sources:**"), `${name} should name **Sources:** in order to forbid it`);
    assert.match(source, /禁止/, `${name} should state the forbidden-label rule`);
  }
});
