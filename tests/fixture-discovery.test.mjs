import assert from "node:assert/strict";
import test from "node:test";

import { discoverFixtureCandidates } from "../src/fixture-discovery.mjs";
import { parseFixtureDownloadRows, validateFixtureFeedRegistry } from "../src/fixture-download.mjs";

const enabledFeed = {
  checkedAt: "2026-07-10",
  competition: "Premier League",
  evidenceUrl: "https://www.premierleague.com/en/news/example",
  feedUrl: "https://fixturedownload.com/feed/json/epl-2026",
  id: "fixture-download-epl-2026",
  kind: "fixture_download_json",
  priorityTeams: ["Arsenal", "Manchester City"],
  scope: "senior_men",
  selection: "priority_teams",
  state: "enabled_candidate",
  teamAliases: { "Man City": "Manchester City" },
};

function row(overrides = {}) {
  return {
    AwayTeam: "Coventry",
    AwayTeamScore: null,
    DateUtc: "2026-08-21 19:00:00Z",
    Group: null,
    HomeTeam: "Arsenal",
    HomeTeamScore: null,
    Location: "Raw stadium must be discarded",
    MatchNumber: 1,
    RoundNumber: 1,
    Winner: "",
    ...overrides,
  };
}

function registry(feed = enabledFeed) {
  return { feeds: [feed] };
}

function jsonResponse(value, { contentType = "application/json", url = enabledFeed.feedUrl } = {}) {
  const body = JSON.stringify(value);
  return {
    headers: { get(name) { return name.toLowerCase() === "content-type" ? contentType : String(Buffer.byteLength(body)); } },
    ok: true,
    text: async () => body,
    url,
  };
}

test("fixture parser maps EPL aliases and discards scores, winner, location, and hostile extras", () => {
  const fixtures = parseFixtureDownloadRows([
    row({ AwayTeamScore: 7, HomeTeamScore: 8, Winner: "Raw winner", result: "8-7" }),
    row({ AwayTeam: "Bournemouth", DateUtc: "2026-08-23 13:00:00Z", HomeTeam: "Man City", MatchNumber: 8 }),
    row({ AwayTeam: "Crystal Palace", HomeTeam: "Everton", MatchNumber: 3 }),
  ], enabledFeed, { from: "2026-08-20", to: "2026-08-24" });
  assert.deepEqual(fixtures, [
    {
      competition: "Premier League",
      id: "fixture-download-epl-2026-match-1",
      kickoffUtc: "2026-08-21T19:00:00Z",
      scope: "senior_men",
      teams: ["Arsenal", "Coventry"],
    },
    {
      competition: "Premier League",
      id: "fixture-download-epl-2026-match-8",
      kickoffUtc: "2026-08-23T13:00:00Z",
      scope: "senior_men",
      teams: ["Manchester City", "Bournemouth"],
    },
  ]);
  const serialized = JSON.stringify(fixtures);
  assert.doesNotMatch(serialized, /winner|score|result|stadium|8-7/i);
});

test("fixture registry withholds mismatched feeds and rejects untrusted hosts", () => {
  const withheld = { ...enabledFeed, blockReason: "date_mismatch", state: "withheld" };
  assert.deepEqual(validateFixtureFeedRegistry(registry(withheld)), [withheld]);
  assert.throws(() => validateFixtureFeedRegistry(registry({
    ...enabledFeed,
    feedUrl: "https://example.test/feed/json/epl-2026",
  })), /host is not allowed/);
  assert.throws(() => validateFixtureFeedRegistry(registry({
    ...enabledFeed,
    feedUrl: "https://example.test/terminliste/subscribe",
    kind: "official_ical",
  })), /official calendar host is not allowed/);
});

test("fixture discovery is fail-closed on redirects, content type, and schema changes", async () => {
  const cases = [
    [jsonResponse([row()], { url: "https://example.test/feed.json" }), "fixture_feed_invalid"],
    [jsonResponse([row()], { contentType: "text/html" }), "fixture_feed_wrong_content_type"],
    [jsonResponse([{ ...row(), DateUtc: "schema changed" }]), "fixture_feed_invalid"],
  ];
  for (const [response, code] of cases) {
    const result = await discoverFixtureCandidates({
      checkedAt: "2026-07-10",
      fetchImpl: async () => response,
      from: "2026-08-20",
      registry: registry(),
      to: "2026-08-24",
    });
    assert.deepEqual(result.failures, [{ code, feedId: enabledFeed.id }]);
    assert.deepEqual(result.snapshot.fixtures, []);
  }
});

test("fixture discovery reports transport failures as unavailable rather than schema-invalid", async () => {
  const result = await discoverFixtureCandidates({
    checkedAt: "2026-07-10",
    fetchImpl: async () => { throw new TypeError("fetch failed"); },
    from: "2026-08-20",
    registry: registry(),
    to: "2026-08-24",
  });
  assert.deepEqual(result.failures, [{ code: "fixture_feed_unavailable", feedId: enabledFeed.id }]);
});

test("fixture discovery emits a neutral private snapshot for enabled feeds only", async () => {
  const withheld = {
    ...enabledFeed,
    blockReason: "official_cross_check_pending",
    feedUrl: "https://fixturedownload.com/feed/json/la-liga-2026",
    id: "fixture-download-la-liga-2026",
    state: "withheld",
  };
  const result = await discoverFixtureCandidates({
    checkedAt: "2026-07-10",
    fetchImpl: async () => jsonResponse([row()]),
    from: "2026-08-20",
    registry: { feeds: [enabledFeed, withheld] },
    to: "2026-08-24",
  });
  assert.deepEqual(result.failures, []);
  assert.equal(result.snapshot.fixtures.length, 1);
  assert.deepEqual(result.snapshot.sources, [{ feedId: enabledFeed.id, fixtureCount: 1 }]);
  assert.doesNotMatch(JSON.stringify(result), /Raw stadium|Winner|HomeTeamScore|AwayTeamScore/);
});

test("fixture discovery ingests the official Eliteserien calendar as neutral UTC", async () => {
  const feed = {
    ...enabledFeed,
    competition: "Eliteserien",
    evidenceUrl: "https://www.eliteserien.no/terminliste",
    feedUrl: "https://www.eliteserien.no/terminliste/subscribe",
    id: "eliteserien-official-calendar-2026",
    kind: "official_ical",
    priorityTeams: [],
    selection: "all",
    teamAliases: {},
  };
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:a76adb3a-b111-4530-acb8-bf341895f3d9",
    "SUMMARY:Fredrikstad - Lillestrøm",
    "DTSTART;TZID=Europe/Oslo:20260711T140000",
    "DESCRIPTION:Raw result-shaped copy",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  const result = await discoverFixtureCandidates({
    checkedAt: "2026-07-10",
    fetchImpl: async (_url, options) => {
      assert.equal(options.headers.accept, "text/calendar");
      return {
        headers: { get(name) { return name.toLowerCase() === "content-type" ? "text/calendar; charset=utf-8" : String(Buffer.byteLength(body)); } },
        ok: true,
        status: 200,
        text: async () => body,
        url: feed.feedUrl,
      };
    },
    from: "2026-07-10",
    registry: registry(feed),
    to: "2026-07-12",
  });
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.snapshot.fixtures.map(({ kickoffUtc, teams }) => ({ kickoffUtc, teams })), [
    { kickoffUtc: "2026-07-11T12:00:00Z", teams: ["Fredrikstad", "Lillestrøm"] },
  ]);
  assert.doesNotMatch(JSON.stringify(result), /Raw result-shaped copy|description/i);
});
