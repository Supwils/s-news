import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StructuredData } from "@/components/structured-data";
import { TOPIC_INITIAL_CARDS } from "@/lib/list-windows";
import { TopicPageContent } from "@/components/topic-page-content";
import { getCopy } from "@/data/copy";
import { localizePath } from "@/lib/locale-routing";
import {
  getEntryPreviewsByTopic,
  toCardEntry,
} from "@/lib/news";
import { getTopicMeta, isTopicKey, TOPICS } from "@/lib/news-meta";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

type TopicPageProps = {
  params: Promise<{ topic: string }>;
};

export const dynamic = "force-static";

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { topic } = await params;

  if (!isTopicKey(topic)) {
    return {};
  }

  const copy = getCopy("zh");
  const meta = getTopicMeta(topic, "zh");

  return {
    title: meta?.label ?? copy.ui.topicPage.defaultTitle,
    description: meta?.description,
    alternates: {
      canonical: `/news/${topic}`,
      languages: {
        "zh-CN": `/news/${topic}`,
        "en-US": localizePath(`/news/${topic}`, "en"),
      },
      types: {
        "application/rss+xml": absoluteUrl(`/news/${topic}/feed.xml`),
      },
    },
    openGraph: {
      type: "website",
      url: `/news/${topic}`,
      siteName: SITE_NAME,
      title: meta?.label ?? copy.ui.topicPage.defaultTitle,
      description: meta?.description,
      images: [
        {
          url: absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: `${meta?.label ?? copy.ui.topicPage.defaultTitle} open graph image`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta?.label ?? copy.ui.topicPage.defaultTitle,
      description: meta?.description,
      images: [absoluteUrl("/twitter-image")],
    },
  };
}

export function generateStaticParams() {
  return TOPICS.map((topic) => ({ topic: topic.key }));
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { topic } = await params;

  if (!isTopicKey(topic)) {
    notFound();
  }

  const meta = getTopicMeta(topic, "zh");
  const entries = await getEntryPreviewsByTopic(topic, "zh");

  if (!meta) {
    notFound();
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${meta.label} | ${SITE_NAME}`,
    description: meta.description,
    url: absoluteUrl(`/news/${topic}`),
    inLanguage: "zh-CN",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: entries.length,
      itemListElement: entries.slice(0, 20).map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/news/${entry.topic}/${entry.date}`),
        name: entry.title,
      })),
    },
  };

  return (
    <>
      <StructuredData data={structuredData} />
      {/* Only the prerendered window is serialized into this page; the rest of
          the archive is fetched from /api/news when the reader asks for it. */}
      <TopicPageContent
        topic={topic}
        entries={entries.slice(0, TOPIC_INITIAL_CARDS).map(toCardEntry)}
        totalEntries={entries.length}
      />
    </>
  );
}
