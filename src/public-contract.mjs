const FIXTURE_KEYS = new Set([
  "availability",
  "competition",
  "favorite",
  "id",
  "kickoffTba",
  "kickoffUtc",
  "teams",
]);

const SOURCE_KEYS = new Set([
  "accessLabel",
  "durationLabel",
  "evidenceStatus",
  "format",
  "id",
  "providerName",
  "provenance",
  "redirectPath",
  "riskLabel",
  "riskTone",
]);
const SOURCE_REQUIRED_KEYS = new Set([...SOURCE_KEYS].filter((key) => key !== "durationLabel"));

const TOP_LEVEL_KEYS = new Set(["checkedAt", "fixtures", "region", "sourcesByFixture"]);
const SOURCE_FORMATS = new Set(["extended", "full", "halves", "mini", "short"]);
const EVIDENCE_STATUS = new Set([
  "directory_candidate",
  "item_blocked",
  "item_observed",
  "player_candidate",
  "thread_candidate",
]);
const PROVENANCE = new Set(["aggregator", "community_unverified", "verified_official"]);
const RISK_TONES = new Set(["caution", "checked", "unknown"]);
const AVAILABILITY = new Set(["checking", "none", "ready"]);
const FORBIDDEN_KEYS = new Set([
  "comments",
  "description",
  "duration",
  "events",
  "externalUrl",
  "goals",
  "legal",
  "result",
  "score",
  "thumbnail",
  "title",
  "winner",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertExactKeys(value, allowed, path, required = allowed) {
  for (const key of Object.keys(value)) {
    assert(!FORBIDDEN_KEYS.has(key), `${path}.${key} is forbidden in the public contract`);
    assert(allowed.has(key), `${path}.${key} is not in the public allowlist`);
  }
  for (const key of required) assert(Object.hasOwn(value, key), `${path}.${key} is required`);
}

function assertText(value, path) {
  assert(typeof value === "string" && value.trim().length > 0, `${path} must be non-empty text`);
}

function assertDate(value, path) {
  assertText(value, path);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(value), `${path} must be YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00Z`);
  assert(!Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value, `${path} must be a real date`);
}

function validateFixture(fixture, path) {
  assert(fixture && typeof fixture === "object" && !Array.isArray(fixture), `${path} must be an object`);
  assertExactKeys(fixture, FIXTURE_KEYS, path);
  assertText(fixture.id, `${path}.id`);
  assertText(fixture.competition, `${path}.competition`);
  assert(typeof fixture.kickoffTba === "boolean", `${path}.kickoffTba must be boolean`);
  assertText(fixture.kickoffUtc, `${path}.kickoffUtc`);
  const kickoff = new Date(fixture.kickoffUtc);
  assert(!Number.isNaN(kickoff.valueOf()) && kickoff.toISOString().replace(".000Z", "Z") === fixture.kickoffUtc, `${path}.kickoffUtc must be canonical ISO UTC`);
  assert(Array.isArray(fixture.teams) && fixture.teams.length === 2, `${path}.teams must have two entries`);
  fixture.teams.forEach((team, index) => assertText(team, `${path}.teams[${index}]`));
  assert(typeof fixture.favorite === "boolean", `${path}.favorite must be boolean`);
  assert(AVAILABILITY.has(fixture.availability), `${path}.availability is unsupported`);
}

function validateSource(source, path) {
  assert(source && typeof source === "object" && !Array.isArray(source), `${path} must be an object`);
  assertExactKeys(source, SOURCE_KEYS, path, SOURCE_REQUIRED_KEYS);
  assertText(source.id, `${path}.id`);
  assertText(source.providerName, `${path}.providerName`);
  assertText(source.accessLabel, `${path}.accessLabel`);
  assertText(source.riskLabel, `${path}.riskLabel`);
  if (source.durationLabel !== undefined) {
    assert(/^\d{1,2}:\d{2}(?::\d{2})?$/u.test(source.durationLabel), `${path}.durationLabel is invalid`);
  }
  assert(EVIDENCE_STATUS.has(source.evidenceStatus), `${path}.evidenceStatus is unsupported`);
  assert(SOURCE_FORMATS.has(source.format), `${path}.format is unsupported`);
  assert(PROVENANCE.has(source.provenance), `${path}.provenance is unsupported`);
  assert(RISK_TONES.has(source.riskTone), `${path}.riskTone is unsupported`);
  if (source.evidenceStatus === "thread_candidate") {
    assert(source.provenance === "community_unverified", `${path} thread candidates must be community/unverified`);
  }
  assert(/^\/go\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.redirectPath), `${path}.redirectPath is invalid`);
}

export function validatePublicCatalogue(catalogue) {
  assert(catalogue && typeof catalogue === "object" && !Array.isArray(catalogue), "catalogue must be an object");
  assertExactKeys(catalogue, TOP_LEVEL_KEYS, "catalogue");
  assertText(catalogue.region, "catalogue.region");
  assertDate(catalogue.checkedAt, "catalogue.checkedAt");
  assert(Array.isArray(catalogue.fixtures) && catalogue.fixtures.length > 0, "catalogue.fixtures must not be empty");
  catalogue.fixtures.forEach((fixture, index) => validateFixture(fixture, `catalogue.fixtures[${index}]`));
  assert(catalogue.sourcesByFixture && typeof catalogue.sourcesByFixture === "object", "catalogue.sourcesByFixture is required");

  const fixtureIds = new Set(catalogue.fixtures.map((fixture) => fixture.id));
  for (const [fixtureId, sources] of Object.entries(catalogue.sourcesByFixture)) {
    assert(fixtureIds.has(fixtureId), `sourcesByFixture.${fixtureId} has no matching fixture`);
    assert(Array.isArray(sources), `sourcesByFixture.${fixtureId} must be an array`);
    sources.forEach((source, index) => validateSource(source, `sourcesByFixture.${fixtureId}[${index}]`));
  }

  return catalogue;
}

export function findForbiddenPublicKey(value, path = "catalogue") {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenPublicKey(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) return `${path}.${key}`;
    const found = findForbiddenPublicKey(child, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}
