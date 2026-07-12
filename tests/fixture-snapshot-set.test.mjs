import assert from "node:assert/strict";
import test from "node:test";

import { mergeFixtureSnapshots, selectDiscoveryFixtures } from "../src/fixture-snapshot-set.mjs";

const first = {
  checkedAt: "2026-07-09",
  fixtures: [{ id: "later", kickoffUtc: "2026-07-12T01:00:00Z" }],
};
const second = {
  checkedAt: "2026-07-10",
  fixtures: [
    { id: "earlier", kickoffUtc: "2026-07-09T20:00:00Z" },
    { id: "unknown-time", kickoffTba: true, kickoffUtc: "2026-07-10T12:00:00Z" },
    { id: "future", kickoffUtc: "2026-08-21T19:00:00Z" },
  ],
};

test("fixture snapshots merge deterministically and reject duplicate identity", () => {
  const merged = mergeFixtureSnapshots([first, second]);
  assert.equal(merged.checkedAt, "2026-07-10");
  assert.deepEqual(merged.fixtures.map((fixture) => fixture.id), ["earlier", "unknown-time", "later", "future"]);
  assert.throws(() => mergeFixtureSnapshots([first, first]), /duplicated/);
});

test("YouTube discovery window includes recent and imminent matches but not distant fixtures", () => {
  const selected = selectDiscoveryFixtures(mergeFixtureSnapshots([first, second]).fixtures, {
    checkedAt: "2026-07-10",
  });
  assert.deepEqual(selected.map((fixture) => fixture.id), ["earlier", "later"]);
});
