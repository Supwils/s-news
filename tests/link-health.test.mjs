import test from "node:test";
import assert from "node:assert/strict";

import { archiveUrl, classifyStatus, chunk, extractUrls } from "../scripts/link-health-lib.mjs";

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
  assert.equal(classifyStatus(404), "dead");
  assert.equal(classifyStatus(410), "dead");
  assert.equal(classifyStatus("network-error"), "dead");
  assert.equal(classifyStatus("timeout"), "dead");
  // bot-blocking and transient server errors must NOT be marked dead
  assert.equal(classifyStatus(403), "unknown");
  assert.equal(classifyStatus(429), "unknown");
  assert.equal(classifyStatus(500), "unknown");
  assert.equal(classifyStatus(503), "unknown");
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
