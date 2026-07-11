import type { Locale } from "@/data/copy";
import { getTopicMeta, type TopicKey } from "@/lib/news-meta";
import { TOPICS } from "@/lib/news-meta";
import type { NewsCardEntry, NewsPreview } from "@/lib/news";

const TOPIC_ORDER = TOPICS.map((topic) => topic.key);

export function groupPreviewsByDate<T extends NewsCardEntry>(entries: T[]) {
  return [...entries]
    .sort((left, right) => {
      if (left.date !== right.date) {
        return right.date.localeCompare(left.date);
      }

      return TOPIC_ORDER.indexOf(left.topic) - TOPIC_ORDER.indexOf(right.topic);
    })
    .reduce<
      Array<{
        date: string;
        entries: T[];
      }>
    >((groups, entry) => {
      const current = groups.at(-1);

      if (!current || current.date !== entry.date) {
        groups.push({ date: entry.date, entries: [entry] });
        return groups;
      }

      current.entries.push(entry);
      return groups;
    }, []);
}

export function groupDateSectionsByMonth(
  groups: Array<{
    date: string;
    entries: NewsPreview[];
  }>,
) {
  return groups.reduce<
    Array<{
      month: string;
      groups: Array<{
        date: string;
        entries: NewsPreview[];
      }>;
    }>
  >((months, group) => {
    const month = group.date.slice(0, 7);
    const current = months.at(-1);

    if (!current || current.month !== month) {
      months.push({ month, groups: [group] });
      return months;
    }

    current.groups.push(group);
    return months;
  }, []);
}

export function searchEntries(
  entries: NewsPreview[],
  query: string,
  topic: TopicKey | "all",
  locale: Locale = "zh",
) {
  const normalized = query.trim().toLowerCase();

  return entries.filter((entry) => {
    if (topic !== "all" && entry.topic !== topic) {
      return false;
    }

    if (!normalized) {
      return true;
    }

    const haystack = `${entry.searchText} ${(getTopicMeta(entry.topic, locale)?.label ?? "").toLowerCase()}`;
    return haystack.includes(normalized);
  });
}

const MONTH_NAMES_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatArchiveMonth(month: string, locale: Locale = "zh") {
  const [year, monthValue] = month.split("-").map(Number);
  if (!year || !monthValue) {
    return month;
  }

  if (locale === "en") {
    return `${MONTH_NAMES_EN[monthValue - 1]} ${year}`;
  }
  return `${year}年${monthValue}月`;
}

export function formatDisplayDate(date: string, locale: Locale = "zh") {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    return date;
  }

  if (locale === "en") {
    return `${MONTH_NAMES_EN[month - 1]} ${day}, ${year}`;
  }
  return `${year}年${month}月${day}日`;
}
