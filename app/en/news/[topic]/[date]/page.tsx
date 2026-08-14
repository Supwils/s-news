import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NewsDetailContent } from "@/components/news-detail-content";
import { adjacentDates } from "@/lib/adjacent-dates";
import { NewsMarkdown } from "@/components/news-markdown-block";
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

  const entryEn = await getNewsEntry(topic, date, "en");
  const entryZh = entryEn ? null : await getNewsEntry(topic, date, "zh");
  const entry = entryEn ?? entryZh;
  const meta = getTopicMeta(topic, "en");
  const canonicalPath = localizePath(`/news/${topic}/${date}`, "en");

  if (!entry) {
    return {};
  }

  return {
    title: entry.title,
    description: entry.description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        "zh-CN": `/news/${topic}/${date}`,
        "en-US": canonicalPath,
      },
    },
    openGraph: {
      type: "article",
      url: canonicalPath,
      siteName: SITE_NAME,
      title: entry.title,
      description: entry.description,
      locale: entryEn ? "en_US" : "zh_CN",
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

/**
 * Prerender only the entries that have an English digest.
 *
 * A Chinese-only entry still resolves under `/en` — the page falls back to the
 * Chinese body below — but it is not in the English sitemap, so nothing links
 * to it and no crawler asks for it. Prerendering those ~360 pages cost build
 * output for URLs nobody requests; they are generated on demand and cached on
 * the first (rare) hit instead. `dynamicParams` stays at its default of true.
 */
export async function generateStaticParams() {
  return getAllNewsParams("en");
}

export default async function EnglishNewsDetailPage({ params }: NewsDetailPageProps) {
  const { topic, date } = await params;

  if (!isTopicKey(topic)) {
    notFound();
  }

  // This route renders English. Only fall back to the Chinese original when
  // no English translation exists — loading the Chinese body unconditionally
  // doubles the prerendered payload for every page that *does* have a
  // translation (the common case).
  const [entryEn, availableTopicsEn, topicPreviewsEn] = await Promise.all([
    getNewsEntry(topic, date, "en"),
    getTopicsWithNewsForDate(date, "en"),
    getEntryPreviewsByTopic(topic, "en"),
  ]);

  const entryZh = entryEn ? null : await getNewsEntry(topic, date, "zh");

  const relatedEn = topicPreviewsEn
    .filter((entry) => entry.date !== date)
    .slice(0, 3);

  // Pager steps stay inside the English index: a Chinese-only date is not
  // advertised on /en (no sitemap entry, no links), and the pager keeps it
  // that way by jumping to the nearest indexed English issues instead.
  const { prev: prevDate, next: nextDate } = adjacentDates(
    topicPreviewsEn.map((entry) => entry.date),
    date,
  );

  const meta = getTopicMeta(topic, "en");
  const activeEntry = entryEn ?? entryZh;

  if (!activeEntry || !meta) {
    notFound();
  }

  const canonicalPath = localizePath(`/news/${topic}/${date}`, "en");

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: activeEntry.title,
    description: activeEntry.description,
    url: absoluteUrl(canonicalPath),
    datePublished: `${date}T08:00:00.000Z`,
    dateModified: `${date}T08:00:00.000Z`,
    articleSection: meta.label,
    inLanguage: entryEn ? "en-US" : "zh-CN",
    isAccessibleForFree: true,
    wordCount: activeEntry.content.split(/\s+/).filter(Boolean).length,
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
      "@id": absoluteUrl(canonicalPath),
    },
  };

  const { filePath: _filePath, content, ...clientEntry } = activeEntry;
  const deadLinks = await getDeadLinks();
  const events = (await getEventsForDigest(topic, date, "en")).map((event) => ({
    id: event.id,
    title: event.title,
    topics: event.topics,
    memberCount: event.memberCount,
  }));
  const linkCheckedAt = await getLinkCheckedAt();
  const outline = outlineOf(content);
  const articleBody = (
    <>
      <NewsMarkdown content={content} deadLinks={deadLinks} articleDate={date} locale={entryEn ? "en" : "zh"} />
      <SourceHealthStrip
        content={content}
        deadLinks={deadLinks}
        checkedAt={linkCheckedAt}
        locale={entryEn ? "en" : "zh"}
      />
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
        availableTopics={availableTopicsEn}
        related={relatedEn}
        isChineseFallback={!entryEn}
        events={events}
        prevDate={prevDate}
        nextDate={nextDate}
      />
    </>
  );
}
