import test from "node:test";
import assert from "node:assert/strict";
import { getPublicCatalogue } from "../src/catalogue.mjs";
import { findForbiddenPublicKey, validatePublicCatalogue } from "../src/public-contract.mjs";

test("public catalogue contains only allowlisted neutral fields", () => {
  const catalogue = getPublicCatalogue();
  assert.equal(validatePublicCatalogue(catalogue), catalogue);
  assert.equal(findForbiddenPublicKey(catalogue), null);
  assert.match(catalogue.fixtures[0].kickoffUtc, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal(Object.hasOwn(catalogue, "dates"), false);
  for (const localField of ["dateKey", "dateLabel", "kickoff"]) {
    assert.equal(Object.hasOwn(catalogue.fixtures[0], localField), false);
  }
});

test("catalogue clones cannot mutate the server seed", () => {
  const first = getPublicCatalogue();
  const original = first.fixtures[0].teams[0];
  first.fixtures[0].teams[0] = "Changed";
  assert.equal(getPublicCatalogue().fixtures[0].teams[0], original);
});

test("catalogue includes every verified Norway World Cup match and the recent Argentina match", () => {
  const catalogue = getPublicCatalogue();
  const expectedNorwayFixtures = [
    "iraq-norway-2026-06-16",
    "norway-senegal-2026-06-23",
    "norway-france-2026-06-26",
    "ivory-coast-norway-2026-06-30",
    "brazil-norway-2026-07-05",
    "fifa-world-cup-2026-match-99",
  ];
  for (const fixtureId of expectedNorwayFixtures) {
    const fixture = catalogue.fixtures.find((candidate) => candidate.id === fixtureId);
    assert.ok(fixture, `missing ${fixtureId}`);
    assert.ok(fixture.teams.includes("Norway"));
  }

  const completed = expectedNorwayFixtures.slice(0, -1);
  for (const fixtureId of [...completed, "argentina-egypt-2026-07-07"]) {
    const fixture = catalogue.fixtures.find((candidate) => candidate.id === fixtureId);
    assert.equal(fixture.availability, "ready");
    const formats = new Set(catalogue.sourcesByFixture[fixtureId].map((source) => source.format));
    assert.deepEqual([...formats].sort(), ["extended", "full", "halves", "short"]);
  }

  const norwayEngland = catalogue.fixtures.find((fixture) => fixture.id === "fifa-world-cup-2026-match-99");
  assert.equal(norwayEngland.availability, "ready");
  assert.deepEqual(
    [...new Set(catalogue.sourcesByFixture[norwayEngland.id].map((source) => source.format))].sort(),
    ["extended", "full", "short"],
  );
});

test("thread candidates are reserved for community-unverified sources", () => {
  const catalogue = getPublicCatalogue();
  const thread = catalogue.sourcesByFixture["fifa-world-cup-2026-match-97"]
    .find((source) => source.evidenceStatus === "thread_candidate");
  thread.provenance = "verified_official";
  assert.throws(
    () => validatePublicCatalogue(catalogue),
    /thread candidates must be community\/unverified/,
  );
});

test("public contract rejects raw or nested spoiler-bearing fields", () => {
  const hostileCases = [
    ["score", "2-1"],
    ["title", "A winner is named"],
    ["thumbnail", "data:image/png;base64,unsafe"],
    ["comments", ["result"]],
    ["duration", 5400],
    ["externalUrl", "https://example.test/raw"],
    ["legal", true],
  ];

  for (const [key, value] of hostileCases) {
    const catalogue = getPublicCatalogue();
    catalogue.fixtures[0][key] = value;
    assert.throws(
      () => validatePublicCatalogue(catalogue),
      new RegExp(`fixtures\\[0\\]\\.${key}`),
      `expected ${key} to be rejected`,
    );
  }
});

test("public source records expose internal redirect paths, never destinations", () => {
  const sources = Object.values(getPublicCatalogue().sourcesByFixture).flat();
  assert.ok(sources.length > 0);
  for (const source of sources) {
    assert.match(source.redirectPath, /^\/go\/[a-z0-9-]+$/);
    assert.equal(Object.hasOwn(source, "externalUrl"), false);
    assert.equal(JSON.stringify(source).includes("https://"), false);
  }
});

test("public sources may expose only a neutral formatted duration label", () => {
  const catalogue = getPublicCatalogue();
  const source = catalogue.sourcesByFixture["fifa-world-cup-2026-match-98"]
    .find(({ id }) => id === "spain-belgium-youtube-short");
  assert.equal(source.durationLabel, "5:16");

  source.durationLabel = "Spain won 2-1";
  assert.throws(() => validatePublicCatalogue(catalogue), /durationLabel is invalid/);
});
