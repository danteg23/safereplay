import assert from "node:assert/strict";
import test from "node:test";

import { runDailyRefresh } from "../scripts/refresh-daily.mjs";

test("daily refresh updates fixtures before the private YouTube review queue", async () => {
  const calls = [];
  const report = await runDailyRefresh({
    argv: ["--region=NO"],
    checkedAt: "2026-07-10",
    fixtureDiscovery: async (options) => {
      calls.push(["fixtures", options]);
      return {
        catalogueSnapshotSaved: true,
        failures: [],
        feeds: ["feed-1", "feed-2"],
        fixtureCount: 14,
      };
    },
    liveSourceDiscovery: async (options) => {
      calls.push(["live", options]);
      return { failures: [], linksFound: 3, providersChecked: 2, publicSnapshotUpdated: true };
    },
    youtubeDiscovery: async (options) => {
      calls.push(["youtube", options]);
      return {
        candidates: [{ stage: "blocked" }, { stage: "candidate" }],
        connector: "atom_feed",
        failures: [],
      };
    },
  });

  assert.deepEqual(calls.map(([name]) => name), ["fixtures", "live", "youtube"]);
  assert.deepEqual(calls[0][1], {
    argv: ["--save-private", "--save-catalogue"],
    checkedAt: "2026-07-10",
  });
  assert.deepEqual(calls[1][1], { checkedAt: "2026-07-10T00:00:00.000Z", save: true });
  assert.deepEqual(calls[2][1].argv, ["--region=NO", "--save-private"]);
  assert.equal(calls[2][1].checkedAt, "2026-07-10");
  assert.deepEqual(report, {
    checkedAt: "2026-07-10",
    fixtures: { feedsChecked: 2, fixturesFound: 14, publicSnapshotUpdated: true },
    live: { failures: 0, linksFound: 3, providersChecked: 2, publicSnapshotUpdated: true },
    region: "NO",
    restartRequired: true,
    youtube: {
      candidatesBlocked: 1,
      candidatesFound: 2,
      connector: "atom_feed",
      feedFailures: 0,
      privateReviewQueueUpdated: true,
    },
  });
  assert.doesNotMatch(JSON.stringify(report), /title|description|thumbnail|youtube\.com/i);
});

test("daily refresh fails closed before YouTube when the fixture snapshot is incomplete", async () => {
  let youtubeCalled = false;
  await assert.rejects(() => runDailyRefresh({
    fixtureDiscovery: async () => ({
      catalogueSnapshotSaved: false,
      failures: [{ code: "feed_unavailable" }],
      feeds: [],
      fixtureCount: 0,
    }),
    liveSourceDiscovery: async () => { throw new Error("must not run"); },
    youtubeDiscovery: async () => { youtubeCalled = true; },
  }), /refused an incomplete fixture snapshot/);
  assert.equal(youtubeCalled, false);
});

test("daily refresh can use the authenticated remote YouTube route without exposing metadata", async () => {
  let youtubeOptions;
  const report = await runDailyRefresh({
    argv: ["--remote-search", "--region=PH"],
    checkedAt: "2026-07-11",
    fixtureDiscovery: async () => ({
      catalogueSnapshotSaved: true,
      failures: [],
      feeds: ["fixture-feed"],
      fixtureCount: 12,
    }),
    liveSourceDiscovery: async () => ({
      failures: [{ code: "live_source_unavailable", provider: "camel" }],
      linksFound: 2,
      providersChecked: 2,
      publicSnapshotUpdated: true,
    }),
    youtubeDiscovery: async (options) => {
      youtubeOptions = options;
      return {
        candidates: [{ stage: "candidate", title: "private raw title" }],
        connector: "remote_search",
        failures: [],
        remote: { cacheHits: 11, remoteSearches: 1 },
      };
    },
  });

  assert.deepEqual(youtubeOptions.argv, ["--region=PH", "--save-private", "--remote-search"]);
  assert.equal(report.youtube.connector, "remote_search");
  assert.equal(report.youtube.cacheHits, 11);
  assert.equal(report.youtube.remoteSearches, 1);
  assert.deepEqual(report.live, {
    failures: 1,
    linksFound: 2,
    providersChecked: 2,
    publicSnapshotUpdated: true,
  });
  assert.doesNotMatch(JSON.stringify(report), /private raw title|title|description|thumbnail|youtube\.com/i);
});
