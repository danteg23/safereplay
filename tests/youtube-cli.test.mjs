import assert from "node:assert/strict";
import test from "node:test";

import { runYouTubeDiscovery } from "../scripts/discover-youtube.mjs";

function emptyFeed(url) {
  const channelId = new URL(url).searchParams.get("channel_id");
  return `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><yt:channelId>${channelId}</yt:channelId></feed>`;
}

test("YouTube CLI runs every feed-ready source and prints only a neutral report", async () => {
  const requested = [];
  let saved = null;
  const report = await runYouTubeDiscovery({
    argv: ["--region=NO", "--save-private"],
    checkedAt: "2026-07-10",
    fetchImpl: async (url) => {
      requested.push(url);
      return { ok: true, text: async () => emptyFeed(url) };
    },
    savePrivate: async (candidates) => { saved = candidates; },
  });

  assert.ok(requested.length >= 6);
  assert.equal(new Set(requested).size, requested.length);
  assert.deepEqual(saved, []);
  assert.deepEqual(report.candidates, []);
  assert.deepEqual(report.failures, []);
  assert.equal(report.region, "NO");
  assert.equal(report.connector, "atom_feed");
  assert.equal(report.privateCandidatesSaved, 0);
  assert.doesNotMatch(JSON.stringify(report), /titleObserved|descriptionObserved|itemUrl|youtube\.com/);
});

test("YouTube CLI can use an injected Data API key without leaking it or requiring OAuth", async () => {
  const apiKey = "private-test-key-123";
  const requested = [];
  const report = await runYouTubeDiscovery({
    apiKey,
    argv: ["--region=PH"],
    checkedAt: "2026-07-10",
    fetchImpl: async (rawUrl) => {
      const url = new URL(rawUrl);
      requested.push(url);
      if (url.pathname.endsWith("/channels")) {
        const ids = url.searchParams.get("id").split(",");
        return {
          ok: true,
          json: async () => ({ items: ids.map((id) => ({
            contentDetails: { relatedPlaylists: { uploads: `UU${id.slice(2)}` } },
            id,
          })) }),
        };
      }
      if (url.pathname.endsWith("/playlistItems")) return { ok: true, json: async () => ({ items: [] }) };
      throw new Error("unexpected endpoint");
    },
  });

  assert.equal(report.connector, "youtube_data_api");
  assert.deepEqual(report.candidates, []);
  assert.deepEqual(report.failures, []);
  assert.ok(requested.length > 1);
  assert.ok(requested.every((url) => url.searchParams.get("key") === apiKey));
  assert.doesNotMatch(JSON.stringify(report), new RegExp(apiKey));
});

test("YouTube CLI can use the authenticated remote route without local credentials", async () => {
  const calls = [];
  const remoteExecutor = {
    async verify() { calls.push("verify"); },
    async search(parameters) { calls.push(parameters); return { results: [] }; },
    stats() { return { cacheHits: 0, remoteSearches: calls.filter((call) => typeof call === "object").length }; },
  };
  const report = await runYouTubeDiscovery({
    apiKey: "must-not-be-used",
    argv: ["--region=PH", "--remote-search"],
    checkedAt: "2026-07-10",
    remoteExecutor,
  });

  assert.equal(calls[0], "verify");
  assert.equal(calls.filter((call) => typeof call === "object").length, 28);
  assert.equal(report.connector, "remote_search");
  assert.deepEqual(report.remote, { cacheHits: 0, remoteSearches: 28 });
  assert.deepEqual(report.candidates, []);
  assert.doesNotMatch(JSON.stringify(report), /must-not-be-used|title|description|thumbnail|youtube\.com/i);
});

test("YouTube CLI can target an explicit historical fixture without widening the daily window", async () => {
  const calls = [];
  const remoteExecutor = {
    async verify() { calls.push("verify"); },
    async search(parameters) { calls.push(parameters); return { results: [] }; },
    stats() { return { cacheHits: 0, remoteSearches: calls.filter((call) => typeof call === "object").length }; },
  };
  const report = await runYouTubeDiscovery({
    argv: ["--region=PH", "--remote-search", "--fixture-id=iraq-norway-2026-06-16"],
    checkedAt: "2026-07-11",
    remoteExecutor,
  });

  assert.equal(calls.filter((call) => typeof call === "object").length, 2);
  assert.equal(report.connector, "remote_search");
  assert.deepEqual(report.remote, { cacheHits: 0, remoteSearches: 2 });
});

test("YouTube CLI rejects an unknown explicit fixture id", async () => {
  await assert.rejects(
    runYouTubeDiscovery({
      argv: ["--region=PH", "--fixture-id=not-a-real-fixture"],
      checkedAt: "2026-07-11",
      fetchImpl: async () => { throw new Error("must not fetch"); },
    }),
    /unknown --fixture-id: not-a-real-fixture/,
  );
});
