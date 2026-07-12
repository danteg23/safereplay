import assert from "node:assert/strict";
import test from "node:test";

import { runFixtureDiscovery } from "../scripts/discover-fixtures.mjs";

test("fixture CLI saves only the neutral candidate snapshot and reports counts", async () => {
  let saved = null;
  let catalogueSaved = null;
  const premierLeagueRows = [{
      AwayTeam: "Coventry",
      AwayTeamScore: 7,
      DateUtc: "2026-08-21 19:00:00Z",
      HomeTeam: "Arsenal",
      HomeTeamScore: 8,
      Location: "Raw stadium",
      MatchNumber: 1,
      RoundNumber: 1,
      Winner: "Raw winner",
    }];
  const mlsRows = [{
    AwayTeam: "Inter Miami CF",
    DateUtc: "2026-08-22 23:30:00Z",
    HomeTeam: "New York City Football Club",
    MatchNumber: 1,
    RoundNumber: 1,
  }];
  const calendarBody = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:a76adb3a-b111-4530-acb8-bf341895f3d9",
    "SUMMARY:Molde - Brann",
    "DTSTART;TZID=Europe/Oslo:20261213T170000",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  const report = await runFixtureDiscovery({
    argv: ["--from=2026-08-20", "--to=2026-08-24", "--save-private", "--save-catalogue"],
    checkedAt: "2026-07-10",
    fetchImpl: async (url) => {
      if (url.includes("eliteserien.no")) return {
        headers: { get(name) { return name.toLowerCase() === "content-type" ? "text/calendar" : String(Buffer.byteLength(calendarBody)); } },
        ok: true,
        status: 200,
        text: async () => calendarBody,
        url,
      };
      const rows = url.includes("mls-2026") ? mlsRows : premierLeagueRows;
      return {
        headers: { get(name) { return name.toLowerCase() === "content-type" ? "application/json" : "512"; } },
        ok: true,
        status: 200,
        text: async () => JSON.stringify(rows),
        url,
      };
    },
    saveCatalogueImpl: async (snapshot) => { catalogueSaved = snapshot; },
    savePrivateImpl: async (snapshot) => { saved = snapshot; },
  });
  assert.equal(report.catalogueSnapshotSaved, true);
  assert.equal(report.fixtureCount, 2);
  assert.equal(report.privateSnapshotSaved, true);
  assert.equal(saved.fixtures[0].teams[0], "Arsenal");
  assert.deepEqual(saved.fixtures[1].teams, ["New York City FC", "Inter Miami"]);
  assert.equal("displayTimeZone" in saved, false);
  assert.deepEqual(catalogueSaved, saved);
  assert.doesNotMatch(JSON.stringify(report), /Arsenal|Coventry|winner|score|stadium/i);
  assert.doesNotMatch(JSON.stringify(saved), /Raw winner|Raw stadium|HomeTeamScore|AwayTeamScore/i);
});

test("fixture CLI refuses to replace the catalogue when discovery fails", async () => {
  let saved = false;
  await assert.rejects(
    runFixtureDiscovery({
      argv: ["--from=2026-08-20", "--to=2026-08-24", "--save-catalogue"],
      checkedAt: "2026-07-10",
      fetchImpl: async () => { throw new TypeError("network down"); },
      saveCatalogueImpl: async () => { saved = true; },
    }),
    /promotion refused/,
  );
  assert.equal(saved, false);
});
