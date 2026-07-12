import assert from "node:assert/strict";
import test from "node:test";

import {
  runPostMatchRefresh,
  selectPostMatchFixtures,
} from "../scripts/post-match-refresh.mjs";

test("post-match selection is focused between 135 minutes and 12 hours after kickoff", () => {
  const now = new Date("2026-07-12T03:00:00Z");
  const fixtures = [
    { id: "too-recent", kickoffUtc: "2026-07-12T01:00:00Z" },
    { id: "ready", kickoffUtc: "2026-07-11T21:00:00Z" },
    { id: "too-old", kickoffUtc: "2026-07-11T14:00:00Z" },
  ];
  assert.deepEqual(selectPostMatchFixtures(fixtures, { now }).map(({ id }) => id), ["ready"]);
});

test("post-match refresh checks Reddit every run and scopes cached YouTube to the finished fixture", async () => {
  const calls = [];
  const feed = `<?xml version="1.0"?><feed><entry><content type="html">Full Match</content><link href="https://www.reddit.com/r/footballhighlights/comments/abc123/norway_vs_england/" /><published>2026-07-12T01:00:00Z</published><title>Norway vs England, World Cup, 11-Jul-2026</title></entry></feed>`;
  const report = await runPostMatchRefresh({
    feedFetch: async () => feed,
    now: new Date("2026-07-12T03:00:00Z"),
    remoteExecutor: { name: "bounded-cache" },
    replaySave: async (snapshot) => {
      calls.push(["replay", snapshot]);
      return true;
    },
    youtubeDiscovery: async (options) => {
      calls.push(["youtube", options]);
      await options.savePrivate([{ id: "private-candidate" }]);
      return { candidatesFound: 1, remote: { cacheHits: 1, remoteSearches: 1 } };
    },
    youtubeSave: async (candidates) => calls.push(["private", candidates]),
  });

  assert.deepEqual(calls.map(([name]) => name), ["replay", "youtube", "private"]);
  const fixtureIds = calls[1][1].argv.at(-1).replace("--fixture-id=", "").split(",");
  assert.ok(fixtureIds.includes("fifa-world-cup-2026-match-99"));
  assert.equal(calls[1][1].remoteExecutor.name, "bounded-cache");
  assert.deepEqual(report, {
    fixturesChecked: fixtureIds.length,
    publicSnapshotUpdated: true,
    youtube: { cacheHits: 1, candidatesFound: 1, remoteSearches: 1 },
  });
});
