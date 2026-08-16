import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * The webfonts are vendored under app/fonts/ so that `next build` never talks to
 * fonts.gstatic.com. `next/font/google` downloads the .woff2 binaries during the
 * build, and when one of those fetches fails Turbopack does not report a network
 * error — it emits CSS pointing at an unresolvable internal module and the build
 * exits 1. That took down three of the twenty production deploys before
 * 2026-08-15, each time *after* the daily pipeline had already committed and
 * pushed the day's digests, so the content sat in git while the site served the
 * previous day until someone redeployed by hand.
 *
 * Reintroducing the Google loader would put that failure mode back and nothing
 * else in the repo would notice until a build died, so it is asserted here.
 */

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAYOUT = path.join(PROJECT_ROOT, "app", "layout.tsx");
const FONTS_DIR = path.join(PROJECT_ROOT, "app", "fonts");

/**
 * Layout source with comments stripped. The assertions are about what the file
 * *does*; the comments above the font declarations are free to name the very
 * import being asserted against, and do.
 */
const layoutCode = readFileSync(LAYOUT, "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((line) => !/^\s*\/\//.test(line))
  .join("\n");

/** Every `path: "./fonts/<file>"` entry in a localFont() src array. */
const declaredFiles = [...layoutCode.matchAll(/path:\s*"\.\/fonts\/([^"]+)"/g)].map(
  (match) => match[1],
);

test("the layout does not fetch fonts from Google at build time", () => {
  assert.ok(
    !/from\s+"next\/font\/google"/.test(layoutCode),
    "app/layout.tsx imports next/font/google, which downloads .woff2 files during the build " +
      "and fails the whole deploy when a fetch does not land. Vendor the file under app/fonts/ " +
      "and load it with next/font/local instead — see app/fonts/README.md.",
  );
  assert.match(layoutCode, /from\s+"next\/font\/local"/);
});

test("every font the layout declares is actually vendored", () => {
  assert.ok(declaredFiles.length > 0, "found no localFont src paths in app/layout.tsx");
  for (const file of declaredFiles) {
    assert.ok(
      statSync(path.join(FONTS_DIR, file), { throwIfNoEntry: false })?.isFile(),
      `app/layout.tsx declares ./fonts/${file}, which is not in app/fonts/`,
    );
  }
});

test("every vendored font is a real woff2 and not a truncated download", () => {
  const vendored = readdirSync(FONTS_DIR).filter((file) => file.endsWith(".woff2"));
  assert.deepEqual(
    vendored.sort(),
    [...declaredFiles].sort(),
    "app/fonts/ and app/layout.tsx disagree on which files exist — an orphaned or missing face",
  );

  for (const file of vendored) {
    const bytes = readFileSync(path.join(FONTS_DIR, file));
    // Refreshing these means re-fetching from the Google CSS API by hand, and a
    // wrong User-Agent or a bad URL yields an HTML error page or a .ttf, both of
    // which would sail through as "a file exists".
    assert.equal(
      bytes.subarray(0, 4).toString("latin1"),
      "wOF2",
      `app/fonts/${file} is not a woff2 file (signature: ${bytes.subarray(0, 4).toString("hex")})`,
    );
    assert.ok(bytes.length > 10_000, `app/fonts/${file} is only ${bytes.length} bytes`);
  }
});
