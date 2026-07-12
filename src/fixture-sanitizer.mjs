const PUBLIC_KEYS = new Set([
  "availability",
  "competition",
  "favorite",
  "id",
  "kickoffTba",
  "kickoffUtc",
  "teams",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertText(value, path) {
  assert(typeof value === "string" && value.trim().length > 0, `${path} must be non-empty text`);
}

export function sanitizeFixture(rawFixture, {
  availability = "none",
  favoriteTeams = [],
} = {}) {
  assert(rawFixture && typeof rawFixture === "object" && !Array.isArray(rawFixture), "raw fixture must be an object");
  assertText(rawFixture.id, "rawFixture.id");
  assertText(rawFixture.competition, "rawFixture.competition");
  assertText(rawFixture.kickoffUtc, "rawFixture.kickoffUtc");
  assert(rawFixture.kickoffTba === undefined || typeof rawFixture.kickoffTba === "boolean", "rawFixture.kickoffTba must be boolean");
  assert(Array.isArray(rawFixture.teams) && rawFixture.teams.length === 2, "rawFixture.teams must contain two teams");
  rawFixture.teams.forEach((team, index) => assertText(team, `rawFixture.teams[${index}]`));

  const kickoffDate = new Date(rawFixture.kickoffUtc);
  assert(!Number.isNaN(kickoffDate.valueOf()), "rawFixture.kickoffUtc must be a valid instant");
  const kickoffUtc = kickoffDate.toISOString().replace(".000Z", "Z");
  assert(kickoffUtc === rawFixture.kickoffUtc, "rawFixture.kickoffUtc must be canonical ISO UTC");
  const fixture = {
    id: rawFixture.id,
    competition: rawFixture.competition,
    kickoffTba: rawFixture.kickoffTba === true,
    kickoffUtc,
    teams: [...rawFixture.teams],
    favorite: rawFixture.teams.some((team) => favoriteTeams.includes(team)),
    availability,
  };

  assert(Object.keys(fixture).every((key) => PUBLIC_KEYS.has(key)), "fixture sanitizer emitted a non-public field");
  return fixture;
}

export function sanitizeFixtureSnapshot(snapshot, {
  availabilityByFixture = {},
  favoriteTeams = [],
} = {}) {
  assert(snapshot && typeof snapshot === "object", "fixture snapshot must be an object");
  assertText(snapshot.checkedAt, "snapshot.checkedAt");
  assert(Array.isArray(snapshot.fixtures) && snapshot.fixtures.length > 0, "snapshot.fixtures must not be empty");
  return snapshot.fixtures.map((fixture) => sanitizeFixture(fixture, {
    availability: availabilityByFixture[fixture.id] ?? "none",
    favoriteTeams,
  }));
}
