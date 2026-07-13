import { readFileSync } from "node:fs";

const PERMANENT_REASONS = new Set(["embed_disabled", "private", "removed", "restricted", "unavailable"]);
const PROBE_STATUSES = new Set(["available", "permanent", "transient"]);
const HEARTBEAT_INTERVAL_MS = 21 * 24 * 60 * 60 * 1000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateYouTubeAvailability(value) {
  assert(value && typeof value === "object" && !Array.isArray(value), "youtubeAvailability must be an object");
  assert(value.schemaVersion === 1, "youtubeAvailability.schemaVersion must be 1");
  assert(typeof value.lastSuccessfulSweep === "string" && !Number.isNaN(Date.parse(value.lastSuccessfulSweep)),
    "youtubeAvailability.lastSuccessfulSweep must be an ISO timestamp");
  assert(value.unavailable && typeof value.unavailable === "object" && !Array.isArray(value.unavailable),
    "youtubeAvailability.unavailable must be an object");

  const unavailable = {};
  for (const [id, entry] of Object.entries(value.unavailable)) {
    const path = `youtubeAvailability.unavailable.${id}`;
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id), `${path} has an invalid id`);
    assert(entry && typeof entry === "object" && !Array.isArray(entry), `${path} must be an object`);
    assert(Object.keys(entry).every((key) => key === "checkedAt" || key === "reason"), `${path} has an unknown field`);
    assert(PERMANENT_REASONS.has(entry.reason), `${path}.reason is invalid`);
    assert(typeof entry.checkedAt === "string" && !Number.isNaN(Date.parse(entry.checkedAt)),
      `${path}.checkedAt must be an ISO timestamp`);
    unavailable[id] = Object.freeze({ checkedAt: entry.checkedAt, reason: entry.reason });
  }
  return Object.freeze({
    lastSuccessfulSweep: value.lastSuccessfulSweep,
    schemaVersion: 1,
    unavailable: Object.freeze(unavailable),
  });
}

export function classifyYouTubeProbeFailure(stderr = "") {
  const message = String(stderr).toLowerCase();

  if (/not (?:made|available).*your country|geo(?:graphically)? restricted|copyright.*(?:country|location)/u.test(message)) {
    return { reason: "region_or_rights", status: "transient" };
  }
  if (/sign in to confirm|not a bot|http error|timed out|timeout|temporary|connection|network|429|too many requests/u.test(message)) {
    return { reason: "probe_blocked", status: "transient" };
  }
  if (/removed by the uploader|has been removed|deleted by/u.test(message)) {
    return { reason: "removed", status: "permanent" };
  }
  if (/private video|video is private|made this video private/u.test(message)) {
    return { reason: "private", status: "permanent" };
  }
  if (/embedding disabled|playback on other websites has been disabled|not allowed to be played in embedded players|blocked it from display on this website or application/u.test(message)) {
    return { reason: "embed_disabled", status: "permanent" };
  }
  if (/members[- ]only|join this channel|age.restricted|confirm your age|requires payment/u.test(message)) {
    return { reason: "restricted", status: "permanent" };
  }
  if (/video unavailable|account.*terminated|no longer available/u.test(message)) {
    return { reason: "unavailable", status: "permanent" };
  }
  return { reason: "probe_failed", status: "transient" };
}

export function refreshYouTubeAvailability({ now = new Date().toISOString(), probes, records, snapshot }) {
  const current = validateYouTubeAvailability(snapshot);
  assert(Array.isArray(records), "records must be an array");
  assert(probes instanceof Map, "probes must be a Map");
  assert(!Number.isNaN(Date.parse(now)), "now must be an ISO timestamp");

  const knownIds = new Set(records.map((record) => record.id));
  const unavailable = Object.fromEntries(Object.entries(current.unavailable)
    .filter(([id]) => knownIds.has(id))
    .map(([id, entry]) => [id, { ...entry }]));
  const counts = { available: 0, permanent: 0, transient: 0 };

  for (const record of records) {
    const probe = probes.get(record.id);
    assert(probe && PROBE_STATUSES.has(probe.status), `missing or invalid probe for ${record.id}`);
    counts[probe.status] += 1;
    if (probe.status === "available") {
      delete unavailable[record.id];
      continue;
    }
    if (probe.status === "permanent") {
      assert(PERMANENT_REASONS.has(probe.reason), `invalid permanent reason for ${record.id}`);
      if (unavailable[record.id]?.reason !== probe.reason) {
        unavailable[record.id] = { checkedAt: now, reason: probe.reason };
      }
    }
  }

  const heartbeatExpired = Date.parse(now) - Date.parse(current.lastSuccessfulSweep) >= HEARTBEAT_INTERVAL_MS;
  const next = {
    lastSuccessfulSweep: heartbeatExpired ? now : current.lastSuccessfulSweep,
    schemaVersion: 1,
    unavailable,
  };
  const changed = JSON.stringify(next) !== JSON.stringify({
    lastSuccessfulSweep: current.lastSuccessfulSweep,
    schemaVersion: current.schemaVersion,
    unavailable: Object.fromEntries(Object.entries(current.unavailable).map(([id, entry]) => [id, { ...entry }])),
  });
  return { changed, counts, snapshot: next };
}

const availabilitySnapshot = validateYouTubeAvailability(JSON.parse(
  readFileSync(new URL("../config/youtube-availability.json", import.meta.url), "utf8"),
));

export function isYouTubePlayerUnavailable(id) {
  return Object.hasOwn(availabilitySnapshot.unavailable, id);
}
