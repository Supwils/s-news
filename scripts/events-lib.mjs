/**
 * Pure helpers for cross-topic event clustering. No I/O — everything here is
 * unit-testable offline, and the thresholds were calibrated against the real
 * corpus (2026-07-06 / 2026-07-09) before being committed:
 *
 *   title+summary dice ≥ 0.20 across topics on one day → always a real event
 *   (OPEC+, Microsoft/Xbox layoffs, WMO El Niño, 碳达峰, Micron, FOMC minutes);
 *   the highest observed false pair sat at 0.18. Shared source URLs are rarer
 *   (2 of 216 URLs on a busy day) but are certain edges when they occur.
 *
 * An "event" is a connected component over article blocks, linked by
 * same-day cross-topic similarity, shared source URLs, and day-to-day
 * continuation of the same story.
 */

/**
 * Similarity threshold for same-day cross-topic edges, over IDF-weighted dice.
 * Recalibrated after weighting: on 2026-07-06/09 every pair ≥ 0.20 is a real
 * event (OPEC+ 0.52, 碳达峰 0.66, Microsoft/Xbox 0.33/0.20…), first borderline
 * pair at 0.14.
 *
 * There is deliberately NO cross-day similarity edge. Measured on the corpus,
 * adjacent-day pairs of a genuinely continuing story (Iran conflict: 0.45,
 * 0.21, 0.14…) and of a recurring column genre (market wraps: 0.31, 0.23…)
 * overlap — no threshold separates them, and union-find transitivity turns any
 * leakage into hundred-member blobs (observed: ×101 over three months). Days
 * are connected only by the precise signal: a shared source URL.
 */
export const SAME_DAY_THRESHOLD = 0.2;
/** A source URL re-cited within this many days chains the story across days. */
export const URL_MAX_DAY_GAP = 7;
/**
 * A source URL cited on more than this many distinct days is a reference page,
 * not a story link, and creates no edges at all.
 *
 * URL edges were the one signal trusted without qualification, and it turned
 * out to need the same treatment the text signal already gets from IDF: what
 * matters is an *unusually* shared citation, not a shared one. The URLs doing
 * the most chaining across this corpus are evergreen:
 *
 *   22 days  sec.gov/newsroom/press-releases/…
 *   15 days  federalreserve.gov/releases/h15        (the daily rates release)
 *   13 days  tradingeconomics.com/united-states/stock-market
 *   12 days  cboe.com/tradable-products/vix
 *
 * Citing H.15 on June 5 and June 12 does not mean those are one story; it means
 * both discuss interest rates. 74% of cross-day URL edges came from URLs
 * spanning 3+ days, and because union-find is transitive, URL_MAX_DAY_GAP
 * bounded each edge while the resulting cluster grew without limit — three
 * weeks of market wraps merged into one "event" named after a single day's
 * close.
 *
 * Swept against the corpus (zh, 14523 blocks). Event count is flat, so this
 * splits over-merged clusters rather than dropping coverage:
 *
 *   limit      events  multi-day  max span  span>14d  span>7d
 *   none          322        136       27d        11       30
 *   4             325        129       14d         0       15
 *   3 (this)      324        117       12d         0        8
 *   2             317         96        8d         0        1   ← loses real ones
 *
 * At 3 the survivors past a week are all genuine continuing stories (a policy
 * rollout, a quarterly delivery miss, an FDA approval); at 2 the 29% drop in
 * multi-day events starts cutting those too.
 */
export const URL_MAX_DISTINCT_DAYS = 3;

/**
 * Split a digest into its `### N. title` article blocks.
 * `index` is the 1-based position — together with topic+date it forms the
 * block's stable id for a given corpus state.
 */
export function splitArticleBlocks(content) {
  const matches = [...content.matchAll(/^###\s+(?:\d+\.\s*)?(.+)$/gm)];
  return matches.map((match, i) => {
    const start = match.index ?? 0;
    const end = matches[i + 1]?.index ?? content.length;
    const body = content.slice(start, end);
    const summary = (body.match(/\*\*(?:摘要：|Summary:)\*\*\s*([\s\S]*?)(?=\n\*\*|\n---|$)/) || [])[1] ?? "";
    return {
      index: i + 1,
      title: stripInlineMarkdown(match[1].trim()),
      summaryLead: stripInlineMarkdown(summary).slice(0, 160),
      urls: [...body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => normalizeUrl(m[1])),
    };
  });
}

export function stripInlineMarkdown(text) {
  return text
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/\*([^*\n]+?)\*/g, "$1")
    .replace(/`([^`\n]+?)`/g, "$1")
    .replace(/\[([^\]]+?)\]\([^)]+?\)/g, "$1");
}

/** Tracking params and fragments make the same page look like different URLs. */
export function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    u.hostname = u.hostname.replace(/^www\./, "").toLowerCase();
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref$|ref_|source$)/.test(key)) u.searchParams.delete(key);
    }
    const qs = u.searchParams.toString();
    return `${u.protocol}//${u.hostname}${u.pathname.replace(/\/$/, "")}${qs ? `?${qs}` : ""}`;
  } catch {
    return url;
  }
}

/**
 * English function words inflate similarity between unrelated headlines —
 * unchecked, they chained 6,800 English blocks into one "event".
 */
const LATIN_STOPWORDS = new Set(
  (
    "a an the and or but of to in on at by for with from as is are was were be been " +
    "this that these those it its their his her they them we you your our us new says said " +
    "after before over under up down out about into more most other some all not no vs via amid"
  ).split(" "),
);

/**
 * The text signature of a block: CJK character bigrams plus latin/digit words.
 * Bigrams sidestep Chinese tokenization; latin words carry names like "OPEC".
 */
export function grams(text) {
  const out = new Set();
  const cjk = text.replace(/[^一-鿿]/g, " ");
  for (const seg of cjk.split(/\s+/)) {
    for (let i = 0; i < seg.length - 1; i += 1) out.add(seg.slice(i, i + 2));
  }
  for (const word of text.toLowerCase().match(/[a-z0-9]{2,}/g) ?? []) {
    if (!LATIN_STOPWORDS.has(word)) out.add(word);
  }
  return out;
}

export function dice(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared += 1;
  return (2 * shared) / (a.size + b.size);
}

/**
 * Corpus-frequency weights: log(N / df). Grams that appear in hundreds of
 * blocks (美股 / 收跌 / market / stocks) say "this is a market-wrap column",
 * not "this is the same story" — unweighted, they chained 101 daily market
 * recaps over three months into one "event". Distinctive grams (霍尔木兹,
 * micron, 碳达峰) keep their full weight.
 */
export function buildGramWeights(signatures) {
  const df = new Map();
  for (const signature of signatures) {
    for (const gram of signature) df.set(gram, (df.get(gram) ?? 0) + 1);
  }
  const n = Math.max(signatures.length, 1);
  const weights = new Map();
  for (const [gram, count] of df) weights.set(gram, Math.log(n / count));
  return weights;
}

/** Dice over gram weights instead of gram counts. */
export function weightedDice(a, b, weights, totalA, totalB) {
  if (!totalA || !totalB) return 0;
  let shared = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const gram of small) {
    if (large.has(gram)) shared += weights.get(gram) ?? 0;
  }
  return (2 * shared) / (totalA + totalB);
}

export function signatureWeight(signature, weights) {
  let total = 0;
  for (const gram of signature) total += weights.get(gram) ?? 0;
  return total;
}

export function dayGap(dateA, dateB) {
  return Math.abs(Date.UTC(...split(dateA)) - Date.UTC(...split(dateB))) / 86400000;
  function split(d) {
    const [y, m, day] = d.split("-").map(Number);
    return [y, m - 1, day];
  }
}

/** Minimal union-find for clustering block indices. */
export function createUnionFind(size) {
  const parent = Array.from({ length: size }, (_, i) => i);
  function find(i) {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  return {
    union(a, b) {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    },
    groups() {
      const byRoot = new Map();
      for (let i = 0; i < size; i += 1) {
        const root = find(i);
        if (!byRoot.has(root)) byRoot.set(root, []);
        byRoot.get(root).push(i);
      }
      return [...byRoot.values()];
    },
  };
}

/**
 * Cluster a corpus of blocks into events.
 *
 * `blocks`: [{ topic, date, index, title, summaryLead, urls }].
 * Edges:
 *   same day, different topic — IDF-weighted dice ≥ SAME_DAY_THRESHOLD;
 *   any pair ≤ URL_MAX_DAY_GAP apart — a shared normalized source URL.
 * Blocks of the SAME topic on the SAME day never link directly — a digest does
 * not repeat its own stories; those matches are always template noise.
 * (Transitive co-membership through a cross-topic bridge is legitimate.)
 */
export function clusterEvents(blocks) {
  const signatures = blocks.map((block) => grams(`${block.title} ${block.summaryLead}`));
  // IDF weights are computed over THIS corpus, so similarity means "unusually
  // shared vocabulary", not "both are market-wrap columns".
  const weights = buildGramWeights(signatures);
  const totals = signatures.map((signature) => signatureWeight(signature, weights));
  const uf = createUnionFind(blocks.length);

  // Shared-URL edges via an inverted index. Like the IDF weights above, the
  // hub filter is computed over THIS corpus: a URL is a reference page relative
  // to the days it is cited on here, not by any property of the URL itself.
  const byUrl = new Map();
  blocks.forEach((block, i) => {
    for (const url of block.urls) {
      if (!byUrl.has(url)) byUrl.set(url, []);
      byUrl.get(url).push(i);
    }
  });
  for (const holders of byUrl.values()) {
    // See URL_MAX_DISTINCT_DAYS: an evergreen page cited across many days is
    // evidence of a shared subject, not of a shared story.
    if (new Set(holders.map((i) => blocks[i].date)).size > URL_MAX_DISTINCT_DAYS) continue;
    for (let a = 0; a < holders.length; a += 1) {
      for (let b = a + 1; b < holders.length; b += 1) {
        const i = holders[a];
        const j = holders[b];
        if (blocks[i].date === blocks[j].date && blocks[i].topic === blocks[j].topic) continue;
        if (dayGap(blocks[i].date, blocks[j].date) > URL_MAX_DAY_GAP) continue;
        uf.union(i, j);
      }
    }
  }

  // Same-day similarity edges, bucketed per day.
  const byDate = new Map();
  blocks.forEach((block, i) => {
    if (!byDate.has(block.date)) byDate.set(block.date, []);
    byDate.get(block.date).push(i);
  });

  for (const ids of byDate.values()) {
    for (let a = 0; a < ids.length; a += 1) {
      for (let b = a + 1; b < ids.length; b += 1) {
        const i = ids[a];
        const j = ids[b];
        if (blocks[i].topic === blocks[j].topic) continue;
        if (weightedDice(signatures[i], signatures[j], weights, totals[i], totals[j]) >= SAME_DAY_THRESHOLD) {
          uf.union(i, j);
        }
      }
    }
  }

  return uf
    .groups()
    .filter((group) => group.length > 1)
    .map((group) => group.map((i) => blocks[i]));
}

/**
 * Stable id for an event: its chronologically first member (date, then topic,
 * then position). New days joining a continuing story never change the id.
 */
export function eventId(members) {
  const first = [...members].sort(
    (a, b) => a.date.localeCompare(b.date) || a.topic.localeCompare(b.topic) || a.index - b.index,
  )[0];
  return `${first.date}_${first.topic}_${first.index}`;
}

/**
 * The event's display title: the member whose signature is most similar to all
 * the others — the "most central" telling of the story.
 */
export function eventTitle(members) {
  if (members.length === 1) return members[0].title;
  const signatures = members.map((m) => grams(`${m.title} ${m.summaryLead}`));
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < members.length; i += 1) {
    let score = 0;
    for (let j = 0; j < members.length; j += 1) {
      if (i !== j) score += dice(signatures[i], signatures[j]);
    }
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return members[best].title;
}
