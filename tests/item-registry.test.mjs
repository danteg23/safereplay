import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { surfaceableItems, validateItemCandidateRegistry } from "../src/item-registry.mjs";

const sources = JSON.parse(await readFile(new URL("../config/sources.json", import.meta.url), "utf8"));
const items = JSON.parse(await readFile(new URL("../config/item-candidates.json", import.meta.url), "utf8"));

test("current item candidates are machine-readable and source-linked", () => {
  assert.equal(validateItemCandidateRegistry(items, sources), items);
  assert.ok(items.some((item) => item.formats.includes("full")));
  assert.ok(items.some((item) => item.formats.includes("mini")));
  assert.ok(items.some((item) => item.provenance === "community_unverified"));
  assert.ok(items.some((item) => item.provenance === "verified_official"));
  assert.ok(items.some((item) => item.sourceId === "fox-sports-world-cup" && item.formats.includes("extended")));
  assert.ok(items.some((item) => item.sourceId === "itvx-world-cup" && item.formats.includes("short")));
  assert.ok(items.some((item) => item.sourceId === "sbs-on-demand-world-cup" && item.formats.includes("short")));
  assert.ok(items.some((item) => item.sourceId === "rte-world-cup" && item.stage === "blocked"));
  assert.ok(items.some((item) => item.sourceId === "zee5-world-cup" && item.access === "paid"));
});

test("no current item candidate is falsely surfaced", () => {
  assert.deepEqual(surfaceableItems(items), []);
  assert.ok(items.some((item) => item.playback.status === "blocked_by_popup"));
  assert.ok(items.some((item) => item.playback.status === "removed_404"));
  assert.ok(items.some((item) => item.metadata.thumbnailState === "spoiler_reported"));
  assert.ok(items.filter((item) => ["fox-sports-world-cup", "itvx-world-cup"].includes(item.sourceId))
    .every((item) => item.playback.status === "policy_blocked" && item.stage === "candidate"));
});

test("surface gate requires observed playback and candidate metadata", () => {
  const copy = structuredClone(items);
  copy[0].stage = "surface";
  assert.throws(() => validateItemCandidateRegistry(copy, sources), /cannot surface before playback is observed/);

  copy[0].playback.status = "observed";
  assert.throws(() => validateItemCandidateRegistry(copy, sources), /cannot surface before metadata is a candidate/);
});

test("paid research candidates can never pass the surface gate", () => {
  const copy = structuredClone(items);
  const paid = copy.find((item) => item.access === "paid");
  paid.stage = "surface";
  paid.playback.status = "observed";
  paid.metadata.thumbnailState = "neutral_observed";
  paid.metadata.scanDecision = "candidate";
  assert.throws(() => validateItemCandidateRegistry(copy, sources), /cannot surface with paid access/);
});

test("item candidate provenance cannot contradict the source registry", () => {
  const copy = structuredClone(items);
  copy[0].provenance = "verified_official";
  assert.throws(() => validateItemCandidateRegistry(copy, sources), /provenance must match source registry/);
});

test("item candidate URLs cannot jump to an unrelated host", () => {
  const copy = structuredClone(items);
  copy[0].itemUrl = "https://example.test/unrelated";
  assert.throws(() => validateItemCandidateRegistry(copy, sources), /itemUrl host must match its source/);
});

test("an item cannot claim a format that its source does not offer", () => {
  const copy = structuredClone(items);
  const fox = copy.find((item) => item.sourceId === "fox-sports-world-cup");
  fox.formats = ["full"];
  assert.throws(() => validateItemCandidateRegistry(copy, sources), /full not offered by source/);
});
