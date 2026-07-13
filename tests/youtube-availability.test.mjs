import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getPublicCatalogue, providerDestinations } from "../src/catalogue.mjs";
import {
  classifyYouTubeProbeFailure,
  refreshYouTubeAvailability,
  validateYouTubeAvailability,
} from "../src/youtube-availability.mjs";
import {
  getYouTubePlayerRecord,
  getYouTubePlayerRecords,
} from "../src/youtube-player-catalogue.mjs";
import { checkYouTubeAvailability, probeYouTubeVideo } from "../scripts/check-youtube-availability.mjs";

const records = [
  { id: "fixture-youtube-short", videoId: "AbCdEf12345" },
  { id: "fixture-youtube-full", videoId: "FgHiJk67890" },
];
const emptySnapshot = {
  lastSuccessfulSweep: "2026-07-14T00:00:00.000Z",
  schemaVersion: 1,
  unavailable: {},
};

test("availability snapshot accepts only neutral permanent failure state", () => {
  assert.deepEqual(validateYouTubeAvailability(emptySnapshot), emptySnapshot);
  assert.throws(() => validateYouTubeAvailability({ schemaVersion: 1, unavailable: {
    "fixture-youtube-short": { checkedAt: "2026-07-14T00:00:00.000Z", reason: "network" },
  }, lastSuccessfulSweep: "2026-07-14T00:00:00.000Z" }), /reason is invalid/);
  assert.throws(() => validateYouTubeAvailability({ schemaVersion: 1, unavailable: {
    "fixture-youtube-short": { checkedAt: "today", reason: "removed" },
  }, lastSuccessfulSweep: "2026-07-14T00:00:00.000Z" }), /ISO timestamp/);
});

test("probe classification removes permanent failures but preserves regional and network failures", () => {
  assert.deepEqual(classifyYouTubeProbeFailure("Video unavailable. This video has been removed by the uploader"),
    { reason: "removed", status: "permanent" });
  assert.deepEqual(classifyYouTubeProbeFailure("This is a private video"),
    { reason: "private", status: "permanent" });
  assert.deepEqual(classifyYouTubeProbeFailure("FIFA has blocked it from display on this website or application"),
    { reason: "embed_disabled", status: "permanent" });
  assert.deepEqual(classifyYouTubeProbeFailure("not made this video available in your country"),
    { reason: "region_or_rights", status: "transient" });
  assert.deepEqual(classifyYouTubeProbeFailure("HTTP Error 429: Too Many Requests"),
    { reason: "probe_blocked", status: "transient" });
});

test("refresh hides permanent failures, restores recovered videos, and ignores transient failures", () => {
  const first = refreshYouTubeAvailability({
    now: "2026-07-14T00:00:00.000Z",
    probes: new Map([
      [records[0].id, { reason: "removed", status: "permanent" }],
      [records[1].id, { reason: "probe_blocked", status: "transient" }],
    ]),
    records,
    snapshot: emptySnapshot,
  });
  assert.equal(first.changed, true);
  assert.deepEqual(first.snapshot.unavailable, {
    "fixture-youtube-short": { checkedAt: "2026-07-14T00:00:00.000Z", reason: "removed" },
  });

  const recovered = refreshYouTubeAvailability({
    now: "2026-07-14T00:15:00.000Z",
    probes: new Map(records.map((record) => [record.id, { status: "available" }])),
    records,
    snapshot: first.snapshot,
  });
  assert.equal(recovered.changed, true);
  assert.deepEqual(recovered.snapshot, emptySnapshot);
});

test("a successful sweep writes a sparse heartbeat every 21 days", () => {
  const result = refreshYouTubeAvailability({
    now: "2026-08-04T00:00:00.000Z",
    probes: new Map(records.map((record) => [record.id, { status: "available" }])),
    records,
    snapshot: emptySnapshot,
  });
  assert.equal(result.changed, true);
  assert.equal(result.snapshot.lastSuccessfulSweep, "2026-08-04T00:00:00.000Z");
});

test("checker runs probes concurrently without exposing video metadata", async () => {
  const result = await checkYouTubeAvailability({
    now: "2026-07-14T00:00:00.000Z",
    probe: async (videoId) => videoId === records[0].videoId
      ? { status: "available" }
      : { reason: "private", status: "permanent" },
    records,
    snapshot: emptySnapshot,
  });
  assert.equal(result.counts.available, 1);
  assert.equal(result.counts.permanent, 1);
  assert.deepEqual(Object.keys(result.snapshot.unavailable), ["fixture-youtube-full"]);
});

test("checked-in permanent failures disappear from catalogue, player pages, and redirects", () => {
  const snapshot = JSON.parse(readFileSync(
    new URL("../config/youtube-availability.json", import.meta.url),
    "utf8",
  ));
  const unavailableIds = Object.keys(snapshot.unavailable);
  const catalogue = getPublicCatalogue();
  const publicSourceIds = catalogue.fixtures.flatMap((fixture) => (
    catalogue.sourcesByFixture[fixture.id] ?? []
  )).map((source) => source.id);
  const playerIds = getYouTubePlayerRecords().map((record) => record.id);

  for (const id of unavailableIds) {
    assert.equal(getYouTubePlayerRecord(id), null);
    assert.equal(playerIds.includes(id), false);
    assert.equal(publicSourceIds.includes(id), false);
    assert.equal(Object.hasOwn(providerDestinations, id), false);
  }
});

test("yt-dlp probe treats only an exact neutral id response as available", async () => {
  const available = await probeYouTubeVideo("AbCdEf12345", {
    execute: async () => ({ stdout: "AbCdEf12345\n" }),
  });
  assert.deepEqual(available, { status: "available" });

  const removed = await probeYouTubeVideo("AbCdEf12345", {
    execute: async () => {
      const error = new Error("probe failed");
      error.stderr = "Video unavailable. This video has been removed by the uploader";
      throw error;
    },
  });
  assert.deepEqual(removed, { reason: "removed", status: "permanent" });
});
