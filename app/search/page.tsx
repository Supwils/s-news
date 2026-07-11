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
  title: `搜索 · ${SITE_NAME}`,
  description: "搜索 Swil-News 全部日报：标题、正文、主题、日期。",
  alternates: {
    canonical: "/search",
    languages: {
      "zh-CN": "/search",
      "en-US": localizePath("/search", "en"),
    },
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchRoute({ searchParams }: { searchParams: SearchParams }) {
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
