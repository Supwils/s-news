import test from "node:test";
import assert from "node:assert/strict";

import { adjacentDates } from "../lib/adjacent-dates.ts";

/**
 * The pager on a digest detail page steps through the dates that exist for
 * that topic in the current locale's index. `prev` is the nearest older
 * issue, `next` the nearest newer one — never "yesterday" by the calendar,
 * because generation gaps are normal (quarantined topics, missed days).
 */

test("middle of the run: both neighbours found", () => {
  const dates = ["2026-07-23", "2026-07-22", "2026-07-21"];
  assert.deepEqual(adjacentDates(dates, "2026-07-22"), {
    prev: "2026-07-21",
    next: "2026-07-23",
  });
});

test("newest issue has no next, oldest has no prev", () => {
  const dates = ["2026-07-23", "2026-07-22"];
  assert.deepEqual(adjacentDates(dates, "2026-07-23"), { prev: "2026-07-22", next: null });
  assert.deepEqual(adjacentDates(dates, "2026-07-22"), { prev: null, next: "2026-07-23" });
});

test("calendar gaps are skipped, not treated as dead ends", () => {
  const dates = ["2026-07-23", "2026-07-19", "2026-07-15"];
  assert.deepEqual(adjacentDates(dates, "2026-07-19"), {
    prev: "2026-07-15",
    next: "2026-07-23",
  });
});

test("current date absent from the list still finds neighbours (en fallback page)", () => {
  // /en renders a zh-only date on demand; the en index does not contain it.
  const dates = ["2026-07-23", "2026-07-20"];
  assert.deepEqual(adjacentDates(dates, "2026-07-21"), {
    prev: "2026-07-20",
    next: "2026-07-23",
  });
});

test("order-agnostic and duplicate-tolerant", () => {
  const dates = ["2026-07-20", "2026-07-23", "2026-07-20", "2026-07-22"];
  assert.deepEqual(adjacentDates(dates, "2026-07-22"), {
    prev: "2026-07-20",
    next: "2026-07-23",
  });
});

test("empty list yields no neighbours", () => {
  assert.deepEqual(adjacentDates([], "2026-07-22"), { prev: null, next: null });
});
