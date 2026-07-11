import { NextResponse } from "next/server";

import type { Locale } from "@/data/copy";
import { getEventSummaries } from "@/lib/events";

/**
 * Slim event summaries (no members), backing the /events list's "load more".
 * The list page prerenders only its first window; this serves the rest, once,
 * cached at the edge. Index-only — no markdown is read.
 */
export async function GET(request: Request) {
  const localeParam = new URL(request.url).searchParams.get("locale");
  if (localeParam !== null && localeParam !== "zh" && localeParam !== "en") {
    return NextResponse.json({ error: "Unknown locale. Use zh or en." }, { status: 400 });
  }
  const locale: Locale = localeParam ?? "zh";

  const events = await getEventSummaries(locale);
  return NextResponse.json(
    { locale, total: events.length, events },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
