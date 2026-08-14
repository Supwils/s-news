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
 *   dead    — 404 or 410, and nothing else: only the origin server saying the
 *             page is gone is proof that it is
 *   unknown — 401/403/429 (bot-blocked), 5xx (transient), network errors and
 *             timeouts (we could not reach it), anything else
 *
 * Network errors used to count as dead, on the theory that they were "hard"
 * failures. The 2026-07-28 report shows they are not: 9,051 URLs dead on
 * network-error and 904 on timeout, against 281 real 404/410s. The top hosts
 * in that list were CoinDesk (518), CNBC (502), TechCrunch (247), BBC and
 * Bloomberg — all serving 200 when spot-checked. The failures were
 * self-inflicted (see the host-interleaving note in check-links.mjs), and a
 * connection this checker could not open says nothing about the page.
 */
export function classifyStatus(status) {
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

/**
 * Reorder URLs so consecutive entries belong to different hosts.
 *
 * The collector sorts its URLs, which groups every host's links together; the
 * checker then takes fixed-size slices as concurrency batches. The two combined
 * meant a batch was N simultaneous requests to a single origin — indistinguishable
 * from an attack, and duly dropped. That, not link rot, produced the 9,051
 * `network-error` verdicts in the 2026-07-28 report, with the worst hits landing
 * on the hosts that had the most URLs to be hammered with.
 *
 * Round-robin over per-host buckets fixes it without a scheduler: with H hosts,
 * a host repeats no sooner than every H entries. Unparseable URLs share one
 * bucket — there are a handful and they cannot be grouped by origin anyway.
 */
export function interleaveByHost(urls) {
  const buckets = new Map();
  for (const url of urls) {
    let host;
    try {
      host = new URL(url).hostname;
    } catch {
      host = "";
    }
    if (!buckets.has(host)) buckets.set(host, []);
    buckets.get(host).push(url);
  }
  // Largest bucket first: the host with the most URLs is the one that most
  // needs its requests spread out, and draining it early keeps the tail mixed.
  const queues = [...buckets.values()].sort((a, b) => b.length - a.length);
  const out = [];
  for (let i = 0; out.length < urls.length; i += 1) {
    for (const q of queues) if (i < q.length) out.push(q[i]);
  }
  return out;
}

/**
 * Run `fn` over `items` with at most `limit` in flight, results in input order.
 *
 * Replaces a loop of `await Promise.all(batch)`, which put a barrier at the end
 * of every batch: the batch could not finish until its slowest member did, so a
 * single URL sitting out the 12-second timeout stalled the other 23 slots.
 * Sorted input hid the cost — a batch was one host, so its members behaved
 * alike — and interleaving hosts exposed it, turning each batch into a lottery
 * that paid the maximum. Workers pulling from a shared cursor have no barrier:
 * a slow request occupies one slot and nothing else waits on it.
 */
export async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    for (let i = cursor++; i < items.length; i = cursor++) {
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return results;
}

/** Split a list into chunks of at most `size` for bounded concurrency. */
export function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
