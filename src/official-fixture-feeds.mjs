const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const LFP_MATCH_ID = /^l1_championship_match_\d+$/u;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function boundedText(value, path, maxLength = 100) {
  assert(typeof value === "string" && value.trim() && value.length <= maxLength, `${path} must be bounded text`);
  assert(!/[\p{Cc}\p{Cf}]/u.test(value), `${path} contains control characters`);
  return value.trim();
}

function dateBounds(from, to) {
  assert(DATE.test(from ?? "") && DATE.test(to ?? ""), "fixture bounds must be dates");
  const fromMs = new Date(`${from}T00:00:00Z`).valueOf();
  const toMs = new Date(`${to}T23:59:59.999Z`).valueOf();
  assert(Number.isFinite(fromMs) && Number.isFinite(toMs) && fromMs <= toMs, "fixture bounds are invalid");
  return { fromMs, toMs };
}

function canonicalTeam(value, aliases, path) {
  const raw = boundedText(value, path, 80);
  return Object.hasOwn(aliases, raw) ? aliases[raw] : raw;
}

function canonicalInstant(value, path) {
  const date = new Date(value);
  assert(typeof value === "string" && Number.isFinite(date.valueOf()), `${path} must be a valid instant`);
  return date.toISOString().replace(".000Z", "Z");
}

export function parseBarcelonaScheduleHtml(html, feed, { from, to }) {
  assert(typeof html === "string" && html.length > 0, "Barcelona schedule response must be HTML");
  const { fromMs, toMs } = dateBounds(from, to);
  const events = [];
  const exactKickoffs = new Map();
  for (const item of html.matchAll(/<li[^>]*class=["'][^"']*fixture-result-list__fixture[^"']*["'][^>]*data-fixture-id=["'](\d+)["'][^>]*>([\s\S]*?)<\/li>/giu)) {
    const kickoff = /data-kickoff=["'](\d{13})["']/u.exec(item[2]);
    if (!kickoff) continue;
    const value = new Date(Number(kickoff[1]));
    assert(Number.isFinite(value.valueOf()), "Barcelona exact kickoff is invalid");
    exactKickoffs.set(item[1], value.toISOString().replace(".000Z", "Z"));
  }
  const scripts = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu);
  for (const script of scripts) {
    let value;
    try {
      value = JSON.parse(script[1]);
    } catch {
      continue;
    }
    if (Array.isArray(value)) events.push(...value.filter((item) => item?.["@type"] === "SportsEvent"));
  }
  assert(events.length > 0 && events.length <= 100, "Barcelona SportsEvent schema changed");

  const fixtures = [];
  const ids = new Set();
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (!/\(La Liga\)$/u.test(event.name ?? "")) continue;
    const url = new URL(event.url);
    assert(url.protocol === "https:" && url.hostname === "www.fcbarcelona.com", `events[${index}].url host changed`);
    const match = /^\/en\/matches\/(\d+)\/[a-z0-9-]+$/u.exec(url.pathname);
    assert(match && !url.search && !url.hash, `events[${index}].url path changed`);
    assert(!ids.has(match[1]), `events[${index}].url is duplicated`);
    ids.add(match[1]);
    const exactKickoff = exactKickoffs.get(match[1]);
    const kickoffTba = !exactKickoff && DATE.test(event.startDate ?? "");
    const kickoffUtc = exactKickoff ?? (kickoffTba
      ? `${event.startDate}T12:00:00Z`
      : canonicalInstant(event.startDate, `events[${index}].startDate`));
    const kickoffMs = new Date(kickoffUtc).valueOf();
    if (kickoffMs < fromMs || kickoffMs > toMs) continue;
    const teams = [
      canonicalTeam(event.homeTeam?.name, feed.teamAliases, `events[${index}].homeTeam.name`),
      canonicalTeam(event.awayTeam?.name, feed.teamAliases, `events[${index}].awayTeam.name`),
    ];
    assert(teams[0] !== teams[1], `events[${index}] teams must differ`);
    fixtures.push({
      competition: feed.competition,
      id: `${feed.id}-match-${match[1]}`,
      kickoffTba,
      kickoffUtc,
      scope: feed.scope,
      teams,
    });
  }
  return fixtures.sort((left, right) => left.kickoffUtc.localeCompare(right.kickoffUtc) || left.id.localeCompare(right.id));
}

export function selectLigue1GameWeeks(calendar, { from, to }) {
  assert(calendar && typeof calendar === "object" && !Array.isArray(calendar), "Ligue 1 calendar must be an object");
  assert(calendar.gameWeeks && typeof calendar.gameWeeks === "object" && !Array.isArray(calendar.gameWeeks), "Ligue 1 gameWeeks schema changed");
  const { fromMs, toMs } = dateBounds(from, to);
  const weeks = [];
  for (const [key, week] of Object.entries(calendar.gameWeeks)) {
    const number = Number(key);
    assert(Number.isSafeInteger(number) && number >= 1 && number <= 34 && week?.gameWeekNumber === number, "Ligue 1 gameWeek identity changed");
    const startMs = new Date(week.startDate).valueOf();
    const endMs = new Date(week.displayEndDate ?? week.endDate).valueOf();
    assert(Number.isFinite(startMs) && Number.isFinite(endMs) && startMs <= endMs, "Ligue 1 gameWeek dates changed");
    if (endMs >= fromMs && startMs <= toMs) weeks.push(number);
  }
  return weeks.sort((left, right) => left - right);
}

export function parseLigue1GameWeek(value, feed, { from, to }) {
  assert(value && typeof value === "object" && !Array.isArray(value), "Ligue 1 response must be an object");
  assert(Array.isArray(value.matches) && value.matches.length > 0 && value.matches.length <= 12, "Ligue 1 matches schema changed");
  const { fromMs, toMs } = dateBounds(from, to);
  const fixtures = [];
  const ids = new Set();
  for (let index = 0; index < value.matches.length; index += 1) {
    const match = value.matches[index];
    const path = `matches[${index}]`;
    assert(match && typeof match === "object" && !Array.isArray(match), `${path} must be an object`);
    assert(LFP_MATCH_ID.test(match.matchId ?? "") && !ids.has(match.matchId), `${path}.matchId is invalid or duplicated`);
    ids.add(match.matchId);
    assert(match.championshipId === feed.championshipId, `${path}.championshipId changed`);
    assert(Number.isSafeInteger(match.gameWeekNumber) && match.gameWeekNumber >= 1 && match.gameWeekNumber <= 34, `${path}.gameWeekNumber is invalid`);
    if (match.unknownMatch === true) continue;
    assert(match.dateTimeUnknown === undefined || typeof match.dateTimeUnknown === "boolean", `${path}.dateTimeUnknown is invalid`);
    const kickoffUtc = canonicalInstant(match.date, `${path}.date`);
    const kickoffMs = new Date(kickoffUtc).valueOf();
    if (kickoffMs < fromMs || kickoffMs > toMs) continue;
    const teams = [
      canonicalTeam(match.home?.clubIdentity?.name, feed.teamAliases, `${path}.home.clubIdentity.name`),
      canonicalTeam(match.away?.clubIdentity?.name, feed.teamAliases, `${path}.away.clubIdentity.name`),
    ];
    assert(teams[0] !== teams[1], `${path} teams must differ`);
    fixtures.push({
      competition: feed.competition,
      id: match.matchId.replaceAll("_", "-"),
      kickoffTba: match.dateTimeUnknown === true,
      kickoffUtc,
      scope: feed.scope,
      teams,
    });
  }
  return fixtures.sort((left, right) => left.kickoffUtc.localeCompare(right.kickoffUtc) || left.id.localeCompare(right.id));
}

function fifaLocalizedName(value, path) {
  assert(Array.isArray(value) && value.length > 0 && value.length <= 10, `${path} schema changed`);
  const english = value.find((item) => item?.Locale === "en-GB") ?? value.find((item) => item?.Locale === "en");
  return boundedText(english?.Description, `${path}.Description`, 80);
}

export function parseFifaWorldCupCalendar(value, feed) {
  assert(value && typeof value === "object" && !Array.isArray(value), "FIFA calendar must be an object");
  assert(value.ContinuationToken === null, "FIFA calendar unexpectedly paginated");
  assert(Array.isArray(value.Results) && value.Results.length === 104, "FIFA World Cup calendar schema changed");
  const wanted = new Map(Object.entries(feed.matchIds).map(([id, number]) => [id, number]));
  const fixtures = [];
  const found = new Set();

  for (let index = 0; index < value.Results.length; index += 1) {
    const match = value.Results[index];
    const number = wanted.get(String(match?.IdMatch));
    if (!number) continue;
    const path = `Results[${index}]`;
    assert(!found.has(number), `${path}.IdMatch is duplicated`);
    found.add(number);
    assert(String(match.IdSeason) === String(feed.seasonId), `${path}.IdSeason changed`);
    const kickoffUtc = canonicalInstant(match.Date, `${path}.Date`);
    let teams;
    let participantsTba = false;
    if (match.Home === null && match.Away === null) {
      teams = feed.placeholderTeams[number];
      assert(Array.isArray(teams), `${path} has no approved placeholder teams`);
      participantsTba = true;
    } else {
      assert(match.Home && match.Away, `${path} has only one participant`);
      teams = [
        fifaLocalizedName(match.Home.TeamName, `${path}.Home.TeamName`),
        fifaLocalizedName(match.Away.TeamName, `${path}.Away.TeamName`),
      ];
      assert(teams[0] !== teams[1], `${path} teams must differ`);
    }
    fixtures.push({
      competition: feed.competition,
      id: `fifa-world-cup-2026-match-${number}`,
      kickoffTba: false,
      kickoffUtc,
      participantsTba,
      scope: feed.scope,
      teams: [...teams],
    });
  }
  assert(found.size === wanted.size, "FIFA World Cup remaining match identity changed");
  return fixtures.sort((left, right) => left.kickoffUtc.localeCompare(right.kickoffUtc) || left.id.localeCompare(right.id));
}
