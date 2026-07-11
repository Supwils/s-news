import type { Metadata } from "next";

import { EventsIndexContent } from "@/components/events-index-content";
import { getEventSummaries } from "@/lib/events";
import { localizePath } from "@/lib/locale-routing";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";

const INITIAL_EVENTS = 60;

export const metadata: Metadata = {
  title: `Events | ${SITE_NAME}`,
  description: `Cross-topic events clustered from the daily digests in ${SITE_NAME}.`,
  alternates: {
    canonical: "/events",
    languages: {
      "zh-CN": "/events",
      "en-US": localizePath("/events", "en"),
    },
  },
};

export default async function EventsIndexPage() {
  const events = await getEventSummaries("zh");
  return <EventsIndexContent events={events.slice(0, INITIAL_EVENTS)} totalCount={events.length} />;
}
