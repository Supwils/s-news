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
| Cross-topic events `/events`, `/events/[id]` — IDF-weighted same-day clustering + shared-URL chaining (≤7-day gap) | `scripts/build-events.mjs`, `scripts/events-lib.mjs`, `lib/events.ts` |
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
2. **Single-machine dependency of the daily job.** Generation runs on one Mac
   via launchd. The 2026-07-24 09:00 run measured the real cost: the host slept
   four minutes in, cycled darkwake/sleep for five hours, and the job burned
   **seven hours to publish nothing**. `caffeinate` now blocks idle sleep and
   the watchdog is sleep-proof, so the same conditions fail in ~30 minutes with
   an alert instead — but a lid closed on battery still wins, and that is not
   fixable on this machine. Moving generation to a cloud cron needs a decision
   on running `cursor-agent` headless with its auth in CI, or switching backend.
   **Blocked on: platform/auth/cost decisions.**
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
- **2026-07-24 — the daily commit is pathspec-limited.** `git add -A NEWS/`
  bounds staging, not committing: `git commit` writes the whole index, and
  4985d86 shipped two unrelated staged doc renames. Content commits now carry
  `-- NEWS/`, which is also what lets CI skip them by path.
