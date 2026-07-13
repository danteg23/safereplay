const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const CODE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const RAW_DATE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}Z$/u;
const STATES = new Set(["enabled_candidate", "withheld"]);
const SELECTIONS = new Set(["all", "priority_teams"]);
const KINDS = new Set(["fixture_download_json", "official_fifa_api", "official_ical", "official_lfp_api", "official_schema_org"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function text(value, path, maxLength = 100) {
  assert(typeof value === "string" && value.trim() && value.length <= maxLength, `${path} must be bounded text`);
  assert(!/[\p{Cc}\p{Cf}]/u.test(value), `${path} contains control characters`);
  return value.trim();
}

function fixtureDownloadUrl(value) {
  const url = new URL(value);
  assert(url.protocol === "https:" && url.hostname === "fixturedownload.com", "fixture feed host is not allowed");
  assert(/^\/feed\/json\/[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(url.pathname), "fixture feed path is invalid");
  assert(!url.search && !url.hash, "fixture feed URL must not contain query or fragment");
  return url;
}

function officialCalendarUrl(value) {
  const url = new URL(value);
  assert(url.protocol === "https:" && url.hostname === "www.eliteserien.no", "official calendar host is not allowed");
  assert(url.pathname === "/terminliste/subscribe", "official calendar path is invalid");
  assert(!url.search && !url.hash, "official calendar URL must not contain query or fragment");
  return url;
}

function barcelonaScheduleUrl(value) {
  const url = new URL(value);
  assert(url.protocol === "https:" && url.hostname === "www.fcbarcelona.com", "Barcelona schedule host is not allowed");
  assert(url.pathname === "/en/football/first-team/schedule", "Barcelona schedule path is invalid");
  assert(!url.search && !url.hash, "Barcelona schedule URL must not contain query or fragment");
  return url;
}

function officialLfpUrl(feed, value) {
  const url = new URL(value);
  assert(url.protocol === "https:" && url.hostname === "ma-api.ligue1.fr", "official LFP API host is not allowed");
  const calendarPath = `/championship-calendar/${feed.championshipId}`;
  const matchPath = new RegExp(`^/championship-matches/championship/${feed.championshipId}/game-week/(?:[1-9]|[12]\\d|3[0-4])$`, "u");
  assert(url.pathname === calendarPath || matchPath.test(url.pathname), "official LFP API path is invalid");
  assert(url.searchParams.size === 1 && url.searchParams.get("season") === String(feed.season) && !url.hash, "official LFP API query is invalid");
  return url;
}

function officialFifaUrl(feed, value) {
  const url = new URL(value);
  assert(url.protocol === "https:" && url.hostname === "api.fifa.com", "official FIFA API host is not allowed");
  assert(url.pathname === "/api/v3/calendar/matches", "official FIFA API path is invalid");
  assert(url.searchParams.size === 3, "official FIFA API query is invalid");
  assert(url.searchParams.get("language") === "en", "official FIFA API language is invalid");
  assert(url.searchParams.get("count") === "500", "official FIFA API count is invalid");
  assert(url.searchParams.get("idSeason") === String(feed.seasonId), "official FIFA API season is invalid");
  assert(!url.hash, "official FIFA API URL must not contain a fragment");
  return url;
}

export function validateFixtureFeedRegistry(value) {
  assert(value && typeof value === "object" && !Array.isArray(value), "fixture feed registry must be an object");
  assert(Array.isArray(value.feeds) && value.feeds.length > 0, "fixture feed registry must contain feeds");
  const ids = new Set();
  for (let index = 0; index < value.feeds.length; index += 1) {
    const feed = value.feeds[index];
    const path = `feeds[${index}]`;
    assert(feed && typeof feed === "object" && !Array.isArray(feed), `${path} must be an object`);
    assert(ID.test(feed.id ?? "") && !ids.has(feed.id), `${path}.id is invalid or duplicated`);
    ids.add(feed.id);
    assert(KINDS.has(feed.kind), `${path}.kind is invalid`);
    text(feed.competition, `${path}.competition`);
    allowedFixtureFeedUrl(feed, feed.feedUrl);
    assert(STATES.has(feed.state), `${path}.state is invalid`);
    assert(feed.scope === "senior_men", `${path}.scope is invalid`);
    assert(SELECTIONS.has(feed.selection), `${path}.selection is invalid`);
    assert(Array.isArray(feed.priorityTeams), `${path}.priorityTeams must be an array`);
    feed.priorityTeams.forEach((team, teamIndex) => text(team, `${path}.priorityTeams[${teamIndex}]`));
    assert(feed.selection === "all" || feed.priorityTeams.length > 0, `${path} priority selection requires teams`);
    assert(feed.teamAliases && typeof feed.teamAliases === "object" && !Array.isArray(feed.teamAliases), `${path}.teamAliases is invalid`);
    for (const [raw, canonical] of Object.entries(feed.teamAliases)) {
      text(raw, `${path}.teamAliases key`);
      text(canonical, `${path}.teamAliases.${raw}`);
    }
    assert(DATE.test(feed.checkedAt ?? ""), `${path}.checkedAt is invalid`);
    if (feed.kind === "official_lfp_api") {
      assert(feed.championshipId === 1, `${path}.championshipId is invalid`);
      assert(feed.season === 2026, `${path}.season is invalid`);
    } else if (feed.kind === "official_fifa_api") {
      assert(feed.seasonId === 285023, `${path}.seasonId is invalid`);
      assert(feed.matchIds && typeof feed.matchIds === "object" && !Array.isArray(feed.matchIds), `${path}.matchIds is invalid`);
      const matchNumbers = Object.values(feed.matchIds);
      assert(matchNumbers.length === 4 && new Set(matchNumbers).size === 4, `${path}.matchIds must contain four unique matches`);
      assert(matchNumbers.every((number) => Number.isSafeInteger(number) && number >= 101 && number <= 104), `${path}.matchIds contains an invalid match number`);
      assert(feed.placeholderTeams && typeof feed.placeholderTeams === "object" && !Array.isArray(feed.placeholderTeams), `${path}.placeholderTeams is invalid`);
      for (const number of [103, 104]) {
        const teams = feed.placeholderTeams[number];
        assert(Array.isArray(teams) && teams.length === 2, `${path}.placeholderTeams.${number} is invalid`);
        teams.forEach((team, teamIndex) => text(team, `${path}.placeholderTeams.${number}[${teamIndex}]`, 80));
      }
    } else {
      assert(feed.championshipId === undefined && feed.season === undefined, `${path} LFP fields are not allowed`);
      assert(feed.seasonId === undefined && feed.matchIds === undefined && feed.placeholderTeams === undefined, `${path} FIFA fields are not allowed`);
    }
    const evidenceUrl = new URL(feed.evidenceUrl);
    assert(evidenceUrl.protocol === "https:", `${path}.evidenceUrl must use HTTPS`);
    if (feed.state === "withheld") assert(CODE.test(feed.blockReason ?? ""), `${path}.blockReason is required`);
    else assert(feed.blockReason === undefined, `${path}.blockReason is only valid when withheld`);
  }
  return value.feeds;
}

function canonicalTeam(value, aliases, path) {
  const raw = text(value, path, 80);
  return Object.hasOwn(aliases, raw) ? aliases[raw] : raw;
}

function dateBound(value, path, endOfDay = false) {
  assert(DATE.test(value ?? ""), `${path} must be YYYY-MM-DD`);
  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const date = new Date(`${value}${suffix}`);
  assert(!Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value, `${path} must be a real date`);
  return date.valueOf();
}

export function parseFixtureDownloadRows(rows, feed, { from, to }) {
  assert(Array.isArray(rows), "fixture feed response must be an array");
  const fromMs = dateBound(from, "from");
  const toMs = dateBound(to, "to", true);
  assert(fromMs <= toMs, "from must not be after to");
  const matchNumbers = new Set();
  const fixtures = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const path = `rows[${index}]`;
    assert(row && typeof row === "object" && !Array.isArray(row), `${path} must be an object`);
    assert(Number.isSafeInteger(row.MatchNumber) && row.MatchNumber > 0, `${path}.MatchNumber is invalid`);
    assert(!matchNumbers.has(row.MatchNumber), `${path}.MatchNumber is duplicated`);
    matchNumbers.add(row.MatchNumber);
    assert(RAW_DATE.test(row.DateUtc ?? ""), `${path}.DateUtc schema changed`);
    const kickoffUtc = row.DateUtc.replace(" ", "T");
    const kickoffDate = new Date(kickoffUtc);
    const kickoffMs = kickoffDate.valueOf();
    assert(!Number.isNaN(kickoffMs), `${path}.DateUtc is invalid`);
    assert(kickoffDate.toISOString().replace(".000Z", "Z") === kickoffUtc, `${path}.DateUtc is not canonical`);
    const teams = [
      canonicalTeam(row.HomeTeam, feed.teamAliases, `${path}.HomeTeam`),
      canonicalTeam(row.AwayTeam, feed.teamAliases, `${path}.AwayTeam`),
    ];
    assert(teams[0] !== teams[1], `${path} teams must differ`);
    if (kickoffMs < fromMs || kickoffMs > toMs) continue;
    if (feed.selection === "priority_teams" && !teams.some((team) => feed.priorityTeams.includes(team))) continue;
    fixtures.push({
      competition: feed.competition,
      id: `${feed.id}-match-${row.MatchNumber}`,
      kickoffUtc,
      scope: feed.scope,
      teams,
    });
  }
  return fixtures.sort((left, right) => left.kickoffUtc.localeCompare(right.kickoffUtc) || left.id.localeCompare(right.id));
}

export function allowedFixtureDownloadUrl(value) {
  return fixtureDownloadUrl(value);
}

export function allowedFixtureFeedUrl(feed, value) {
  if (feed?.kind === "fixture_download_json") return fixtureDownloadUrl(value);
  if (feed?.kind === "official_ical") return officialCalendarUrl(value);
  if (feed?.kind === "official_schema_org") return barcelonaScheduleUrl(value);
  if (feed?.kind === "official_lfp_api") return officialLfpUrl(feed, value);
  if (feed?.kind === "official_fifa_api") return officialFifaUrl(feed, value);
  throw new Error("fixture feed kind is not allowed");
}
