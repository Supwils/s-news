#!/usr/bin/env bash
#
# news-agent.sh <command-file> <instruction>
#
# Backend adapter for news generation. Dispatches to the configured CLI tool.
#
# NEWS_AGENT_BACKEND  cursor (default) | claude | codex
#
# Per-backend model overrides:
#   cursor  NEWS_AGENT_MODEL  (default: auto, via NEWS_AGENT_MODEL_DEFAULT)
#   claude  NEWS_CLAUDE_MODEL (default: claude-opus-4-7)
#   codex   NEWS_CODEX_MODEL  (default: codex-mini-latest)
#
# Timeout:
#   NEWS_AGENT_TIMEOUT_SECONDS          hard upper bound for a single topic call
#                                       (default 1800 = 30 min). Caps
#                                       cursor-agent's internal retry loop, which
#                                       spins for hours on transient DNS errors.
#   NEWS_AGENT_WATCHDOG_POLL_SECONDS    how often the watchdog checks the clock
#                                       (default 15).

set -e

TIMEOUT_SECS="${NEWS_AGENT_TIMEOUT_SECONDS:-1800}"
WATCHDOG_POLL_SECS="${NEWS_AGENT_WATCHDOG_POLL_SECONDS:-15}"

# Kills <pid>'s process group once TIMEOUT_SECS of *wall-clock* time have passed,
# and touches <marker> so the caller can tell a timeout from an ordinary failure.
# Returns as soon as the child is gone.
_watchdog() {
  local pid="$1" marker="$2" started now
  started="$(date +%s)"
  while :; do
    sleep "$WATCHDOG_POLL_SECS"
    kill -0 "$pid" 2>/dev/null || return 0
    now="$(date +%s)"
    if [[ "$((now - started))" -ge "$TIMEOUT_SECS" ]]; then
      : >"$marker"
      kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
      sleep 30
      kill -KILL "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
      return 0
    fi
  done
}

# Run a command under a hard wall-clock timeout.
#
# Deliberately not GNU `timeout`, and no longer `perl -e 'alarm'`: both arm
# ITIMER_REAL, which stops counting while macOS is asleep. This job runs on a
# laptop. On 2026-07-24 the host slept four minutes into the 09:00 run and spent
# the next five hours in a darkwake/sleep cycle; the 30-minute alarm never fired
# because from its point of view barely any time had passed, one topic held a
# concurrency slot from 09:15 to 14:15, and the whole 7-hour run published
# nothing. The alarm mechanism was fine — the clock was not. `date +%s` is the
# only clock on this host that keeps time across sleep, so the watchdog polls it.
#
# The child runs in its own process group (`set -m`) so the watchdog can signal
# the whole tree: `cursor-agent` is a bash shim that execs node.
_run_with_timeout() {
  local marker rc=0 child_pid watchdog_pid
  marker="$(mktemp "${TMPDIR:-/tmp}/news-agent-timeout-XXXXXX")"
  rm -f "$marker"

  set -m
  "$@" &
  child_pid=$!
  set +m

  _watchdog "$child_pid" "$marker" &
  watchdog_pid=$!

  # `set -m` makes the shell announce abnormal job termination ("Terminated: 15")
  # on its own stderr. That lands in the topic's debug log, whose last non-empty
  # line run_all_news.sh reports as the failure reason — so silence the reaper,
  # not the child. The child's own stderr was bound at fork and is unaffected.
  { wait "$child_pid" || rc=$?; } 2>/dev/null

  kill "$watchdog_pid" 2>/dev/null || true
  wait "$watchdog_pid" 2>/dev/null || true

  # The signal that killed the child is not diagnostic on its own — the agent
  # may have been terminated for any reason — so the marker, not the exit code,
  # is what identifies a timeout.
  if [[ -e "$marker" ]]; then
    rc=124
    rm -f "$marker"
    echo "Error: news-agent timed out after ${TIMEOUT_SECS}s of wall-clock time (NEWS_AGENT_TIMEOUT_SECONDS)" >&2
  fi
  rm -f "$marker"
  return "$rc"
}

COMMAND_FILE="${1:?news-agent.sh requires <command-file> as first argument}"
INSTRUCTION="${2:?news-agent.sh requires <instruction> as second argument}"

BACKEND="${NEWS_AGENT_BACKEND:-cursor}"

case "$BACKEND" in
  cursor)
    MODEL="${NEWS_AGENT_MODEL:-${NEWS_AGENT_MODEL_DEFAULT:-auto}}"
    if ! command -v cursor-agent &>/dev/null; then
      echo "错误: 未找到 Cursor CLI (cursor-agent)。请安装: curl https://cursor.com/install -fsS | bash" >&2
      exit 1
    fi
    _run_with_timeout cursor-agent -p --force --model "$MODEL" "@${COMMAND_FILE}" "${INSTRUCTION}"
    ;;

  claude)
    MODEL="${NEWS_CLAUDE_MODEL:-claude-opus-4-7}"
    if ! command -v claude &>/dev/null; then
      echo "错误: 未找到 Claude Code CLI。请安装: npm install -g @anthropic-ai/claude-code" >&2
      exit 1
    fi
    PROMPT="$(cat "${COMMAND_FILE}")"$'\n\n'"${INSTRUCTION}"
    _run_with_timeout claude --print --model "$MODEL" "$PROMPT"
    ;;

  codex)
    MODEL="${NEWS_CODEX_MODEL:-codex-mini-latest}"
    if ! command -v codex &>/dev/null; then
      echo "错误: 未找到 Codex CLI。请安装: npm install -g @openai/codex" >&2
      exit 1
    fi
    PROMPT="$(cat "${COMMAND_FILE}")"$'\n\n'"${INSTRUCTION}"
    _run_with_timeout codex --model "$MODEL" --approval-mode full-auto "$PROMPT"
    ;;

  noop)
    # Test-only backend: writes nothing and exits 0, exactly like a cursor-agent
    # run whose search failed or whose context was truncated. Lets the daily
    # pipeline be exercised end-to-end — assert-digest, quarantine, retry,
    # threshold, manifest — without spending a token. Never set this in cron.
    echo "[news-agent] noop backend: pretending to run ${COMMAND_FILE} (no output written)" >&2
    exit 0
    ;;

  *)
    echo "错误: 未知的 NEWS_AGENT_BACKEND='${BACKEND}'。支持的值: cursor | claude | codex | noop (test)" >&2
    exit 1
    ;;
esac
