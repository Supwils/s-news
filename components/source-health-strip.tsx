import { isCoveredByCheck, summarizeSources } from "@/lib/source-health";
import type { DeadLinks } from "@/lib/link-health";

/**
 * A colophon line for the digest's citations: how many sources it cites, how
 * many still resolve, and when that was last verified.
 *
 * The archive already checks every external URL weekly and quietly reroutes the
 * unreachable ones to the Web Archive, but a reader had no way to know any of
 * that was happening — the product promises traceability and then kept the
 * evidence to itself. This says it out loud.
 *
 * Server-rendered like the article body it follows: the numbers are known at
 * build time, so nothing here reaches the client.
 */

type Props = {
  content: string;
  deadLinks: DeadLinks;
  /** This issue's date, compared against the report to know if it was covered. */
  articleDate: string;
  /** ISO timestamp from the report; null when there is no usable report. */
  checkedAt: string | null;
  locale: "zh" | "en";
};

function formatCheckedAt(checkedAt: string, locale: "zh" | "en") {
  const date = new Date(checkedAt);
  if (Number.isNaN(date.getTime())) return null;
  // Fixed UTC parts rather than toLocaleDateString: this renders at build time,
  // and the build machine's zone must not decide what date a reader sees.
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  if (locale === "en") {
    const name = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1];
    return `${name} ${day}, ${year}`;
  }
  return `${year}年${month}月${day}日`;
}

export function SourceHealthStrip({ content, deadLinks, articleDate, checkedAt, locale }: Props) {
  const { total, reachable, archived } = summarizeSources(content, deadLinks);

  // A digest with no links has nothing to attest to; an empty strip would be
  // noise that says "0 sources verified".
  if (total === 0) return null;

  const verifiedOn = checkedAt ? formatCheckedAt(checkedAt, locale) : null;
  const covered = isCoveredByCheck(articleDate, checkedAt);

  // An issue newer than the last check is not "all reachable" — it is unknown.
  // The report only records dead URLs, so its silence about these is not
  // evidence, and the check runs weekly: on most days this is the newest issue.
  const parts = !covered
    ? locale === "en"
      ? [`${total} ${total === 1 ? "source" : "sources"} cited`, "not yet verified"]
      : [`本期引用来源 ${total} 条`, "尚未校验"]
    : locale === "en"
      ? [
          `${total} ${total === 1 ? "source" : "sources"} cited`,
          archived === 0 ? "all still reachable" : `${reachable} reachable · ${archived} archived`,
        ]
      : [
          `本期引用来源 ${total} 条`,
          archived === 0 ? "全部可达" : `${reachable} 条可达 · ${archived} 条已转存档`,
        ];

  const verifiedLine =
    verifiedOn === null
      ? null
      : locale === "en"
        ? `Links last verified ${verifiedOn}`
        : `链接最近校验于 ${verifiedOn}`;

  return (
    <aside
      aria-label={locale === "en" ? "Source verification" : "来源校验"}
      className="np-mono mt-12 border-t border-(--color-border) pt-4 text-[12px] leading-6 tracking-[0.06em] text-(--color-text-muted)"
    >
      <p>
        {parts.join(" · ")}
        {covered && archived > 0 ? (
          <span className="ml-1.5 text-(--np-ink-red)">
            {locale === "en" ? "(opens Web Archive)" : "（打开存档快照）"}
          </span>
        ) : null}
      </p>
      {verifiedLine ? <p className="mt-0.5">{verifiedLine}</p> : null}
    </aside>
  );
}
