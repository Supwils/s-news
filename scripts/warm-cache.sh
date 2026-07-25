#!/usr/bin/env bash
#
# Best-effort edge-cache warmup for the hot set of pages.
#
# Why: every daily deploy ships a fresh build, which leaves Vercel's edge cache
# COLD for all prerendered pages. The first visitor to each page in each region
# then pays the origin fetch, which is the dominant contributor to the high TTFB
# seen on /news/[topic]/[date] in Speed Insights.
#
# The hot set:
#   - both home pages
#   - the newest $WARM_DAYS days of articles, per locale
#   - all ten topic pages (zh + en) — linked from every masthead
#   - the current month's archive, /weekly, /events, the current week (zh + en)
#
# On $WARM_DAYS, and why it is small on purpose.
#
# "Newest" is the wrong model of this site's traffic: measured 2026-07-25, the
# most-visited pages were /news/finance/2026-06-17 (38 days old),
# /news/finance/2026-07-03, /news/supply-chain/2026-07-09 — readers arrive from
# Google onto a specific old story, not onto today's issue. So a wide window was
# tried: 45 issue-days, 924 URLs, 177s, all 2xx.
#
# It was reverted the same day. Two reasons, in order:
#   - The benefit is unprovable from here. A warmup from one location populates
#     one POP (this runs from a laptop, so pdx1). Without knowing where readers
#     actually are, widening the window may help nobody.
#   - The cost is certain. Against a baseline of ~96 edge requests per 5 minutes,
#     924 requests in under 3 minutes reads as a 9.85x anomaly — Vercel alerted
#     on it. Daily. An alert that fires every day is an alert you stop reading,
#     which is the same failure this script itself was fixed for on 2026-07-24.
#
# Trading a certain noise for an unprovable gain is a bad trade. The targeted
# version of this idea — warm the Top-N pages Vercel Analytics actually reports
# — is the right one, and it needs an API token rather than a bigger number.
# Until then this covers the nav-reachable set only. WARM_DAYS raises it.
#
# Scope/limits, both real:
#   - a warmup from a single location only populates the POP(s) that serve
#     these requests. This runs from the maintainer's laptop, so it warms one
#     POP (pdx1). Readers elsewhere still pay the cold fetch. Fixing that needs
#     the warmup to run from Vercel, and even then it is per-region.
#   - it cannot outrun the invalidation: every daily deploy re-cools all ~2700
#     pages, so this is a mitigation, not a solution.
#
# Requests are sent with a distinctive User-Agent so this job's own traffic is
# filterable in Vercel's logs — it is otherwise indistinguishable from a
# crawler, which is exactly the confusion that made the 2026-07-25 traffic
# audit hard to read.
#
# Usage:
#   scripts/warm-cache.sh [BASE_URL]
#   SITE_URL=https://example.com WARM_DAYS=3 scripts/warm-cache.sh
#
# Base URL resolution: first CLI arg > $SITE_URL > $NEXT_PUBLIC_SITE_URL.
# If none is set, the script logs and exits 0 (never fails its caller).

set -Eeo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

BASE_URL="${1:-${SITE_URL:-${NEXT_PUBLIC_SITE_URL:-}}}"
BASE_URL="${BASE_URL%/}"
if [[ -z "$BASE_URL" ]]; then
  echo "[warm-cache] No base URL (pass as arg or set SITE_URL / NEXT_PUBLIC_SITE_URL); skipping." >&2
  exit 0
fi

WARM_DAYS="${WARM_DAYS:-3}"
WARM_CONCURRENCY="${WARM_CONCURRENCY:-12}"
WARM_USER_AGENT="${WARM_USER_AGENT:-swil-news-warmup/1 (+https://news.supwil.com)}"

# Every path worth warming, one per line. Empty if the indexes are missing or
# unreadable — the home pages are still warmed in that case.
#
# Each locale's paths come from that locale's own index. The old version derived
# the English list by prefixing "/en" onto every Chinese path, which held only
# because the window was two days: 360 Chinese entries across 40 dates have no
# English issue at all, so a wider window would have warmed a few hundred 404s
# and tripped the miss-rate gate below.
HOT_PATHS="$(node --input-type=module -e '
  import { readFileSync } from "node:fs";
  const warmDays = Number(process.argv[1]) || 1;
  const { isoWeekId } = await import("./lib/iso-week.mjs");

  const LOCALES = [
    { prefix: "", index: ".generated/news-index.json" },
    { prefix: "/en", index: ".generated/news-index-en.json" },
  ];

  for (const { prefix, index } of LOCALES) {
    try {
      const idx = JSON.parse(readFileSync(index, "utf8"));
      const entries = Array.isArray(idx.entries) ? idx.entries : [];
      if (!entries.length) continue;

      const days = new Set(
        [...new Set(entries.map((e) => e.date))].sort().reverse().slice(0, warmDays),
      );
      const newest = [...days].sort().reverse()[0];

      const out = [];
      for (const e of entries) {
        if (days.has(e.date)) out.push(`/news/${e.topic}/${e.date}`);
      }
      for (const topic of [...new Set(entries.map((e) => e.topic))]) {
        out.push(`/news/${topic}`);
      }
      out.push(`/archive/${newest.slice(0, 7)}`);
      // Nav entry pages added 2026-07: weekly rollups and cross-topic events.
      out.push("/weekly");
      out.push("/events");
      out.push(`/weekly/${isoWeekId(newest)}`);

      for (const p of out) console.log(prefix + p);
    } catch (_) { /* best-effort: this locale contributes nothing */ }
  }
' "$WARM_DAYS" 2>/dev/null || true)"

# Every response code, one per line, for the tally at the end. Lines are short
# enough that concurrent appends stay atomic.
WARM_RESULTS="$(mktemp "${TMPDIR:-/tmp}/warm-cache-XXXXXX")"
trap 'rm -f "$WARM_RESULTS"' EXIT

warm_one() {
  local path="$1"
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 \
    -A "$WARM_USER_AGENT" "${BASE_URL}${path}" || echo "000")"
  printf '%s %s\n' "$code" "$path" >>"$WARM_RESULTS"
}
export -f warm_one
export BASE_URL WARM_RESULTS WARM_USER_AGENT

STARTED_AT="$(date +%s)"
echo "[warm-cache] Warming hot set on ${BASE_URL} (newest ${WARM_DAYS} day(s), ${WARM_CONCURRENCY}-way)"
warm_one "/"
warm_one "/en"

if [[ -n "$HOT_PATHS" ]]; then
  # Failures are already swallowed by warm_one, so xargs never returns non-zero.
  # Nothing is echoed per URL: the tally below, plus the full list of failures,
  # is what is worth reading, and a per-URL log buries every other step of the
  # job as soon as WARM_DAYS is raised.
  echo "$HOT_PATHS" | grep -v '^$' | xargs -P "$WARM_CONCURRENCY" -I{} bash -c 'warm_one "$@"' _ {}
fi

# Report the tally, and fail loudly when the warmup mostly missed.
#
# This script used to exit 0 unconditionally, so on 2026-07-24 it reported
# "Done." after twenty consecutive 404s and the job sent a success email. A
# warmup that cannot reach the pages it is warming is the clearest possible
# signal that the deploy is not live, and it was the one signal being discarded.
TOTAL="$(wc -l <"$WARM_RESULTS" | tr -d ' ')"
OK="$(grep -c '^2' "$WARM_RESULTS" || true)"
BAD="$((TOTAL - OK))"
ELAPSED="$(( $(date +%s) - STARTED_AT ))"
echo "[warm-cache] Done in ${ELAPSED}s. ${OK}/${TOTAL} warmed, ${BAD} not 2xx."

if [[ "$BAD" -gt 0 ]]; then
  echo "[warm-cache] Non-2xx responses:" >&2
  grep -v '^2' "$WARM_RESULTS" | sed 's/^/  /' >&2 || true
fi

MAX_FAIL_PCT="${WARM_MAX_FAIL_PCT:-20}"
if [[ "$TOTAL" -gt 0 && "$(( BAD * 100 / TOTAL ))" -gt "$MAX_FAIL_PCT" ]]; then
  echo "[warm-cache] FAILED: ${BAD}/${TOTAL} non-2xx exceeds WARM_MAX_FAIL_PCT=${MAX_FAIL_PCT}%." >&2
  exit 1
fi
