/**
 * The time facet for search.
 *
 * `build-search-index.mjs` has always written `year` and `month` filters onto
 * every Pagefind record; only `topic` and `locale` were ever used. Adding a time
 * dimension therefore needs no reindexing and no new data.
 *
 * The presets map exactly onto those two indexed filters — month granularity,
 * never a post-filter over the result rows. That keeps Pagefind's result count
 * honest: a "last 30 days" preset would have to discard rows after the fact,
 * and the "N results" the UI shows would then be a lie.
 *
 * The anchor is the newest issue's date (inlined at build time), not the wall
 * clock, so "this month" means "the month of the latest digest" and the facet
 * cannot go empty on a day the site was not rebuilt.
 */

import type { PagefindFilters } from "@/lib/pagefind-client";

export const TIME_RANGES = ["all", "month", "quarter", "year"] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

export function isTimeRange(value: string | null): value is TimeRange {
  return value !== null && (TIME_RANGES as readonly string[]).includes(value);
}

/** The newest issue date, `YYYY-MM-DD`. Falls back to an empty string in tests. */
const LATEST_ISSUE_DATE = process.env.NEXT_PUBLIC_LATEST_ISSUE_DATE ?? "";

/** `2026-07` minus n months, wrapping years. */
function shiftMonth(month: string, back: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const zeroBased = year * 12 + (monthIndex - 1) - back;
  const shiftedYear = Math.floor(zeroBased / 12);
  const shiftedMonth = (zeroBased % 12) + 1;
  return `${shiftedYear}-${String(shiftedMonth).padStart(2, "0")}`;
}

/**
 * The Pagefind filter fragment for a preset, anchored on `anchorDate`
 * (`YYYY-MM-DD`). Returns `{}` for "all" — no filter at all, rather than a
 * filter that happens to match everything.
 */
export function timeRangeFilters(
  range: TimeRange,
  anchorDate: string = LATEST_ISSUE_DATE,
): PagefindFilters {
  if (range === "all" || !anchorDate) return {};

  const month = anchorDate.slice(0, 7);
  const year = anchorDate.slice(0, 4);

  if (range === "year") return { year: { any: [year] } };
  if (range === "month") return { month: { any: [month] } };
  // quarter: the anchor month and the two before it. `any` is load-bearing —
  // `{month: [a, b, c]}` asks for digests filed under all three months at once.
  return { month: { any: [month, shiftMonth(month, 1), shiftMonth(month, 2)] } };
}

export function timeRangeLabel(range: TimeRange, locale: "zh" | "en") {
  const labels: Record<TimeRange, [zh: string, en: string]> = {
    all: ["全部时间", "All time"],
    month: ["最新一月", "Latest month"],
    quarter: ["最近三月", "Last 3 months"],
    year: ["今年", "This year"],
  };
  return labels[range][locale === "zh" ? 0 : 1];
}
