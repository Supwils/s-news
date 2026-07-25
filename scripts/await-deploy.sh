#!/usr/bin/env bash
#
# await-deploy.sh [BASE_URL]
#
# Blocks until the commit that was just pushed is actually being served, or
# gives up and says so.
#
# Why this exists: the daily job used to `sleep 150` after `git push` and then
# warm the cache. Vercel needs longer than that — clone, install, prebuild
# (pagefind alone is ~9s), build, and upload ~2700 prerendered pages plus a
# 32 MB search index. So on 2026-07-24 every one of the twenty warmup requests
# for that day's articles returned 404: the warmup ran against the *previous*
# deployment, and since Vercel keys its CDN cache per deployment, the other
# forty-odd 200s were thrown away when the new build went live moments later.
# The pages that get the most traffic were the only ones never warmed.
#
# The probe is the newest article path in the local index — a URL that exists in
# the new deployment and in no earlier one, which makes "is it live yet" an
# exact question rather than a guess. That also makes this the pipeline's deploy
# verification: until now nothing between `git push` and the success email ever
# checked that the site had changed.
#
# Exit status:
#   0  the new deployment is serving (or there was nothing to probe)
#   1  still not live when the wait window expired
#
# Environment:
#   AWAIT_DEPLOY_TIMEOUT    total seconds to wait   (default 600)
#   AWAIT_DEPLOY_INTERVAL   seconds between probes  (default 15)

set -Eeo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

BASE_URL="${1:-${SITE_URL:-${NEXT_PUBLIC_SITE_URL:-}}}"
BASE_URL="${BASE_URL%/}"
if [[ -z "$BASE_URL" ]]; then
  echo "[await-deploy] No base URL (pass as arg or set SITE_URL / NEXT_PUBLIC_SITE_URL); skipping." >&2
  exit 0
fi

INDEX_FILE=".generated/news-index.json"
TIMEOUT_SECS="${AWAIT_DEPLOY_TIMEOUT:-600}"
INTERVAL_SECS="${AWAIT_DEPLOY_INTERVAL:-15}"

# Newest entry in the freshly rebuilt index, as a path. Empty if the index is
# missing or unreadable — in which case there is nothing to verify against.
PROBE_PATH="$(node --input-type=module -e '
  import { readFileSync } from "node:fs";
  try {
    const idx = JSON.parse(readFileSync(process.argv[1], "utf8"));
    const entries = Array.isArray(idx.entries) ? idx.entries : [];
    // build-news-index.mjs sorts date-desc, but do not lean on it.
    const newest = entries.reduce((a, b) => (a && a.date >= b.date ? a : b), null);
    if (newest?.topic && newest?.date) {
      console.log("/news/" + newest.topic + "/" + newest.date);
    }
  } catch { /* best-effort: emit nothing */ }
' "$INDEX_FILE" 2>/dev/null || true)"

if [[ -z "$PROBE_PATH" ]]; then
  echo "[await-deploy] Could not read a probe path from ${INDEX_FILE}; skipping the wait." >&2
  exit 0
fi

probe() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 20 "${BASE_URL}${PROBE_PATH}" || echo "000"
}

echo "[await-deploy] Waiting for ${BASE_URL}${PROBE_PATH} (up to ${TIMEOUT_SECS}s)"
STARTED="$(date +%s)"
while :; do
  CODE="$(probe)"
  ELAPSED="$(( $(date +%s) - STARTED ))"
  if [[ "$CODE" == "200" ]]; then
    echo "[await-deploy] Live after ${ELAPSED}s."
    exit 0
  fi
  if [[ "$ELAPSED" -ge "$TIMEOUT_SECS" ]]; then
    echo "[await-deploy] Still ${CODE} after ${ELAPSED}s — the deployment is not serving the new issue." >&2
    exit 1
  fi
  echo "[await-deploy] ${CODE} at +${ELAPSED}s; retrying in ${INTERVAL_SECS}s"
  sleep "$INTERVAL_SECS"
done
