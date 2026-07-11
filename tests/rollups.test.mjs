import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { isoWeekId } from "../lib/iso-week.mjs";

/**
 * The rollup index is a build artifact derived from the daily index. These
 * assertions run against whatever `pnpm build:rollups` last produced, so they
 * also confirm the artifact exists and is well-formed after a build.
 */

const GENERATED = path.join(process.cwd(), ".generated");

async function loadRollupIndex(file) {
  return JSON.parse(await readFile(path.join(GENERATED, file), "utf8"));
}

async function loadNewsIndex(file) {
  return JSON.parse(await readFile(path.join(GENERATED, file), "utf8"));
}

for (const [rollupFile, newsFile, locale] of [
  ["rollup-index.json", "news-index.json", "zh"],
  ["rollup-index-en.json", "news-index-en.json", "en"],
]) {
  test(`${locale}: every framing/highlight date sits inside its week's Mon..Sun range`, async () => {
    const index = await loadRollupIndex(rollupFile);
    for (const week of index.weeks) {
      for (const topic of week.topics) {
        for (const item of [...topic.framings, ...topic.highlights]) {
          assert.ok(
            item.date >= week.weekStart && item.date <= week.weekEnd,
            `${week.weekId}/${topic.topic}: ${item.date} outside ${week.weekStart}..${week.weekEnd}`,
          );
          assert.equal(isoWeekId(item.date), week.weekId);
        }
      }
    }
  });

  test(`${locale}: weeks are unique, newest-first, and never empty`, async () => {
    const index = await loadRollupIndex(rollupFile);
    const ids = index.weeks.map((w) => w.weekId);
    assert.deepEqual(ids, [...ids].sort((a, b) => b.localeCompare(a)));
    assert.equal(new Set(ids).size, ids.length, "duplicate week id");
    for (const week of index.weeks) {
      assert.ok(week.topics.length > 0, `${week.weekId} has no topics`);
      assert.equal(
        week.digestCount,
        week.topics.reduce((sum, t) => sum + t.digestCount, 0),
        `${week.weekId} digestCount mismatch`,
      );
    }
  });

  test(`${locale}: rollup digest count equals the daily index over the same weeks`, async () => {
    const rollups = await loadRollupIndex(rollupFile);
    const news = await loadNewsIndex(newsFile);

    const perWeekFromDaily = new Map();
    for (const entry of news.entries) {
      const week = isoWeekId(entry.date);
      perWeekFromDaily.set(week, (perWeekFromDaily.get(week) ?? 0) + 1);
    }

    for (const week of rollups.weeks) {
      assert.equal(
        week.digestCount,
        perWeekFromDaily.get(week.weekId),
        `${week.weekId}: rollup counts ${week.digestCount}, daily index has ${perWeekFromDaily.get(week.weekId)}`,
      );
    }
    // No week of daily digests is dropped from the rollups.
    assert.equal(rollups.weeks.length, perWeekFromDaily.size);
  });
}
