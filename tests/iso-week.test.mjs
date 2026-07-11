import test from "node:test";
import assert from "node:assert/strict";

import { addDays, isIsoWeekId, isoWeekId, isoWeekRange, isoWeekStart } from "../lib/iso-week.mjs";

test("known ISO week ids (checked against the ISO 8601 calendar)", () => {
  assert.equal(isoWeekId("2026-01-01"), "2026-W01"); // Thursday → W01
  assert.equal(isoWeekId("2026-07-09"), "2026-W28");
  assert.equal(isoWeekId("2026-12-31"), "2026-W53"); // 2026 is a 53-week year
});

test("ISO year differs from the calendar year at the boundaries", () => {
  // 2025-12-29 is a Monday whose Thursday (Jan 1, 2026) falls in 2026.
  assert.equal(isoWeekId("2025-12-29"), "2026-W01");
  // 2027-01-01 is a Friday belonging to the last ISO week of 2026.
  assert.equal(isoWeekId("2027-01-01"), "2026-W53");
});

test("week starts on Monday", () => {
  assert.equal(isoWeekStart("2026-07-09"), "2026-07-06"); // Thu → the Mon of its week
  assert.equal(isoWeekStart("2026-07-06"), "2026-07-06"); // a Monday maps to itself
  assert.equal(isoWeekStart("2026-07-12"), "2026-07-06"); // Sunday still maps back
});

test("week range is Monday..Sunday and round-trips through isoWeekId", () => {
  const { weekStart, weekEnd } = isoWeekRange("2026-W28");
  assert.equal(weekStart, "2026-07-06");
  assert.equal(weekEnd, "2026-07-12");
  assert.equal(isoWeekId(weekStart), "2026-W28");
  assert.equal(isoWeekId(weekEnd), "2026-W28");
});

test("every day of a week maps to that week's id", () => {
  const { weekStart } = isoWeekRange("2026-W28");
  for (let i = 0; i < 7; i += 1) {
    assert.equal(isoWeekId(addDays(weekStart, i)), "2026-W28");
  }
});

test("W01 range crossing the year boundary", () => {
  const { weekStart, weekEnd } = isoWeekRange("2026-W01");
  assert.equal(weekStart, "2025-12-29");
  assert.equal(weekEnd, "2026-01-04");
});

test("isIsoWeekId validates the shape and the week number", () => {
  assert.equal(isIsoWeekId("2026-W28"), true);
  assert.equal(isIsoWeekId("2026-W53"), true);
  assert.equal(isIsoWeekId("2026-W00"), false);
  assert.equal(isIsoWeekId("2026-W54"), false);
  assert.equal(isIsoWeekId("2026-28"), false);
  assert.equal(isIsoWeekId(null), false);
});
