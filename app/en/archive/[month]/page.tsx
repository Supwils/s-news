import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MonthArchivePageContent } from "@/components/month-archive-page-content";
import { StructuredData } from "@/components/structured-data";
import { ARCHIVE_INITIAL_GROUPS, countDays, takeFirstDayGroups } from "@/lib/list-windows";
import { localizePath } from "@/lib/locale-routing";
import { getArchiveMonths, getEntryPreviewsByMonth, toCardEntry } from "@/lib/news";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

type MonthArchivePageProps = {
  params: Promise<{ month: string }>;
};

export const dynamic = "force-static";

function isValidMonth(month: string) {
  return /^\d{4}-\d{2}$/.test(month);
}

export async function generateMetadata({ params }: MonthArchivePageProps): Promise<Metadata> {
  const { month } = await params;
  if (!isValidMonth(month)) {
    return {};
  }

  const canonicalPath = localizePath(`/archive/${month}`, "en");

  return {
    title: `${month} Archive`,
    description: `Monthly archive for ${month} in ${SITE_NAME}.`,
    alternates: {
      canonical: canonicalPath,
      languages: {
        "zh-CN": `/archive/${month}`,
        "en-US": canonicalPath,
      },
    },
  };
}

export async function generateStaticParams() {
  const months = await getArchiveMonths();
  return months.map((month) => ({ month }));
}

export default async function EnglishMonthArchivePage({ params }: MonthArchivePageProps) {
  const { month } = await params;
  if (!isValidMonth(month)) {
    notFound();
  }

  const months = await getArchiveMonths();
  const monthIndex = months.indexOf(month);
  if (monthIndex === -1) {
    notFound();
  }

  // The month's existence is already guaranteed by the monthIndex check above.
  // Load English previews only; an empty list renders the "no English digests"
  // state rather than 404ing.
  const entries = await getEntryPreviewsByMonth(month, "en");

  const previousMonth = months[monthIndex + 1] ?? null;
  const nextMonth = months[monthIndex - 1] ?? null;
  const canonicalPath = localizePath(`/archive/${month}`, "en");

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${month} Archive | ${SITE_NAME}`,
    description: `Monthly archive for ${month}.`,
    url: absoluteUrl(canonicalPath),
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl(localizePath("/", "en")),
    },
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: entries.length,
      itemListElement: entries.slice(0, 50).map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(localizePath(`/news/${entry.topic}/${entry.date}`, "en")),
        name: entry.title,
      })),
    },
  };

  return (
    <>
      <StructuredData data={structuredData} />
      {/* Only the prerendered day-groups are serialized into this page; the rest
          of the month is fetched from /api/news when the reader asks for it. */}
      <MonthArchivePageContent
        month={month}
        entries={takeFirstDayGroups(entries, ARCHIVE_INITIAL_GROUPS).map(toCardEntry)}
        totalEntries={entries.length}
        totalDays={countDays(entries)}
        previousMonth={previousMonth}
        nextMonth={nextMonth}
      />
    </>
  );
}
