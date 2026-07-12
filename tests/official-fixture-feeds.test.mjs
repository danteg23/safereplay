import assert from "node:assert/strict";
import test from "node:test";

import {
  parseBarcelonaScheduleHtml,
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
