import assert from "node:assert/strict";
import test from "node:test";

import {
  getYouTubePlayerRecord,
  validateYouTubePlayerItems,
} from "../src/youtube-player-catalogue.mjs";

const valid = {
  competition: "World Cup",
  fixtureId: "fixture-1",
  format: "full",
  id: "fixture-1-youtube-full",
  providerName: "Official channel on YouTube",
  sourceId: "official-youtube",
  teams: ["France", "Morocco"],
  videoId: "AbCdEf12345",
};

test("compact player catalogue keeps only neutral identity and a strict video id", () => {
  assert.deepEqual(validateYouTubePlayerItems([valid]), [{ ...valid, teams: [...valid.teams] }]);
  const record = getYouTubePlayerRecord("france-morocco-youtube-full");
  assert.equal(record.format, "full");
  assert.equal(record.providerName, "Aleph Arena on YouTube");
  assert.deepEqual(record.teams, ["France", "Morocco"]);
  assert.equal(Object.hasOwn(record, "title"), false);
  assert.equal(Object.hasOwn(record, "thumbnail"), false);
  assert.equal(getYouTubePlayerRecord("spain-belgium-youtube-short").videoId, "dKwl7C7xGS8");
  assert.equal(getYouTubePlayerRecord("spain-belgium-youtube-short").durationLabel, "5:16");
  assert.equal(getYouTubePlayerRecord("spain-belgium-youtube-long"), null);
});

test("compact player catalogue rejects raw metadata, malformed ids, and duplicates", () => {
  assert.throws(() => validateYouTubePlayerItems([{ ...valid, title: "spoiler" }]), /title is forbidden/);
  assert.throws(() => validateYouTubePlayerItems([{ ...valid, videoId: "not-valid" }]), /videoId is invalid/);
  assert.throws(() => validateYouTubePlayerItems([{ ...valid, durationLabel: "about five minutes" }]), /durationLabel is invalid/);
  assert.throws(() => validateYouTubePlayerItems([valid, valid]), /ids must be unique/);
});
