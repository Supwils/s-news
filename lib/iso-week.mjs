/**
 * ISO 8601 week helpers, shared by the rollup builder (Node) and the weekly
 * routes (Next). Authored as .mjs with a .d.mts sibling so both sides import
 * the same implementation without a bundler — same pattern as markdown-extract.
 *
 * ISO rules: weeks start Monday; week 1 is the week containing the year's first
 * Thursday, so a date's ISO *year* can differ from its calendar year at the
 * boundaries (2025-12-29 is 2026-W01; 2027-01-01 is 2026-W53).
 *
 * All arithmetic is done in UTC on `YYYY-MM-DD` strings, never on the wall
 * clock — the same determinism the rest of the build depends on.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** ISO weekday: Monday = 1 … Sunday = 7. */
function isoWeekday(date) {
  return date.getUTCDay() === 0 ? 7 : date.getUTCDay();
}

/** The Monday of the ISO week containing `dateStr`, as `YYYY-MM-DD`. */
export function isoWeekStart(dateStr) {
  const date = toUtc(dateStr);
  const monday = new Date(date.getTime() - (isoWeekday(date) - 1) * DAY_MS);
  return `${monday.getUTCFullYear()}-${pad2(monday.getUTCMonth() + 1)}-${pad2(monday.getUTCDate())}`;
}

export function addDays(dateStr, days) {
  const shifted = new Date(toUtc(dateStr).getTime() + days * DAY_MS);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/**
 * The ISO week id for a date, as `YYYY-Www` (e.g. `2026-W28`). The year is the
 * ISO week-numbering year, which is the calendar year of the week's Thursday.
 */
export function isoWeekId(dateStr) {
  const date = toUtc(dateStr);
  // The Thursday of this week decides the year and the week number.
  const thursday = new Date(date.getTime() + (4 - isoWeekday(date)) * DAY_MS);
  const isoYear = thursday.getUTCFullYear();
  const firstThursdayOfYear = new Date(Date.UTC(isoYear, 0, 4));
  const week =
    1 +
    Math.round(
      (thursday.getTime() - firstThursdayOfYear.getTime()) / (7 * DAY_MS) +
        (isoWeekday(firstThursdayOfYear) - 4) / 7,
    );
  return `${isoYear}-W${pad2(week)}`;
}

const WEEK_ID_RE = /^(\d{4})-W(\d{2})$/;

export function isIsoWeekId(value) {
  const match = WEEK_ID_RE.exec(value ?? "");
  if (!match) return false;
  const week = Number(match[2]);
  return week >= 1 && week <= 53;
}

/** Monday…Sunday span of an ISO week id, as `{ weekStart, weekEnd }`. */
export function isoWeekRange(weekId) {
  const match = WEEK_ID_RE.exec(weekId);
  if (!match) throw new Error(`Not an ISO week id: ${weekId}`);
  const isoYear = Number(match[1]);
  const week = Number(match[2]);

  const jan4 = `${isoYear}-01-04`;
  const week1Monday = isoWeekStart(jan4);
  const weekStart = addDays(week1Monday, (week - 1) * 7);
  return { weekStart, weekEnd: addDays(weekStart, 6) };
}
