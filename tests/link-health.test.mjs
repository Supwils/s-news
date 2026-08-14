import test from "node:test";
import assert from "node:assert/strict";

import {
  archiveUrl,
  classifyStatus,
  chunk,
  extractUrls,
  interleaveByHost,
  mapWithConcurrency,
} from "../scripts/link-health-lib.mjs";

test("extractUrls pulls markdown links and autolinks, de-duplicated", () => {
  const md = [
    "See [Reuters — Story](https://reuters.com/a) and [again](https://reuters.com/a).",
    "Autolink <https://example.com/x>.",
    "Not a link: https://bare.example.com should be ignored (no markdown syntax).",
  ].join("\n");
  assert.deepEqual(extractUrls(md).sort(), ["https://example.com/x", "https://reuters.com/a"]);
});

test("extractUrls strips trailing prose punctuation glued to a URL", () => {
  assert.deepEqual(extractUrls("[x](https://example.com/path.)"), ["https://example.com/path"]);
});

test("classifyStatus is conservative — only unambiguous failures are dead", () => {
  assert.equal(classifyStatus(200), "ok");
  assert.equal(classifyStatus(301), "ok");
  // only the server saying so is proof the page is gone
  assert.equal(classifyStatus(404), "dead");
  assert.equal(classifyStatus(410), "dead");
  // "I could not reach it" is not "it is gone". The 2026-07-28 report marked
  // 9,051 URLs dead on network-error and 904 on timeout against 281 real
  // 404/410s — half the corpus rendered as Wayback snapshots, with CoinDesk,
  // CNBC, BBC, Bloomberg and Nature at the top of the "dead" list. Every one
  // of them was serving 200 when spot-checked.
  assert.equal(classifyStatus("network-error"), "unknown");
  assert.equal(classifyStatus("timeout"), "unknown");
  // bot-blocking and transient server errors must NOT be marked dead
  assert.equal(classifyStatus(403), "unknown");
  assert.equal(classifyStatus(429), "unknown");
  assert.equal(classifyStatus(500), "unknown");
  assert.equal(classifyStatus(503), "unknown");
});

test("interleaveByHost keeps same-host URLs out of the same concurrency batch", () => {
  // The collector sorts, which puts every URL of a host next to its siblings —
  // so a batch of N was N simultaneous requests to one origin. CoinDesk (518
  // URLs) and CNBC (502) topped the "dead" list precisely because they had the
  // most URLs to be hammered with.
  const urls = [
    "https://a.com/1", "https://a.com/2", "https://a.com/3",
    "https://b.com/1", "https://b.com/2",
    "https://c.com/1",
  ];
  const spread = interleaveByHost(urls);
  assert.deepEqual([...spread].sort(), [...urls].sort(), "no URL is lost or duplicated");
  // No two neighbours share an origin. Nothing stronger is available here — with
  // three of six URLs on a.com, pigeonhole forces a repeat inside some window of
  // three — but adjacency is the property that keeps a batch off one server.
  for (let i = 1; i < spread.length; i += 1) {
    assert.notEqual(
      new URL(spread[i]).hostname,
      new URL(spread[i - 1]).hostname,
      `positions ${i - 1},${i} share a host`,
    );
  }

  // The shape that actually runs: many hosts, batches of CONCURRENCY. A host
  // must not appear twice inside one batch, which is exactly what sorting did.
  const many = [];
  for (let h = 0; h < 40; h += 1) for (let n = 0; n < 5; n += 1) many.push(`https://h${h}.com/${n}`);
  for (const batch of chunk(interleaveByHost(many), 24)) {
    const hosts = batch.map((u) => new URL(u).hostname);
    assert.equal(new Set(hosts).size, hosts.length, "a batch hit the same host twice");
  }
});

test("interleaveByHost tolerates a single host and unparseable URLs", () => {
  assert.deepEqual(interleaveByHost([]), []);
  assert.deepEqual(interleaveByHost(["https://a.com/1"]), ["https://a.com/1"]);
  assert.equal(interleaveByHost(["not a url", "https://a.com/1"]).length, 2);
});

test("mapWithConcurrency holds the limit and keeps results in order", async () => {
  let inFlight = 0;
  let peak = 0;
  const items = Array.from({ length: 50 }, (_, i) => i);
  const out = await mapWithConcurrency(items, 7, async (n) => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, n % 5));
    inFlight -= 1;
    return n * 2;
  });
  assert.deepEqual(out, items.map((n) => n * 2), "results stay aligned with their inputs");
  assert.ok(peak <= 7, `peak concurrency ${peak} exceeded the limit`);
});

test("mapWithConcurrency lets fast work pass a slow item instead of blocking on it", async () => {
  // The batch-and-await-all loop this replaces made every batch wait for its
  // slowest member, so one URL sitting out the 12s timeout stalled the other 23.
  const done = [];
  await mapWithConcurrency(["slow", "a", "b", "c", "d"], 2, async (label) => {
    await new Promise((r) => setTimeout(r, label === "slow" ? 60 : 1));
    done.push(label);
  });
  assert.equal(done.at(-1), "slow", "the slow item should finish last, not gate the rest");
  assert.deepEqual(done.slice(0, 4), ["a", "b", "c", "d"]);
});

test("archiveUrl targets the Wayback snapshot near the citation date", () => {
  assert.equal(
    archiveUrl("2026-07-09", "https://reuters.com/a"),
    "https://web.archive.org/web/20260709/https://reuters.com/a",
  );
  // no date → Wayback's "nearest capture" sentinel, never a broken stamp
  assert.equal(archiveUrl("", "https://x.com"), "https://web.archive.org/web/2/https://x.com");
});

test("chunk splits into bounded batches", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 3), []);
});
