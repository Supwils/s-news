import test from "node:test";
import assert from "node:assert/strict";

import {
  findRoutesNeedingMarkdown,
  findUnexpectedReaderImporters,
  toTracingKey,
} from "../scripts/news-runtime-routes.mjs";

/**
 * These assertions protect the one invariant that a green local build cannot:
 * the digest corpus must reach exactly the routes that read a digest from disk.
 * `scripts/verify-build-trace.mjs` checks the built output; this checks the
 * inputs that drive it.
 */

test("only the article-body routes read markdown at request time", () => {
  assert.deepEqual(findRoutesNeedingMarkdown(), [
    "/api/news/[topic]/[date]",
    "/en/news/[topic]/[date]",
    "/news/[topic]/[date]",
  ]);
});

test("nothing outside app/ imports the markdown reader", () => {
  // A shared module importing lib/news-content.ts would pull all 1770 digests
  // into every route that transitively imports it, defeating the discovery.
  assert.deepEqual(findUnexpectedReaderImporters(), []);
});

test("tracing keys escape the glob character classes in dynamic segments", () => {
  // An unescaped "[topic]" is a character class and matches nothing — silently.
  assert.equal(toTracingKey("/news/[topic]/[date]"), "/news/\\[topic\\]/\\[date\\]");
  assert.equal(toTracingKey("/about"), "/about");
  assert.equal(toTracingKey("/en/archive/[month]"), "/en/archive/\\[month\\]");
});
