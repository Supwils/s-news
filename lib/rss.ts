import { type Locale } from "@/data/copy";
import { localizePath } from "@/lib/locale-routing";
import { getAllNewsPreviews, getEntryPreviewsByTopic, type NewsPreview } from "@/lib/news";
import { getTopicMeta, isTopicKey, type TopicKey } from "@/lib/news-meta";
import { absoluteUrl, getSiteDescription, SITE_NAME } from "@/lib/site";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getEntryDate(entry: NewsPreview) {
  return new Date(`${entry.date}T08:00:00.000Z`).toUTCString();
}

function buildItemDescription(entry: NewsPreview, locale: Locale) {
  const label = locale === "en" ? "Highlights" : "要点";
  const highlights = entry.highlights.length > 0 ? ` | ${label}: ${entry.highlights.join(" / ")}` : "";
  return `${entry.description}${highlights}`;
}

function buildFeedXml({
  title,
  description,
  feedPath,
  entries,
  locale,
}: {
  title: string;
  description: string;
  feedPath: string;
  entries: NewsPreview[];
  locale: Locale;
}) {
  // Every URL in the feed must stay inside the feed's own locale tree: an item
  // <link> that drops the /en prefix sends English subscribers to the Chinese
  // page, and an unlocalized <guid> makes readers dedupe the two feeds together.
  const siteUrl = absoluteUrl(localizePath("/", locale));
  const feedUrl = absoluteUrl(feedPath);

  const items = entries
    .slice(0, 50)
    .map((entry) => {
      const url = absoluteUrl(localizePath(`/news/${entry.topic}/${entry.date}`, locale));
      return [
        "<item>",
        `<title>${escapeXml(entry.title)}</title>`,
        `<link>${escapeXml(url)}</link>`,
        `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `<pubDate>${escapeXml(getEntryDate(entry))}</pubDate>`,
        `<description>${escapeXml(buildItemDescription(entry, locale))}</description>`,
        "</item>",
      ].join("");
    })
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    `<title>${escapeXml(title)}</title>`,
    `<link>${escapeXml(siteUrl)}</link>`,
    `<description>${escapeXml(description)}</description>`,
    `<language>${locale === "en" ? "en-US" : "zh-CN"}</language>`,
    `<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    items,
    "</channel>",
    "</rss>",
  ].join("");
}

export async function buildGlobalFeed(locale: Locale = "zh") {
  const entries = await getAllNewsPreviews(locale);
  return buildFeedXml({
    title: SITE_NAME,
    description: getSiteDescription(locale),
    feedPath: localizePath("/feed.xml", locale),
    entries,
    locale,
  });
}

export async function buildTopicFeed(topicValue: string, locale: Locale = "zh") {
  if (!isTopicKey(topicValue)) {
    return null;
  }

  const topic = topicValue as TopicKey;
  const meta = getTopicMeta(topic, locale);
  if (!meta) {
    return null;
  }

  const entries = await getEntryPreviewsByTopic(topic, locale);
  return buildFeedXml({
    title: `${SITE_NAME} · ${meta.label}`,
    description: meta.description,
    feedPath: localizePath(`/news/${topic}/feed.xml`, locale),
    entries,
    locale,
  });
}
