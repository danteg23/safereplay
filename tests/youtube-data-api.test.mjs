import assert from "node:assert/strict";
import test from "node:test";

import {
  declaredYouTubeRegionStatus,
  discoverYouTubeDataApiCandidates,
  parseYouTubeDurationSeconds,
} from "../src/youtube-data-api.mjs";

const source = {
  access: "free",
  channelId: "UCpcTrCXblq78GZrTUTLWeBw",
  discovery: ["youtube_channel"],
  formats: ["full", "halves", "mini", "extended", "short"],
  id: "fifa-youtube",
  provenance: "verified_official",
};
const fixture = {
  competition: "World Cup",
  id: "spain-belgium-example",
  kickoffUtc: "2026-07-10T19:00:00Z",
  teams: ["Spain", "Belgium"],
};
const playlistId = `UU${source.channelId.slice(2)}`;

function response(value) {
  return { json: async () => structuredClone(value), ok: true };
}

function video(id, {
  channelId = source.channelId,
  duration = "PT3M",
  publishedAt = "2026-07-10T21:00:00Z",
  regionRestriction = { blocked: ["US"] },
  scheduledStartTime = null,
  title = "Spain v Belgium | Highlights",
} = {}) {
  const item = {
    contentDetails: { caption: "true", duration, regionRestriction },
    id,
    snippet: {
      channelId,
      description: "Tournament match package.",
      publishedAt,
      thumbnails: { high: { url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` } },
      title,
    },
    status: { embeddable: true, privacyStatus: "public" },
  };
  if (scheduledStartTime) item.liveStreamingDetails = { scheduledStartTime };
  return item;
}

function apiMock(items, requested = []) {
  return async (rawUrl) => {
    const url = new URL(rawUrl);
    requested.push(url);
    if (url.pathname.endsWith("/channels")) {
      return response({ items: [{ contentDetails: { relatedPlaylists: { uploads: playlistId } }, id: source.channelId }] });
    }
    if (url.pathname.endsWith("/playlistItems")) {
      return response({ items: items.map((item) => ({ contentDetails: { videoId: item.id } })) });
    }
    if (url.pathname.endsWith("/videos")) {
      const ids = new Set(url.searchParams.get("id").split(","));
      return response({ items: items.filter((item) => ids.has(item.id)) });
    }
    throw new Error("unexpected endpoint");
  };
}

test("YouTube duration and declared region parsing are conservative", () => {
  assert.equal(parseYouTubeDurationSeconds("PT1H42M3S"), 6_123);
  assert.equal(parseYouTubeDurationSeconds("PT12M"), 720);
  assert.equal(parseYouTubeDurationSeconds("not-a-duration"), null);
  assert.equal(declaredYouTubeRegionStatus({ allowed: ["PH", "NO"] }, "PH"), "available");
  assert.equal(declaredYouTubeRegionStatus({ allowed: ["NO"] }, "PH"), "blocked");
  assert.equal(declaredYouTubeRegionStatus({ blocked: ["US"] }, "PH"), "available");
  assert.equal(declaredYouTubeRegionStatus(null, "PH"), "unknown");
});

test("Data API uploads become private duration-aware candidates with a thumbnail review target", async () => {
  const items = [
    video("FullMatch01", { duration: "PT1H42M", title: "Spain v Belgium | Full Match" }),
    video("ExtendVid01", { duration: "PT12M", title: "Spain v Belgium | Highlights" }),
  ];
  const requested = [];
  const result = await discoverYouTubeDataApiCandidates({
    apiKey: "test-api-key-123",
    checkedAt: "2026-07-10",
    fetchImpl: apiMock(items, requested),
    fixtures: [fixture],
    region: "PH",
    sources: [source],
  });

  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.candidates.map((candidate) => candidate.formats[0]).sort(), ["extended", "full"]);
  assert.ok(result.candidates.every((candidate) => candidate.metadata.thumbnailState === "unscanned"));
  assert.ok(result.candidates.every((candidate) => candidate.metadata.thumbnailUrlObserved.startsWith("https://i.ytimg.com/")));
  assert.ok(result.candidates.every((candidate) => candidate.playback.status === "links_unverified"));
  assert.equal(requested.filter((url) => url.pathname.endsWith("/channels")).length, 1);
  assert.equal(requested.filter((url) => url.pathname.endsWith("/playlistItems")).length, 1);
  assert.equal(requested.filter((url) => url.pathname.endsWith("/videos")).length, 1);
});

test("declared PH blocking prevents candidate-stage promotion without pretending playback was tested", async () => {
  const items = [video("BlockedVid1", { regionRestriction: { allowed: ["NO"] } })];
  const result = await discoverYouTubeDataApiCandidates({
    apiKey: "test-api-key-123",
    checkedAt: "2026-07-10",
    fetchImpl: apiMock(items),
    fixtures: [fixture],
    region: "PH",
    sources: [source],
  });
  const [candidate] = result.candidates;
  assert.equal(candidate.stage, "blocked");
  assert.equal(candidate.playback.status, "links_unverified");
  assert.ok(candidate.destinationRisks.includes("api_region_blocked"));
});

test("scheduled live time can identify the current fixture when the stream was created earlier", async () => {
  const items = [video("Scheduled01", {
    duration: "PT1H45M",
    publishedAt: "2026-05-01T12:00:00Z",
    scheduledStartTime: "2026-07-10T19:00:00Z",
    title: "Spain v Belgium | Full Match",
  })];
  const result = await discoverYouTubeDataApiCandidates({
    apiKey: "test-api-key-123",
    checkedAt: "2026-07-10",
    fetchImpl: apiMock(items),
    fixtures: [fixture],
    region: "PH",
    sources: [source],
  });
  assert.equal(result.candidates.length, 1);
  assert.deepEqual(result.candidates[0].formats, ["full"]);
});

test("an explicitly historical upload with the same teams is not matched to the current fixture", async () => {
  const items = [video("Historic001", {
    duration: "PT1H35M",
    title: "Spain v Belgium | 1998 Full Match",
  })];
  const result = await discoverYouTubeDataApiCandidates({
    apiKey: "test-api-key-123",
    checkedAt: "2026-07-10",
    fetchImpl: apiMock(items),
    fixtures: [fixture],
    region: "PH",
    sources: [source],
  });
  assert.deepEqual(result.candidates, []);
});

test("video detail channel substitution is rejected and reported neutrally", async () => {
  const items = [video("Mismatch001", { channelId: "UCaaaaaaaaaaaaaaaaaaaaaa" })];
  const result = await discoverYouTubeDataApiCandidates({
    apiKey: "test-api-key-123",
    checkedAt: "2026-07-10",
    fetchImpl: apiMock(items),
    fixtures: [fixture],
    region: "PH",
    sources: [source],
  });
  assert.deepEqual(result.candidates, []);
  assert.deepEqual(result.failures, [{ code: "api_channel_mismatch", sourceId: "fifa-youtube" }]);
});

test("video detail requests batch at no more than 50 IDs", async () => {
  const items = Array.from({ length: 51 }, (_, index) => video(`V${String(index).padStart(10, "0")}`));
  const requested = [];
  const result = await discoverYouTubeDataApiCandidates({
    apiKey: "test-api-key-123",
    checkedAt: "2026-07-10",
    fetchImpl: apiMock(items, requested),
    fixtures: [fixture],
    region: "PH",
    sources: [source],
  });
  const videoRequests = requested.filter((url) => url.pathname.endsWith("/videos"));
  assert.equal(videoRequests.length, 2);
  assert.ok(videoRequests.every((url) => url.searchParams.get("id").split(",").length <= 50));
  assert.equal(result.candidates.length, 51);
});
