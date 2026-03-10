import type { Locale } from "@/data/copy";
import { getTopicMeta, type TopicKey } from "@/lib/news-meta";
import type { NewsPreview } from "@/lib/news";

export function groupPreviewsByDate(entries: NewsPreview[]) {
  return [...entries]
    .sort((left, right) => {
      if (left.date !== right.date) {
        return right.date.localeCompare(left.date);
      }

      return left.topic.localeCompare(right.topic);
    })
    .reduce<
      Array<{
        date: string;
        entries: NewsPreview[];
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
