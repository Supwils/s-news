#!/usr/bin/env bash
#
# notify.sh — dual-channel notification helper for the daily-news pipeline.
#
# Sourced (not executed) by daily-news-and-commit.sh. Exposes:
#   notify_success <duration_sec> [extra_message]
#   notify_failure <stage> <reason> [debug_log_path]
#
# Channels:
#   1. macOS desktop notification via osascript (zero install).
#   2. Email via Resend HTTPS API (requires RESEND_API_KEY in env or .env).
#
# Environment variables (read from .env at PROJECT_ROOT if present):
#   RESEND_API_KEY            required for email; if missing, email is skipped.
#   DAILY_NEWS_NOTIFY_TO      recipient. REQUIRED for email — there is no
#                             default, because a default in a public repository
#                             is a personal address published to every scraper
#                             that reads it. Set it in .env locally and as a
#                             repository secret in CI. Resend only delivers to
#                             the address its account is registered with until
#                             you verify a domain at https://resend.com/domains
#                             and point DAILY_NEWS_NOTIFY_FROM at it.
#   DAILY_NEWS_NOTIFY_FROM    sender (default: "Swil-News <onboarding@resend.dev>")
#
# All functions are best-effort and never propagate failures back to the caller:
# losing a notification must not turn a successful job into a failed one.
#
# No top-level `set +e` here: this file is sourced, so flipping shell options
# would leak into the caller and disable its errexit for the rest of the run
# (which is exactly how a failed `git push` once got reported as success).
# Non-fatality is the call site's job: invoke as `notify_* ... || true` and
# guard the source itself with `|| true`.

NOTIFY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOTIFY_PROJECT_ROOT="$(cd "$NOTIFY_SCRIPT_DIR/.." && pwd)"

# Load .env if present (no shell expansion of values; export simple KEY=value lines).
# The `|| [[ -n "$key" ]]` clause handles a final line without a trailing newline
# — read returns non-zero in that case but the buffer still holds valid data.
if [[ -f "$NOTIFY_PROJECT_ROOT/.env" ]]; then
  while IFS='=' read -r key value || [[ -n "$key" ]]; do
    # skip blanks and comments
    [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
    # strip surrounding whitespace and matching quotes
    key="${key// /}"
    value="${value#\"}"; value="${value%\"}"
    value="${value#\'}"; value="${value%\'}"
    [[ -n "$value" ]] && export "$key=$value"
  done < "$NOTIFY_PROJECT_ROOT/.env"
fi

# No default recipient: see the header. Unset means email is skipped, the same
# way a missing RESEND_API_KEY skips it — a notification that cannot be
# addressed must not fail the job that produced it.
: "${DAILY_NEWS_NOTIFY_FROM:=Swil-News <onboarding@resend.dev>}"

# --- macOS desktop notification ----------------------------------------------
# osascript: built-in, no dependencies. Sound "Glass" for success, "Basso" for
# failure. Title appears in the banner; subtitle is the second line.
_notify_macos() {
  local title="$1" subtitle="$2" message="$3" sound="$4"
  if ! command -v osascript &>/dev/null; then return 0; fi
  # Escape backslashes and double quotes for the AppleScript string literals.
  local _t _s _m
  _t=${title//\\/\\\\}; _t=${_t//\"/\\\"}
  _s=${subtitle//\\/\\\\}; _s=${_s//\"/\\\"}
  _m=${message//\\/\\\\}; _m=${_m//\"/\\\"}
  osascript >/dev/null 2>&1 <<EOF
display notification "$_m" with title "$_t" subtitle "$_s" sound name "$sound"
EOF
}

# --- Resend email ------------------------------------------------------------
# Sends a plain-text email via Resend's REST API. Skips silently if the API key
# is missing (so the script still works in dev / on machines without secrets).
_notify_email() {
  local subject="$1" body="$2"
  if [[ -z "${RESEND_API_KEY:-}" ]]; then return 0; fi
  # Must precede every use of the variable: the caller runs under `set -u`, so
  # an unset recipient would abort the job rather than skip the email.
  if [[ -z "${DAILY_NEWS_NOTIFY_TO:-}" ]]; then return 0; fi
  if ! command -v curl &>/dev/null; then return 0; fi

  # Build JSON safely with python (jq isn't a guaranteed dep on macOS).
  local payload
  payload=$(
    python3 - "$DAILY_NEWS_NOTIFY_FROM" "$DAILY_NEWS_NOTIFY_TO" "$subject" "$body" <<'PYEOF'
import json, sys
sender, to, subject, body = sys.argv[1:5]
print(json.dumps({
    "from": sender,
    "to": [to],
    "subject": subject,
    "text": body,
}))
PYEOF
  )

  curl -sS -X POST "https://api.resend.com/emails" \
    --max-time 20 \
    -H "Authorization: Bearer ${RESEND_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$payload" >/dev/null 2>&1
}

# --- Public API --------------------------------------------------------------

# notify_success <duration_sec> [extra_message]
notify_success() {
  local duration="${1:-0}"
  local extra="${2:-}"
  local hms
  hms=$(printf '%dh %02dm %02ds' $((duration/3600)) $(((duration%3600)/60)) $((duration%60)))
  local title="✅ Daily News · success"
  local subtitle="finished in ${hms}"
  local message="Daily news pipeline completed cleanly. ${extra}"
  local body
  body="Daily News pipeline succeeded.

Host:        $(hostname)
Project:     ${NOTIFY_PROJECT_ROOT}
Started:     ${NOTIFY_JOB_STARTED_AT:-unknown}
Finished:    $(date '+%Y-%m-%d %H:%M:%S')
Duration:    ${hms}

${extra}
"
  _notify_macos "$title" "$subtitle" "$message" "Glass"
  _notify_email "[swil-news] daily success · ${hms} · $(date +%F)" "$body"
}

# notify_failure <stage> <reason> [debug_log_path]
notify_failure() {
  local stage="${1:-unknown}"
  local reason="${2:-unspecified}"
  local debug_log="${3:-}"
  local title="❌ Daily News · failed"
  local subtitle="stage: ${stage}"
  local message="${reason}"
  local body
  body="Daily News pipeline FAILED.

Host:        $(hostname)
Project:     ${NOTIFY_PROJECT_ROOT}
Stage:       ${stage}
Reason:      ${reason}
Time:        $(date '+%Y-%m-%d %H:%M:%S')
"
  if [[ -n "$debug_log" ]]; then
    body+="
Debug log:   ${debug_log}
"
  fi
  body+="
Main log:    ${NOTIFY_PROJECT_ROOT}/logs/daily-news.log
Err log:     ${NOTIFY_PROJECT_ROOT}/logs/daily-news.err.log
"
  _notify_macos "$title" "$subtitle" "$message" "Basso"
  _notify_email "[swil-news] daily FAILED at ${stage} · $(date +%F)" "$body"
}
