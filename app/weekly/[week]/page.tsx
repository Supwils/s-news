import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StructuredData } from "@/components/structured-data";
import { WeeklyPageContent } from "@/components/weekly-page-content";
import { isIsoWeekId } from "@/lib/iso-week.mjs";
import { localizePath } from "@/lib/locale-routing";
import { getAllWeekIds, getWeekRollup } from "@/lib/rollups";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

type WeeklyPageProps = {
  params: Promise<{ week: string }>;
};

export const dynamic = "force-static";

export async function generateMetadata({ params }: WeeklyPageProps): Promise<Metadata> {
  const { week } = await params;
  if (!isIsoWeekId(week)) return {};

  return {
    title: `${week} · Weekly digest | ${SITE_NAME}`,
    description: `Week-in-review rollup for ${week} in ${SITE_NAME}.`,
    alternates: {
      canonical: `/weekly/${week}`,
      languages: {
        "zh-CN": `/weekly/${week}`,
        "en-US": localizePath(`/weekly/${week}`, "en"),
      },
    },
  };
}

export async function generateStaticParams() {
  const weekIds = await getAllWeekIds("zh");
  return weekIds.map((week) => ({ week }));
}

export default async function WeeklyPage({ params }: WeeklyPageProps) {
  const { week: weekId } = await params;
  if (!isIsoWeekId(weekId)) {
    notFound();
  }

  const weekIds = await getAllWeekIds("zh");
  const index = weekIds.indexOf(weekId);
  if (index === -1) {
    notFound();
  }

  const week = await getWeekRollup(weekId, "zh");
  if (!week) {
    notFound();
  }

  // weekIds are sorted newest-first, so the next (newer) week is the lower index.
  const nextWeekId = weekIds[index - 1] ?? null;
  const previousWeekId = weekIds[index + 1] ?? null;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${weekId} Weekly Digest | ${SITE_NAME}`,
    description: `Week-in-review rollup for ${weekId}.`,
    url: absoluteUrl(`/weekly/${weekId}`),
    inLanguage: "zh-CN",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <WeeklyPageContent week={week} previousWeekId={previousWeekId} nextWeekId={nextWeekId} />
    </>
  );
}
