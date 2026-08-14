import test from "node:test";
import assert from "node:assert/strict";

import { isCoveredByCheck, summarizeSources } from "../lib/source-health.ts";

const digest = `
### 1. First story
**摘要：** something happened.
**链接：** [Reuters](https://reuters.com/a) · [CNBC](https://www.cnbc.com/b)

### 2. Second story
**摘要：** more.
**链接：** [Gone](https://example.com/removed) · [Reuters again](https://reuters.com/a)
`;

test("summarizeSources counts distinct cited sources, not link occurrences", () => {
  // reuters.com/a is cited twice; the report holds one entry for it, so the
  // strip must not claim four sources when the digest has three.
  const health = summarizeSources(digest, new Set());
  assert.equal(health.total, 3);
  assert.equal(health.reachable, 3);
  assert.equal(health.archived, 0);
});

test("summarizeSources splits reachable from archived", () => {
  const health = summarizeSources(digest, new Set(["https://example.com/removed"]));
  assert.deepEqual(health, { total: 3, reachable: 2, archived: 1 });
});

test("summarizeSources ignores dead URLs this digest never cited", () => {
  // The report covers the whole corpus. A digest's strip must describe that
  // digest, not the archive.
  const health = summarizeSources(digest, new Set(["https://somewhere-else.com/x"]));
  assert.deepEqual(health, { total: 3, reachable: 3, archived: 0 });
});

test("summarizeSources handles a digest with no links", () => {
  assert.deepEqual(summarizeSources("# Title\n\nNo sources here.", new Set()), {
    total: 0,
    reachable: 0,
    archived: 0,
  });
});

test("summarizeSources matches the report's raw-URL keys", () => {
  // The checker stores what extractUrls produced — `www.` intact, no query
  // stripping — and the renderer looks up the unmodified href. If either side
  // normalized, every www host would silently count as reachable.
  const md = "[x](https://www.cnbc.com/b)";
  assert.equal(summarizeSources(md, new Set(["https://www.cnbc.com/b"])).archived, 1);
});

test("isCoveredByCheck refuses to speak for issues the check never saw", () => {
  // The report holds only dead URLs, so "absent" means either checked-and-fine
  // or never-checked. Without this guard every issue published since the last
  // weekly run claims a verification it never got — and that is the newest
  // issue nearly every day, the one most people read.
  assert.equal(isCoveredByCheck("2026-08-13", "2026-08-14T08:16:50.447Z"), true);
  assert.equal(isCoveredByCheck("2026-08-15", "2026-08-14T08:16:50.447Z"), false);
});

test("isCoveredByCheck treats a same-day issue as covered", () => {
  // The weekly check runs at the end of the daily job, after that day's content
  // is committed, so it sees the issue dated the same day.
  assert.equal(isCoveredByCheck("2026-08-14", "2026-08-14T23:59:00.000Z"), true);
  assert.equal(isCoveredByCheck("2026-08-14", "2026-08-14T00:00:01.000Z"), true);
});

test("isCoveredByCheck reports no coverage when there is no report", () => {
  assert.equal(isCoveredByCheck("2026-08-13", null), false);
  assert.equal(isCoveredByCheck("", "2026-08-14T08:16:50.447Z"), false);
});
