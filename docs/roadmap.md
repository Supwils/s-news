# Roadmap — pipeline resilience, then the features it unblocks

## The ordering constraint

Every feature below adds a step to the daily job or the build. Today a single
flaky topic sinks the whole day:

- `run_all_news.sh` runs all ten topics in isolation, but exits non-zero if *any*
  of them fails.
- `daily-news-and-commit.sh` is `set -Eeuo pipefail`, so that non-zero exit skips
  `pnpm build`, `git commit`, `git push`, and the cache warmup.
- Since `prebuild` now runs `validate:news-content`, a single digest that drifts
  from the template *also* fails the build — same outcome.
- `news-agent.sh` documents that `cursor-agent` has spun for 90+ minutes on
  transient DNS errors. Intermittent failure is the normal case, not the edge.

So: **one bad topic must not cost the other nine their publication.** Everything
else is built on top of that.

---

## Phase A — Make the daily pipeline fail partially, not totally

### A1. The prompts are the root cause of the content defects

Correlated against the 103 grandfathered issues in
`scripts/news-content-baseline.json`:

| Template defect | Consequence | Evidence |
|---|---|---|
| No command ever writes the literal `**Summary:**` / `**Links:**` / `**Commentary:**` — the English section only says "各条目（Summary / Commentary）翻译", never naming Links | The model invents `**Sources:**` | 81 of 103 defects; `sports-health-nutrition/en` ×22, `crypto/en` ×8 |
| 8 of 10 zh templates describe the framing as prose (`**总体定性**——…`) instead of showing a literal `**总体定性：**` line | Framing marker missing | All 21 framing defects come from those 8. The 2 that show it literally (`energy-climate`, `science`) have **zero** |
| All 10 embed the literal placeholder `> 基于年月日整理的…` | Copied verbatim into output | `NEWS/ai-tech/zh/2025-03-06_…md` — also the only remaining `missing summary heading`, and the orphan `2025-03` archive month |
| Templates use ASCII `'` but say nothing about it | Model emits `Today’s Summary` (U+2019) | 22 English digests silently lost all highlights until the extractor was made tolerant |
| Bullets specified as "3–5"; the UI renders `slice(0, 4)` | A 5th bullet is silently dropped | — |

Fix: show the English structure as a literal markdown block exactly like the
Chinese one; show the framing line literally; parameterize the date; mandate the
ASCII apostrophe; say 3–4 bullets.

### A2. Assert the digest was actually written

No runner checks its own output. `cursor-agent` can exit 0 having written
nothing. `scripts/assert-digest.sh` now verifies, for each topic:

- both the zh and en file exist for today's date and are non-trivial,
- the `# ` title carries today's date,
- the pair passes **strict** content validation (`--files`, no baseline).

### A3. Quarantine instead of abort

A digest that fails A2 is moved to `.quarantine/<date>/<topic>/` (gitignored,
outside `NEWS/` because the layout validator rejects unknown directories there).
`NEWS/` therefore stays valid, `pnpm build` stays green, and the nine healthy
topics publish on schedule. The quarantined files remain on disk for inspection.

### A4. Threshold, retry, and honest reporting

- `run_topic` retries once on failure (transient DNS / rate limits dominate).
- `run_all_news.sh` exits 0 when at least `NEWS_MIN_SUCCESS_TOPICS` (default 7)
  of 10 topics succeed, and writes `.generated/daily-run.json` with the outcome.
- `daily-news-and-commit.sh` stages `git add -A NEWS/` only — never `git add -u`,
  which used to sweep unrelated working-tree changes into the content commit —
  and reports the failed topics in its notification.

---

## Phase B — Expose the time dimension in search *(small)*

`build-search-index.mjs` already writes `year` and `month` filters onto every
Pagefind record; the UI only uses `topic` and `locale`. Adding a time facet is
pure frontend. Pagefind filter values OR together, so a preset like "last 3
months" is a month list, and finer presets post-filter by the exact `date` meta
already on every record.

---

## Phase C — Weekly rollups *(the archive's most wasted asset)* — DONE 2026-07-10

A daily digest loses most of its value within days. "What happened this week"
barely decays. The inputs already exist and are structured: seven `## 今日小结`
blocks and seven `**总体定性：**` lines per topic per week — **no new web search
is required**, only one summarization call over content already on disk.

Design:

- Output to `ROLLUPS/<topic>/<zh|en>/<YYYY>-W<WW>.md`, *outside* `NEWS/`, because
  `validate-news-layout.mjs` rejects unknown directories under `NEWS/` and
  `build-news-index.mjs` iterates a fixed topic list.
**Built mechanically, not by an agent** (see the `weekly-rollups` memory): the
daily `takeaway` + `highlights` are already LLM-quality, so `scripts/build-rollups.mjs`
synthesizes `.generated/rollup-index*.json` from `.generated/news-index*.json`
with zero token cost, wired into `predev`/`prebuild`/`prestart`. The weekly routes
read only that index (`lib/rollups.ts`), so `verify-build-trace.mjs` still reports
3 corpus-bearing routes. ISO week math is `lib/iso-week.mjs`, cross-checked over
2025–2027. English weeks come from the English index (13 vs 20), so empty English
weeks are not advertised. A model-written rollup can later override a week via
`ROLLUPS/` without reworking this.

## Phase D — Link health *(the "可追溯" promise)* — DONE 2026-07-10

The archive contains tens of thousands of external links. In a year a large
fraction will rot, which directly undermines the product's stated guarantee.

Design:

Built (see the `link-health` memory). One correction to the original sketch:
the report is a **committed file at repo root** (`link-health.json`), NOT a
`.generated` artifact — link health is expensive and internet-dependent, so a
`.generated` file (regenerated by prebuild) could never reach the Vercel build.
`scripts/check-links.mjs` HEAD-requests all ~17.5k distinct URLs with a
concurrency pool + timeout; `scripts/run-check-links.sh` runs it weekly and
commits the result. Classification is conservative (only 404/410 + hard network
failures are `dead`; 403/429/5xx are `unknown`). Dead links render an "存档 /
archived" Wayback fallback via `NewsMarkdown`, without pulling the corpus into the
detail routes. Missing file → feature silently off, green build. Verified.

## Phase E — Events: cross-topic clustering, then timelines *(the real bet)* — STAGES 1–2 DONE 2026-07-10

The same story (a strike on Iran) lands in `general`, `finance`, and
`energy-climate` on the same day as three unrelated `### ` blocks. The index has
no concept of an event, so the site is ten parallel newspapers rather than one
multi-perspective view.

Staged:

1. **Extract**: give every `### ` article block a stable id and pull its entities
   and links out at index time.
2. **Cluster within a day**: link articles across topics that share entities and
   source URLs. Shared URLs are a strong, cheap signal — no model call needed for
   the obvious cases.
3. **Chain across days**: connect a day's clusters to the previous days' to form
   an event timeline.
4. **Surface**: an event page showing one story through each topic's lens, over
   time.

Stages 1–2 shipped (see the `events-clustering` memory): `/events` +
`/events/[id]` serve 273 zh / 255 en cross-topic events clustered mechanically —
IDF-weighted same-day similarity (threshold 0.20, calibrated on the corpus) plus
shared source URLs (≤7-day gap). Two failure modes were hit and fixed during
calibration: English stopwords chained 6,800 blocks into one blob; recurring
market-wrap genres chained ×101 over three months. The decisive measurement:
adjacent-day text similarity CANNOT distinguish a real continuing story from a
recurring column genre (score ranges overlap), so cross-day similarity edges are
deliberately absent.

Stages 3–4 (day-chaining by meaning, event narrative) remain open — that is
where a model pass would earn its keep, using the mechanical clusters as
candidate anchors rather than clustering raw blocks. `getEventsForDigest()` in
lib/events.ts is ready for cross-linking events from daily detail pages.
