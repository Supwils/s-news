import test from "node:test";
import assert from "node:assert/strict";

import { isTimeRange, timeRangeFilters } from "../lib/search-time-range.ts";

/**
 * The presets must map onto the `year`/`month` filters Pagefind already indexes.
 * Anything that needs a post-filter over the rows would make the "N results"
 * count wrong, which is why there is no "last 30 days".
 *
 * Every value must be wrapped in `{any: [...]}`. Measured against the built
 * index: Pagefind ANDs a bare array, so `{month: ["2026-07","2026-06","2026-05"]}`
 * asks for digests filed under all three months at once and returns 0.
 */

test("all-time applies no filter at all", () => {
  assert.deepEqual(timeRangeFilters("all", "2026-07-09"), {});
});

test("month and year map straight onto the indexed filters", () => {
  assert.deepEqual(timeRangeFilters("month", "2026-07-09"), { month: { any: ["2026-07"] } });
  assert.deepEqual(timeRangeFilters("year", "2026-07-09"), { year: { any: ["2026"] } });
});

test("quarter is the anchor month plus the two before it, OR-ed", () => {
  assert.deepEqual(timeRangeFilters("quarter", "2026-07-09"), {
    month: { any: ["2026-07", "2026-06", "2026-05"] },
  });
});

test("quarter wraps across a year boundary", () => {
  assert.deepEqual(timeRangeFilters("quarter", "2026-01-15"), {
    month: { any: ["2026-01", "2025-12", "2025-11"] },
  });
});

test("filter values are never bare arrays, which Pagefind would AND", () => {
  for (const range of ["month", "quarter", "year"]) {
    for (const value of Object.values(timeRangeFilters(range, "2026-07-09"))) {
      assert.ok(!Array.isArray(value), `${range} produced a bare array; Pagefind would AND it`);
      assert.ok(Array.isArray(value.any), `${range} must use the {any: [...]} OR form`);
    }
  }
});

test("a missing anchor degrades to no filter rather than an empty result set", () => {
  assert.deepEqual(timeRangeFilters("quarter", ""), {});
});

test("isTimeRange rejects unknown values from the URL", () => {
  assert.equal(isTimeRange("quarter"), true);
  assert.equal(isTimeRange("last-30-days"), false);
  assert.equal(isTimeRange(null), false);
});
