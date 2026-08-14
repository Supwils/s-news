# Status board & roadmap

> Updated 2026-07-24. This file is the single source of truth for what is built
> and what is genuinely open. If another doc contradicts it, this one wins.

## Docs map

| Doc | Status |
|---|---|
| `docs/roadmap.md` (this file) | **Authoritative** status + open items + decision log |
| `docs/optimization-plan.md` | Historical record of the 2026-07-10 perf/resilience pass — accurate as history |
| `docs/s-news.md` | Original design/architecture doc (March). Broad strokes still right; file-layout details predate the `zh/en` split |
| `docs/archive/*` | Superseded planning scratchpads, kept for provenance only |

## Shipped

Everything below is live and verified; pointers are the code entry points.

| Capability | Entry points |
|---|---|
| Daily generation: 10 topics × zh/en, 2-way parallel, retry, quarantine, ≥7/10 threshold, honest partial-success notifications | `scripts/daily-news-and-commit.sh`, `scripts/run_all_news.sh`, `scripts/assert-digest.sh` |
| Repair triage before quarantine: Tier 0 deterministic label rewrites → guarded agent format-repair → quarantine | `scripts/repair-digest.mjs`, `scripts/repair-digest-lib.mjs` |
| Content contract: layout + content validators, 103 grandfathered legacy issues, strict mode for fresh files, prompts tested against the validator | `scripts/validate-news-*.mjs`, `scripts/news-content-baseline.json`, `tests/news-commands.test.mjs` |
| Local push gate (validate + lint + test) via versioned hooks; node-version-proof test runner (`--experimental-strip-types`) | `.githooks/pre-push`, `package.json` `prepush`/`prepare` |
| Rendering: ~2700 routes SSG from `.generated/news-index*.json`; only 3 routes carry the 31 MB corpus (traced + verified postbuild) | `next.config.ts`, `scripts/verify-build-trace.mjs` |
| Weekly rollups `/weekly` — synthesized mechanically from the daily index, zero token cost | `scripts/build-rollups.mjs`, `lib/rollups.ts` |
| Cross-topic events `/events`, `/events/[id]` — IDF-weighted same-day clustering + shared-URL chaining (≤7-day gap, evergreen "hub" URLs filtered out) | `scripts/build-events.mjs`, `scripts/events-lib.mjs`, `lib/events.ts` |
| Link health: weekly ~17.5k-URL check, conservative dead classification, Wayback fallback in the reader | `scripts/check-links.mjs`, `link-health.json` |
| Search `/search`: Pagefind + topic/locale facets + time presets (month/quarter/year via `{any:[...]}` filters) | `scripts/build-search-index.mjs`, `lib/search-time-range.ts`, `components/search-page.tsx` |
| Daily brief on both homes (lead + per-topic picks from highlights/takeaway) | `components/news-home.tsx` |
| Issue pager on digest pages: prev/next issue links (`rel` semantics) + ←/→ keyboard nav; /en pager stays inside the English index | `lib/adjacent-dates.ts`, `components/news-detail-content.tsx` |
| Runtime page with run states (idle/running/success/error), local-only execution | `app/runtime/page.tsx` |
| Perf: slim home/archive payloads (−70…87%), single-locale detail props, warm-cache of the 70-URL hot set gated on a deploy probe (cold 1.1–2.4s TTFB vs <0.2s warm) | `lib/news.ts`, `scripts/await-deploy.sh`, `scripts/warm-cache.sh` |
| Ops: network preflight, dual-channel notifications, quarantine rotation, weekly link-check schedule, false-success bug fixed 2026-07-23 | `scripts/daily-news-and-commit.sh`, `scripts/notify.sh` |
| Ops hardening 2026-07-24: sleep-proof agent watchdog, `caffeinate` power assertion, deploy verification before warming, NEWS-only content commits, debug-log rotation, longest-topic-first dispatch | `scripts/news-agent.sh`, `scripts/await-deploy.sh`, `scripts/daily-news-and-commit.sh`, `tests/pipeline-scripts.test.mjs` |

## Open items, ranked

1. **Events stages 3–4 — cross-day chaining by meaning + event narrative.**
   The one substantial product bet left (original Phase E). Mechanical cross-day
   *text* edges were measured and rejected (recurring column genres are
   indistinguishable from continuing stories); shared-URL chaining already
   exists. The designed next step is a small daily model pass that judges
   chain/no-chain over candidate event pairs (mechanical clusters as anchors)
   and writes a committed artifact like `link-health.json`, so the Vercel build
   stays token-free. **Blocked on: owner approval of daily token spend +
   placement in the daily pipeline.**
2. ~~**Single-machine dependency of the daily job.**~~ DONE 2026-08-13:
   `.github/workflows/daily-news.yml` runs the same
   `scripts/daily-news-and-commit.sh` on a GitHub runner at 14:43 UTC; launchd
   is unloaded and its plist renamed `.disabled` (renaming matters — launchd
   reloads anything left in `~/Library/LaunchAgents` at next login). First
   scheduled run: 10/10 topics, no retries, 33m35s end to end. Measured on the
   way:
   - Auth is a Cursor **user API key** in the `CURSOR_API_KEY` repo secret.
     Verified against a keyless control step, which fails with "Authentication
     required". Testing this locally with a fake `HOME` gives a false negative
     ("Keychain operation timed out") — hiding `~/.cursor` also hides the macOS
     keychain, which Linux does not have.
   - Actions is free because the repo is **public**. Going private would bill
     ~900 min/month against the 2000-minute free tier.
   - Cursor logs API-key usage as **Free**, not `Included`: the cloud run does
     not draw on the subscription pool the way the logged-in Mac session did.
     Treat that as a beta-period state, not an architectural advantage —
     ~11.2M tokens/day is not a plausible permanent giveaway. Baseline recorded
     so a change is detectable.
   - The scheduler fired **53 minutes late** even at a `:43` minute picked to
     dodge top-of-hour congestion (`created` == `started`, so the delay is
     GitHub's, not runner allocation).
   **Residual gap:** a dropped scheduled run is silent — no failed job exists to
   notify anyone. A deadman switch (separate workflow asserting that main has a
   NEWS commit for today) is the remaining work.
3. ~~**Cloud CI gate.**~~ DONE 2026-07-24: `.github/workflows/gate.yml` runs
   `pnpm prepush` on code pushes, PRs, and manual dispatch. Full `next build` is
   deliberately excluded — Vercel already builds every push and a broken build
   fails the deploy, not the site. `paths-ignore: NEWS/**` keeps the daily
   content push out of CI; the NEWS-only content commit makes that filter exact.
4. **Mobile Speed Insights pass.** Desktop was profiled and fixed (RES 74 → 
   Tier 1–3 done); the Mobile tab was never reviewed. Needs dashboard data.
5. **`<html lang>` is `zh-CN` when SSR-rendering `/en`.** Fix requires two root
   layouts via route groups (moving every route file). Deferred by risk
   assessment 2026-07-10; client-side `lang` is corrected.
6. **103 grandfathered legacy content defects.** Standing decision: fix by
   regenerating those digests, not by scripted rewrites of year-old content.
   Optional; they are invisible to readers except as missing labels/framing.
7. **`NEWS/ai-tech/zh/2025-03-06_….md` template artifact** (invents an orphan
   2025-03 archive month). User content; removal is the owner's call.

## Decision log

- **2026-07-10 — render mode stays 100% SSG.** ISR cannot deliver its promise
  while content lives in the repo (immutable function bundles); build is ~30 s
  so there is nothing to save. Revisit past ~10k routes or a 5-min build.
  - *Amended 2026-08-14 — watch the deploy, not the build.* Re-measured: 36 s
    locally for ~2700 routes, so the build has not grown and, on this hardware,
    never will trip a 5-minute trigger. What does grow with route count is the
    deploy: the 2026-08-13 run took 2m09s to build and **5m48s** from push to
    the site serving the new issue. `await-deploy.sh` already measures that
    every day, so the trigger should be a rising `await_deploy` duration rather
    than a hand-estimated build time. At ~20 new files/day the ~10k-route line
    arrives around mid-2027; the answer there is fewer routes (fold old dates
    into monthly archives), not a different render mode.
- **2026-07-10 — no cross-day similarity edges in events.** Measured: score
  ranges of continuing stories and recurring genres overlap. Only shared URLs
  chain across days; meaning-level chaining is a model's job (open item 1).
- **2026-07-10 — legacy defects are grandfathered, not script-rewritten.**
  Fresh files are held to strict validation instead.
- **2026-06-16 — one client parent beats many server islands** for
  widget-heavy pages: converting `NewsDetailContent` to a server component
  *grew* the payload; reverted. Measure `.html`/`.rsc` before refactoring.
- **2026-07-23 — pre-push gate + daily job hardened.** Test runner made
  node-version-proof; sourced `set +e` leak fixed so a failed push can never
  report success again.
- **2026-07-24 — timeouts are measured against `date +%s`, never a timer.**
  `alarm(2)` and GNU `timeout` both arm ITIMER_REAL, which stops counting while
  macOS sleeps. A 30-minute agent timeout sat through a five-hour stall because
  from its point of view no time had passed. Any future wall-clock bound in this
  pipeline polls the clock; `tests/pipeline-scripts.test.mjs` enforces it.
- **2026-07-24 — the pipeline verifies the deploy, not just the push.** A flat
  `sleep 150` before warming was shorter than a Vercel build, so every warmup
  ran against the previous deployment — all twenty of that day's article URLs
  returned 404 and the job still emailed success. `await-deploy.sh` probes for
  the newest issue instead; a deployment that never serves it fails the job.
- **2026-08-14 — "I could not reach it" is not "it is gone".** `classifyStatus`
  counted `network-error` and `timeout` as dead. The 2026-07-28 report therefore
  called **10,236 of 20,339 URLs dead (50.3%)** — 9,051 on network-error, 904 on
  timeout, against **281** real 404/410s. The reader swaps a dead link for a
  Wayback snapshot, so half the archive was pointing at snapshots of live pages,
  with CoinDesk (518), CNBC (502), TechCrunch (247), BBC, Bloomberg and Nature
  at the top of the "dead" list; every one served 200 when spot-checked. The
  failures were self-inflicted: `collectUrls` sorts, which puts a host's URLs
  adjacent, and the checker slices that sorted list into batches — so a batch of
  `LINK_CHECK_CONCURRENCY` was that many simultaneous requests to one origin,
  and the hosts with the most URLs got hit hardest. Three fixes: only 404/410
  are dead (the function's own doc already said a false dead is worse than a
  missed one); `interleaveByHost` round-robins the hosts; and
  `mapWithConcurrency` replaces the `await Promise.all(batch)` loop, whose
  barrier made every batch wait for its slowest member — sorted input hid that
  (a batch was one host, so its members behaved alike) and interleaving exposed
  it, so the first re-run had not finished after 29 minutes. Re-measured over
  22,493 URLs at concurrency 48 in 35 min: **ok 8,411 → 17,302, dead 10,236 →
  537 (50.3% → 2.4%), and every remaining dead link is a real 404 or 410** —
  9,725 URLs stopped resolving to Wayback snapshots, led by CoinDesk (501),
  CNBC (492), Nature (444) and TechCrunch (238). Two lessons worth keeping: a
  hard failure is not proof of absence, and a measurement this far off should
  have been questioned by its own implausibility long before anyone read the
  code. Also fixed in passing: `--sample`, documented as a smoke test, wrote its
  partial result straight over the committed report.
- **2026-07-25 — an evergreen source URL is not a story link.** URL edges were
  the one signal trusted without qualification. The URLs doing the most chaining
  turned out to be reference pages (`federalreserve.gov/releases/h15` on 15
  distinct days, a VIX product page on 12), and because union-find is
  transitive, `URL_MAX_DAY_GAP` bounded each edge while the cluster grew without
  limit — three weeks of market wraps became one "event" named after a single
  day's close. A URL cited on more than `URL_MAX_DISTINCT_DAYS` (3) distinct
  days now creates no edges, the same qualification IDF already gave the text
  signal. Swept before choosing: event count is flat (322 → 324), max span
  27d → 12d, events over 14 days 11 → 0. 18 of 322 event ids churned.
- **2026-07-25 — the site hardcodes its production origin.** See
  `lib/site-origin.mjs`. Canonical/sitemap/robots/RSS/OG had been advertising
  the per-deployment `*.vercel.app` host since launch; a postbuild gate now
  fails a production build that would ship the wrong one.
- **2026-07-24 — the daily commit is pathspec-limited.** `git add -A NEWS/`
  bounds staging, not committing: `git commit` writes the whole index, and
  4985d86 shipped two unrelated staged doc renames. Content commits now carry
  `-- NEWS/`, which is also what lets CI skip them by path.
