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

/** `2026-07-08_general_3` — date, topic folder, block position. */
const EVENT_ID_RE = /^\d{4}-\d{2}-\d{2}_[a-z-]+_\d+$/;

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!EVENT_ID_RE.test(id)) return {};
  const event = await getEvent(id, "zh");
  if (!event) return {};

  return {
    title: `${event.title} | ${SITE_NAME}`,
    description: `跨主题事件：${event.title}（${event.firstDate} – ${event.lastDate}）`,
    alternates: {
      canonical: `/events/${id}`,
      languages: {
        "zh-CN": `/events/${id}`,
        "en-US": localizePath(`/events/${id}`, "en"),
      },
    },
  };
}

export async function generateStaticParams() {
  const ids = await getAllEventIds("zh");
  return ids.map((id) => ({ id }));
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  if (!EVENT_ID_RE.test(id)) {
    notFound();
  }

  const event = await getEvent(id, "zh");
  if (!event) {
    notFound();
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${event.title} | ${SITE_NAME}`,
    description: `跨主题事件（${event.firstDate} – ${event.lastDate}）`,
    url: absoluteUrl(`/events/${id}`),
    inLanguage: "zh-CN",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <EventPageContent event={event} />
    </>
  );
}
