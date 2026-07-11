import { NextResponse } from "next/server";

import type { Locale } from "@/data/copy";
import { getAllNewsPreviews, groupPreviewsByDate } from "@/lib/news";
import { isTopicKey } from "@/lib/news-meta";

const MONTH_RE = /^\d{4}-\d{2}$/;

/**
 * Read-only index of digests, grouped by date.
 *
 * `?locale=en` serves the English index (the route used to be zh-only, so the
 * English half of the archive was unreachable). `?topic=` and `?month=` narrow
 * the result — the topic and archive pages use them to fetch the entries below
 * their initial window instead of having every entry serialized into their RSC
 * payload.
 *
 * `searchText` is stripped: it is a derived blob the pages deliberately drop to
 * keep payloads small, and it has no meaning to an API consumer.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const localeParam = params.get("locale");
  if (localeParam !== null && localeParam !== "zh" && localeParam !== "en") {
    return NextResponse.json({ error: "Unknown locale. Use zh or en." }, { status: 400 });
  }
  const locale: Locale = localeParam ?? "zh";

  const topicParam = params.get("topic");
  if (topicParam && !isTopicKey(topicParam)) {
    return NextResponse.json({ error: "Unknown topic" }, { status: 400 });
  }

  const monthParam = params.get("month");
  if (monthParam && !MONTH_RE.test(monthParam)) {
    return NextResponse.json({ error: "Invalid month. Use YYYY-MM." }, { status: 400 });
  }

  const previews = await getAllNewsPreviews(locale);
  const entries = previews.filter(
    (entry) =>
      (!topicParam || entry.topic === topicParam) &&
      (!monthParam || entry.date.startsWith(`${monthParam}-`)),
  );

  return NextResponse.json(
    {
      locale,
      total: entries.length,
      dates: groupPreviewsByDate(entries).map((group) => ({
        date: group.date,
        entries: group.entries.map(({ searchText: _searchText, ...entry }) => entry),
      })),
    },
    {
      // Content only changes on deploy, so this is safe to cache hard at the edge.
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    },
  );
}
