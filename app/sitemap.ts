import type { MetadataRoute } from "next";

import { localizePath } from "@/lib/locale-routing";
import { getAllNewsPreviews } from "@/lib/news";
import { getAllEventIds } from "@/lib/events";
import { getAllWeekIds } from "@/lib/rollups";
import { TOPICS } from "@/lib/news-meta";
import { absoluteUrl } from "@/lib/site";

// Revalidate sitemap daily — content only changes when new digests land.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Both calls are deduped by React.cache in lib/news.ts, so this is two
  // index reads total (one per locale) instead of three.
  const [entriesZh, entriesEn, weekIdsZh, weekIdsEn, eventIdsZh, eventIdsEn] = await Promise.all([
    getAllNewsPreviews("zh"),
    getAllNewsPreviews("en"),
    getAllWeekIds("zh"),
    getAllWeekIds("en"),
    getAllEventIds("zh"),
    getAllEventIds("en"),
  ]);
  const monthsOf = (entries: typeof entriesZh) =>
    [...new Set(entries.map((entry) => entry.date.slice(0, 7)))].sort((left, right) =>
      right.localeCompare(left),
    );

  const archiveMonths = monthsOf(entriesZh);
  // Only advertise English archive months that actually hold English digests.
  // Deriving these from the Chinese index listed contentless `/en/archive/<month>`
  // shells whose hreflang claimed to be the equivalent of a populated zh archive.
  const archiveMonthsEn = monthsOf(entriesEn);

  const staticPagesZh: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/about"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/feed.xml"),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.4,
    },
  ];

  const staticPagesEn: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl(localizePath("/", "en")),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absoluteUrl(localizePath("/about", "en")),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl(localizePath("/feed.xml", "en")),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.3,
    },
  ];

  const topicPagesZh: MetadataRoute.Sitemap = TOPICS.flatMap((topic) => [
    {
      url: absoluteUrl(`/news/${topic.key}`),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absoluteUrl(`/news/${topic.key}/feed.xml`),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.3,
    },
  ]);

  const topicPagesEn: MetadataRoute.Sitemap = TOPICS.flatMap((topic) => [
    {
      url: absoluteUrl(localizePath(`/news/${topic.key}`, "en")),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: absoluteUrl(localizePath(`/news/${topic.key}/feed.xml`, "en")),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.2,
    },
  ]);

  const archivePagesZh: MetadataRoute.Sitemap = archiveMonths.map((month) => ({
    url: absoluteUrl(`/archive/${month}`),
    lastModified: new Date(`${month}-01T08:00:00.000Z`),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const archivePagesEn: MetadataRoute.Sitemap = archiveMonthsEn.map((month) => ({
    url: absoluteUrl(localizePath(`/archive/${month}`, "en")),
    lastModified: new Date(`${month}-01T08:00:00.000Z`),
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  const entryPagesZh: MetadataRoute.Sitemap = entriesZh.map((entry) => ({
    url: absoluteUrl(`/news/${entry.topic}/${entry.date}`),
    lastModified: new Date(`${entry.date}T08:00:00.000Z`),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const entryPagesEn: MetadataRoute.Sitemap = entriesEn.map((entry) => ({
    url: absoluteUrl(localizePath(`/news/${entry.topic}/${entry.date}`, "en")),
    lastModified: new Date(`${entry.date}T08:00:00.000Z`),
    changeFrequency: "daily",
    priority: 0.5,
  }));

  const weeklyIndexPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/weekly"), lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    {
      url: absoluteUrl(localizePath("/weekly", "en")),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  const weeklyPagesZh: MetadataRoute.Sitemap = weekIdsZh.map((weekId) => ({
    url: absoluteUrl(`/weekly/${weekId}`),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const weeklyPagesEn: MetadataRoute.Sitemap = weekIdsEn.map((weekId) => ({
    url: absoluteUrl(localizePath(`/weekly/${weekId}`, "en")),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  const eventIndexPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/events"), lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    {
      url: absoluteUrl(localizePath("/events", "en")),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.5,
    },
  ];

  const eventPagesZh: MetadataRoute.Sitemap = eventIdsZh.map((id) => ({
    url: absoluteUrl(`/events/${id}`),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  const eventPagesEn: MetadataRoute.Sitemap = eventIdsEn.map((id) => ({
    url: absoluteUrl(localizePath(`/events/${id}`, "en")),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.3,
  }));

  return [
    ...weeklyIndexPages,
    ...weeklyPagesZh,
    ...weeklyPagesEn,
    ...eventIndexPages,
    ...eventPagesZh,
    ...eventPagesEn,
    ...staticPagesZh,
    ...staticPagesEn,
    ...topicPagesZh,
    ...topicPagesEn,
    ...archivePagesZh,
    ...archivePagesEn,
    ...entryPagesZh,
    ...entryPagesEn,
  ];
}
