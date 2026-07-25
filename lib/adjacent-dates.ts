export type AdjacentDates = {
  /** Nearest older issue date, or null at the start of the run. */
  prev: string | null;
  /** Nearest newer issue date, or null at the newest issue. */
  next: string | null;
};

/**
 * Nearest neighbours of `current` among `dates` (ISO YYYY-MM-DD strings, any
 * order). `current` itself does not have to be in the list: the /en route can
 * render a Chinese-only date as a fallback, and that date is absent from the
 * English index — the pager then steps to the nearest indexed English issues.
 */
export function adjacentDates(dates: Iterable<string>, current: string): AdjacentDates {
  let prev: string | null = null;
  let next: string | null = null;
  for (const date of dates) {
    if (date < current) {
      if (prev === null || date > prev) prev = date;
    } else if (date > current) {
      if (next === null || date < next) next = date;
    }
  }
  return { prev, next };
}
