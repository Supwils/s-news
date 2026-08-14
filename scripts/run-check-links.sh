#!/usr/bin/env bash
#
# Scheduled link-health check. Run this on its own cadence (weekly is plenty) —
# NOT from the daily news job, and NEVER from `prebuild`: it makes ~17k external
# requests and the build must not depend on the public internet.
#
# It regenerates link-health.json, which is a COMMITTED file (local → git →
# deploy, like NEWS). This script only refreshes and commits it; a missing file
# just turns the "archived" markers off, so a failed run is harmless.
#
# Example crontab (Mondays 04:00):
#   0 4 * * 1  /path/to/scripts/run-check-links.sh >> /path/to/logs/link-check.log 2>&1
#
# Env: LINK_CHECK_CONCURRENCY, LINK_CHECK_TIMEOUT_MS (see check-links.mjs).

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "[link-check] starting $(date '+%Y-%m-%d %H:%M:%S')"
node "$SCRIPT_DIR/check-links.mjs"

if [[ "${LINK_CHECK_COMMIT:-1}" == "1" && -n $(git status -s -- link-health.json) ]]; then
  git add link-health.json
  # The pathspec bounds what is COMMITTED, not just what is staged: `git commit`
  # with no pathspec commits the whole index, which is how 4985d86 shipped two
  # unrelated doc renames the operator had left staged. daily-news-and-commit.sh
  # was fixed for this; this script is its sibling and had the same hole.
  git commit -m "chore(links): refresh link-health report" -- link-health.json
  if [[ "${LINK_CHECK_PUSH:-0}" == "1" ]]; then
    git push
  fi
  echo "[link-check] committed link-health.json"
else
  echo "[link-check] no change to link-health.json"
fi
