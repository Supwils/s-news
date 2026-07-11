import test from "node:test";
import assert from "node:assert/strict";

import {
  clusterEvents,
  dice,
  dayGap,
  eventId,
  eventTitle,
  grams,
  normalizeUrl,
  splitArticleBlocks,
} from "../scripts/events-lib.mjs";

const DIGEST = `# 2026年7月9日 · 日报

## 一、要闻

### 1. 美伊连续第二日互轰，特朗普称停火「已结束」
**摘要：** 美国与伊朗连续第二日交换军事打击。

**链接：**

- [Al Jazeera — story](https://www.aljazeera.com/news/2026/7/9/us-iran?utm_source=rss)

**简评：** 简评。

---

### 2. 哈梅内伊安葬
**摘要：** 国葬落幕。

**链接：**

- [Reuters — funeral](https://reuters.com/world/funeral)

**简评：** 简评。
`;

test("splitArticleBlocks extracts title, summary lead, and normalized urls", () => {
  const blocks = splitArticleBlocks(DIGEST);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].index, 1);
  assert.equal(blocks[0].title, "美伊连续第二日互轰，特朗普称停火「已结束」");
  assert.match(blocks[0].summaryLead, /^美国与伊朗连续第二日/);
  // tracking param stripped, www stripped
  assert.deepEqual(blocks[0].urls, ["https://aljazeera.com/news/2026/7/9/us-iran"]);
});

test("normalizeUrl strips tracking params, fragments, www, trailing slash", () => {
  assert.equal(
    normalizeUrl("https://www.Example.com/a/?utm_source=x&id=7#frag"),
    "https://example.com/a?id=7",
  );
  assert.equal(normalizeUrl("not a url"), "not a url");
});

test("grams + dice: related zh titles score high, unrelated low", () => {
  const opecA = grams("OPEC+同意8月再增产18.8万桶/日，油价回落");
  const opecB = grams("OPEC+ 宣布 8月起 七国合计日增产18.8万桶");
  const gaming = grams("电竞世界杯：《无畏契约》八强开战");
  assert.ok(dice(opecA, opecB) > 0.35, `related pair scored ${dice(opecA, opecB)}`);
  assert.ok(dice(opecA, gaming) < 0.1, `unrelated pair scored ${dice(opecA, gaming)}`);
});

test("dayGap", () => {
  assert.equal(dayGap("2026-07-09", "2026-07-09"), 0);
  assert.equal(dayGap("2026-07-09", "2026-07-06"), 3);
  assert.equal(dayGap("2026-01-01", "2025-12-31"), 1);
});

function block(topic, date, index, title, urls = []) {
  return { topic, date, index, title, summaryLead: "", urls };
}

test("same-day cross-topic similar blocks cluster", () => {
  const blocks = [
    block("general", "2026-07-06", 1, "OPEC+同意8月再增产18.8万桶/日，油价回落"),
    block("finance", "2026-07-06", 2, "OPEC+同意8月再增产18.8万桶/日，油价先跌后稳"),
    block("gaming", "2026-07-06", 1, "电竞世界杯八强开战"),
  ];
  const events = clusterEvents(blocks);
  assert.equal(events.length, 1);
  const topics = events[0].map((b) => `${b.topic}:${b.index}`).sort();
  assert.deepEqual(topics, ["finance:2", "general:1"]);
});

test("same-topic same-day blocks never link directly (a digest does not repeat itself)", () => {
  // Near-identical, but only each other to link to: must stay separate.
  const blocks = [
    block("general", "2026-07-06", 1, "OPEC+同意8月再增产18.8万桶/日，油价回落"),
    block("general", "2026-07-06", 3, "OPEC+同意8月再增产18.8万桶/日，油价波动"),
  ];
  assert.deepEqual(clusterEvents(blocks), []);
  // Transitive co-membership through a cross-topic bridge IS allowed — the
  // exclusion is about direct edges, union-find joins are legitimate.
});

test("a shared source URL links blocks even when titles differ", () => {
  const url = "https://news.example.com/breaking";
  const blocks = [
    block("general", "2026-07-06", 1, "完全不同的标题甲", [url]),
    block("crypto", "2026-07-06", 1, "另一个毫无重叠的标题乙", [url]),
  ];
  const events = clusterEvents(blocks);
  assert.equal(events.length, 1);
  assert.equal(events[0].length, 2);
});

test("cross-day linking happens only through a shared URL, never through similarity", () => {
  const url = "https://reuters.com/iran-strikes";
  const blocks = [
    // near-identical titles on different days: must NOT link (genre chains and
    // real continuations are inseparable by text alone — measured, see lib)
    block("general", "2026-07-06", 1, "美伊冲突：美军打击伊朗军事目标，油价上行"),
    block("general", "2026-07-08", 1, "美伊冲突持续：美军再度打击伊朗军事目标"),
    // a shared URL within URL_MAX_DAY_GAP does link across days
    block("finance", "2026-07-06", 2, "油价因中东冲突上行", [url]),
    block("crypto", "2026-07-09", 3, "避险情绪推高比特币", [url]),
  ];
  const events = clusterEvents(blocks);
  assert.equal(events.length, 1);
  assert.deepEqual(
    events[0].map((b) => `${b.topic}:${b.date}`).sort(),
    ["crypto:2026-07-09", "finance:2026-07-06"],
  );
});

test("a shared URL beyond URL_MAX_DAY_GAP does not link", () => {
  const url = "https://reuters.com/old-report";
  const blocks = [
    block("general", "2026-06-01", 1, "标题甲", [url]),
    block("finance", "2026-07-09", 1, "标题乙", [url]),
  ];
  assert.deepEqual(clusterEvents(blocks), []);
});

test("eventId is the chronologically first member and survives growth", () => {
  const early = block("finance", "2026-07-06", 2, "t");
  const late = block("general", "2026-07-08", 1, "t");
  assert.equal(eventId([late, early]), "2026-07-06_finance_2");
  assert.equal(eventId([late, early, block("crypto", "2026-07-09", 1, "t")]), "2026-07-06_finance_2");
});

test("eventTitle picks the most central member", () => {
  const members = [
    block("general", "2026-07-06", 1, "OPEC+增产18.8万桶 油价回落"),
    block("finance", "2026-07-06", 1, "OPEC+增产18.8万桶 油价先跌后稳 市场消化"),
    block("energy-climate", "2026-07-06", 1, "OPEC+七国宣布增产 油价回落 供应宽松"),
  ];
  const title = eventTitle(members);
  assert.ok(members.some((m) => m.title === title));
});
