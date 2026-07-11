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

  const canonicalPath = localizePath(`/weekly/${week}`, "en");
  return {
    title: `${week} · Weekly digest | ${SITE_NAME}`,
    description: `Week-in-review rollup for ${week} in ${SITE_NAME}.`,
    alternates: {
      canonical: canonicalPath,
      languages: {
        "zh-CN": `/weekly/${week}`,
        "en-US": canonicalPath,
      },
    },
  };
}

export async function generateStaticParams() {
  // English weeks only — a week with no English digests is not advertised, the
  // same principle as the sitemap archive months.
  const weekIds = await getAllWeekIds("en");
  return weekIds.map((week) => ({ week }));
}

export default async function EnglishWeeklyPage({ params }: WeeklyPageProps) {
  const { week: weekId } = await params;
  if (!isIsoWeekId(weekId)) {
    notFound();
  }

  const weekIds = await getAllWeekIds("en");
  const index = weekIds.indexOf(weekId);
  if (index === -1) {
    notFound();
  }

  const week = await getWeekRollup(weekId, "en");
  if (!week) {
    notFound();
  }

  const nextWeekId = weekIds[index - 1] ?? null;
  const previousWeekId = weekIds[index + 1] ?? null;

  const canonicalPath = localizePath(`/weekly/${weekId}`, "en");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${weekId} Weekly Digest | ${SITE_NAME}`,
    description: `Week-in-review rollup for ${weekId}.`,
    url: absoluteUrl(canonicalPath),
    inLanguage: "en-US",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl(localizePath("/", "en")) },
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <WeeklyPageContent week={week} previousWeekId={previousWeekId} nextWeekId={nextWeekId} />
    </>
  );
}
