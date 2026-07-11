import assert from "node:assert/strict";
import test from "node:test";

import {
  buildYouTubePlaybackProbeRecords,
  buildYouTubeProofRecords,
} from "../src/youtube-proof.mjs";

const source = {
  discovery: ["youtube_channel"],
  id: "fifa-youtube",
  name: "FIFA on YouTube",
  provenance: "verified_official",
};
const item = {
  access: "free",
  competition: "World Cup",
  fixtureId: "fixture-1",
  formats: ["extended"],
  id: "fixture-1-fifa-youtube-abcdefghijk",
  itemUrl: "https://www.youtube.com/watch?v=AbCdEf12345",
  metadata: {
    descriptionObserved: "Raw provider description",
    scanDecision: "manual_review",
    thumbnailState: "unscanned",
    thumbnailUrlObserved: "https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg",
    titleObserved: "Raw provider title",
  },
  playback: { status: "links_unverified" },
  provenance: "verified_official",
  sourceId: "fifa-youtube",
  stage: "candidate",
  teams: ["Norway", "England"],
};

test("device proof record exposes neutral facts while destination stays server-only", () => {
  const [record] = buildYouTubeProofRecords([item], [source]);
  assert.equal(record.destination, item.itemUrl);
  assert.deepEqual(record.publicRecord.teams, ["Norway", "England"]);
  assert.equal(record.publicRecord.providerName, "FIFA on YouTube");
  assert.equal(record.publicRecord.redirectPath, `/go/youtube-proof/${item.id}`);
  const publicText = JSON.stringify(record.publicRecord);
  for (const forbidden of ["Raw provider title", "Raw provider description", "youtube.com", "ytimg.com", "itemUrl", "thumbnailUrlObserved", "descriptionObserved", "titleObserved"]) {
    assert.equal(publicText.includes(forbidden), false, `public proof leaked ${forbidden}`);
  }
});

test("device proof excludes blocked metadata, unrelated hosts, and source substitution", () => {
  const blocked = structuredClone(item);
  blocked.stage = "blocked";
  blocked.metadata.scanDecision = "block_auto_surface";
  const unrelated = { ...structuredClone(item), id: "unrelated-host", itemUrl: "https://example.test/video" };
  const substituted = { ...structuredClone(item), id: "substituted-source", sourceId: "other-youtube" };
  assert.deepEqual(buildYouTubeProofRecords([blocked, unrelated, substituted], [source]), []);
});

test("covered playback probe accepts blocked metadata without exposing it", () => {
  const blocked = structuredClone(item);
  blocked.stage = "blocked";
  blocked.metadata.scanDecision = "block_auto_surface";
  const [record] = buildYouTubePlaybackProbeRecords([blocked], [source]);
  assert.equal(record.videoId, "AbCdEf12345");
  assert.equal(record.publicRecord.metadataDecision, "block_auto_surface");
  assert.deepEqual(record.publicRecord.teams, ["Norway", "England"]);
  const publicText = JSON.stringify(record.publicRecord);
  for (const forbidden of ["Raw provider title", "Raw provider description", "youtube.com", "ytimg.com", "itemUrl", "thumbnailUrlObserved"]) {
    assert.equal(publicText.includes(forbidden), false, `playback probe leaked ${forbidden}`);
  }
});

test("covered playback probe rejects unrelated hosts and source substitution", () => {
  const unrelated = { ...structuredClone(item), id: "unrelated-host", itemUrl: "https://example.test/watch?v=AbCdEf12345" };
  const substituted = { ...structuredClone(item), id: "substituted-source", sourceId: "other-youtube" };
  assert.deepEqual(buildYouTubePlaybackProbeRecords([unrelated, substituted], [source]), []);
});
