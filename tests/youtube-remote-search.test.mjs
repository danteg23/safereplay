import assert from "node:assert/strict";
import test from "node:test";

import {
  discoverRemoteYouTubeCandidates,
  formatAwareFixtureQuery,
  preferredChannelFixtureQuery,
  sanitizeRemoteYouTubeSearchResponse,
} from "../src/youtube-remote-search.mjs";

const source = {
  access: "free",
  channelId: "UCpcTrCXblq78GZrTUTLWeBw",
  discovery: ["youtube_channel"],
  formats: ["full", "extended", "short"],
  id: "fifa-youtube",
  provenance: "verified_official",
};
const fixture = {
  competition: "World Cup",
  id: "france-morocco-example",
  kickoffUtc: "2026-07-09T20:00:00Z",
  scope: "senior_men",
  teams: ["France", "Morocco"],
};

function result(overrides = {}) {
  return {
    channel_id: source.channelId,
    channel_title: "Raw channel title is discarded",
    description: "Neutral tournament match package.",
    published_at: "2026-07-09T22:00:00Z",
    thumbnail: "https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg",
    title: "France v Morocco | Extended Highlights",
    url: "https://attacker.example/not-trusted",
    video_id: "AbCdEf12345",
    ...overrides,
  };
}

test("remote JSON parser reconstructs destinations and discards account and untrusted fields", () => {
  const parsed = sanitizeRemoteYouTubeSearchResponse({
    account: "private account label",
    next_page_token: "opaque token",
    query: "raw query",
    results: [result()],
  });
  assert.deepEqual(parsed, {
    results: [{
      channelId: source.channelId,
      description: "Neutral tournament match package.",
      itemUrl: "https://www.youtube.com/watch?v=AbCdEf12345",
      published: "2026-07-09T22:00:00Z",
      thumbnailUrl: "https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg",
      title: "France v Morocco | Extended Highlights",
      videoId: "AbCdEf12345",
    }],
  });
  assert.doesNotMatch(JSON.stringify(parsed), /account label|opaque token|attacker\.example|channel title/i);
});

test("remote discovery spends one query per fixture and retains only allowlisted channels", async () => {
  const calls = [];
  const response = {
    results: [
      result(),
      result({ channel_id: "UCaaaaaaaaaaaaaaaaaaaaaa", video_id: "OtherVid001" }),
    ],
  };
  const discovery = await discoverRemoteYouTubeCandidates({
    checkedAt: "2026-07-10",
    fixtures: [fixture],
    region: "PH",
    searchImpl: async (parameters) => { calls.push(parameters); return response; },
    sources: [source],
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    maxResults: 25,
    publishedAfter: "2026-07-07T20:00:00.000Z",
    query: "France Morocco highlights|France Morocco full match",
    region: "PH",
    safeSearch: "moderate",
    topicId: "/m/02vx4",
  });
  assert.deepEqual(discovery.failures, []);
  assert.equal(discovery.candidates.length, 1);
  assert.equal(discovery.candidates[0].sourceId, "fifa-youtube");
  assert.deepEqual(discovery.candidates[0].formats, ["extended"]);
  assert.equal(discovery.candidates[0].metadata.thumbnailState, "unscanned");
});

test("format-aware remote query covers highlights and full match in one search", () => {
  assert.equal(
    formatAwareFixtureQuery(fixture),
    "France Morocco highlights|France Morocco full match",
  );
  assert.throws(() => formatAwareFixtureQuery({ teams: ["France"] }), /exactly two teams/);
});

test("TV 2 gets one Norwegian preferred-channel search and still requires its exact channel id", async () => {
  const tv2 = {
    access: "free",
    channelId: "UC9QZZRUajPEoo1Q-V3MfvnQ",
    discovery: ["youtube_channel"],
    formats: ["extended", "short"],
    id: "tv2-sport-youtube",
    name: "TV 2 Sport on YouTube",
    provenance: "community_unverified",
  };
  const calls = [];
  const tv2Result = result({
    channel_id: tv2.channelId,
    title: "France v Morocco | Highlights",
    video_id: "Tv2Video001",
  });
  const discovery = await discoverRemoteYouTubeCandidates({
    checkedAt: "2026-07-10",
    fixtures: [fixture],
    region: "PH",
    searchImpl: async (parameters) => {
      calls.push(parameters);
      return parameters.relevanceLanguage
        ? { results: [tv2Result, result({ video_id: "OtherVid001" })] }
        : { results: [] };
    },
    sources: [source, tv2],
  });

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], {
    maxResults: 25,
    publishedAfter: "2026-07-07T20:00:00.000Z",
    query: "France Morocco TV 2 Sport on YouTube highlights",
    region: "NO",
    relevanceLanguage: "no",
    safeSearch: "moderate",
    topicId: "/m/02vx4",
  });
  assert.equal(discovery.candidates.length, 1);
  assert.equal(discovery.candidates[0].sourceId, tv2.id);
  assert.equal(discovery.candidates[0].provenance, "community_unverified");
  assert.equal(
    preferredChannelFixtureQuery(fixture, tv2),
    "France Morocco TV 2 Sport on YouTube highlights",
  );
});

test("remote discovery blocks score metadata and reports failed fixture searches neutrally", async () => {
  const blocked = await discoverRemoteYouTubeCandidates({
    checkedAt: "2026-07-10",
    fixtures: [fixture],
    region: "NO",
    searchImpl: async () => ({ results: [result({ title: "France 3-1 Morocco | Highlights" })] }),
    sources: [source],
  });
  assert.equal(blocked.candidates[0].stage, "blocked");
  assert.equal(blocked.candidates[0].metadata.scanDecision, "block_auto_surface");

  const failed = await discoverRemoteYouTubeCandidates({
    checkedAt: "2026-07-10",
    fixtures: [fixture],
    region: "NO",
    searchImpl: async () => { throw new Error("raw SSH failure"); },
    sources: [source],
  });
  assert.deepEqual(failed, {
    candidates: [],
    failures: [{ code: "remote_search_unavailable", sourceId: fixture.id }],
  });
  assert.doesNotMatch(JSON.stringify(failed), /SSH failure/);
});

test("remote discovery preserves the exact route-missing failure", async () => {
  const error = new Error("cross-repo YouTube execution route missing");
  error.name = "RemoteYouTubeRouteMissingError";
  await assert.rejects(discoverRemoteYouTubeCandidates({
    checkedAt: "2026-07-10",
    fixtures: [fixture],
    region: "PH",
    searchImpl: async () => { throw error; },
    sources: [source],
  }), error);
});
