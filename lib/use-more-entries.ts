"use client";

import { useCallback, useState } from "react";

import type { Locale } from "@/data/copy";
import type { NewsCardEntry } from "@/lib/news";

type NewsApiResponse = {
  dates: Array<{ date: string; entries: NewsCardEntry[] }>;
};

/**
 * List pages prerender only their first window of cards but used to receive the
 * whole month/topic as props, so every entry — highlights included — was
 * serialized into the RSC payload of a page that rendered a fraction of them.
 *
 * The rest now come from `/api/news` on the first "load more" click: one cached
 * request, paid only by readers who ask for it.
 */
export function useMoreEntries(
  initialEntries: NewsCardEntry[],
  query: { locale: Locale; topic?: string; month?: string },
) {
  const [entries, setEntries] = useState(initialEntries);
  const [fetched, setFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const { locale, topic, month } = query;

  /** Resolves true when the full list is available (already fetched, or just fetched). */
  const fetchRest = useCallback(async () => {
    if (fetched) return true;
    if (loading) return false;

    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams({ locale });
      if (topic) params.set("topic", topic);
      if (month) params.set("month", month);

      const response = await fetch(`/api/news?${params}`);
      if (!response.ok) throw new Error(`/api/news responded ${response.status}`);

      const payload = (await response.json()) as NewsApiResponse;
      setEntries(payload.dates.flatMap((group) => group.entries));
      setFetched(true);
      return true;
    } catch (error) {
      console.warn("[news] failed to load more entries", error);
      // Keep the initial window rendered; the button stays clickable to retry.
      setFailed(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetched, loading, locale, topic, month]);

  return { entries, fetchRest, loading, failed };
}
