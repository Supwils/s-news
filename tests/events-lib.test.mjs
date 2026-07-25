import test from "node:test";
import assert from "node:assert/strict";

import {
  clusterEvents,
  dayGap,
  dice,
  eventId,
  eventTitle,
  grams,
  normalizeUrl,
  splitArticleBlocks,
  URL_MAX_DAY_GAP,
  URL_MAX_DISTINCT_DAYS,
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

test("an evergreen URL cited across many days links nothing", () => {
  // federalreserve.gov/releases/h15 is cited on 15 distinct days of the real
  // corpus. Every pair of those days is inside URL_MAX_DAY_GAP, so before the
  // hub filter this one URL alone merged three weeks of unrelated rate
  // coverage into a single "event".
  const hub = "https://federalreserve.gov/releases/h15";
  const blocks = [];
  for (let day = 1; day <= URL_MAX_DISTINCT_DAYS + 1; day += 1) {
    const date = `2026-06-0${day}`;
    blocks.push(block("general", date, 1, `第${day}日利率评论`, [hub]));
    blocks.push(block("finance", date, 1, `第${day}日债市回顾`, [hub]));
  }
  assert.deepEqual(clusterEvents(blocks), []);
});

test("a story URL stays a story URL right up to the limit", () => {
  // The same shape, one day shorter: still a story, still links.
  const url = "https://reuters.com/opec-august-output-decision";
  const blocks = [];
  for (let day = 1; day <= URL_MAX_DISTINCT_DAYS; day += 1) {
    const date = `2026-06-0${day}`;
    blocks.push(block("general", date, 1, `第${day}日OPEC评论`, [url]));
    blocks.push(block("finance", date, 1, `第${day}日油市回顾`, [url]));
  }
  const events = clusterEvents(blocks);
  assert.equal(events.length, 1);
  assert.equal(events[0].length, URL_MAX_DISTINCT_DAYS * 2);
});

test("URL_MAX_DAY_GAP bounds an edge; only the hub filter bounds the chain", () => {
  // Each hop shares a URL with the next and sits 6 days away — every edge is
  // legal — but union-find is transitive, so the cluster spans 18 days. This is
  // the failure mode no single-edge test can see, and the reason the span had
  // to be bounded at the source (URL_MAX_DISTINCT_DAYS) rather than by the gap.
  // Every URL here is cited on exactly 2 days, so none is filtered as a hub.
  const hops = [
    ["general", "2026-06-01", ["https://reuters.com/s0"]],
    ["finance", "2026-06-07", ["https://reuters.com/s0", "https://reuters.com/s1"]],
    ["crypto", "2026-06-13", ["https://reuters.com/s1", "https://reuters.com/s2"]],
    ["science", "2026-06-19", ["https://reuters.com/s2"]],
  ];
  const blocks = hops.map(([topic, date, urls], i) => block(topic, date, i + 1, `第${i}段`, urls));

  const events = clusterEvents(blocks);
  assert.equal(events.length, 1, "the four hops are one cluster");

  const dates = [...new Set(events[0].map((b) => b.date))].sort();
  assert.equal(dayGap(dates[0], dates[dates.length - 1]), 18);
  assert.ok(
    dayGap(dates[0], dates[dates.length - 1]) > URL_MAX_DAY_GAP,
    "a chain outruns the per-edge gap by construction",
  );
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
