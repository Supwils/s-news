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
#   NEWS_AGENT_TIMEOUT_SECONDS  hard upper bound for a single topic call
#                               (default 1800 = 30 min). Caps cursor-agent's
#                               internal retry loop, which has been observed
#                               to spin for 90+ minutes on transient DNS
#                               errors and effectively kill the daily pipeline.

set -e

TIMEOUT_SECS="${NEWS_AGENT_TIMEOUT_SECONDS:-1800}"

# Run a command with a hard wall-clock timeout. Prefer GNU `timeout` / `gtimeout`
# (from brew coreutils); fall back to `perl -e 'alarm; exec'` which ships with
# macOS by default. This avoids forcing a Homebrew dependency on the cron host.
_run_with_timeout() {
  local rc
  if command -v gtimeout &>/dev/null; then
    gtimeout --kill-after=30 "$TIMEOUT_SECS" "$@"
    rc=$?
  elif command -v timeout &>/dev/null; then
    timeout --kill-after=30 "$TIMEOUT_SECS" "$@"
    rc=$?
  else
    # perl SIGALRM fallback: arms a wall-clock alarm and exec()s the child.
    # On expiry the unhandled SIGALRM terminates the process tree (exit 142
    # = 128 + SIGALRM(14)). We normalize that to 124 to match GNU timeout.
    perl -e 'alarm shift; exec @ARGV or die "exec failed: $!"' "$TIMEOUT_SECS" "$@"
    rc=$?
    if [[ "$rc" -eq 142 ]]; then rc=124; fi
  fi
  if [[ "$rc" -eq 124 ]]; then
    echo "Error: news-agent timed out after ${TIMEOUT_SECS}s (NEWS_AGENT_TIMEOUT_SECONDS)" >&2
  fi
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
