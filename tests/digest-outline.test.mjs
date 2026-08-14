import test from "node:test";
import assert from "node:assert/strict";

import { headingId, outlineOf } from "../lib/digest-outline.ts";

const digest = `# 2026年8月12日 · 日常通用新闻日报

> 基于今日要闻整理。

## 一、政策与安全

### 1. 某项政策落地

**摘要：** something.

### 2. **加粗的**标题

**摘要：** more.

## 二、市场

### 3. Third story
`;

test("outlineOf captures sections and stories, skipping the h1 title", () => {
  const outline = outlineOf(digest);
  assert.deepEqual(
    outline.map((e) => [e.level, e.text]),
    [
      [2, "一、政策与安全"],
      [3, "1. 某项政策落地"],
      [3, "2. 加粗的标题"],
      [2, "二、市场"],
      [3, "3. Third story"],
    ],
  );
});

test("headingId strips inline markdown so the id matches the rendered text", () => {
  // The outline parses raw markdown (`**加粗的**标题`); the heading renderer sees
  // text react-markdown already unwrapped (`加粗的标题`). Both must land on the
  // same id or every bold heading's anchor breaks.
  assert.equal(headingId("2. **加粗的**标题"), headingId("2. 加粗的标题"));
});

test("headingId keeps CJK verbatim", () => {
  // Transliterating or dropping non-latin characters would collapse every
  // Chinese heading to the same empty slug.
  assert.equal(headingId("一、政策与安全"), "h-一-政策与安全");
});

test("headingId is stable and URL-fragment safe in shape", () => {
  const id = headingId("3. Third story");
  assert.equal(id, "h-3-third-story");
  assert.equal(id, headingId("3. Third story"));
  assert.ok(!/[\s#?/]/.test(id));
});

test("a heading of pure punctuation yields no id and is dropped", () => {
  assert.equal(headingId("— — —"), "");
  assert.deepEqual(outlineOf("## — — —\n\n### ...\n"), []);
});

test("ids are unique within a real-shaped digest", () => {
  const ids = outlineOf(digest).map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});
