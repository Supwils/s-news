import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

/**
 * Reads the committed link-health report and exposes the set of URLs the checker
 * found unreachable, plus a Web Archive fallback for them.
 *
 * The report is produced out-of-band by scripts/check-links.mjs (which needs the
 * internet) and committed like NEWS content, so the build never depends on it.
 * A missing or malformed file degrades to "no dead links known" — the feature
 * is simply off, never a build error.
 */

export type DeadLinks = Set<string>;

type LinkHealthFile = {
  version: number;
  checkedAt: string;
  dead?: Record<string, { status: number | string }>;
};

const LINK_HEALTH_PATH = path.join(process.cwd(), "link-health.json");

export const getDeadLinks = cache(async (): Promise<DeadLinks> => {
  try {
    const raw = await fs.readFile(LINK_HEALTH_PATH, "utf8");
    const parsed = JSON.parse(raw) as LinkHealthFile;
    return new Set(Object.keys(parsed.dead ?? {}));
  } catch {
    return new Set();
  }
});

/**
 * `checkedAt` from the report, or null when there is no usable report.
 *
 * The reader is told when the citations were last verified, so an absent or
 * unparseable file must read as "we don't know" rather than as a date.
 */
export const getLinkCheckedAt = cache(async (): Promise<string | null> => {
  try {
    const raw = await fs.readFile(LINK_HEALTH_PATH, "utf8");
    const parsed = JSON.parse(raw) as LinkHealthFile;
    return typeof parsed.checkedAt === "string" ? parsed.checkedAt : null;
  } catch {
    return null;
  }
});

/**
 * A Wayback Machine URL for `url` as of `date` (YYYY-MM-DD) — the page as it was
 * around when the digest cited it. Wayback redirects the compact-date form to
 * the nearest capture, so no availability lookup is needed.
 */
export function archiveUrl(date: string, url: string) {
  const stamp = date.replace(/-/g, "");
  return `https://web.archive.org/web/${stamp || "2"}/${url}`;
}
