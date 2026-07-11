import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EventPageContent } from "@/components/event-page-content";
import { StructuredData } from "@/components/structured-data";
import { getAllEventIds, getEvent } from "@/lib/events";
import { localizePath } from "@/lib/locale-routing";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

type EventPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-static";

const EVENT_ID_RE = /^\d{4}-\d{2}-\d{2}_[a-z-]+_\d+$/;

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!EVENT_ID_RE.test(id)) return {};
  const event = await getEvent(id, "en");
  if (!event) return {};

  const canonicalPath = localizePath(`/events/${id}`, "en");
  return {
    title: `${event.title} | ${SITE_NAME}`,
    description: `Cross-topic event: ${event.title} (${event.firstDate} – ${event.lastDate})`,
    alternates: {
      canonical: canonicalPath,
      languages: {
        "zh-CN": `/events/${id}`,
        "en-US": canonicalPath,
      },
    },
  };
}

export async function generateStaticParams() {
  // English ids come from the English index — the clusters differ per locale,
  // so a zh event id may simply not exist here (and 404s), like archive months.
  const ids = await getAllEventIds("en");
  return ids.map((id) => ({ id }));
}

export default async function EnglishEventPage({ params }: EventPageProps) {
  const { id } = await params;
  if (!EVENT_ID_RE.test(id)) {
    notFound();
  }

  const event = await getEvent(id, "en");
  if (!event) {
    notFound();
  }

  const canonicalPath = localizePath(`/events/${id}`, "en");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${event.title} | ${SITE_NAME}`,
    description: `Cross-topic event (${event.firstDate} – ${event.lastDate})`,
    url: absoluteUrl(canonicalPath),
    inLanguage: "en-US",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl(localizePath("/", "en")) },
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <EventPageContent event={event} />
    </>
  );
}
