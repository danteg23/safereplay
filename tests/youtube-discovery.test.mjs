import assert from "node:assert/strict";
import test from "node:test";

import { discoverYouTubeCandidates, youtubeFeedUrl } from "../src/youtube-discovery.mjs";

const source = {
  access: "free",
  channelId: "UCkzCjdRMrW2vXLx8mvPVLdQ",
  discovery: ["youtube_channel"],
  formats: ["extended", "short"],
  id: "manchester-city-youtube",
  provenance: "verified_official",
};
const fixture = {
  competition: "Example Cup",
  id: "manchester-city-arsenal-example",
  kickoffUtc: "2026-07-10T12:00:00Z",
  teams: ["Manchester City", "Arsenal"],
};

function xml(channelId = source.channelId) {
  return `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
    <yt:channelId>${channelId}</yt:channelId>
    <entry>
      <yt:videoId>AbCdEf12345</yt:videoId>
      <yt:channelId>${channelId}</yt:channelId>
      <title>Manchester City v Arsenal | Extended highlights</title>
      <published>2026-07-10T14:00:00+00:00</published>
      <media:group><media:description>Watch the neutral extended package.</media:description></media:group>
    </entry>
  </feed>`;
}

test("YouTube discovery uses public channel feeds without an API key", async () => {
  const requests = [];
  const result = await discoverYouTubeCandidates({
    checkedAt: "2026-07-10",
    fetchImpl: async (url, options) => {
      requests.push({ options, url });
      return { ok: true, text: async () => xml() };
    },
    fixtures: [fixture],
    region: "PH",
    sources: [source, { ...source, id: "identity-pending", channelId: undefined }],
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, youtubeFeedUrl(source.channelId));
  assert.match(requests[0].options.headers.accept, /atom\+xml/);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].metadata.scanDecision, "manual_review");
  assert.deepEqual(result.failures, []);
});

test("one broken YouTube feed does not suppress other official channels", async () => {
  const broken = { ...source, channelId: "UCaaaaaaaaaaaaaaaaaaaaaa", id: "broken-youtube" };
  const result = await discoverYouTubeCandidates({
    checkedAt: "2026-07-10",
    fetchImpl: async (url) => url.includes(broken.channelId)
      ? { ok: false, status: 503, text: async () => "" }
      : { ok: true, text: async () => xml() },
    fixtures: [fixture],
    region: "PH",
    sources: [broken, source],
  });

  assert.equal(result.candidates.length, 1);
  assert.deepEqual(result.failures, [{ code: "feed_http_503", sourceId: "broken-youtube" }]);
});

test("a stable unverified channel remains discoverable without being relabeled official", async () => {
  const unverified = { ...source, id: "tv2-sport-youtube", provenance: "community_unverified" };
  const result = await discoverYouTubeCandidates({
    checkedAt: "2026-07-10",
    fetchImpl: async () => ({ ok: true, text: async () => xml() }),
    fixtures: [fixture],
    region: "NO",
    sources: [unverified],
  });

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].provenance, "community_unverified");
  assert.equal(result.candidates[0].playback.region, "NO");
});
