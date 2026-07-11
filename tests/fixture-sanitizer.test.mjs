import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sanitizeFixture, sanitizeFixtureSnapshot } from "../src/fixture-sanitizer.mjs";

const snapshot = JSON.parse(await readFile(new URL("../config/fixture-snapshot.json", import.meta.url), "utf8"));

test("official schedule snapshot becomes timezone-neutral canonical fixtures", () => {
  const fixtures = sanitizeFixtureSnapshot(snapshot, {
    availabilityByFixture: { "fifa-world-cup-2026-match-98": "ready" },
    favoriteTeams: ["Norway"],
  });
  assert.deepEqual(fixtures.map(({ kickoffUtc, teams }) => ({ kickoffUtc, teams })), [
    { kickoffUtc: "2026-06-16T22:00:00Z", teams: ["Iraq", "Norway"] },
    { kickoffUtc: "2026-06-23T00:00:00Z", teams: ["Norway", "Senegal"] },
    { kickoffUtc: "2026-06-26T19:00:00Z", teams: ["Norway", "France"] },
    { kickoffUtc: "2026-06-30T17:00:00Z", teams: ["Ivory Coast", "Norway"] },
    { kickoffUtc: "2026-07-05T20:00:00Z", teams: ["Brazil", "Norway"] },
    { kickoffUtc: "2026-07-07T16:00:00Z", teams: ["Argentina", "Egypt"] },
    { kickoffUtc: "2026-07-09T20:00:00Z", teams: ["France", "Morocco"] },
    { kickoffUtc: "2026-07-10T19:00:00Z", teams: ["Spain", "Belgium"] },
    { kickoffUtc: "2026-07-11T21:00:00Z", teams: ["Norway", "England"] },
    { kickoffUtc: "2026-07-12T01:00:00Z", teams: ["Argentina", "Switzerland"] },
  ]);
  assert.equal(fixtures.find((fixture) => fixture.id === "fifa-world-cup-2026-match-98").availability, "ready");
  assert.equal(fixtures.find((fixture) => fixture.id === "norway-france-2026-06-26").favorite, true);
});

test("fixture sanitizer discards hostile score, result, event, and media fields", () => {
  const sanitized = sanitizeFixture({
    id: "hostile-fixture",
    competition: "World Cup",
    kickoffUtc: "2026-07-10T19:00:00Z",
    teams: ["Spain", "Belgium"],
    score: "9-8",
    result: { winner: "Example" },
    events: [{ type: "goal" }],
    title: "Outcome-bearing title",
    thumbnail: "unsafe.jpg",
  }, {
    availability: "checking",
    favoriteTeams: [],
  });
  const serialized = JSON.stringify(sanitized);
  for (const forbidden of ["score", "result", "winner", "events", "goal", "title", "thumbnail", "9-8"]) {
    assert.equal(serialized.includes(forbidden), false, `sanitized fixture leaked ${forbidden}`);
  }
});

test("fixture sanitizer rejects missing neutral identity", () => {
  assert.throws(() => sanitizeFixture({
    id: "missing-teams",
    competition: "World Cup",
    kickoffUtc: "2026-07-10T19:00:00Z",
  }), /teams must contain two teams/);
});
