import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NewsDetailContent } from "@/components/news-detail-content";
import { NewsMarkdown } from "@/components/news-markdown-block";
import { adjacentDates } from "@/lib/adjacent-dates";
import { getEventsForDigest } from "@/lib/events";
import { getDeadLinks, getLinkCheckedAt } from "@/lib/link-health";
import { SourceHealthStrip } from "@/components/source-health-strip";
import { outlineOf } from "@/lib/digest-outline";
import { StructuredData } from "@/components/structured-data";
import { localizePath } from "@/lib/locale-routing";
import { getAllNewsParams, getEntryPreviewsByTopic, getTopicsWithNewsForDate } from "@/lib/news";
import { getNewsEntry } from "@/lib/news-content";
import { getTopicMeta, isTopicKey } from "@/lib/news-meta";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

type NewsDetailPageProps = {
  params: Promise<{ topic: string; date: string }>;
};

export const dynamic = "force-static";

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { topic, date } = await params;

  if (!isTopicKey(topic)) {
    return {};
  }

  const entry = await getNewsEntry(topic, date, "zh");
  const meta = getTopicMeta(topic, "zh");

  if (!entry) {
    return {};
  }

  return {
    title: entry.title,
    description: entry.description,
    alternates: {
      canonical: `/news/${topic}/${date}`,
      languages: {
        "zh-CN": `/news/${topic}/${date}`,
        "en-US": localizePath(`/news/${topic}/${date}`, "en"),
      },
    },
    openGraph: {
      type: "article",
      url: `/news/${topic}/${date}`,
      siteName: SITE_NAME,
      title: entry.title,
      description: entry.description,
      locale: "zh_CN",
      publishedTime: `${date}T08:00:00.000Z`,
      modifiedTime: `${date}T08:00:00.000Z`,
      images: [
        {
          url: absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: `${entry.title} open graph image`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: entry.title,
      description: entry.description,
      images: [absoluteUrl("/twitter-image")],
    },
    keywords: [entry.title, meta?.label ?? topic, "daily digest", "news archive"],
  };
}

export async function generateStaticParams() {
  return getAllNewsParams();
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { topic, date } = await params;

  if (!isTopicKey(topic)) {
    notFound();
  }

  // This route always renders Chinese. Switching to English navigates to the
  // dedicated /en/* route tree, so loading any English data here is dead
  // weight that only bloats the prerendered payload.
  const [entryZh, availableTopicsZh, topicPreviewsZh] = await Promise.all([
    getNewsEntry(topic, date, "zh"),
    getTopicsWithNewsForDate(date, "zh"),
    getEntryPreviewsByTopic(topic, "zh"),
  ]);

  const relatedZh = topicPreviewsZh
    .filter((entry) => entry.date !== date)
    .slice(0, 3);

  const { prev: prevDate, next: nextDate } = adjacentDates(
    topicPreviewsZh.map((entry) => entry.date),
    date,
  );

  const meta = getTopicMeta(topic, "zh");

  if (!entryZh || !meta) {
    notFound();
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: entryZh.title,
    description: entryZh.description,
    url: absoluteUrl(`/news/${topic}/${date}`),
    datePublished: `${date}T08:00:00.000Z`,
    dateModified: `${date}T08:00:00.000Z`,
    articleSection: meta.label,
    inLanguage: "zh-CN",
    isAccessibleForFree: true,
    wordCount: entryZh.content.split(/\s+/).filter(Boolean).length,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/snew-logo1.svg"),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/news/${topic}/${date}`),
    },
  };

  const { filePath: _filePath, content: zhContent, ...clientEntry } = entryZh;
  const deadLinks = await getDeadLinks();
  const events = (await getEventsForDigest(topic, date, "zh")).map((event) => ({
    id: event.id,
    title: event.title,
    topics: event.topics,
    memberCount: event.memberCount,
  }));
  const linkCheckedAt = await getLinkCheckedAt();
  const outline = outlineOf(zhContent);
  const articleBody = (
    <>
      <NewsMarkdown content={zhContent} deadLinks={deadLinks} articleDate={date} locale="zh" />
      <SourceHealthStrip content={zhContent} deadLinks={deadLinks} checkedAt={linkCheckedAt} locale="zh" />
    </>
  );

  return (
    <>
      <StructuredData data={structuredData} />
      <NewsDetailContent
        topic={topic}
        date={date}
        entry={clientEntry}
        articleBody={articleBody}
        outline={outline}
        availableTopics={availableTopicsZh}
        related={relatedZh}
        events={events}
        prevDate={prevDate}
        nextDate={nextDate}
      />
    </>
  );
}
