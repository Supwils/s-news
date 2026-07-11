/**
 * Pure helpers for the link-health checker. No I/O, no network — so the parts
 * that decide "is this link dead" are unit-tested offline, and only the actual
 * HTTP round-trip in check-links.mjs is left un-mocked.
 */

// Markdown inline links: [text](http…). Bare autolinks <http…> too.
const MARKDOWN_LINK_RE = /\]\((https?:\/\/[^)\s]+)\)/g;
const AUTOLINK_RE = /<(https?:\/\/[^>\s]+)>/g;

/** Every distinct http(s) URL referenced by a markdown document. */
export function extractUrls(markdown) {
  const urls = new Set();
  for (const re of [MARKDOWN_LINK_RE, AUTOLINK_RE]) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(markdown))) {
      urls.add(stripTrailingPunctuation(match[1]));
    }
  }
  return [...urls];
}

/** Markdown often glues a trailing `.` or `)` from prose onto a bare URL. */
function stripTrailingPunctuation(url) {
  return url.replace(/[.,;:]+$/, "");
}

/**
 * Turn an HTTP status (or a thrown-error sentinel) into one of three verdicts.
 *
 * Deliberately conservative: this feature marks links as broken on a page that
 * promises traceability, so a false "dead" is worse than a missed one. Only
 * unambiguous failures are `dead`; bot-blocking and transient server errors are
 * `unknown` and render normally.
 *
 *   ok      — 2xx, 3xx
 *   dead    — 404, 410, or a hard network failure (DNS, refused, timeout)
 *   unknown — 401/403/429 (bot-blocked), 5xx (transient), anything else
 */
export function classifyStatus(status) {
  if (status === "network-error" || status === "timeout") return "dead";
  if (typeof status !== "number") return "unknown";
  if (status >= 200 && status < 400) return "ok";
  if (status === 404 || status === 410) return "dead";
  return "unknown";
}

/**
 * A Wayback Machine URL for `url` as of `date` (YYYY-MM-DD) — "the page as it
 * was around when we cited it". Wayback redirects the compact-date form to the
 * nearest capture, so no availability lookup is needed at check time.
 */
export function archiveUrl(date, url) {
  const stamp = (date ?? "").replace(/-/g, "");
  return `https://web.archive.org/web/${stamp || "2"}/${url}`;
}

/** Split a list into chunks of at most `size` for bounded concurrency. */
export function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
