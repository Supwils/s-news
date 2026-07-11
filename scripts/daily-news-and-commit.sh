#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# 让 launchd/cron 能找到 pnpm 和 agent（nvm + Cursor CLI）
export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

LOG_TS() { date '+%Y-%m-%d %H:%M:%S'; }
log_info() { echo "[$(LOG_TS)] [INFO] $*"; }
log_warn() { echo "[$(LOG_TS)] [WARN] $*"; }
log_error() { echo "[$(LOG_TS)] [ERROR] $*" >&2; }

# Notification helpers (macOS desktop + Resend email). Sourced — never fatal.
# shellcheck disable=SC1091
source "$SCRIPT_DIR/notify.sh"

JOB_STARTED_AT_EPOCH=$(date +%s)
export NOTIFY_JOB_STARTED_AT="$(date '+%Y-%m-%d %H:%M:%S')"

LAST_STEP="init"
LAST_DEBUG_LOG=""
on_error() {
  local exit_code="$1"
  local reason="exit_code=${exit_code}"
  log_error "Daily job failed at step=${LAST_STEP} exit_code=${exit_code}"
  notify_failure "${LAST_STEP}" "${reason}" "${LAST_DEBUG_LOG}"
}
trap 'on_error "$?"' ERR

log_info "Daily job started project_root=${PROJECT_ROOT}"

# --- Network preflight --------------------------------------------------------
# A bad wifi / DNS at 09:00 is the dominant historical failure mode (often
# 90+ minutes wasted on cursor-agent's internal retries). Verify Cursor's API
# host resolves before launching the pipeline; if it doesn't after a short
# bounded wait, abort cleanly with a notification.
LAST_STEP="network_preflight"
log_info "Step start: network_preflight host=api2.cursor.sh"
NET_OK=0
for attempt in 1 2 3 4 5 6; do
  if host api2.cursor.sh >/dev/null 2>&1 || nslookup api2.cursor.sh >/dev/null 2>&1; then
    NET_OK=1
    break
  fi
  log_warn "Preflight DNS attempt ${attempt}/6 failed; sleeping 20s"
  sleep 20
done
if [[ "$NET_OK" != "1" ]]; then
  log_error "Network preflight failed: api2.cursor.sh unresolvable after 6 attempts (~2 min)"
  notify_failure "network_preflight" "DNS for api2.cursor.sh unresolvable after 6 attempts" ""
  # Exit 0 explicitly: this is an environment skip, not a job failure — avoids
  # the ERR trap double-notifying and keeps launchd's failure stats clean.
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

LAST_STEP="git_commit_push"
COMMITTED=0
# `git add -A NEWS/` stages additions, modifications and deletions under NEWS/
# and nothing else. The old `git add NEWS/ && git add -u` swept every unrelated
# working-tree change into the "adding daily news" commit.
if [[ -n $(git status -s -- NEWS/) ]]; then
  log_info "Step start: git_commit_push changes_detected=true"
  git add -A NEWS/
  git commit -m "feat(content): adding daily news"
  git push
  COMMITTED=1
  log_info "Step success: git_commit_push result=committed_and_pushed"
else
  log_warn "Step skipped: git_commit_push reason=no_changes_under_NEWS"
fi

# Warm the edge cache for the hot set (home pages + newest day's articles) once
# the new deploy is live. A fresh deploy leaves Vercel's edge cache cold, so the
# first organic visitor otherwise pays the origin fetch (the main driver of the
# high TTFB on /news/[topic]/[date]). Best-effort and non-fatal: a failed warmup
# must never fail the daily content job.
LAST_STEP="warm_cache"
WARM_TARGET="${SITE_URL:-${NEXT_PUBLIC_SITE_URL:-}}"
if [[ "$COMMITTED" == "1" && -n "$WARM_TARGET" ]]; then
  WARM_DEPLOY_WAIT="${WARM_DEPLOY_WAIT:-150}"
  log_info "Step start: warm_cache wait=${WARM_DEPLOY_WAIT}s target=${WARM_TARGET}"
  sleep "$WARM_DEPLOY_WAIT"
  if bash "$SCRIPT_DIR/warm-cache.sh" "$WARM_TARGET"; then
    log_info "Step success: warm_cache"
  else
    log_warn "Step warn: warm_cache failed (non-fatal)"
  fi
else
  log_warn "Step skipped: warm_cache reason=$([[ "$COMMITTED" == "1" ]] && echo no_SITE_URL || echo no_changes)"
fi

JOB_DURATION=$(( $(date +%s) - JOB_STARTED_AT_EPOCH ))
log_info "Daily job finished status=success duration_sec=${JOB_DURATION}"
# A partially successful run still publishes. Say so, loudly, rather than
# reporting an unqualified success — the failed topics were quarantined out of
# NEWS/ and produced no content today.
RUN_SUMMARY="Pushed to origin/main."
if [[ -f "$PROJECT_ROOT/.generated/daily-run.json" ]]; then
  FAILED_TOPICS="$(node -e '
    try {
      const run = require(process.argv[1]);
      process.stdout.write((run.failed ?? []).join(", "));
    } catch { /* no manifest: nothing to report */ }
  ' "$PROJECT_ROOT/.generated/daily-run.json" 2>/dev/null || true)"
  if [[ -n "$FAILED_TOPICS" ]]; then
    RUN_SUMMARY="Pushed to origin/main. QUARANTINED topics (no content today): ${FAILED_TOPICS}"
    log_warn "Partial run: quarantined topics=${FAILED_TOPICS}"
  fi
fi
notify_success "${JOB_DURATION}" "${RUN_SUMMARY}"
