import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateSourceRegistry } from "../src/source-registry.mjs";

const registryUrl = new URL("../config/sources.json", import.meta.url);
const registry = JSON.parse(await readFile(registryUrl, "utf8"));

function clone(value) {
  return structuredClone(value);
}

test("checked-in source registry is valid and spans every requested format", () => {
  assert.equal(validateSourceRegistry(registry), registry);

  const formats = new Set(registry.flatMap((source) => source.formats));
  for (const format of ["full", "mini", "extended", "short"]) {
    assert(formats.has(format), `missing ${format} source`);
  }
});

test("community and aggregator sources remain in the exploration pool", () => {
  validateSourceRegistry(registry);

  assert(registry.some((source) => source.provenance === "community_unverified"));
  assert(registry.some((source) => source.provenance === "aggregator"));
});

test("official broadcaster discovery includes concrete Short and Extended classes", () => {
  validateSourceRegistry(registry);
  const fox = registry.find((source) => source.id === "fox-sports-world-cup");
  const itvx = registry.find((source) => source.id === "itvx-world-cup");

  assert.equal(fox.provenance, "verified_official");
  assert.ok(fox.formats.includes("extended"));
  assert.equal(itvx.provenance, "verified_official");
  assert.ok(itvx.formats.includes("short"));
  assert.equal(fox.stage, "explore");
  assert.equal(itvx.stage, "explore");
});

test("YouTube is a first-class discovery pool for priority clubs, leagues, UEFA, and TV 2 research", () => {
  validateSourceRegistry(registry);
  const youtube = registry.filter((source) => source.discovery.includes("youtube_channel"));
  const ids = new Set(youtube.map((source) => source.id));

  for (const id of [
    "aleph-arena-youtube",
    "fifa-youtube",
    "premier-league-youtube",
    "laliga-youtube",
    "ligue-1-youtube",
    "mls-youtube",
    "uefa-youtube",
    "manchester-city-youtube",
    "arsenal-youtube",
    "manchester-united-youtube",
    "barcelona-youtube",
    "inter-miami-youtube",
    "tv2-sport-youtube",
  ]) assert(ids.has(id), `missing ${id}`);

  for (const id of [
    "aleph-arena-youtube",
    "fifa-youtube",
    "premier-league-youtube",
    "laliga-youtube",
    "ligue-1-youtube",
    "mls-youtube",
    "uefa-youtube",
    "manchester-city-youtube",
    "arsenal-youtube",
    "manchester-united-youtube",
    "barcelona-youtube",
    "inter-miami-youtube",
    "tv2-sport-youtube",
  ]) assert.match(registry.find((source) => source.id === id).channelId, /^UC[A-Za-z0-9_-]{22}$/);

  for (const source of youtube) assert.equal(source.requiresItemScan, true);
  assert.equal(registry.find((source) => source.id === "tv2-sport-youtube").provenance, "community_unverified");
});

test("feed-ready YouTube channels require an exact identity evidence URL", () => {
  const missing = clone(registry);
  delete missing.find((source) => source.channelId).channelIdentityEvidenceUrl;
  assert.throws(() => validateSourceRegistry(missing), /channelIdentityEvidenceUrl is required/);

  const mismatch = clone(registry);
  const source = mismatch.find((candidate) => candidate.channelId);
  source.channelIdentityEvidenceUrl = "https://www.youtube.com/channel/UCaaaaaaaaaaaaaaaaaaaaaa";
  assert.throws(() => validateSourceRegistry(mismatch), /channelIdentityEvidenceUrl must match channelId/);
});

test("official classification requires evidence", () => {
  const invalid = clone(registry);
  delete invalid.find((source) => source.provenance === "verified_official").provenanceEvidenceUrl;

  assert.throws(() => validateSourceRegistry(invalid), /provenanceEvidenceUrl is required/);
});

test("registry cannot smuggle in a legal-status field", () => {
  const invalid = clone(registry);
  invalid[0].legal = true;

  assert.throws(() => validateSourceRegistry(invalid), /must not contain legal-status fields/);
});

test("provider evidence never disables per-item spoiler scanning", () => {
  const invalid = clone(registry);
  invalid[0].requiresItemScan = false;

  assert.throws(() => validateSourceRegistry(invalid), /requiresItemScan must be true/);
});

test("a source cannot surface before playback and free access are evidenced", () => {
  const invalid = clone(registry);
  const candidate = invalid.find((source) => source.access === "unknown");
  candidate.stage = "surface";

  assert.throws(() => validateSourceRegistry(invalid), /cannot surface with unknown access/);
});

test("region codes and evidence dates are strict", () => {
  const invalidRegion = clone(registry);
  invalidRegion[0].regions[0].code = "PHILIPPINES";
  assert.throws(() => validateSourceRegistry(invalidRegion), /code is invalid/);

  const invalidDate = clone(registry);
  invalidDate[0].regions[0].checkedAt = "2026-02-31";
  assert.throws(() => validateSourceRegistry(invalidDate), /must be a real date/);
});
