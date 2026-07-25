import type { Locale } from "@/data/copy";
// Relative, not "@/lib/...": tests/site-origin.test.mjs imports this module
// under plain node, which does not resolve the tsconfig path alias. The
// `@/data/copy` import above survives only because it is type-only and gets
// stripped before execution.
import { DEV_ORIGIN, PRODUCTION_ORIGIN } from "./site-origin.mjs";

export const SITE_NAME = "Swil-News";
export const SITE_DESCRIPTION =
  "Local-first daily news desk with archived multi-topic AI-generated digests.";
export const SITE_DEFAULT_LOCALE: Locale = "zh";

const SITE_DESCRIPTION_BY_LOCALE: Record<Locale, string> = {
  zh: "本地优先的每日新闻台，归档多主题 AI 日报。",
  en: SITE_DESCRIPTION,
};

export function getSiteDescription(locale: Locale) {
  return SITE_DESCRIPTION_BY_LOCALE[locale];
}

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * The origin every outbound URL on this site is built from.
 *
 * Order matters, and each step is here for a reason:
 *   1–2. an explicit override always wins — that is how a one-off build, a
 *        test, or `scripts/daily-news-and-commit.sh` retargets the site;
 *   3.   a *production* build has exactly one correct answer and must never
 *        guess it from the deployment it happens to be running in. See
 *        lib/site-origin.mjs for what guessing cost;
 *   4.   a preview is the one place a per-deployment host is right — a preview
 *        should link to itself, not to production;
 *   5.   otherwise this is `next dev`.
 *
 * Only server code reads this (asserted by tests/site-origin.test.mjs), so
 * plain `process.env` is available; none of these need a NEXT_PUBLIC_ prefix.
 */
export function getSiteUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    (process.env.VERCEL_ENV === "production" ? PRODUCTION_ORIGIN : undefined) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  return normalizeBaseUrl(envUrl ?? DEV_ORIGIN);
}

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${getSiteUrl()}/`).toString();
}

export function getLanguageTag(locale: Locale) {
  return locale === "en" ? "en-US" : "zh-CN";
}

export function getOpenGraphLocale(locale: Locale) {
  return locale === "en" ? "en_US" : "zh_CN";
}
