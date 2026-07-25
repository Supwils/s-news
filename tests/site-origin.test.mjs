import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { DEV_ORIGIN, PRODUCTION_ORIGIN } from "../lib/site-origin.mjs";
import { absoluteUrl, getSiteUrl } from "../lib/site.ts";

/**
 * Every outbound URL this site emits — canonical, sitemap, robots, RSS, OG —
 * is built from getSiteUrl(). It resolved from the environment with no
 * production fallback, so it was correct on every developer machine and wrong
 * on Vercel for the life of the deployment. These assertions pin the resolution
 * order; scripts/verify-canonical-origin.mjs checks the built artifacts.
 */

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** getSiteUrl() reads process.env per call, so the env can be swapped per case. */
function withEnv(overrides, run) {
  const keys = ["NEXT_PUBLIC_SITE_URL", "SITE_URL", "VERCEL_ENV", "VERCEL_URL"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    for (const [key, value] of Object.entries(overrides)) process.env[key] = value;
    run();
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

test("a production build never inherits the per-deployment host", () => {
  withEnv({ VERCEL_ENV: "production", VERCEL_URL: "s-daily-news-deck-9dhg92ild-x.vercel.app" }, () => {
    assert.equal(getSiteUrl(), PRODUCTION_ORIGIN);
    assert.equal(
      absoluteUrl("/news/finance/2026-06-17"),
      `${PRODUCTION_ORIGIN}/news/finance/2026-06-17`,
    );
  });
});

test("a preview build links to itself, not to production", () => {
  withEnv({ VERCEL_ENV: "preview", VERCEL_URL: "s-daily-news-deck-abc123-x.vercel.app" }, () => {
    assert.equal(getSiteUrl(), "https://s-daily-news-deck-abc123-x.vercel.app");
  });
});

test("an explicit override still wins everywhere", () => {
  withEnv({ NEXT_PUBLIC_SITE_URL: "https://staging.example.com/", VERCEL_ENV: "production" }, () => {
    assert.equal(getSiteUrl(), "https://staging.example.com", "trailing slash is normalized away");
  });
  withEnv({ SITE_URL: "https://alt.example.com", VERCEL_ENV: "production" }, () => {
    assert.equal(getSiteUrl(), "https://alt.example.com");
  });
});

test("outside Vercel this is next dev", () => {
  withEnv({}, () => {
    assert.equal(getSiteUrl(), DEV_ORIGIN);
  });
});

test("the daily job and the site agree on the production origin", () => {
  // scripts/daily-news-and-commit.sh hardcodes SITE_URL for the cache warmup
  // and the deploy probe. If the domain moves and only one side is updated,
  // the pipeline warms a site the pages do not claim to live on.
  const script = readFileSync(
    path.join(PROJECT_ROOT, "scripts", "daily-news-and-commit.sh"),
    "utf8",
  );
  assert.match(
    script,
    new RegExp(`SITE_URL:=${PRODUCTION_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
    `daily-news-and-commit.sh must default SITE_URL to ${PRODUCTION_ORIGIN}`,
  );
});

test("only server code reads the origin", () => {
  // getSiteUrl() reads VERCEL_ENV, which has no NEXT_PUBLIC_ prefix and is
  // therefore undefined in the browser. A client component calling it would
  // silently fall all the way through to DEV_ORIGIN in production.
  const importers = [
    "app/layout.tsx",
    "app/sitemap.ts",
    "app/robots.ts",
    "lib/rss.ts",
  ];
  for (const file of importers) {
    const source = readFileSync(path.join(PROJECT_ROOT, file), "utf8");
    assert.doesNotMatch(
      source.split("\n").slice(0, 3).join("\n"),
      /"use client"/,
      `${file} reads the site origin and must stay a server module`,
    );
  }
});
