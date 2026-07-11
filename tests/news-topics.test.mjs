import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { TOPIC_FOLDERS } from "../scripts/news-topics.mjs";

/**
 * The Node scripts and the TypeScript app each need a topic list, and they
 * cannot import each other. This test is the seam: a topic added to
 * lib/news-meta.ts but not to scripts/news-topics.mjs would otherwise be
 * silently absent from the generated index and the search index — the app
 * treats a successfully-loaded index as authoritative, so the topic would
 * simply show zero digests with no error anywhere.
 */
test("scripts and lib/news-meta.ts agree on the topic list", async () => {
  const source = await readFile(path.join(process.cwd(), "lib", "news-meta.ts"), "utf8");
  const fromMeta = [...source.matchAll(/^\s+key: "([^"]+)",$/gm)].map((match) => match[1]);

  assert.ok(fromMeta.length > 0, "could not parse topic keys from lib/news-meta.ts");
  assert.deepEqual(
    [...fromMeta].sort(),
    [...TOPIC_FOLDERS].sort(),
    "lib/news-meta.ts and scripts/news-topics.mjs disagree",
  );
});
