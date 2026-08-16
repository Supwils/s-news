#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# launchd and cron start with a near-empty PATH — no pnpm, no cursor-agent, and
# macOS ships no node — so these fallbacks make the job self-sufficient there.
#
# They are APPENDED, not prepended, and that matters on CI. The GitHub runner
# image installs its own Node with `n`, which lands in /usr/local/bin; prepending
# put that ahead of the one actions/setup-node had just resolved from .nvmrc, so
# the daily job silently built on the image default while the gate built on the
# pinned version. Appending leaves an already-correct PATH alone.
#
# The nvm entry is the launchd path only, and is resolved from .nvmrc rather than
# hardcoded, so it cannot drift away from what CI and Vercel run. An unmatched
# glob just leaves a non-existent directory on PATH, which is harmless.
NVM_NODE_BIN=("$HOME"/.nvm/versions/node/v"$(tr -d '[:space:]' < "$PROJECT_ROOT/.nvmrc")".*/bin)
export PATH="$PATH:${NVM_NODE_BIN[0]}:$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin"

# Hold a power assertion for the lifetime of the job.
#
# 2026-07-24: the 09:00 run started, the host went to sleep four minutes later
# ("Entering Sleep state ... Using Batt" in pmset), and spent the next five
# hours cycling between darkwake and sleep. Nothing noticed, because the agent
# timeout is armed with a timer that does not advance while the machine is
# asleep. Seven hours, zero articles. Re-exec under `caffeinate` so the run
# holds the machine awake instead of hoping.
#
# Honest limit: `-i` blocks *idle* sleep and `-s` blocks system sleep on AC. On
# battery, closing the lid still wins. That case is the standing argument for
# moving generation off this machine (docs/roadmap.md, open item 2).
#
# The plist is gitignored, so this belongs in the script, not in launchd args.
if [[ "${DAILY_NEWS_CAFFEINATED:-0}" != "1" ]] && command -v caffeinate >/dev/null 2>&1; then
  export DAILY_NEWS_CAFFEINATED=1
  exec caffeinate -i -s /bin/bash "$SCRIPT_DIR/$(basename "${BASH_SOURCE[0]}")" "$@"
fi

# The launchd plist sets no environment, so SITE_URL was never present and the
# post-deploy cache warmup silently skipped every day. Default to production;
# an explicit SITE_URL in the environment still wins.
: "${SITE_URL:=https://news.supwil.com}"
export SITE_URL

LOG_TS() { date '+%Y-%m-%d %H:%M:%S'; }
log_info() { echo "[$(LOG_TS)] [INFO] $*"; }
log_warn() { echo "[$(LOG_TS)] [WARN] $*"; }
log_error() { echo "[$(LOG_TS)] [ERROR] $*" >&2; }

# Notification helpers (macOS desktop + Resend email). Sourced — never fatal.
# The `|| true` suppresses errexit while the helper file loads; notify.sh must
# not flip shell options itself (a sourced `set +e` leaks into this script).
# shellcheck disable=SC1091
source "$SCRIPT_DIR/notify.sh" || true

JOB_STARTED_AT_EPOCH=$(date +%s)
export NOTIFY_JOB_STARTED_AT="$(date '+%Y-%m-%d %H:%M:%S')"

LAST_STEP="init"
LAST_DEBUG_LOG=""
on_error() {
  local exit_code="$1"
  local reason="exit_code=${exit_code}"
  log_error "Daily job failed at step=${LAST_STEP} exit_code=${exit_code}"
  notify_failure "${LAST_STEP}" "${reason}" "${LAST_DEBUG_LOG}" || true
}
trap 'on_error "$?"' ERR

log_info "Daily job started project_root=${PROJECT_ROOT}"

# --- Network preflight --------------------------------------------------------
# A bad wifi / DNS at 09:00 is the dominant historical failure mode (often
# 90+ minutes wasted on cursor-agent's internal retries). Verify Cursor's API
# is reachable before launching the pipeline; if it isn't after a short
# bounded wait, abort cleanly with a notification.
#
# `curl` leads because it tests what the run actually needs — an HTTPS round
# trip to the API — rather than only that a name resolved. It is also the one
# probe guaranteed to exist on both this Mac and a CI runner: `host` and
# `nslookup` ship in dnsutils, which is NOT installed on the GitHub Actions
# ubuntu image. Without this, the preflight below would fail on every cloud run
# and take the `exit 0` path — a green job that publishes nothing, every day.
# The two DNS probes stay as fallbacks so local behaviour is unchanged.
LAST_STEP="network_preflight"
log_info "Step start: network_preflight host=api2.cursor.sh"
_net_ok() {
  curl -sS --max-time 10 -o /dev/null "https://api2.cursor.sh" 2>/dev/null ||
    host api2.cursor.sh >/dev/null 2>&1 ||
    nslookup api2.cursor.sh >/dev/null 2>&1
}
NET_OK=0
for attempt in 1 2 3 4 5 6; do
  if _net_ok; then
    NET_OK=1
    break
  fi
  log_warn "Preflight network attempt ${attempt}/6 failed; sleeping 20s"
  sleep 20
done
if [[ "$NET_OK" != "1" ]]; then
  log_error "Network preflight failed: api2.cursor.sh unreachable after 6 attempts (~2 min)"
  notify_failure "network_preflight" "api2.cursor.sh unreachable after 6 attempts" "" || true
  # On this laptop an unreachable API at 09:00 is an environment skip, not a job
  # failure, so exit 0 and keep launchd's failure stats clean. On CI it is the
  # opposite: nothing else watches this job, so a silent exit 0 would render a
  # green check over a day that published nothing. Fail loudly there.
  if [[ -n "${CI:-}" ]]; then
    exit 1
  fi
  exit 0
fi
log_info "Step success: network_preflight"

# Cursor CLI agent --model：环境变量 NEWS_AGENT_MODEL；或把模型名作为本脚本第一个参数传给 run_all_news。
# NEWS_AGENT_MODEL_DEFAULT 在未设置 NEWS_AGENT_MODEL 且未传参时生效；composer-2 已被 Cursor 下线，默认改为 auto（由 Cursor 自动选模型）。
: "${NEWS_AGENT_MODEL_DEFAULT:=auto}"
export NEWS_AGENT_MODEL_DEFAULT

LAST_STEP="generate_news"
log_info "Step start: generate_news model=${NEWS_AGENT_MODEL_DEFAULT}"
bash "$SCRIPT_DIR/run_all_news.sh" "$@"
log_info "Step success: generate_news"

LAST_STEP="build"
log_info "Step start: build command=pnpm build"
pnpm build
log_info "Step success: build"

# Fold this run into the committed record before the commit, so it rides that
# commit instead of costing a second deploy of its own.
LAST_STEP="record_run"
log_info "Step start: record_run"
node "$SCRIPT_DIR/record-run.mjs" --published "$([[ -n $(git status -s -- NEWS/) ]] && echo true || echo false)" || \
  log_warn "Step warn: record_run failed (non-fatal)"
log_info "Step success: record_run"

LAST_STEP="git_commit_push"
COMMITTED=0
# `git add -A NEWS/` stages additions, modifications and deletions under NEWS/
# and nothing else. The old `git add NEWS/ && git add -u` swept every unrelated
# working-tree change into the "adding daily news" commit.
if [[ -n $(git status -s -- NEWS/) ]]; then
  log_info "Step start: git_commit_push changes_detected=true"
  # `git add -A NEWS/` bounds what gets *staged*; it does not bound what gets
  # committed, because `git commit` commits the whole index. That is how 4985d86
  # shipped two unrelated doc renames the operator had left staged. The pathspec
  # makes the commit carry NEWS/ and nothing else, and — verified — it still
  # picks up newly added files while leaving the rest of the index staged and
  # untouched for whoever put it there.
  git add -A NEWS/ pipeline-metrics.json
  # The pathspec still bounds the commit to these two paths — anything else the
  # operator left staged stays staged. pipeline-metrics.json rides along rather
  # than getting its own commit, which would deploy the site twice a day to say
  # the same thing.
  git commit -m "feat(content): adding daily news" -- NEWS/ pipeline-metrics.json
  git push
  COMMITTED=1
  log_info "Step success: git_commit_push result=committed_and_pushed"
else
  log_warn "Step skipped: git_commit_push reason=no_changes_under_NEWS"
fi

# Wait for the push to actually go live, then warm the edge cache for the hot
# set (home pages + newest day's articles).
#
# A fresh deploy leaves Vercel's edge cache cold, so the first organic visitor
# otherwise pays the origin fetch — measured at 1.1–2.4s TTFB against <0.2s on a
# hit, and the main driver of the high TTFB on /news/[topic]/[date]. This used
# to be a flat `sleep 150`, which is not long enough for Vercel to build and
# upload ~2700 pages, so the warmup consistently ran against the previous
# deployment and did nothing. Probing for the new issue replaces the guess and
# doubles as the pipeline's deploy verification.
#
# Warming stays non-fatal. Failing to *deploy* does not.
LAST_STEP="await_deploy"
WARM_TARGET="${SITE_URL:-${NEXT_PUBLIC_SITE_URL:-}}"
DEPLOY_STATUS="skipped"
WARM_STATUS="skipped"
if [[ "$COMMITTED" == "1" && -n "$WARM_TARGET" ]]; then
  log_info "Step start: await_deploy target=${WARM_TARGET}"
  if bash "$SCRIPT_DIR/await-deploy.sh" "$WARM_TARGET"; then
    DEPLOY_STATUS="live"
    log_info "Step success: await_deploy"
  else
    DEPLOY_STATUS="not_live"
    log_error "Step failed: await_deploy — the pushed issue is not being served"
  fi

  LAST_STEP="warm_cache"
  log_info "Step start: warm_cache target=${WARM_TARGET}"
  if bash "$SCRIPT_DIR/warm-cache.sh" "$WARM_TARGET"; then
    WARM_STATUS="ok"
    log_info "Step success: warm_cache"
  else
    WARM_STATUS="degraded"
    log_warn "Step warn: warm_cache saw too many non-2xx responses (non-fatal)"
  fi
else
  log_warn "Step skipped: warm_cache reason=$([[ "$COMMITTED" == "1" ]] && echo no_SITE_URL || echo no_changes)"
fi

# Housekeeping: quarantined digests are kept for inspection, not forever, and
# neither are per-topic debug logs — ten a day had reached 1428 files / 14 MB
# before anything pruned them.
LAST_STEP="housekeeping"
find "$PROJECT_ROOT/.quarantine" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} + 2>/dev/null || true
find "$PROJECT_ROOT/logs/debug" -type f -name '*.log' -mtime +30 -delete 2>/dev/null || true

# Weekly link-health refresh (Mondays, after publish): ~17k HEAD requests, so it
# never runs in the build; best-effort, and the resulting commit rides the next
# day's push if LINK_CHECK_PUSH is off.
if [[ "$(date +%u)" == "1" ]]; then
  LAST_STEP="link_check"
  log_info "Step start: link_check (weekly)"
  if LINK_CHECK_PUSH=1 bash "$SCRIPT_DIR/run-check-links.sh"; then
    log_info "Step success: link_check"
  else
    log_warn "Step warn: link_check failed (non-fatal)"
  fi
fi

JOB_DURATION=$(( $(date +%s) - JOB_STARTED_AT_EPOCH ))
# A partially successful run still publishes. Say so, loudly, rather than
# reporting an unqualified success — the failed topics were quarantined out of
# NEWS/ and produced no content today.
RUN_SUMMARY="Pushed to origin/main. Deploy: ${DEPLOY_STATUS}. Warm: ${WARM_STATUS}."
if [[ -f "$PROJECT_ROOT/.generated/daily-run.json" ]]; then
  FAILED_TOPICS="$(node -e '
    try {
      const run = require(process.argv[1]);
      process.stdout.write((run.failed ?? []).join(", "));
    } catch { /* no manifest: nothing to report */ }
  ' "$PROJECT_ROOT/.generated/daily-run.json" 2>/dev/null || true)"
  if [[ -n "$FAILED_TOPICS" ]]; then
    RUN_SUMMARY="${RUN_SUMMARY} QUARANTINED topics (no content today): ${FAILED_TOPICS}"
    log_warn "Partial run: quarantined topics=${FAILED_TOPICS}"
  fi
fi

# Content in git is not content on the site. If the deployment never started
# serving the new issue, the run did not succeed no matter how clean the build
# was, and the email must not be green — that is precisely how the 2026-07-24
# warmup could 404 twenty times and still report success.
if [[ "$DEPLOY_STATUS" == "not_live" ]]; then
  log_error "Daily job finished status=deploy_unverified duration_sec=${JOB_DURATION}"
  notify_failure "deploy_verification" \
    "Content generated, committed and pushed, but ${WARM_TARGET} was still not serving the new issue when the wait expired. Check the Vercel build for this commit. ${RUN_SUMMARY}" \
    "" || true
  exit 1
fi

log_info "Daily job finished status=success duration_sec=${JOB_DURATION}"
notify_success "${JOB_DURATION}" "${RUN_SUMMARY}" || true
