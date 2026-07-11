import type { Metadata } from "next";

import { WeeklyIndexContent } from "@/components/weekly-index-content";
import { localizePath } from "@/lib/locale-routing";
import { getWeekSummaries } from "@/lib/rollups";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: `Weekly digests | ${SITE_NAME}`,
  description: `Week-in-review rollups of the daily digests in ${SITE_NAME}.`,
  alternates: {
    canonical: localizePath("/weekly", "en"),
    languages: {
      "zh-CN": "/weekly",
      "en-US": localizePath("/weekly", "en"),
    },
  },
};

export default async function EnglishWeeklyIndexPage() {
  const weeks = await getWeekSummaries("en");
  return <WeeklyIndexContent weeks={weeks} />;
}
