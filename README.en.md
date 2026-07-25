# Swil-News

[中文](./README.md) | English

**Turn Cursor-generated daily digests into an interface worth opening every day.**

Swil-News is a local-first multi-topic daily news reader. You generate general, finance, AI/tech, sports-health-nutrition, and other digests with Cursor Commands, store them as Markdown, and use this Next.js app to browse and search them by date and topic. The result is a readable, searchable daily information hub instead of scattered output files.

---

## Why It Matters

- **Your data stays with you**: digests live in local `NEWS/` folders, not a hosted CMS. You can version them, back them up, and control them.
- **Multi-topic and traceable**: every entry includes summaries, links, and commentary, and everything is archived by date.
- **Repeatable generation**: the same Commands and scripts can be rerun anytime or scheduled with cron.
- **Theme-aware reading experience**: the web UI supports light/dark mode and system preference.

This is a good fit if you want AI-generated daily briefings without giving up control over the data or the reading experience.

---

## Feature Overview

- **Bilingual daily digests**: 10 topics × Chinese/English, generated in isolation with quarantine on failure (one bad topic never blocks the other nine).
- **Daily brief**: a cross-topic front-page selection built from each digest's highlights.
- **Weekly rollups `/weekly`**: synthesized mechanically from the daily index at zero token cost.
- **Cross-topic events `/events`**: the same story clustered across topic digests (same-day similarity + shared source URLs across days).
- **Full-text search `/search`**: static Pagefind index with topic, locale, and time (month/quarter/year) facets.
- **Link health**: a weekly check over ~17.5k external links; dead links get a Wayback archive fallback in the reader.
- **RSS**: site-wide and per-topic feeds in both locales (`/feed.xml`, `/news/[topic]/feed.xml`).

---

## Local vs Deployment

| Scenario | Behavior |
|------|------|
| **Run locally** | You can access the **Runtime** page and trigger generation scripts from the web UI. News is read directly from local `NEWS/`. |
| **Public deployment (for example Vercel)** | **No Runtime**: scripts do not run in deployment. The site only shows committed `NEWS/` digests. The navigation hides the Runtime entry, and `/runtime` becomes a read-only explanation page. |

Flow: **generate locally -> write into `NEWS/` -> commit and push -> deploy bundles the content -> visitors get read-only access**. Deployment disables execution permissions through environment checks such as `VERCEL`, which keeps the setup simple and safer.

---

## Workflow

1. **Define a digest**: create a topic-specific instruction file under `.cursor/commands/` with steps, template, and output path.
2. **Trigger generation**: run `scripts/run-*-news.sh` locally or on a schedule, or open the app locally and use the Runtime page. The scripts call Cursor CLI Commands and write files into `NEWS/<topic>/`.
3. **Read and search**: the Next.js app reads Markdown from the filesystem, or from bundled `NEWS/` files after deployment, and lets you browse by date/topic and search titles and summaries.

Flow: **person / cron -> script -> Cursor CLI -> NEWS/*.md -> Next.js UI**.

---

## Project Structure

```text
├── .cursor/commands/     # Topic-specific digest Command definitions
│   ├── general-news.md
│   ├── finance-news.md
│   ├── aitech-news.md
│   └── …
├── NEWS/                 # Generated digests (topic × zh/en subdirectories, committed)
│   ├── general/{zh,en}/
│   ├── finance/{zh,en}/
│   ├── ai-tech/{zh,en}/
│   └── … (10 topics)
├── scripts/              # Generation, validation, index builders, ops
│   ├── daily-news-and-commit.sh  # Full daily flow: generate→validate→build→push→warm cache
│   ├── run_all_news.sh           # All topics, parallel, quarantine + publish threshold
│   ├── validate-news-*.mjs       # Layout/content validators (prebuild gate)
│   ├── build-{news-index,rollups,events,search-index}.mjs
│   └── check-links.mjs           # Weekly link-health check
├── app/                  # Next.js App Router (/ Chinese tree + /en English tree)
│   ├── page.tsx          # Home: daily brief + date index
│   ├── news/[topic]/[date]/  # Digest detail pages
│   ├── weekly/ events/ search/ archive/  # Rollups, events, search, monthly archive
│   ├── runtime/          # Local-only page for running generation
│   └── api/              # NEWS reading API; runtime/generate is local-only
├── components/  lib/     # UI components; index readers, parsing, events/rollup logic
└── docs/
    ├── roadmap.md        # Status board: shipped / open / decision log (authoritative)
    └── s-news.md         # Design and architecture notes
```

---

## Usage

### Requirements

- Node 22+ (tests run on 22.6+ via `--experimental-strip-types`; 22.18+ recommended)
- To **generate** digests: installed and authenticated [Cursor CLI](https://cursor.com) (`agent` available in PATH)

### Generate Digests

Run a topic script from the project root, for example:

```bash
./scripts/run-aitech-news.sh
```

Or run all topics in sequence:

```bash
./scripts/run_all_news.sh
```

These scripts call `agent`, follow the workflows defined in `.cursor/commands/*.md`, and produce files like `NEWS/<topic>/{zh,en}/YYYY-MM-DD_*.md`. Every digest is strictly validated on arrival; a malformed one is quarantined instead of breaking the site. The full daily flow (generate → validate → build → commit/push → cache warmup) lives in `scripts/daily-news-and-commit.sh` and can be scheduled with cron or launchd.

### Local Reading and Runtime

```bash
pnpm install
pnpm dev
```

Then open the local app, browse by date/topic, and search the archive. When running locally, the navigation includes **Runtime**, where you can choose a topic and trigger the generation script directly.

### Run Production Locally

```bash
pnpm build
pnpm start
```

Production mode still reads from the current directory's `NEWS/`. On a local machine, the Runtime API remains available, similar to `pnpm dev`.

### Deploy (for example Vercel + GitHub)

1. Connect the repository to Vercel and use the normal `next build` flow.
2. Daily workflow: generate digests **locally** -> **commit and push** `NEWS/` changes -> let Vercel redeploy.
3. The deployed site stays **read-only**: no Runtime execution, only bundled `NEWS/` content.

---

## Tech Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS 4**, with theme variables in `app/global.css`
- Digest parsing from `NEWS/**/*.md`, based on title/summary/link/commentary structure rather than a CMS

---

## What's Next

The authoritative status board and open items live in **docs/roadmap.md**. In short:

- **Cross-day event chaining and narratives** (model-assisted, upgrading the mechanical clusters into multi-day timelines).
- **Moving generation to the cloud** so publishing no longer depends on one laptop being awake.
- **A mobile Speed Insights pass** (desktop has been profiled and optimized; mobile has not).

For design and architecture details, see **docs/s-news.md**.

---

*Local-first and open-source friendly. Your data stays in your hands, and the interface follows the content.*
