# Optimization Plan — Correctness, i18n, and Pipeline Hardening

Derived from the business-logic review of 2026-07-10. Ordered by blast radius,
each phase independently verifiable and revertible.

## Guiding principle

Every bug in the review traces back to one of three structural weaknesses. Fix
the structure, not the symptom:

1. **Content contracts are asserted in two places and enforced in zero.**
   The extraction regexes in `lib/markdown-extract.mjs` and the validation
   regexes in `scripts/validate-news-content.mjs` are independent copies, and
   the validator runs in no build step. A digest can drift from the template,
   silently lose its highlights, and still ship green.
   → Single source of truth for the patterns; validator gated in `prebuild`
   with a ratcheting baseline so legacy defects don't block the build but new
   ones do.

2. **Locale is inferred in four different ways.** The route prefix, a React
   context prop, a cookie, and `localizePath` call sites each carry a partial
   answer, and they disagree. `lib/rss.ts` forgets to localize at all; nested
   `LocaleProvider`s fight over the cookie and win in the wrong order.
   → Locale becomes a pure function of the pathname, computed once.

3. **Wall-clock time is read during render on statically prerendered pages.**
   `new Date()` in `masthead.tsx` and `footer.tsx` bakes the build timestamp
   into HTML that then disagrees with the client.
   → Remove the clock from render. Deterministic build-time constants instead.

---

## Phase 0 — Content extraction & validation (root cause of 2 shipped bugs)

| Change | File |
|---|---|
| Export `SUMMARY_HEADING` / `FRAMING_MARKER` / takeaway patterns as the single source of truth | `lib/markdown-extract.mjs` |
| Accept the curly apostrophe `Today’s Summary` (22 live files) | `lib/markdown-extract.mjs` |
| Accept the `**定性**：` and `**简评（总体定性）：**` framing variants | `lib/markdown-extract.mjs` |
| `getSummaryBlock` strips the heading line so the takeaway fallback can never return `## 今日小结` + bullets | `lib/markdown-extract.mjs` |
| Validator imports the shared patterns instead of copying them | `scripts/validate-news-content.mjs` |
| Validator gains a ratcheting baseline: known legacy issues are grandfathered, any *new* issue exits 1 | `scripts/validate-news-content.mjs`, `scripts/news-content-baseline.json` |
| Single shared `TOPICS` list for all four scripts | `scripts/news-topics.mjs` |
| `build-news-index.mjs`: resolve root from the script, reject filenames without a `YYYY-MM-DD_` prefix, fail on an empty index | `scripts/build-news-index.mjs` |
| Wire `validate:news-layout` + `validate:news-content` into `prebuild` | `package.json` |

## Phase 1 — Locale correctness

| Change | File |
|---|---|
| RSS item `<link>`/`<guid>` and channel `<link>` go through `localizePath` | `lib/rss.ts` |
| Global feed channel description is localized | `lib/rss.ts`, `lib/site.ts` |
| `LocaleProvider` derives locale from `usePathname()` — nesting can no longer clobber the cookie or `document.lang` | `components/locale-context.tsx` |
| Delete the now-redundant nested provider | `app/en/layout.tsx` |
| English 404 page + catch-all so `/en/<missing>` renders English | `app/en/not-found.tsx`, `app/en/[...rest]/page.tsx` |
| 404 back-link is localized | `app/not-found.tsx` |
| Locale switch falls back to the locale home for routes with no twin (`/runtime`) | `lib/locale-routing.ts` |
| `getAllNewsParams(locale)`; the `/en` detail route uses the `en` index | `lib/news.ts`, `app/en/news/[topic]/[date]/page.tsx` |
| Sitemap lists English archive months that actually have English entries | `app/sitemap.ts` |

## Phase 2 — Determinism & hydration

| Change | File |
|---|---|
| Expose `NEXT_PUBLIC_BUILD_TIME` and `NEXT_PUBLIC_LATEST_ISSUE_DATE` (read from the freshly built index) | `next.config.ts` |
| Masthead stamp = latest issue date, never `new Date()`; Archive link points at the latest issue's month | `components/newspaper/masthead.tsx` |
| Footer `GENERATED` stamp = build time constant | `components/newspaper/footer.tsx` |
| Footer `RUNTIME` link respects the same local-only gate as the nav | `components/newspaper/footer.tsx` |

## Phase 3 — UI logic

| Change | File |
|---|---|
| Topic-filtered "SEE ALL N" links to `/news/<topic>`, not to one article | `components/news-home.tsx` |
| `Load more` guards against concurrent invocations and disables while loading | `components/search-page.tsx` |
| Reading progress actually persists, activating the existing Continue/READ UI | `components/reading-progress.tsx`, `components/news-detail-content.tsx` |

## Phase 4 — API & operations

| Change | File |
|---|---|
| `getNewsEntry` degrades to `null` instead of throwing on a stale index; reject `..` in indexed paths | `lib/news.ts` |
| `/api/news` accepts `?locale=` and stops serializing `searchText` | `app/api/news/route.ts` |
| `/api/revalidate` revalidates the whole route tree per locale; drop the mutating `GET` alias | `app/api/revalidate/route.ts` |

---

# Build & Delivery Optimization (2026-07-10, second pass)

Measured first. The proposal on the table was "SSG for the last month, ISR for
older news"; the numbers said no. See `render_mode_decision` for the full case:
the site is already 100% SSG (so ISR can only be slower), the whole build takes
23 seconds, and content is published by redeploy — which wipes the ISR cache
either way and leaves a function reading markdown baked into its own immutable
bundle. ISR's premise does not hold while `NEWS/` lives in the repo.

What was done instead, in ascending order of risk:

## D — Prerender `/en` detail pages from the English index

`generateStaticParams` for `/en/news/[topic]/[date]` returned the union of both
indexes (1065 pages). ~360 of those are Chinese-only entries rendered under `/en`
as a marked fallback — and the English sitemap never lists them, so no crawler
and no link reaches them. They now generate on demand (120 ms cold, 20 ms warm)
and stay cached. English-only entries are still covered, because the English
index is the source. **−360 prerendered pages, zero user-visible change.**

## A — List pages stop serializing entries they never render

`/archive/2026-04` rendered 8 day-groups but serialized all 265 entries —
including 191 KB of highlights — into its RSC payload. Same shape on topic pages
(36 of 110 cards rendered, 110 shipped). The server now passes exactly the
prerendered window; `useMoreEntries` fetches the remainder from
`/api/news?locale=&topic=&month=` on the first "load more" click, once, cached.

| page | raw | brotli |
|---|---|---|
| `/archive/2026-04` | 756 KB → **477 KB** | 118 KB → **49 KB** |
| `/news/ai-tech` | 340 KB → **234 KB** | 54 KB → **25 KB** |

Window sizes live in `lib/list-windows.ts` so the server slice and the client
render can never drift.

## B — Keep the 31 MB corpus out of functions that never read it

Every route's bundle traced all 1770 digests, because `lib/news.ts` joined a
dynamic path under `NEWS/`. Only three routes open a markdown file at request
time. The reader moved to `lib/news-content.ts` — necessary but not sufficient,
since the dynamic join lands in a shared server chunk. `outputFileTracingExcludes`
plus `outputFileTracingIncludes` in `next.config.ts` finish the job.
**Routes carrying the corpus: 17 → 3.**

`NEWS/` stays on the filesystem, so this is a *runtime* dependency, not a build
detail: an on-demand page whose markdown was never bundled 500s in production
while every local page — all prerendered — looks fine. The design assumes nothing
about where content lives beyond "on disk", and adapts on its own:

- **Discovered, not declared.** `scripts/news-runtime-routes.mjs` finds the routes
  that import `lib/news-content.ts` and derives the tracing keys (escaping the
  `[param]` glob character classes, which silently match nothing otherwise). Add a
  route that reads a digest and it is covered — no config edit.
- **Asserted, not assumed.** `scripts/verify-build-trace.mjs` runs as `postbuild`
  and fails the build on all three ways this can rot: a route that reads markdown
  without it bundled, a route that bundles it without reading it, and any module
  outside `app/` importing the reader (which would drag the corpus everywhere
  transitively). Each fault mode is exercised and confirmed to fail the build.
- **Covered by tests.** `tests/news-runtime-routes.test.mjs` pins the discovered
  route set, the no-rogue-importer rule, and the key escaping.

The key syntax is counter-intuitive; it is documented in `next.config.ts`.

## C — Warm the whole hot set after a deploy

Every deploy leaves the edge cache cold, which is the recorded TTFB driver.
`warm-cache.sh` warmed only the newest day; it now warms 64 URLs — both homes,
the newest `WARM_DAYS` (default 2) days, all ten topic pages, and the current
archive month — concurrently, still best-effort and non-fatal.

## Net result

| | before | after |
|---|---|---|
| `.next` output | 811 MB | **659 MB** |
| prerendered routes | 2169 | **1809** |
| routes bundling 31 MB of markdown | 17 | **3** |
| build wall time | 23.7 s | 22.9 s |

Revisit the render mode when prerendered routes exceed ~10k or the build exceeds
~5 min — roughly a year out at 20 pages/day.

---

## Deliberately NOT done

- **`<html lang="zh-CN">` on `/en` (SSR).** Fixing the server-rendered value
  requires two root layouts via route groups, which means moving every route
  file. The client-side `lang` is corrected by Phase 1. Tracked separately;
  the risk of relocating a 1770-page static route tree outweighs the benefit
  in this pass.
- **Deleting `NEWS/ai-tech/zh/2025-03-06_AI与科技新闻日报.md`**, the template
  artifact that invents an orphan `2025-03` archive month. It is user content;
  removal is the owner's call.
- **Repairing the 104 legacy content defects** (missing `**链接：**` labels and
  framing markers across ~48 files). They are grandfathered by the baseline and
  should be fixed by regenerating those digests, not by a script.
