import { NextResponse } from "next/server";

import { getAllNewsPreviews, groupPreviewsByDate } from "@/lib/news";

export async function GET() {
  const entries = await getAllNewsPreviews();

  return NextResponse.json({
    total: entries.length,
    dates: groupPreviewsByDate(entries),
  });
}
