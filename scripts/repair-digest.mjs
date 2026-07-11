#!/usr/bin/env node

/**
 * Repair triage for a digest that failed strict content validation.
 *
 *   node scripts/repair-digest.mjs <file.md> [more files…]
 *
 * Per file: tier 0 (deterministic label rewrites) → revalidate → tier 1 (an
 * agent pass fed the validator's exact errors, format-only) → guard against
 * content tampering → revalidate. Exits 0 only when EVERY file ends up valid.
 * On any failure the file is restored to its original bytes, so the caller
 * (assert-digest.sh) quarantines exactly what the generator wrote.
 *
 * Tier 1 is skipped when REPAIR_DIGEST_AGENT=0 or when the remaining errors
 * need new facts/URLs (classifyErrors) — content cannot be invented.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyDeterministicFixes,
  buildRepairInstruction,
  classifyErrors,
  guardRepair,
} from "./repair-digest-lib.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const AGENT_ENABLED = process.env.REPAIR_DIGEST_AGENT !== "0";
const REPAIR_COMMAND_FILE = ".cursor/commands/repair-digest.md";
const REPAIR_TIMEOUT_SECONDS = process.env.REPAIR_DIGEST_TIMEOUT_SECONDS ?? "300";

function log(message) {
  console.log(`[repair-digest] ${message}`);
}

/** Strict validation of one file; returns the error lines ([] = valid). */
function validate(file) {
  try {
    execFileSync("node", [path.join(SCRIPT_DIR, "validate-news-content.mjs"), "--files", file], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return [];
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    return output
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => line.slice(2));
  }
}

function agentRepair(file, errors) {
  const instruction = buildRepairInstruction(file, errors);
  const result = spawnSync(
    "bash",
    [path.join(SCRIPT_DIR, "news-agent.sh"), REPAIR_COMMAND_FILE, instruction],
    {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      env: { ...process.env, NEWS_AGENT_TIMEOUT_SECONDS: REPAIR_TIMEOUT_SECONDS },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  return result.status === 0;
}

function repairFile(file) {
  const original = readFileSync(file, "utf8");

  let errors = validate(file);
  if (errors.length === 0) {
    log(`${file}: already valid`);
    return true;
  }

  // Tier 0 — deterministic rewrites.
  const { content: fixed, applied } = applyDeterministicFixes(original);
  if (applied.length > 0) {
    const guarded = guardRepair(original, fixed);
    if (!guarded.ok) {
      // Should be impossible for label renames; refuse rather than trust.
      log(`${file}: tier-0 guard rejected (${guarded.reason}) — leaving untouched`);
      return false;
    }
    writeFileSync(file, fixed, "utf8");
    errors = validate(file);
    if (errors.length === 0) {
      log(`${file}: repaired deterministically (${applied.join(", ")})`);
      return true;
    }
    log(`${file}: tier-0 applied (${applied.join(", ")}), ${errors.length} error(s) remain`);
  }

  // Tier 1 — agent pass, only for format-class errors.
  const { repairable, unrepairable } = classifyErrors(errors);
  if (unrepairable.length > 0) {
    log(`${file}: ${unrepairable.length} error(s) need new content (e.g. "${unrepairable[0]}") — regeneration is the only fix`);
    writeFileSync(file, original, "utf8");
    return false;
  }
  if (!AGENT_ENABLED) {
    log(`${file}: agent repair disabled (REPAIR_DIGEST_AGENT=0)`);
    writeFileSync(file, original, "utf8");
    return false;
  }

  log(`${file}: invoking agent repair for ${repairable.length} format error(s)`);
  const beforeAgent = readFileSync(file, "utf8");
  const agentOk = agentRepair(file, repairable);
  const afterAgent = readFileSync(file, "utf8");

  const guarded = guardRepair(beforeAgent, afterAgent);
  if (!agentOk || !guarded.ok || validate(file).length > 0) {
    const reason = !agentOk ? "agent failed" : !guarded.ok ? `tamper guard: ${guarded.reason}` : "still invalid";
    log(`${file}: agent repair rejected (${reason}) — restoring original`);
    writeFileSync(file, original, "utf8");
    return false;
  }

  log(`${file}: repaired by agent pass (format-only, guard passed)`);
  return true;
}

const files = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (files.length === 0) {
  console.error("usage: repair-digest.mjs <file.md> [more files…]");
  process.exit(2);
}

let allOk = true;
for (const file of files) {
  if (!repairFile(file)) allOk = false;
}
process.exit(allOk ? 0 : 1);
