import { readFileSync } from "node:fs";
import path from "node:path";

import type { NextConfig } from "next";

import {
  findRoutesNeedingMarkdown,
  NEWS_CORPUS_GLOB,
  toTracingKey,
} from "./scripts/news-runtime-routes.mjs";

/**
 * Two build-time constants, inlined into both the server and the client bundle.
 *
 * The masthead and the footer used to call `new Date()` during render. Every
 * page is `force-static`, so the build-time value was baked into the HTML while
 * the client recomputed "now" on hydration — a guaranteed mismatch, and a date
 * stamp that silently went stale for the life of the deployment. Reading the
 * values once here makes them identical on both sides and gives them a meaning
 * the clock never had: when the site was generated, and which issue is latest.
 */
function readLatestIssueDate(fallback: string) {
  try {
    const indexPath = path.join(process.cwd(), ".generated", "news-index.json");
    const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
      entries?: Array<{ date?: string }>;
    };
    // Entries are sorted date-desc by build-news-index.mjs.
    return index.entries?.[0]?.date ?? fallback;
  } catch {
    return fallback;
  }
}

const buildTime = new Date().toISOString();

/**
 * Keep the 31 MB digest corpus out of the serverless functions that never read it.
 *
 * NEWS/ stays on the filesystem, so the routes that render an article body must
 * carry the markdown into their function. Only those. `lib/news.ts` answers
 * everything else from `.generated/news-index*.json`.
 *
 * The route list is discovered from the imports of `lib/news-content.ts` — add a
 * route that reads a digest and it is covered automatically — and
 * `scripts/verify-build-trace.mjs` (postbuild) asserts the built output actually
 * matches. Without that check a mistake here is invisible locally and only
 * surfaces in production, on the first on-demand render of a page whose file was
 * never shipped.
 *
 * Key semantics, established by experiment against this Next version, because
 * they are not what the option names suggest:
 *   - a key is a **prefix glob** over the route path, so "/" covers every route;
 *   - "[" and "]" open a glob character class, so an unescaped "[topic]" matches
 *     nothing at all, silently — hence `toTracingKey`;
 *   - `outputFileTracingIncludes` is applied after the excludes and wins.
 */
/**
 * Response headers. Vercel already sends HSTS; everything below was missing, and
 * on a public repository the source is the threat model's starting point rather
 * than a secret.
 *
 * Deliberately NOT a full Content-Security-Policy yet. A useful `script-src`
 * here would have to cover the inline theme bootstrap in `app/layout.tsx`
 * (hashable, since every page is static), Vercel Analytics and Speed Insights,
 * and Pagefind's WebAssembly (`wasm-unsafe-eval`). Shipping that untested would
 * break search or silently drop analytics, so it is left as a separate change
 * with a browser test pass behind it. `frame-ancestors` needs none of that and
 * cannot break rendering, so it ships now.
 */
const SECURITY_HEADERS = [
  // Stop the browser from second-guessing Content-Type — the vector that turns
  // a served .json or .md into executable script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking. X-Frame-Options for old agents, frame-ancestors for the rest;
  // nothing here is meant to be embedded anywhere.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Send the origin cross-site, the full path same-site. Article URLs carry the
  // topic and date, which is more than a third party needs.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // A reading site asks for none of these. Denying them means an injected
  // script cannot ask either.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `x-powered-by: Next.js` told every visitor the framework for free.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: buildTime,
    NEXT_PUBLIC_LATEST_ISSUE_DATE: readLatestIssueDate(buildTime.slice(0, 10)),
  },
  outputFileTracingExcludes: {
    "/": [NEWS_CORPUS_GLOB],
  },
  outputFileTracingIncludes: Object.fromEntries(
    findRoutesNeedingMarkdown().map((route) => [toTracingKey(route), [NEWS_CORPUS_GLOB]]),
  ),
};

export default nextConfig;
