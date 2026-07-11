import type { Metadata } from "next";
import { Suspense } from "react";

import { NewspaperFooter } from "@/components/newspaper/footer";
import { NewspaperMasthead } from "@/components/newspaper/masthead";
import { SearchPage } from "@/components/search-page";
import { isTimeRange } from "@/lib/search-time-range";
import { localizePath } from "@/lib/locale-routing";
import { isTopicKey, type TopicKey } from "@/lib/news-meta";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: `Search · ${SITE_NAME}`,
  description: "Search every Swil-News digest by title, body, topic, or date.",
  alternates: {
    canonical: localizePath("/search", "en"),
    languages: {
      "zh-CN": "/search",
      "en-US": localizePath("/search", "en"),
    },
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchRouteEn({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const topicParam = params.topic;
  const topics: TopicKey[] = (
    Array.isArray(topicParam) ? topicParam : topicParam ? [topicParam] : []
  ).filter(isTopicKey) as TopicKey[];
  const scope: "current" | "all" = params.scope === "all" ? "all" : "current";
  const rangeParam = typeof params.range === "string" ? params.range : null;
  const range = isTimeRange(rangeParam) ? rangeParam : "all";

  return (
    <div className="np-root">
      <NewspaperMasthead active={null} />
      <main className="mx-auto w-full" style={{ maxWidth: 1280, padding: "24px 16px 40px" }}>
        <Suspense fallback={null}>
          <SearchPage
            initialQuery={q}
            initialTopics={topics}
            initialLocaleScope={scope}
            initialTimeRange={range}
          />
        </Suspense>
        <NewspaperFooter />
      </main>
    </div>
  );
}
