/**
 * Pure helpers for the digest repair triage. No I/O.
 *
 * Tier 0 — deterministic rewrites for the label drifts the model actually
 * produces (30 published files used `**Sources:**` before the prompts forbade
 * it). Zero tokens, zero risk, unit-tested.
 *
 * Tier 1 — an agent repair pass for defects that need one written sentence
 * (a missing framing line). `classifyErrors` decides which validator errors
 * qualify; anything needing new facts or URLs is unrepairable — content cannot
 * be invented, only reformatted.
 *
 * Guards — a repair must never become a rewrite. `guardRepair` rejects any
 * "fix" that changed the article count, touched a URL, or moved the file size
 * by more than 10%.
 */

/**
 * Known-safe label synonym rewrites, observed in real model drift or one
 * typographical step away from it. Each maps drift → the canonical label the
 * validator demands. Deliberately NOT a fuzzy matcher: only exact, bounded
 * forms are rewritten.
 */
const LABEL_FIXES = [
  // en: the model's favourite invention
  { name: "sources-label", from: /\*\*Sources?:\*\*/g, to: "**Links:**" },
  { name: "references-label", from: /\*\*References?:\*\*/g, to: "**Links:**" },
  { name: "comment-label", from: /\*\*Comments?:\*\*/g, to: "**Commentary:**" },
  // zh: synonym + half-width colon variants of every machine-checked label
  { name: "laiyuan-label", from: /\*\*来源：\*\*/g, to: "**链接：**" },
  { name: "zhaiyao-halfwidth", from: /\*\*摘要:\*\*/g, to: "**摘要：**" },
  { name: "lianjie-halfwidth", from: /\*\*链接:\*\*/g, to: "**链接：**" },
  { name: "jianping-halfwidth", from: /\*\*简评:\*\*/g, to: "**简评：**" },
  { name: "dingxing-halfwidth", from: /\*\*总体定性:\*\*/g, to: "**总体定性：**" },
  // en: curly apostrophe in the summary heading (cost 22 digests their highlights once)
  { name: "curly-apostrophe-heading", from: /^##\s+Today’s\s+Summary\s*$/gm, to: "## Today's Summary" },
];

/** Apply every tier-0 fix; returns the new content and the names applied. */
export function applyDeterministicFixes(content) {
  let fixed = content;
  const applied = [];
  for (const fix of LABEL_FIXES) {
    if (fix.from.test(fixed)) {
      fixed = fixed.replace(fix.from, fix.to);
      applied.push(fix.name);
    }
    fix.from.lastIndex = 0;
  }
  return { content: fixed, applied };
}

/**
 * Which validator errors may an agent repair (tier 1)?
 *
 *   repairable   — pure formatting or one summarizing sentence over content
 *                  that already exists (labels, framing line, summary heading);
 *   unrepairable — needs facts or URLs that are not in the file (missing link
 *                  lists, missing articles, missing title). Regenerate instead.
 */
const AGENT_REPAIRABLE = [
  /is missing the summary label/,
  /is missing the links label/,
  /is missing the commentary label/,
  /missing summary heading/,
  /missing daily framing marker/,
];

export function classifyErrors(errors) {
  const repairable = [];
  const unrepairable = [];
  for (const error of errors) {
    if (AGENT_REPAIRABLE.some((pattern) => pattern.test(error))) repairable.push(error);
    else unrepairable.push(error);
  }
  return { repairable, unrepairable };
}

const URL_RE = /\]\((https?:\/\/[^)\s]+)\)/g;

function urlList(content) {
  URL_RE.lastIndex = 0;
  const urls = [];
  let match;
  while ((match = URL_RE.exec(content))) urls.push(match[1]);
  return urls.sort();
}

function articleCount(content) {
  return (content.match(/^###\s+/gm) ?? []).length;
}

/**
 * A repair may only reformat. Reject it when the "fixed" file no longer tells
 * the same story: different article count, any URL added/removed/altered, or
 * a size shift beyond 10% (a missing framing line adds a sentence, not a page).
 */
export function guardRepair(before, after) {
  if (articleCount(before) !== articleCount(after)) {
    return { ok: false, reason: `article count changed ${articleCount(before)} → ${articleCount(after)}` };
  }
  const urlsBefore = urlList(before);
  const urlsAfter = urlList(after);
  if (urlsBefore.length !== urlsAfter.length || urlsBefore.some((url, i) => url !== urlsAfter[i])) {
    return { ok: false, reason: "URL set changed" };
  }
  const sizeBefore = Buffer.byteLength(before, "utf8");
  const sizeAfter = Buffer.byteLength(after, "utf8");
  // 10% of a real digest (~20KB) is generous for label fixes plus one framing
  // sentence; the 1KB floor keeps the guard from misfiring on tiny files where
  // a single added line already exceeds 10%.
  const allowance = Math.max(sizeBefore * 0.1, 1024);
  if (Math.abs(sizeAfter - sizeBefore) > allowance) {
    return { ok: false, reason: `size changed ${sizeBefore} → ${sizeAfter} (beyond allowance)` };
  }
  return { ok: true };
}

/** The tier-1 instruction handed to the agent, with the validator's own words. */
export function buildRepairInstruction(filePath, errors) {
  return [
    `文件 ${filePath} 未通过日报模板校验。校验器报告的错误（逐字）：`,
    ...errors.map((error) => `- ${error}`),
    "",
    "你的任务是【只修格式，不改内容】，直接编辑该文件：",
    "1. 只允许修改上述错误指向的位置；其余内容一个字符都不许动。",
    "2. 禁止重新搜索、禁止增删文章、禁止改写摘要或简评、禁止增删或改动任何 URL。",
    "3. 缺失的标签按模板补上字面形式：中文 `**摘要：**`/`**链接：**`/`**简评：**`，英文 `**Summary:**`/`**Links:**`/`**Commentary:**`。",
    "4. 缺失的 `## 今日小结`/`## Today's Summary` 标题或 `**总体定性：** …`/`**Daily Framing:** …` 行：仅基于文件中已有的内容补写一句总结，不引入任何新事实。",
    "5. 若某条错误无法在不改内容的前提下修复，保持原样并说明原因。",
    "6. 修改完成后保存文件即可，不要输出日报正文。",
  ].join("\n");
}
