#!/usr/bin/env bash
#
# Best-effort edge-cache warmup for the hot set of pages.
#
# Why: every daily deploy ships a fresh build, which leaves Vercel's edge cache
# COLD for all prerendered pages. The first visitor to each page in each region
# then pays the origin fetch, which is the dominant contributor to the high TTFB
# seen on /news/[topic]/[date] in Speed Insights.
#
# The hot set is everything a visitor reaches within one click of landing:
#   - both home pages
#   - the newest $WARM_DAYS days of articles (zh + en)
#   - all ten topic pages (zh + en) — linked from every masthead
#   - the current month's archive (zh + en) — linked from every masthead
#
# Scope/limits: a warmup from a single location only populates the POP(s) that
# serve these requests, not every region. It is a cheap, partial mitigation.
# For reliable, post-deploy, multi-region warming, run this from a Vercel Cron
# job instead of (or in addition to) the local daily script.
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

INDEX_FILE=".generated/news-index.json"
WARM_DAYS="${WARM_DAYS:-2}"
WARM_CONCURRENCY="${WARM_CONCURRENCY:-6}"

# Every path worth warming, one per line. Empty if the index is missing or
# unreadable — the home pages are still warmed in that case.
HOT_PATHS="$(node -e '
  const fs = require("fs");
  const [indexFile, warmDays] = process.argv.slice(1);
  const out = [];
  try {
    const idx = JSON.parse(fs.readFileSync(indexFile, "utf8"));
    const entries = Array.isArray(idx.entries) ? idx.entries : [];
    if (entries.length) {
      const days = [...new Set(entries.map((e) => e.date))].sort().reverse().slice(0, Number(warmDays) || 1);
      for (const e of entries.filter((e) => days.includes(e.date))) {
        out.push("/news/" + e.topic + "/" + e.date);
      }
      for (const topic of [...new Set(entries.map((e) => e.topic))]) {
        out.push("/news/" + topic);
      }
      out.push("/archive/" + days[0].slice(0, 7));
    }
  } catch (_) { /* best-effort: emit nothing */ }
  for (const p of out) {
    console.log(p);
    console.log("/en" + p);
  }
' "$INDEX_FILE" "$WARM_DAYS" 2>/dev/null || true)"

warm_one() {
  local path="$1"
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "${BASE_URL}${path}" || echo "000")"
  echo "[warm-cache] ${code} ${path}"
}
export -f warm_one
export BASE_URL

echo "[warm-cache] Warming hot set on ${BASE_URL} (newest ${WARM_DAYS} day(s))"
warm_one "/"
warm_one "/en"

if [[ -n "$HOT_PATHS" ]]; then
  # -P keeps a 60-URL warmup under a few seconds; failures are already swallowed
  # by warm_one, so xargs never returns non-zero.
  echo "$HOT_PATHS" | grep -v '^$' | xargs -P "$WARM_CONCURRENCY" -I{} bash -c 'warm_one "$@"' _ {}
fi

echo "[warm-cache] Done."
