#!/usr/bin/env bash
#
# assert-digest.sh <topic-folder> <zh-suffix> <en-suffix> [date]
#
# Verifies the digest a runner just generated, and quarantines it if it is bad.
#
# Why: no runner used to check its own output. `cursor-agent` exits 0 having
# written nothing when a search fails or the context is truncated, and `set -e`
# cannot see that. Worse, since `prebuild` validates NEWS content, a single
# malformed digest fails `pnpm build` — which in the daily job runs before
# `git commit`, so one drifting topic used to cost all ten their publication.
#
# So a bad digest is moved OUT of NEWS/ into .quarantine/ (gitignored, and
# outside NEWS/ because validate-news-layout.mjs rejects unknown directories
# there). NEWS/ stays valid, the build stays green, the healthy topics ship, and
# the bad files stay on disk for inspection.
#
# Exits non-zero when the digest is missing or invalid, so the caller can count
# the topic as failed.

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

TOPIC="${1:?assert-digest.sh requires <topic-folder>}"
ZH_SUFFIX="${2:?assert-digest.sh requires <zh-suffix>}"
EN_SUFFIX="${3:?assert-digest.sh requires <en-suffix>}"
DATE="${4:-$(date +%Y-%m-%d)}"

# A digest shorter than this is a truncated or empty generation, not a digest.
MIN_BYTES="${DIGEST_MIN_BYTES:-800}"

ZH_FILE="NEWS/${TOPIC}/zh/${DATE}_${ZH_SUFFIX}.md"
EN_FILE="NEWS/${TOPIC}/en/${DATE}_${EN_SUFFIX}.md"

QUARANTINE_DIR=".quarantine/${DATE}/${TOPIC}"

fail() {
  echo "[assert-digest] ${TOPIC}: $*" >&2
  quarantine
  exit 1
}

quarantine() {
  # Only materialize the directory when there is something to put in it —
  # a missing digest leaves nothing to quarantine, and an empty dir is noise.
  local present=()
  for f in "$ZH_FILE" "$EN_FILE"; do
    [[ -e "$f" ]] && present+=("$f")
  done
  [[ "${#present[@]}" -eq 0 ]] && return 0

  mkdir -p "$QUARANTINE_DIR"
  mv "${present[@]}" "$QUARANTINE_DIR/"
  echo "[assert-digest] ${TOPIC}: quarantined to ${QUARANTINE_DIR}/ — NEWS/ left clean so other topics can publish." >&2
}

file_size() {
  wc -c < "$1" | tr -d ' '
}

# 1. Both locales exist and are not stubs.
for f in "$ZH_FILE" "$EN_FILE"; do
  [[ -f "$f" ]] || fail "missing ${f} (the agent exited without writing it)"
  size="$(file_size "$f")"
  [[ "$size" -ge "$MIN_BYTES" ]] || fail "${f} is only ${size} bytes (< ${MIN_BYTES}); truncated generation"
done

# 2. The title carries the date we asked for, not a hallucinated one.
#    zh: "# 2026年7月9日 · …"   en: "# Jul 9, 2026 · …"
YEAR="${DATE%%-*}"
if ! head -5 "$ZH_FILE" | grep -q "^# .*${YEAR}年"; then
  fail "${ZH_FILE}: title does not carry the year ${YEAR}"
fi
if ! head -5 "$EN_FILE" | grep -q "^# .*${YEAR}"; then
  fail "${EN_FILE}: title does not carry the year ${YEAR}"
fi

# 3. Strict template conformance. A file written minutes ago has no business
#    being grandfathered by the legacy baseline.
#
#    A failure goes through repair triage before quarantine: tier 0 rewrites
#    known label drifts deterministically; tier 1 lets an agent fix pure
#    format errors (guarded against content tampering). Only an unrepairable
#    digest is quarantined — which then costs a full regeneration, so the
#    cheap paths run first. See scripts/repair-digest.mjs.
VALIDATION_LOG="$(mktemp "${TMPDIR:-/tmp}/assert-digest-XXXXXX")"
trap 'rm -f "$VALIDATION_LOG"' EXIT
if ! node scripts/validate-news-content.mjs --files "$ZH_FILE" "$EN_FILE" >"$VALIDATION_LOG" 2>&1; then
  echo "[assert-digest] ${TOPIC}: strict content validation failed — attempting repair:" >&2
  sed 's/^/  /' "$VALIDATION_LOG" >&2 || true
  if node scripts/repair-digest.mjs "$ZH_FILE" "$EN_FILE" >&2; then
    echo "[assert-digest] ${TOPIC}: repaired in place; digest accepted" >&2
  else
    fail "template drift (unrepairable)"
  fi
fi

echo "[assert-digest] ${TOPIC}: ok (${DATE}, zh+en, strict)"
