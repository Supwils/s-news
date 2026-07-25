/**
 * The one origin a production build is allowed to advertise.
 *
 * Hardcoded rather than read from the environment, because everything derived
 * from it — `<link rel="canonical">`, `sitemap.xml`, the `Sitemap:` line in
 * `robots.txt`, RSS channel and item links, OG/Twitter image URLs — is a
 * promise to the outside world about where this site lives. A missing
 * environment variable must not be able to change that promise silently.
 *
 * It did, for as long as the site has been deployed. With no
 * NEXT_PUBLIC_SITE_URL set on the Vercel project, `getSiteUrl()` fell through
 * to VERCEL_URL — the *per-deployment* host — so every daily deploy stamped all
 * ~2700 pages with a brand-new canonical origin
 * (`s-daily-news-deck-<hash>-….vercel.app`) and told Google that
 * news.supwil.com was not the canonical home of its own content. Measured
 * 2026-07-25: canonical, sitemap, robots and OG all pointed at that day's hash.
 *
 * Plain .mjs so `scripts/verify-canonical-origin.mjs` can import the same
 * constant it asserts on, without a second copy to drift.
 * `scripts/daily-news-and-commit.sh` hardcodes the same origin for the same
 * reason; if the domain ever moves, both change together.
 */
export const PRODUCTION_ORIGIN = "https://news.supwil.com";

/** Local `next dev` port, kept next to the origin it substitutes for. */
export const DEV_ORIGIN = "http://localhost:3011";
