import { NextResponse } from "next/server";

import { getNewsEntry } from "@/lib/news";
import { isTopicKey } from "@/lib/news-meta";

type RouteContext = {
  params: Promise<{ topic: string; date: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { topic, date } = await context.params;

  if (!isTopicKey(topic)) {
    return NextResponse.json({ error: "Unknown topic" }, { status: 404 });
  }

  const entry = await getNewsEntry(topic, date);

  if (!entry) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  return NextResponse.json(entry);
}
