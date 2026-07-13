import { readFileSync } from "node:fs";

import { isYouTubePlayerUnavailable } from "./youtube-availability.mjs";

const PLAYER_KEYS = new Set([
  "competition",
  "durationLabel",
  "fixtureId",
  "format",
  "id",
  "providerName",
  "sourceId",
  "teams",
  "videoId",
]);
const REQUIRED_PLAYER_KEYS = new Set([...PLAYER_KEYS].filter((key) => key !== "durationLabel"));
const FORMATS = new Set(["extended", "full", "halves", "mini", "short"]);
const FORBIDDEN_KEYS = new Set(["description", "result", "score", "thumbnail", "title", "winner"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validatePlayerRecord(record, index) {
  const path = `youtubePlayerItems[${index}]`;
  assert(record && typeof record === "object" && !Array.isArray(record), `${path} must be an object`);
  for (const key of Object.keys(record)) {
    assert(!FORBIDDEN_KEYS.has(key), `${path}.${key} is forbidden`);
    assert(PLAYER_KEYS.has(key), `${path}.${key} is not allowed`);
  }
  for (const key of REQUIRED_PLAYER_KEYS) assert(Object.hasOwn(record, key), `${path}.${key} is required`);
  for (const key of ["competition", "fixtureId", "id", "providerName", "sourceId"]) {
    assert(typeof record[key] === "string" && record[key].trim(), `${path}.${key} must be text`);
  }
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(record.id), `${path}.id is invalid`);
  assert(FORMATS.has(record.format), `${path}.format is invalid`);
  assert(Array.isArray(record.teams) && record.teams.length === 2, `${path}.teams must contain two teams`);
  assert(record.teams.every((team) => typeof team === "string" && team.trim()), `${path}.teams must be text`);
  assert(/^[A-Za-z0-9_-]{11}$/u.test(record.videoId), `${path}.videoId is invalid`);
  if (record.durationLabel !== undefined) {
    assert(/^\d{1,2}:\d{2}(?::\d{2})?$/u.test(record.durationLabel), `${path}.durationLabel is invalid`);
  }
  return Object.freeze({ ...record, teams: Object.freeze([...record.teams]) });
}

export function validateYouTubePlayerItems(value) {
  assert(Array.isArray(value), "youtubePlayerItems must be an array");
  const records = value.map(validatePlayerRecord);
  assert(new Set(records.map((record) => record.id)).size === records.length, "youtubePlayerItems ids must be unique");
  return records;
}

const records = validateYouTubePlayerItems(JSON.parse(
  readFileSync(new URL("../config/youtube-player-items.json", import.meta.url), "utf8"),
));
const recordsById = new Map(records.map((record) => [record.id, record]));

export function getYouTubePlayerRecord(id) {
  const record = recordsById.get(id);
  return record && !isYouTubePlayerUnavailable(id) ? structuredClone(record) : null;
}

export function getYouTubePlayerRecords({ includeUnavailable = false } = {}) {
  return records
    .filter((record) => includeUnavailable || !isYouTubePlayerUnavailable(record.id))
    .map((record) => structuredClone(record));
}
