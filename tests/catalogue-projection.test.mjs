import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildSurfaceProjection,
  mergeProviderDestinations,
  mergeSurfaceRecords,
} from "../src/catalogue-projection.mjs";
import { getPublicCatalogue } from "../src/catalogue.mjs";
import { validatePublicCatalogue } from "../src/public-contract.mjs";

const sources = JSON.parse(await readFile(new URL("../config/sources.json", import.meta.url), "utf8"));
const currentItems = JSON.parse(await readFile(new URL("../config/item-candidates.json", import.meta.url), "utf8"));
const fixtureId = "fifa-world-cup-2026-match-98";

function surfaceItem({
  access = "free",
  destinationRisks = [],
  formats = ["short"],
  id = "spain-belgium-youtube-short",
  itemUrl = "https://www.youtube.com/watch?v=AbCdEf12345",
  provenance = "verified_official",
  sourceId = "fifa-youtube",
} = {}) {
  return {
    access,
    competition: "World Cup",
    destinationRisks,
    fixtureId,
    formats,
    id,
    itemUrl,
    kickoffUtc: "2026-07-10T19:00:00Z",
    metadata: {
      checkedAt: "2026-07-10",
      descriptionObserved: "Match highlights from the tournament.",
      scanDecision: "candidate",
      thumbnailState: "neutral_observed",
      titleObserved: "Spain v Belgium | Highlights",
    },
    playback: { checkedAt: "2026-07-10", region: "PH", status: "observed" },
    provenance,
    sourceId,
    stage: "surface",
    teams: ["Spain", "Belgium"],
  };
}

test("a validated surface item becomes only a neutral public row and server destination", () => {
  const item = surfaceItem({ destinationRisks: ["comments", "recommendations"] });
  const projection = buildSurfaceProjection([item], sources, { fixtureIds: [fixtureId] });
  const [{ sourceId, publicRecord }] = projection.recordsByFixture[fixtureId];

  assert.equal(sourceId, "fifa-youtube");
  assert.deepEqual(publicRecord, {
    accessLabel: "Free",
    evidenceStatus: "item_observed",
    format: "short",
    id: "spain-belgium-youtube-short-short",
    providerName: "FIFA on YouTube",
    provenance: "verified_official",
    redirectPath: "/go/spain-belgium-youtube-short",
    riskLabel: "Comments or recommendations may spoil",
    riskTone: "caution",
  });
  assert.equal(projection.destinations[item.id], item.itemUrl);
  assert.doesNotMatch(JSON.stringify(publicRecord), /titleObserved|descriptionObserved|thumbnailState|itemUrl|youtube\.com/);

  const catalogue = getPublicCatalogue();
  catalogue.sourcesByFixture[fixtureId] = [publicRecord];
  assert.equal(validatePublicCatalogue(catalogue), catalogue);
});

test("current candidate, blocked, removed, and paid research records never project", () => {
  const projection = buildSurfaceProjection(currentItems, sources, {
    fixtureIds: currentItems.map((item) => item.fixtureId),
  });
  assert.deepEqual(projection, { destinations: {}, recordsByFixture: {} });

  const paid = surfaceItem({
    access: "paid",
    id: "paid-item",
    itemUrl: "https://www.zee5.com/sports/paid-item",
    sourceId: "zee5-world-cup",
  });
  assert.throws(() => buildSurfaceProjection([paid], sources), /cannot surface with paid access/);
});

test("safer observed items outrank YouTube, while YouTube wins an otherwise equal tie", () => {
  const youtubeRisky = surfaceItem({
    destinationRisks: ["comments"],
    id: "youtube-risky",
  });
  const rteSafe = surfaceItem({
    destinationRisks: [],
    id: "rte-safe",
    itemUrl: "https://www.rte.ie/video/id/safe/",
    sourceId: "rte-world-cup",
  });
  let projection = buildSurfaceProjection([youtubeRisky, rteSafe], sources);
  assert.equal(projection.recordsByFixture[fixtureId][0].sourceId, "rte-world-cup");

  const youtubeEqual = surfaceItem({ id: "youtube-equal" });
  const rteEqual = surfaceItem({
    id: "rte-equal",
    itemUrl: "https://www.rte.ie/video/id/equal/",
    sourceId: "rte-world-cup",
  });
  projection = buildSurfaceProjection([rteEqual, youtubeEqual], sources);
  assert.equal(projection.recordsByFixture[fixtureId][0].sourceId, "fifa-youtube");
});

test("an exact observed item replaces the same provider-format directory row and gains an allowlisted redirect", () => {
  const item = surfaceItem({
    formats: ["full"],
    id: "spain-belgium-aleph-full",
    itemUrl: "https://www.youtube.com/watch?v=ZyXwVu98765",
    sourceId: "aleph-arena-youtube",
  });
  const projection = buildSurfaceProjection([item], sources);
  const staticRows = {
    [fixtureId]: [{
      accessLabel: "Free live",
      evidenceStatus: "directory_candidate",
      format: "full",
      id: "aleph-arena-youtube",
      providerName: "Aleph Arena",
      provenance: "verified_official",
      redirectPath: "/go/aleph-arena-youtube",
      riskLabel: "Exact item metadata unverified",
      riskTone: "caution",
    }],
  };
  const merged = mergeSurfaceRecords([fixtureId], staticRows, projection);
  assert.equal(merged[fixtureId].length, 1);
  assert.equal(merged[fixtureId][0].evidenceStatus, "item_observed");
  assert.equal(merged[fixtureId][0].redirectPath, "/go/spain-belgium-aleph-full");

  assert.deepEqual(
    mergeProviderDestinations({ static: "https://example.test/static" }, projection.destinations),
    { static: "https://example.test/static", [item.id]: item.itemUrl },
  );
  assert.throws(
    () => mergeProviderDestinations({ [item.id]: "https://example.test/collision" }, projection.destinations),
    /collides with static destination/,
  );
});

test("Halves is a first-class public format for observed replay sources", () => {
  const halves = surfaceItem({
    destinationRisks: ["surrounding_page"],
    formats: ["halves"],
    id: "spain-belgium-halves",
    itemUrl: "https://www.footreplays.com/international/spain-belgium-halves/",
    provenance: "community_unverified",
    sourceId: "footreplays",
  });
  const projection = buildSurfaceProjection([halves], sources);
  assert.equal(projection.recordsByFixture[fixtureId][0].publicRecord.format, "halves");
});
