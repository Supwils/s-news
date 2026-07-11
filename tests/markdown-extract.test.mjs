import test from "node:test";
import assert from "node:assert/strict";

import {
  extractHighlights,
  extractTakeaway,
  FRAMING_MARKER,
  SUMMARY_HEADING,
} from "../lib/markdown-extract.mjs";

const CURLY = "’";

test("English summary heading matches both apostrophe forms", () => {
  assert.ok(SUMMARY_HEADING.en.test("## Today's Summary"));
  assert.ok(SUMMARY_HEADING.en.test(`## Today${CURLY}s Summary`));
});

test("highlights survive a curly apostrophe in the summary heading", () => {
  const content = [
    "# Digest",
    "",
    `## Today${CURLY}s Summary`,
    "- First highlight",
    "- Second highlight",
    "",
    "---",
  ].join("\n");

  assert.deepEqual(extractHighlights(content, "en"), ["First highlight", "Second highlight"]);
});

test("takeaway never leaks the summary heading or its bullet list", () => {
  // No `**Daily Framing:**`, and the bullets hug the heading with no blank line —
  // the shape that used to make the whole block the "takeaway".
  const content = ["# Digest", "", "## Today's Summary", "- Honda disclosed a recall", "", "---"].join("\n");

  assert.equal(extractTakeaway(content, "en"), undefined);
});

test("takeaway prefers the inline framing line", () => {
  const content = [
    "# Digest",
    "",
    "## Today's Summary",
    "- A bullet",
    "",
    "**Daily Framing:** A quiet consolidation day.",
    "",
    "---",
  ].join("\n");

  assert.equal(extractTakeaway(content, "en"), "A quiet consolidation day.");
});

test("takeaway falls back to trailing prose, not to bullets", () => {
  const content = [
    "# 日报",
    "",
    "## 今日小结",
    "- 要点一",
    "- 要点二",
    "",
    "整体上今天是震荡整理的一天。",
    "",
    "---",
  ].join("\n");

  assert.equal(extractTakeaway(content, "zh"), "整体上今天是震荡整理的一天。");
});

test("Chinese framing marker accepts every authored variant", () => {
  for (const line of [
    "**总体定性：** 今天是震荡日。",
    "**总体定性**：今天是震荡日。",
    "**今日定性：** 今天是震荡日。",
    "**定性**：今天是震荡日。",
    "**简评（总体定性）：** 今天是震荡日。",
  ]) {
    assert.ok(FRAMING_MARKER.zh.test(line), `should match: ${line}`);
    assert.equal(extractTakeaway(`## 今日小结\n\n${line}\n`, "zh"), "今天是震荡日。");
  }
});

test("Chinese framing marker does not match unrelated bold text", () => {
  assert.equal(FRAMING_MARKER.zh.test("**EPS路径的不确定性**：仍高"), false);
});
