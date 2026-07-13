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
  const barcelonaBody = `<script type="application/ld+json">${JSON.stringify([{
    "@type": "SportsEvent",
    awayTeam: { name: "FC Barcelona" },
    homeTeam: { name: "Elche" },
    name: "Elche vs FC Barcelona (La Liga)",
    startDate: "2026-08-23",
    url: "https://www.fcbarcelona.com/en/matches/138284/elche-fc-barcelona-la-liga-2026-2027",
  }])}</script>`;
  const ligue1Calendar = {
    gameWeeks: {
      1: { gameWeekNumber: 1, startDate: "2026-08-21T18:45:00Z", displayEndDate: "2026-08-25T07:00:00Z" },
    },
  };
  const ligue1Matches = {
    matches: [{
      championshipId: 1,
      date: "2026-08-21T18:45:00.000Z",
      gameWeekNumber: 1,
      home: { clubIdentity: { name: "Olympique de Marseille" } },
      away: { clubIdentity: { name: "RC Strasbourg Alsace" } },
      matchId: "l1_championship_match_73825",
      unknownMatch: false,
    }],
  };
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
  const fifaResults = Array.from({ length: 104 }, (_, index) => ({
    Date: `2026-06-${String((index % 28) + 1).padStart(2, "0")}T19:00:00Z`,
    IdMatch: String(500000000 + index),
    IdSeason: "285023",
  }));
  for (const [id, number, date, home, away] of [
    ["400021541", 101, "2026-07-14T19:00:00Z", "France", "Spain"],
    ["400021540", 102, "2026-07-15T19:00:00Z", "England", "Argentina"],
    ["400021542", 103, "2026-07-18T21:00:00Z", null, null],
    ["400021543", 104, "2026-07-19T19:00:00Z", null, null],
  ]) {
    fifaResults[number - 1] = {
      Away: away ? { TeamName: [{ Locale: "en-GB", Description: away }] } : null,
      Date: date,
      Home: home ? { TeamName: [{ Locale: "en-GB", Description: home }] } : null,
      IdMatch: id,
      IdSeason: "285023",
    };
  }
  const report = await runFixtureDiscovery({
    argv: ["--from=2026-08-20", "--to=2026-08-24", "--save-private", "--save-catalogue"],
    checkedAt: "2026-07-10",
    fetchImpl: async (url) => {
      if (url.includes("api.fifa.com")) {
        const body = JSON.stringify({ ContinuationToken: null, Results: fifaResults });
        return {
          headers: { get(name) { return name.toLowerCase() === "content-type" ? "application/json" : String(Buffer.byteLength(body)); } },
          ok: true,
          status: 200,
          text: async () => body,
          url,
        };
      }
      if (url.includes("eliteserien.no")) return {
        headers: { get(name) { return name.toLowerCase() === "content-type" ? "text/calendar" : String(Buffer.byteLength(calendarBody)); } },
        ok: true,
        status: 200,
        text: async () => calendarBody,
        url,
      };
      if (url.includes("fcbarcelona.com")) return {
        headers: { get(name) { return name.toLowerCase() === "content-type" ? "text/html" : String(Buffer.byteLength(barcelonaBody)); } },
        ok: true,
        status: 200,
        text: async () => barcelonaBody,
        url,
      };
      if (url.includes("championship-calendar")) return {
        headers: { get(name) { return name.toLowerCase() === "content-type" ? "application/json" : "512"; } },
        ok: true,
        status: 200,
        text: async () => JSON.stringify(ligue1Calendar),
        url,
      };
      if (url.includes("championship-matches")) return {
        headers: { get(name) { return name.toLowerCase() === "content-type" ? "application/json" : "512"; } },
        ok: true,
        status: 200,
        text: async () => JSON.stringify(ligue1Matches),
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
  assert.equal(report.fixtureCount, 8);
  assert.equal(report.privateSnapshotSaved, true);
  assert.ok(saved.fixtures.some((fixture) => fixture.teams[0] === "Arsenal"));
  assert.ok(saved.fixtures.some((fixture) => fixture.teams.join("|") === "New York City FC|Inter Miami"));
  assert.ok(saved.fixtures.some((fixture) => fixture.teams.join("|") === "Elche|Barcelona" && fixture.kickoffTba));
  assert.ok(saved.fixtures.some((fixture) => fixture.teams.join("|") === "Olympique de Marseille|RC Strasbourg Alsace"));
  assert.ok(saved.fixtures.some((fixture) => fixture.id === "fifa-world-cup-2026-match-104" && fixture.participantsTba));
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
