/**
 * How many cards a list page prerenders. The server slices its props to exactly
 * this window and the client renders exactly this window, so the two can never
 * drift — a mismatch would either ship entries nobody renders (the payload bug
 * this exists to prevent) or render entries whose data was never sent.
 *
 * Dependency-free on purpose: both the server pages and the client components
 * import it.
 */

/** Topic pages: a flat list of cards. */
export const TOPIC_INITIAL_CARDS = 36;
export const TOPIC_CARDS_STEP = 36;

/** Archive pages: cards grouped by day. */
export const ARCHIVE_INITIAL_GROUPS = 8;
export const ARCHIVE_GROUPS_STEP = 8;

/**
 * The first `groupCount` day-groups worth of entries, given a date-descending
 * list. Used server-side to slice archive props to the prerendered window.
 */
export function takeFirstDayGroups<T extends { date: string }>(entries: T[], groupCount: number) {
  const days: string[] = [];
  const window: T[] = [];

  for (const entry of entries) {
    if (!days.includes(entry.date)) {
      if (days.length === groupCount) break;
      days.push(entry.date);
    }
    window.push(entry);
  }

  return window;
}

/** Distinct days present in a date-descending list. */
export function countDays(entries: Array<{ date: string }>) {
  return new Set(entries.map((entry) => entry.date)).size;
}
