import assert from "node:assert/strict";
import test from "node:test";

import {
  parseBarcelonaScheduleHtml,
  parseFifaWorldCupCalendar,
  parseLigue1GameWeek,
  selectLigue1GameWeeks,
} from "../src/official-fixture-feeds.mjs";

const barcelonaFeed = {
  competition: "La Liga",
  id: "barcelona-official-schema-2026",
  scope: "senior_men",
  teamAliases: { "FC Barcelona": "Barcelona" },
};

const ligue1Feed = {
  championshipId: 1,
  competition: "Ligue 1",
  scope: "senior_men",
  teamAliases: {},
};

const fifaFeed = {
  competition: "World Cup",
  matchIds: {
    "400021541": 101,
    "400021540": 102,
    "400021542": 103,
    "400021543": 104,
  },
  placeholderTeams: {
    103: ["Runner-up match 101", "Runner-up match 102"],
    104: ["Winner match 101", "Winner match 102"],
  },
  scope: "senior_men",
  seasonId: 285023,
};

function fifaCalendar() {
  const Results = Array.from({ length: 104 }, (_, index) => ({
    Date: "2026-06-11T19:00:00Z",
    IdMatch: String(500000000 + index),
    IdSeason: "285023",
  }));
  const remaining = [
    ["400021541", "2026-07-14T19:00:00Z", "France", "Spain"],
    ["400021540", "2026-07-15T19:00:00Z", "England", "Argentina"],
    ["400021542", "2026-07-18T21:00:00Z", null, null],
    ["400021543", "2026-07-19T19:00:00Z", null, null],
  ];
  remaining.forEach(([IdMatch, Date, home, away], index) => {
    Results[100 + index] = {
      Away: away ? { TeamName: [{ Locale: "en-GB", Description: away }], Score: 99 } : null,
      Date,
      Home: home ? { TeamName: [{ Locale: "en-GB", Description: home }], Score: 98 } : null,
      IdMatch,
      IdSeason: "285023",
      Result: "must be discarded",
    };
  });
  return { ContinuationToken: null, Results };
}

test("official FIFA calendar keeps stable match numbers and honest unresolved bracket slots", () => {
  const fixtures = parseFifaWorldCupCalendar(fifaCalendar(), fifaFeed);
  assert.deepEqual(fixtures, [
    { competition: "World Cup", id: "fifa-world-cup-2026-match-101", kickoffTba: false, kickoffUtc: "2026-07-14T19:00:00Z", participantsTba: false, scope: "senior_men", teams: ["France", "Spain"] },
    { competition: "World Cup", id: "fifa-world-cup-2026-match-102", kickoffTba: false, kickoffUtc: "2026-07-15T19:00:00Z", participantsTba: false, scope: "senior_men", teams: ["England", "Argentina"] },
    { competition: "World Cup", id: "fifa-world-cup-2026-match-103", kickoffTba: false, kickoffUtc: "2026-07-18T21:00:00Z", participantsTba: true, scope: "senior_men", teams: ["Runner-up match 101", "Runner-up match 102"] },
    { competition: "World Cup", id: "fifa-world-cup-2026-match-104", kickoffTba: false, kickoffUtc: "2026-07-19T19:00:00Z", participantsTba: true, scope: "senior_men", teams: ["Winner match 101", "Winner match 102"] },
  ]);
  assert.doesNotMatch(JSON.stringify(fixtures), /score|result|98|99/iu);
});

test("official FIFA calendar fails closed if a remaining match disappears", () => {
  const calendar = fifaCalendar();
  calendar.Results = calendar.Results.filter((match) => match.IdMatch !== "400021543");
  calendar.Results.push({ Date: "2026-06-11T19:00:00Z", IdMatch: "unrelated", IdSeason: "285023" });
  assert.throws(() => parseFifaWorldCupCalendar(calendar, fifaFeed), /identity changed/);
});

test("official Barcelona SportsEvent data becomes neutral La Liga fixtures with TBA preserved", () => {
  const events = [
    {
      "@type": "SportsEvent",
      name: "FC Barcelona vs Athletic Club (La Liga)",
      startDate: "2026-08-16",
      homeTeam: { name: "FC Barcelona" },
      awayTeam: { name: "Athletic Club" },
      url: "https://www.fcbarcelona.com/en/matches/138283/fc-barcelona-athletic-club-la-liga-2026-2027",
      description: "discard me",
    },
    {
      "@type": "SportsEvent",
      name: "Birmingham City vs FC Barcelona (Other Club Friendlies)",
      startDate: "2026-07-31T18:45:00Z",
      homeTeam: { name: "Birmingham City" },
      awayTeam: { name: "FC Barcelona" },
      url: "https://www.fcbarcelona.com/en/matches/135762/birmingham-city-fc-barcelona-friendly-2026-2027",
    },
  ];
  const html = `<script type="application/ld+json">{"@type":"Organization"}</script><script type="application/ld+json">${JSON.stringify(events)}</script>`;
  assert.deepEqual(parseBarcelonaScheduleHtml(html, barcelonaFeed, { from: "2026-08-01", to: "2026-08-31" }), [{
    competition: "La Liga",
    id: "barcelona-official-schema-2026-match-138283",
    kickoffTba: true,
    kickoffUtc: "2026-08-16T12:00:00Z",
    scope: "senior_men",
    teams: ["Barcelona", "Athletic Club"],
  }]);
});

test("Barcelona's exact data-kickoff overrides the date-only SportsEvent placeholder", () => {
  const events = [{
    "@type": "SportsEvent",
    name: "Barcelona vs Athletic Club (La Liga)",
    startDate: "2026-08-16",
    homeTeam: { name: "FC Barcelona" },
    awayTeam: { name: "Athletic Club" },
    url: "https://www.fcbarcelona.com/en/matches/138283/fc-barcelona-athletic-club-la-liga-2026-2027",
  }];
  const html = `<script type="application/ld+json">${JSON.stringify(events)}</script><li class="fixture-result-list__fixture" data-fixture-id="138283"><div data-kickoff="1786902300000">20:45</div></li>`;
  const [fixture] = parseBarcelonaScheduleHtml(html, barcelonaFeed, { from: "2026-08-01", to: "2026-08-31" });
  assert.equal(fixture.kickoffTba, false);
  assert.equal(fixture.kickoffUtc, "2026-08-16T17:45:00Z");
});

test("official Ligue 1 API separates confirmed kickoffs from unknown weekend placeholders", () => {
  const calendar = {
    gameWeeks: {
      1: { gameWeekNumber: 1, startDate: "2026-08-21T18:45:00Z", displayEndDate: "2026-08-25T07:00:00Z" },
      2: { gameWeekNumber: 2, startDate: "2026-08-28T18:45:00Z", displayEndDate: "2026-09-01T07:00:00Z" },
    },
  };
  assert.deepEqual(selectLigue1GameWeeks(calendar, { from: "2026-08-20", to: "2026-08-26" }), [1]);

  const matches = {
    matches: [
      {
        championshipId: 1,
        date: "2026-08-21T18:45:00.000Z",
        gameWeekNumber: 1,
        home: { clubIdentity: { name: "Olympique de Marseille" } },
        away: { clubIdentity: { name: "RC Strasbourg Alsace" } },
        matchId: "l1_championship_match_73825",
        unknownMatch: false,
      },
      {
        championshipId: 1,
        date: "2026-08-22T22:00:00.000Z",
        dateTimeUnknown: true,
        gameWeekNumber: 1,
        home: { clubIdentity: { name: "Paris Saint-Germain" } },
        away: { clubIdentity: { name: "Stade Rennais FC" } },
        matchId: "l1_championship_match_73827",
        unknownMatch: false,
      },
    ],
  };
  assert.deepEqual(parseLigue1GameWeek(matches, ligue1Feed, { from: "2026-08-20", to: "2026-08-26" }), [
    {
      competition: "Ligue 1",
      id: "l1-championship-match-73825",
      kickoffTba: false,
      kickoffUtc: "2026-08-21T18:45:00Z",
      scope: "senior_men",
      teams: ["Olympique de Marseille", "RC Strasbourg Alsace"],
    },
    {
      competition: "Ligue 1",
      id: "l1-championship-match-73827",
      kickoffTba: true,
      kickoffUtc: "2026-08-22T22:00:00Z",
      scope: "senior_men",
      teams: ["Paris Saint-Germain", "Stade Rennais FC"],
    },
  ]);
  assert.doesNotMatch(JSON.stringify(parseLigue1GameWeek(matches, ligue1Feed, { from: "2026-08-20", to: "2026-08-26" })), /broadcaster|score|period/i);
});
