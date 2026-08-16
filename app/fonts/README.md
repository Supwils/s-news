# Vendored Latin webfonts

These four `.woff2` files are loaded by `app/layout.tsx` through `next/font/local`.

## Why they are committed

`next/font/google` downloads font binaries from `fonts.gstatic.com` **at build
time**. When a fetch fails, Turbopack does not surface a network error — it emits
CSS referencing an unresolvable internal module and the build fails with:

```
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
```

That failure took down three of the twenty production deploys preceding
2026-08-15. It is especially expensive here because the daily pipeline commits
and pushes the day's digests *before* Vercel builds: when the build dies, the
content is in git but the site keeps serving the previous day, and only a manual
redeploy recovers it.

Vendoring removes the network from the build. The build is now reproducible
offline and cannot fail this way again.

## Provenance

Each file is byte-for-byte what `next/font/google` was fetching for the `latin`
subset. The local build emits the same four assets under the same content
hashes (`f9f15f61`, `093205c5`, `3a6ba036`, `102b7f24`) and the same 182228
bytes total that production served before the switch, so everything on the
critical path is unchanged.

## What this drops: the non-`latin` subsets

`subsets: ["latin"]` did **not** mean the site only shipped Latin. It controls
which subsets get *preloaded*; `next/font/google` still declared `latin-ext`,
`cyrillic`, `cyrillic-ext`, `greek`, `greek-ext` and `vietnamese` — around 80
`@font-face` rules whose files the browser fetched on demand. That is also why
the build had so many chances to fail: Source Serif 4 alone was six weight/style
variants times six subsets.

`next/font/local` has no per-file `unicode-range`, so those subsets are gone.
Characters outside `latin` now render in the next family in the CSS chain
(`app/global.css` ends every stack in a system serif / sans / mono) instead of
in Source Serif 4 / Inter / JetBrains Mono.

Measured against the corpus at the time of the change — 2388 files, 28.2M
characters — that affects 920 characters, 0.003%:

| Subset | Occurrences | Typical |
| --- | --- | --- |
| `latin` (kept, includes U+00A0–00FF) | 11805 | ö é Ü « » Ó ² ¥ |
| `latin-ext` | 182 | ő Đ ć Š č ł ś ń |
| `greek` | 625 | π γ μ α β δ — maths in science digests, in body text |
| `cyrillic` | 111 | П Р А Й М |
| `vietnamese` | 2 | ầ |

Every one of them still renders; only the face differs, and the accented Latin
that actually recurs in the digests (French, German, Spanish, Portuguese) lives
in U+00A0–00FF and is still covered. Trading that against three full-day content
outages in twenty deploys is the deliberate call being made here.

If a future corpus makes the non-`latin` subsets matter, the fix is a second
`localFont()` call per family with `preload: false`, vendoring the `latin-ext`
files, appended to the stacks in `app/global.css` — CSS family fallback resolves
per glyph, so the browser fetches it only when such a character appears.

| File | Family | Style | `wght` axis | Bytes |
| --- | --- | --- | --- | --- |
| `source-serif-4-latin.woff2` | Source Serif 4 | normal | 200–900 | 50924 |
| `source-serif-4-latin-italic.woff2` | Source Serif 4 | italic | 200–900 | 51532 |
| `inter-latin.woff2` | Inter | normal | 100–900 | 48432 |
| `jetbrains-mono-latin.woff2` | JetBrains Mono | normal | 400–800 | 31340 |

All four are variable fonts, so one file per style covers every weight the UI
uses (display 400/600/700, body 400/600/700, mono 400/600). The weight ranges in
`app/layout.tsx` are the axis ranges above and must stay in sync with them.

## Refreshing

Google fingerprints these URLs and revs them when a family is updated, so
re-fetch by asking the CSS API rather than reusing the URLs below. Request the
*same* axes `next/font/google` would have — weights pinned, no optional axes
(notably no `opsz` for Source Serif 4; including it returns a ~122 KB file
instead of ~51 KB) — then take the `@font-face` block whose `unicode-range`
starts with `U+0000-00FF`, which is the `latin` subset.

```sh
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

curl -s -A "$UA" 'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap'
curl -s -A "$UA" 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
curl -s -A "$UA" 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap'
```

The `User-Agent` matters: without a modern one the API serves `.ttf` instead of
`.woff2`.

After replacing a file, confirm the axis range still matches `app/layout.tsx`:

```sh
python3 -c "from fontTools.ttLib import TTFont; import sys; f=TTFont(sys.argv[1]); print([(a.axisTag,a.minValue,a.maxValue) for a in f['fvar'].axes])" app/fonts/inter-latin.woff2
```

## Licensing

All three families are licensed under the SIL Open Font License 1.1, which
permits redistribution of the font files, including bundled in a web
application. They are third-party assets and are **not** covered by this
repository's own licence terms.

- Source Serif 4 — © Adobe, SIL OFL 1.1 — <https://github.com/adobe-fonts/source-serif>
- Inter — © The Inter Project Authors, SIL OFL 1.1 — <https://github.com/rsms/inter>
- JetBrains Mono — © JetBrains, SIL OFL 1.1 — <https://github.com/JetBrains/JetBrainsMono>
