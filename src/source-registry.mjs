const ACCESS = new Set(["free", "free_account", "mixed_free", "paid", "unknown"]);
const DISCOVERY = new Set([
  "provider_app",
  "reddit_thread",
  "search_index",
  "web_catalogue",
  "youtube_channel",
]);
const FORMATS = new Set(["extended", "full", "halves", "mini", "partial", "short"]);
const PROVENANCE = new Set(["aggregator", "community_unverified", "verified_official"]);
const REGION_STATUS = new Set([
  "catalogue_observed",
  "claimed_available",
  "geo_blocked_sample",
  "login_required",
  "playback_observed",
  "untested",
]);
const SPOILER_STATUS = new Set(["item_dependent", "safe_observed", "unknown", "unsafe"]);
const STAGES = new Set(["candidate", "explore", "surface"]);
const SPOILER_SURFACES = ["listing", "preplay", "player", "postplay"];
const FORBIDDEN_LEGAL_KEYS = new Set(["authorized", "illegal", "lawful", "legal", "legitimate"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEnum(value, allowed, path) {
  assert(allowed.has(value), `${path} has unsupported value: ${String(value)}`);
}

function findForbiddenLegalKey(value, path = "source") {
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

function validateDate(value, path) {
  assert(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value), `${path} must be YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00Z`);
  assert(!Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value, `${path} must be a real date`);
}

function validateSource(source, index) {
  const path = `sources[${index}]`;
  assert(source && typeof source === "object" && !Array.isArray(source), `${path} must be an object`);
  assert(!findForbiddenLegalKey(source, path), `${path} must not contain legal-status fields`);

  assert(typeof source.id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.id), `${path}.id is invalid`);
  assert(typeof source.name === "string" && source.name.trim().length > 0, `${path}.name is required`);

  let url;
  try {
    url = new URL(source.baseUrl);
  } catch {
    throw new Error(`${path}.baseUrl must be a valid URL`);
  }
  assert(url.protocol === "https:", `${path}.baseUrl must use HTTPS`);

  assertEnum(source.provenance, PROVENANCE, `${path}.provenance`);
  if (source.provenance === "verified_official") {
    assert(typeof source.provenanceEvidenceUrl === "string", `${path}.provenanceEvidenceUrl is required for verified_official`);
    let evidenceUrl;
    try {
      evidenceUrl = new URL(source.provenanceEvidenceUrl);
    } catch {
      throw new Error(`${path}.provenanceEvidenceUrl must be a valid URL`);
    }
    assert(evidenceUrl.protocol === "https:", `${path}.provenanceEvidenceUrl must use HTTPS`);
  }

  assert(Array.isArray(source.formats) && source.formats.length > 0, `${path}.formats must not be empty`);
  for (const format of source.formats) assertEnum(format, FORMATS, `${path}.formats`);
  assert(new Set(source.formats).size === source.formats.length, `${path}.formats must be unique`);

  assertEnum(source.access, ACCESS, `${path}.access`);
  assert(Array.isArray(source.discovery) && source.discovery.length > 0, `${path}.discovery must not be empty`);
  for (const method of source.discovery) assertEnum(method, DISCOVERY, `${path}.discovery`);
  if (source.discovery.includes("youtube_channel")) {
    assert(url.hostname === "www.youtube.com" || url.hostname === "youtube.com", `${path}.baseUrl must be a YouTube URL`);
    if (Object.hasOwn(source, "channelHandle")) {
      assert(typeof source.channelHandle === "string" && /^@[A-Za-z0-9._-]+$/.test(source.channelHandle), `${path}.channelHandle is invalid`);
    }
    if (Object.hasOwn(source, "channelId")) {
      assert(/^UC[A-Za-z0-9_-]{22}$/.test(source.channelId), `${path}.channelId is invalid`);
      assert(typeof source.channelIdentityEvidenceUrl === "string", `${path}.channelIdentityEvidenceUrl is required with channelId`);
      let identityUrl;
      try {
        identityUrl = new URL(source.channelIdentityEvidenceUrl);
      } catch {
        throw new Error(`${path}.channelIdentityEvidenceUrl must be a valid URL`);
      }
      assert(identityUrl.protocol === "https:", `${path}.channelIdentityEvidenceUrl must use HTTPS`);
      assert(identityUrl.hostname === "www.youtube.com" || identityUrl.hostname === "youtube.com", `${path}.channelIdentityEvidenceUrl must be a YouTube URL`);
      assert(identityUrl.pathname === `/channel/${source.channelId}`, `${path}.channelIdentityEvidenceUrl must match channelId`);
    }
  }

  assert(Array.isArray(source.regions) && source.regions.length > 0, `${path}.regions must not be empty`);
  const regionCodes = new Set();
  for (let regionIndex = 0; regionIndex < source.regions.length; regionIndex += 1) {
    const region = source.regions[regionIndex];
    const regionPath = `${path}.regions[${regionIndex}]`;
    assert(typeof region.code === "string" && /^(?:[A-Z]{2}|GLOBAL)$/.test(region.code), `${regionPath}.code is invalid`);
    assert(!regionCodes.has(region.code), `${path}.regions contains duplicate ${region.code}`);
    regionCodes.add(region.code);
    assertEnum(region.status, REGION_STATUS, `${regionPath}.status`);
    validateDate(region.checkedAt, `${regionPath}.checkedAt`);
  }

  assert(source.spoilerBaseline && typeof source.spoilerBaseline === "object", `${path}.spoilerBaseline is required`);
  for (const surface of SPOILER_SURFACES) {
    assertEnum(source.spoilerBaseline[surface], SPOILER_STATUS, `${path}.spoilerBaseline.${surface}`);
  }
  assert(Object.keys(source.spoilerBaseline).length === SPOILER_SURFACES.length, `${path}.spoilerBaseline has unexpected fields`);

  assert(source.requiresItemScan === true, `${path}.requiresItemScan must be true; provider evidence never replaces item scanning`);
  assertEnum(source.stage, STAGES, `${path}.stage`);
  if (source.stage === "surface") {
    assert(source.access !== "paid" && source.access !== "unknown", `${path} cannot surface with ${source.access} access`);
    assert(source.regions.some((region) => region.status === "playback_observed"), `${path} needs observed playback before surfacing`);
  }

  return source;
}

export function validateSourceRegistry(sources) {
  assert(Array.isArray(sources), "source registry must be an array");
  assert(sources.length > 0, "source registry must not be empty");

  const ids = new Set();
  for (let index = 0; index < sources.length; index += 1) {
    const source = validateSource(sources[index], index);
    assert(!ids.has(source.id), `source id must be unique: ${source.id}`);
    ids.add(source.id);
  }

  assert(sources.some((source) => source.provenance === "community_unverified"), "broad exploration must retain community/unverified sources");
  assert(sources.some((source) => source.formats.includes("full")), "registry must include Full sources");
  assert(sources.some((source) => source.formats.includes("mini")), "registry must include Mini sources");
  assert(sources.some((source) => source.formats.includes("extended")), "registry must include Extended sources");
  assert(sources.some((source) => source.formats.includes("short")), "registry must include Short sources");

  return sources;
}
