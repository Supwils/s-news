import test from "node:test";
import assert from "node:assert/strict";

import {
  applyDeterministicFixes,
  buildRepairInstruction,
  classifyErrors,
  guardRepair,
} from "../scripts/repair-digest-lib.mjs";

test("tier 0 rewrites the labels the model actually invents", () => {
  const drifted = [
    "**Sources:**",
    "",
    "- [x](https://a.com/1)",
    "",
    "**Comment:** fine.",
    "",
    "**摘要:** 半角冒号。",
    "",
    "## Today’s Summary",
  ].join("\n");
  const { content, applied } = applyDeterministicFixes(drifted);
  assert.ok(content.includes("**Links:**"));
  assert.ok(content.includes("**Commentary:**"));
  assert.ok(content.includes("**摘要：**"));
  assert.ok(content.includes("## Today's Summary"));
  assert.ok(!content.includes("Sources"));
  assert.deepEqual(
    applied.sort(),
    ["comment-label", "curly-apostrophe-heading", "sources-label", "zhaiyao-halfwidth"].sort(),
  );
});

test("tier 0 is a no-op on a clean digest", () => {
  const clean = "**摘要：** 好的。\n\n**链接：**\n\n- [x](https://a.com)\n\n**简评：** 好。";
  const { content, applied } = applyDeterministicFixes(clean);
  assert.equal(content, clean);
  assert.deepEqual(applied, []);
});

test("classifyErrors separates format defects from content defects", () => {
  const { repairable, unrepairable } = classifyErrors([
    "NEWS/x.md: article 3 is missing the links label",
    "NEWS/x.md: missing daily framing marker",
    "NEWS/x.md: missing summary heading",
    "NEWS/x.md: article 3 does not contain a markdown link list under the links section",
    "NEWS/x.md: missing article blocks",
    "NEWS/x.md: missing top-level title",
  ]);
  assert.equal(repairable.length, 3);
  assert.equal(unrepairable.length, 3);
  assert.ok(unrepairable.some((e) => e.includes("markdown link list")));
});

const BASE = [
  "# 标题",
  "",
  "### 1. 甲",
  "**摘要：** 内容甲。",
  "**链接：**",
  "- [a](https://a.com/1)",
  "**简评：** 好。",
  "",
  "### 2. 乙",
  "**摘要：** 内容乙。",
  "**链接：**",
  "- [b](https://b.com/2)",
  "**简评：** 好。",
].join("\n");

test("guardRepair accepts a label-only fix and a one-line framing addition", () => {
  const relabeled = BASE.replace("**链接：**", "**链接：**");
  assert.equal(guardRepair(BASE, relabeled).ok, true);
  const withFraming = `${BASE}\n\n**总体定性：** 今天是常规更新日。`;
  assert.equal(guardRepair(BASE, withFraming).ok, true);
});

test("guardRepair rejects a repair that dropped an article", () => {
  const truncated = BASE.split("### 2.")[0];
  const verdict = guardRepair(BASE, truncated);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /article count/);
});

test("guardRepair rejects a repair that touched a URL", () => {
  const swapped = BASE.replace("https://a.com/1", "https://a.com/other");
  const verdict = guardRepair(BASE, swapped);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /URL/);
});

test("guardRepair rejects a wholesale rewrite (size blowout)", () => {
  // must exceed max(10%, 1KB) on this small fixture
  const bloated = BASE + "\n" + "填充内容。".repeat(500);
  const verdict = guardRepair(BASE, bloated);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /size/);
});

test("the repair instruction carries the validator's exact errors and the no-content-change rules", () => {
  const instruction = buildRepairInstruction("NEWS/general/en/x.md", ["article 3 is missing the links label"]);
  assert.ok(instruction.includes("article 3 is missing the links label"));
  assert.ok(instruction.includes("只修格式，不改内容"));
  assert.ok(instruction.includes("禁止重新搜索"));
});
