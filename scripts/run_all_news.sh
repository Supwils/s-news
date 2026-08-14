#!/usr/bin/env bash
#
# 执行全部主题的日报生成脚本（通用、金融、AI 科技、科学、加密、能源气候、汽车出行、游戏、供应链、运动健康营养）
# 默认 2 路并发；可通过 NEWS_PARALLELISM 覆盖。
# 后端通过 NEWS_AGENT_BACKEND 指定: cursor (默认) | claude | codex
#

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# 第一个参数若提供则视为模型名（覆盖 NEWS_AGENT_MODEL，仅对 cursor 后端有效）。
if [[ -n "${1:-}" ]]; then
  export NEWS_AGENT_MODEL="$1"
fi
: "${NEWS_AGENT_MODEL_DEFAULT:=auto}"
export NEWS_AGENT_MODEL="${NEWS_AGENT_MODEL:-$NEWS_AGENT_MODEL_DEFAULT}"
export NEWS_AGENT_MODEL_DEFAULT
: "${NEWS_PARALLELISM:=2}"
if ! [[ "$NEWS_PARALLELISM" =~ ^[1-9][0-9]*$ ]]; then
  echo "错误: NEWS_PARALLELISM 必须是正整数，当前值: $NEWS_PARALLELISM" >&2
  exit 1
fi

LOG_TS() { date '+%Y-%m-%d %H:%M:%S'; }
log_info() { echo "[$(LOG_TS)] [INFO] $*"; }
log_warn() { echo "[$(LOG_TS)] [WARN] $*"; }
log_error() { echo "[$(LOG_TS)] [ERROR] $*" >&2; }
trim() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

DEBUG_DIR="$PROJECT_ROOT/logs/debug"
mkdir -p "$DEBUG_DIR"

# Per-topic outcomes, appended by each lane. `>>` of a single short line is
# atomic enough for concurrent lanes on both macOS and Linux; the alternative
# (a file per topic) buys nothing at this size.
TOPIC_RESULTS="$(mktemp "${TMPDIR:-/tmp}/news-topic-results-XXXXXX")"
trap 'rm -f "$TOPIC_RESULTS"' EXIT

RUN_STARTED_AT="$(date +%s)"
log_info "Generate all topics started model=${NEWS_AGENT_MODEL} parallelism=${NEWS_PARALLELISM}"

export SKIP_NEWS_INDEX_REFRESH=1

# Longest-running topics first.
#
# With a fixed number of lanes, makespan is decided by whatever starts last: on
# 2026-07-24 the run finished at 16:41:30 because auto-mobility (467s) was
# dispatched ninth, while every other lane had gone idle by 16:39. Dispatching
# the long poles first lets the short topics fill the tail instead of extending
# it. Order is by observed duration (467/445/392/299/199/195/180/168/166/154s);
# it is a heuristic, not a contract — nothing breaks if a topic drifts.
SCRIPTS=(
  run-auto-mobility-news.sh
  run-aitech-news.sh
  run-science-news.sh
  run-energy-climate-news.sh
  run-supply-chain-news.sh
  run-crypto-news.sh
  run-finance-news.sh
  run-sports-health-nutrition-news.sh
  run-gaming-news.sh
  run-general-news.sh
)

# The daily script's preflight only proves the API was reachable at 09:00. What
# actually happens is the host sleeping mid-run and waking without a network —
# and cursor-agent answers an unreachable API by spinning, not by exiting.
# Re-check before every attempt.
#
# `curl` first for the same reason as the daily script's preflight: it probes
# the HTTPS round trip rather than just name resolution, and `host`/`nslookup`
# are absent from the GitHub Actions ubuntu image. There the DNS-only version
# reported every topic as dns_unresolvable before it ever called the agent.
_net_ok() {
  curl -sS --max-time 10 -o /dev/null "https://api2.cursor.sh" 2>/dev/null ||
    host api2.cursor.sh >/dev/null 2>&1 ||
    nslookup api2.cursor.sh >/dev/null 2>&1
}

run_topic() {
  local script="$1"
  path="$SCRIPT_DIR/$script"
  if [[ -x "$path" ]]; then
    topic="${script#run-}"
    topic="${topic%.sh}"
    run_id="$(date '+%Y%m%d-%H%M%S')"
    debug_log="$DEBUG_DIR/${run_id}-${topic}.log"

    log_info "Topic start topic=${topic}"
    started_at="$(date +%s)"

    # Retry once. news-agent.sh documents cursor-agent spinning on transient DNS
    # errors; rate limits and truncated generations are equally intermittent. A
    # second attempt is far cheaper than losing the topic for the day.
    local attempt
    for attempt in 1 2; do
      if ! _net_ok; then
        ended_at="$(date +%s)"
        duration="$((ended_at - started_at))"
        log_error "Topic aborted topic=${topic} attempt=${attempt} duration_sec=${duration} reason=api_unreachable"
        return 69 # EX_UNAVAILABLE
      fi
      # `exit_code="$?"` must live in the `else` branch: a failed `if` with no
      # `else` evaluates to status 0, so reading `$?` after the block would
      # report every failure as a success.
      if "$path" >"$debug_log" 2>&1; then
        ended_at="$(date +%s)"
        duration="$((ended_at - started_at))"
        log_info "Topic success topic=${topic} attempt=${attempt} duration_sec=${duration} debug_log=${debug_log}"
        # One line per topic for the committed run record. Written from the
        # subshell that owns the topic, so it goes to a file rather than a
        # variable — a `&`-backgrounded lane cannot assign to its parent.
        printf '%s\t%s\t%s\t%s\n' "$topic" "ok" "$attempt" "$duration" >>"$TOPIC_RESULTS"
        return 0
      else
        exit_code="$?"
      fi
      # A dead network will not come back in 20 seconds, and the retry is not
      # free: the agent burns the full timeout again before giving up. Retrying
      # into an unreachable API is what doubled the 2026-07-24 stall.
      if grep -qE 'ENOTFOUND|ECONNREFUSED|ETIMEDOUT|\[unavailable\]' "$debug_log" 2>/dev/null; then
        log_warn "Topic attempt failed topic=${topic} exit_code=${exit_code} retrying=false reason=network_unreachable"
        break
      fi
      if [[ "$attempt" -eq 1 ]]; then
        log_warn "Topic attempt failed topic=${topic} exit_code=${exit_code} retrying=true"
        sleep "${NEWS_RETRY_DELAY_SECONDS:-20}"
      fi
    done

    ended_at="$(date +%s)"
    duration="$((ended_at - started_at))"
    reason="$(awk 'NF{line=$0} END{print line}' "$debug_log" 2>/dev/null || true)"
    reason="$(trim "${reason:-unknown_error}")"
    log_error "Topic failed topic=${topic} duration_sec=${duration} exit_code=${exit_code} reason=${reason} debug_log=${debug_log}"
    printf '%s\t%s\t%s\t%s\n' "$topic" "failed" "${attempt:-1}" "$duration" >>"$TOPIC_RESULTS"
    return "$exit_code"
  else
    log_warn "Topic skipped script=${script} reason=missing_or_not_executable"
  fi
}

TOKEN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/swil-news-parallel.XXXXXX")"
TOKEN_FIFO="$TOKEN_DIR/tokens"
mkfifo "$TOKEN_FIFO"
exec 9<>"$TOKEN_FIFO"
rm -rf "$TOKEN_DIR"

for ((i = 0; i < NEWS_PARALLELISM; i++)); do
  printf '\n' >&9
done

PIDS=()
TOPICS=()
for script in "${SCRIPTS[@]}"; do
  topic="${script#run-}"
  topic="${topic%.sh}"
  read -r -u 9
  {
    if run_topic "$script"; then
      status=0
    else
      status="$?"
    fi
    printf '\n' >&9
    exit "$status"
  } &
  PIDS+=("$!")
  TOPICS+=("$topic")
done

SUCCEEDED=()
FAILED=()
for i in "${!PIDS[@]}"; do
  pid="${PIDS[$i]}"
  topic="${TOPICS[$i]}"
  if wait "$pid"; then
    SUCCEEDED+=("$topic")
  else
    exit_code="$?"
    log_error "Topic process failed topic=${topic} exit_code=${exit_code}"
    FAILED+=("$topic")
  fi
done
exec 9>&-
unset SKIP_NEWS_INDEX_REFRESH

# A failed topic has already been quarantined out of NEWS/ by assert-digest.sh,
# so the corpus is valid and the healthy topics can still be built and published.
# Losing one topic must not cost the other nine their publication.
: "${NEWS_MIN_SUCCESS_TOPICS:=7}"
TOTAL="${#SCRIPTS[@]}"
SUCCESS_COUNT="${#SUCCEEDED[@]}"

mkdir -p "$PROJECT_ROOT/.generated"
# Built with node rather than printf: expanding an empty array under `set -u`
# is an error on the bash 3.2 that ships with macOS, where the cron host runs.
DAILY_RUN_DATE="$(date +%Y-%m-%d)" \
DAILY_RUN_TOTAL="$TOTAL" \
DAILY_RUN_SUCCEEDED="${SUCCEEDED[*]:-}" \
DAILY_RUN_FAILED="${FAILED[*]:-}" \
DAILY_RUN_DURATION="$(( $(date +%s) - RUN_STARTED_AT ))" \
DAILY_RUN_TOPIC_RESULTS="$TOPIC_RESULTS" \
node -e '
  const fs = require("node:fs");
  const list = (value) => (value ?? "").split(" ").filter(Boolean);
  // Per-topic lines are tab-separated: topic, status, attempts, seconds.
  let topics = [];
  try {
    topics = fs
      .readFileSync(process.env.DAILY_RUN_TOPIC_RESULTS, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [topic, status, attempts, durationSec] = line.split("\t");
        return { topic, status, attempts: Number(attempts), durationSec: Number(durationSec) };
      })
      .sort((a, b) => a.topic.localeCompare(b.topic));
  } catch { /* no lane wrote anything: leave the array empty rather than fail the run */ }
  const manifest = {
    date: process.env.DAILY_RUN_DATE,
    total: Number(process.env.DAILY_RUN_TOTAL),
    succeeded: list(process.env.DAILY_RUN_SUCCEEDED),
    failed: list(process.env.DAILY_RUN_FAILED),
    durationSec: Number(process.env.DAILY_RUN_DURATION),
    topics,
  };
  fs.writeFileSync(process.argv[1], JSON.stringify(manifest, null, 2) + "\n");
' "$PROJECT_ROOT/.generated/daily-run.json"

if [[ "${#FAILED[@]}" -gt 0 ]]; then
  log_warn "Topics failed count=${#FAILED[@]} topics=${FAILED[*]} (quarantined; publishing the rest)"
fi

if [[ "$SUCCESS_COUNT" -lt "$NEWS_MIN_SUCCESS_TOPICS" ]]; then
  log_error "Only ${SUCCESS_COUNT}/${TOTAL} topics succeeded, below NEWS_MIN_SUCCESS_TOPICS=${NEWS_MIN_SUCCESS_TOPICS}. Refusing to publish."
  exit 1
fi

log_info "Step start: validate_news_layout"
node "$SCRIPT_DIR/validate-news-layout.mjs"
log_info "Step success: validate_news_layout"

log_info "Step start: refresh_news_index"
bash "$SCRIPT_DIR/refresh-news-index.sh"
log_info "Step success: refresh_news_index"

log_info "Generate all topics finished status=success succeeded=${SUCCESS_COUNT}/${TOTAL} failed=${FAILED[*]:-none}"
