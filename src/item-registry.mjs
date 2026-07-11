import { scanSourceMetadata } from "./spoiler-scan.mjs";

const ACCESS = new Set(["free", "free_account", "mixed_free", "paid", "unknown"]);
const FORMATS = new Set(["extended", "full", "halves", "mini", "partial", "short"]);
const PLAYBACK = new Set([
  "blocked_by_popup",
  "links_unverified",
  "observed",
  "policy_blocked",
  "removed_404",
]);
const PROVENANCE = new Set(["aggregator", "community_unverified", "verified_official"]);
const STAGES = new Set(["blocked", "candidate", "removed", "surface"]);
const THUMBNAILS = new Set(["neutral_observed", "spoiler_reported", "unscanned"]);
const SCAN_DECISIONS = new Set(["block_auto_surface", "candidate", "manual_review"]);
const FORBIDDEN_LEGAL_KEYS = new Set(["authorized", "illegal", "lawful", "legal", "legitimate"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertText(value, path) {
  assert(typeof value === "string" && value.trim().length > 0, `${path} must be non-empty text`);
}

function assertDate(value, path) {
  assert(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value), `${path} must be YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00Z`);
  assert(!Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value, `${path} must be a real date`);
}

function findForbiddenLegalKey(value, path) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenLegalKey(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_LEGAL_KEYS.has(key.toLowerCase())) return `${path}.${key}`;
    const found = findForbiddenLegalKey(child, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

function hostBelongsToSource(itemUrl, baseUrl) {
  const itemHost = new URL(itemUrl).hostname.toLowerCase();
  const sourceHost = new URL(baseUrl).hostname.toLowerCase();
  return itemHost === sourceHost || itemHost.endsWith(`.${sourceHost}`) || sourceHost.endsWith(`.${itemHost}`);
}

function expectedScanDecision(metadata) {
  if (metadata.thumbnailState === "spoiler_reported") return "block_auto_surface";
  const thumbnailText = metadata.thumbnailState === "neutral_observed" ? "Neutral fixture image" : null;
  return scanSourceMetadata({
    title: metadata.titleObserved,
    description: metadata.descriptionObserved,
    thumbnailText,
  }).decision;
}

export function validateItemCandidateRegistry(items, sources) {
  assert(Array.isArray(items) && items.length > 0, "item candidate registry must not be empty");
  assert(Array.isArray(sources) && sources.length > 0, "source registry is required");
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const ids = new Set();

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const path = `items[${index}]`;
    assert(item && typeof item === "object" && !Array.isArray(item), `${path} must be an object`);
    const forbidden = findForbiddenLegalKey(item, path);
    assert(!forbidden, `${forbidden} is a forbidden legal-status field`);

    assertText(item.id, `${path}.id`);
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id), `${path}.id is invalid`);
    assert(!ids.has(item.id), `item id must be unique: ${item.id}`);
    ids.add(item.id);

    assertText(item.sourceId, `${path}.sourceId`);
    const source = sourceById.get(item.sourceId);
    assert(source, `${path}.sourceId has no source registry entry`);
    assert(item.provenance === source.provenance, `${path}.provenance must match source registry`);
    assert(PROVENANCE.has(item.provenance), `${path}.provenance is unsupported`);

    assertText(item.fixtureId, `${path}.fixtureId`);
    assert(Array.isArray(item.teams) && item.teams.length === 2, `${path}.teams must have two entries`);
    item.teams.forEach((team, teamIndex) => assertText(team, `${path}.teams[${teamIndex}]`));
    assertText(item.competition, `${path}.competition`);
    assertText(item.kickoffUtc, `${path}.kickoffUtc`);
    const kickoff = new Date(item.kickoffUtc);
    const normalizedKickoff = Number.isNaN(kickoff.valueOf()) ? null : kickoff.toISOString().replace(".000Z", "Z");
    assert(normalizedKickoff === item.kickoffUtc, `${path}.kickoffUtc must be canonical ISO UTC`);

    assertText(item.itemUrl, `${path}.itemUrl`);
    const url = new URL(item.itemUrl);
    assert(url.protocol === "https:", `${path}.itemUrl must use HTTPS`);
    assert(hostBelongsToSource(item.itemUrl, source.baseUrl), `${path}.itemUrl host must match its source`);

    assert(Array.isArray(item.formats) && item.formats.length > 0, `${path}.formats must not be empty`);
    item.formats.forEach((format) => assert(FORMATS.has(format), `${path}.formats contains unsupported ${format}`));
    item.formats.forEach((format) => assert(source.formats.includes(format), `${path}.formats contains ${format} not offered by source`));
    assert(new Set(item.formats).size === item.formats.length, `${path}.formats must be unique`);
    assert(ACCESS.has(item.access), `${path}.access is unsupported`);

    assert(item.metadata && typeof item.metadata === "object", `${path}.metadata is required`);
    assertText(item.metadata.titleObserved, `${path}.metadata.titleObserved`);
    assert(item.metadata.descriptionObserved === null || typeof item.metadata.descriptionObserved === "string", `${path}.metadata.descriptionObserved must be text or null`);
    assert(THUMBNAILS.has(item.metadata.thumbnailState), `${path}.metadata.thumbnailState is unsupported`);
    assert(SCAN_DECISIONS.has(item.metadata.scanDecision), `${path}.metadata.scanDecision is unsupported`);
    assertDate(item.metadata.checkedAt, `${path}.metadata.checkedAt`);
    assert(item.metadata.scanDecision === expectedScanDecision(item.metadata), `${path}.metadata.scanDecision does not match scanner evidence`);

    assert(item.playback && typeof item.playback === "object", `${path}.playback is required`);
    assert(/^[A-Z]{2}$/.test(item.playback.region), `${path}.playback.region is invalid`);
    assert(PLAYBACK.has(item.playback.status), `${path}.playback.status is unsupported`);
    assertDate(item.playback.checkedAt, `${path}.playback.checkedAt`);
    assert(Array.isArray(item.destinationRisks), `${path}.destinationRisks must be an array`);
    item.destinationRisks.forEach((risk, riskIndex) => assertText(risk, `${path}.destinationRisks[${riskIndex}]`));
    assert(STAGES.has(item.stage), `${path}.stage is unsupported`);

    if (item.playback.status === "removed_404") assert(item.stage === "removed", `${path} removed playback must use removed stage`);
    if (item.metadata.scanDecision === "block_auto_surface") assert(item.stage !== "surface", `${path} blocked metadata cannot surface`);
    if (item.stage === "surface") {
      assert(item.playback.status === "observed", `${path} cannot surface before playback is observed`);
      assert(item.metadata.scanDecision === "candidate", `${path} cannot surface before metadata is a candidate`);
      assert(item.access === "free" || item.access === "free_account", `${path} cannot surface with ${item.access} access`);
    }
  }

  return items;
}

export function surfaceableItems(items) {
  return items.filter((item) => item.stage === "surface");
}
