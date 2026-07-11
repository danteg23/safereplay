import { scanSourceMetadata } from "./spoiler-scan.mjs";
import { validateTeamAliases } from "./team-aliases.mjs";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const FEED_CHANNEL_ID = /^[A-Za-z0-9_-]{22}$/;

function canonicalChannelId(value) {
  if (CHANNEL_ID.test(value ?? "")) return value;
  if (FEED_CHANNEL_ID.test(value ?? "")) return `UC${value}`;
  return null;
}

function decodeXml(value) {
  return value
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/u, "$1")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replace(/&#(\d+);/gu, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/giu, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function tagText(block, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = block.match(new RegExp(`<${escapedName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedName}>`, "iu"));
  return match ? decodeXml(match[1].trim()) : null;
}

function normalize(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function titleHasTeam(title, team, aliases) {
  const normalizedTitle = ` ${normalize(title)} `;
  return [team, ...(aliases[team] ?? [])]
    .map(normalize)
    .some((candidate) => candidate && normalizedTitle.includes(` ${candidate} `));
}

export function isYouTubeEntryCompatibleWithFixture(entry, fixture) {
  const kickoff = new Date(fixture?.kickoffUtc).valueOf();
  const reference = new Date(entry?.scheduledStartTime ?? entry?.published).valueOf();
  if (Number.isNaN(kickoff) || Number.isNaN(reference)) return false;
  const earliest = kickoff - (48 * 60 * 60 * 1_000);
  const latest = kickoff + (14 * 24 * 60 * 60 * 1_000);
  if (reference < earliest || reference > latest) return false;

  const fixtureYear = new Date(fixture.kickoffUtc).getUTCFullYear();
  const allowedYears = new Set([fixtureYear - 1, fixtureYear, fixtureYear + 1]);
  const explicitYears = [...String(entry.title ?? "").matchAll(/\b(?:19|20)\d{2}\b/gu)]
    .map((match) => Number(match[0]));
  if (explicitYears.some((year) => !allowedYears.has(year))) return false;

  if (fixture.scope === "senior_men") {
    const normalizedTitle = normalize(entry.title ?? "");
    if (/\b(?:women|womens|female|girls|youth|academy|under\s*\d{2}|u\s*\d{2})\b/u.test(normalizedTitle)) {
      return false;
    }
  }
  return true;
}

export function detectYouTubeFormat(title, durationSeconds = null) {
  const normalized = normalize(title);
  const hasDuration = Number.isInteger(durationSeconds) && durationSeconds >= 0;
  if (/\b(?:first half|second half|1st half|2nd half|half 1|half 2)\b/u.test(normalized)) {
    return !hasDuration || (durationSeconds >= 1_800 && durationSeconds <= 4_500) ? "halves" : null;
  }
  if (/\b(?:mini match|condensed match|30 minute recap)\b/u.test(normalized)) {
    return !hasDuration || (durationSeconds >= 900 && durationSeconds <= 3_600) ? "mini" : null;
  }
  if (/\b(?:extended highlights|extended highlight|extended cut|long highlights)\b/u.test(normalized)) {
    return !hasDuration || (durationSeconds >= 300 && durationSeconds <= 2_700) ? "extended" : null;
  }
  if (/\b(?:full match|full replay|full 90|match replay)\b/u.test(normalized) && !/\bhighlights?\b/u.test(normalized)) {
    return !hasDuration || durationSeconds >= 3_600 ? "full" : null;
  }
  if (/\b(?:highlights|highlight package|match highlights)\b/u.test(normalized)) {
    if (!hasDuration || durationSeconds < 480) return "short";
    if (durationSeconds < 1_200) return "extended";
    if (durationSeconds <= 2_700) return "mini";
    return null;
  }
  if (hasDuration) {
    if (durationSeconds >= 3_600) return "full";
    if (durationSeconds >= 1_200 && durationSeconds <= 2_700) return "mini";
    if (durationSeconds >= 480) return "extended";
    if (durationSeconds >= 120) return "short";
  }
  return null;
}

export function parseYouTubeFeed(xml, source) {
  if (typeof xml !== "string" || !xml.includes("<feed")) throw new TypeError("YouTube feed must be Atom XML");
  if (!source || typeof source !== "object") throw new TypeError("YouTube source is required");
  if (!CHANNEL_ID.test(source.channelId ?? "")) throw new Error("YouTube source needs a stable channelId before feed ingestion");

  const entryBlocks = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/giu)].map((match) => match[0]);
  const header = xml.replace(/<entry\b[\s\S]*?<\/entry>/giu, "");
  const feedChannelId = canonicalChannelId(tagText(header, "yt:channelId"));
  if (feedChannelId !== source.channelId) throw new Error("YouTube feed channel does not match source registry");

  return entryBlocks.map((entry, index) => {
    const videoId = tagText(entry, "yt:videoId");
    const channelId = canonicalChannelId(tagText(entry, "yt:channelId"));
    const title = tagText(entry, "title");
    const description = tagText(entry, "media:description");
    const published = tagText(entry, "published");
    if (!VIDEO_ID.test(videoId ?? "")) throw new Error(`YouTube feed entry ${index} has an invalid videoId`);
    if (channelId !== source.channelId) throw new Error(`YouTube feed entry ${index} changed channel identity`);
    if (!title || !published || Number.isNaN(new Date(published).valueOf())) {
      throw new Error(`YouTube feed entry ${index} is missing neutral identity fields`);
    }
    return {
      channelId,
      description,
      itemUrl: `https://www.youtube.com/watch?v=${videoId}`,
      published,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      title,
      videoId,
    };
  });
}

export function buildYouTubeItemCandidates({
  aliases = {},
  checkedAt,
  fixture,
  region,
  source,
  xml,
}) {
  if (!fixture || !Array.isArray(fixture.teams) || fixture.teams.length !== 2) {
    throw new TypeError("fixture must contain exactly two teams");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(checkedAt ?? "")) throw new TypeError("checkedAt must be YYYY-MM-DD");
  if (!/^[A-Z]{2}$/u.test(region ?? "")) throw new TypeError("region must be a two-letter code");
  validateTeamAliases(aliases);

  return buildYouTubeItemCandidatesFromEntries({
    aliases,
    checkedAt,
    entries: parseYouTubeFeed(xml, source),
    fixture,
    region,
    source,
  });
}

export function buildYouTubeItemCandidatesFromEntries({
  aliases = {},
  checkedAt,
  entries,
  fixture,
  region,
  source,
}) {
  if (!fixture || !Array.isArray(fixture.teams) || fixture.teams.length !== 2) {
    throw new TypeError("fixture must contain exactly two teams");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(checkedAt ?? "")) throw new TypeError("checkedAt must be YYYY-MM-DD");
  if (!/^[A-Z]{2}$/u.test(region ?? "")) throw new TypeError("region must be a two-letter code");
  if (!Array.isArray(entries)) throw new TypeError("YouTube entries must be an array");
  validateTeamAliases(aliases);

  return entries.flatMap((entry) => {
    if (!isYouTubeEntryCompatibleWithFixture(entry, fixture)) return [];
    if (!fixture.teams.every((team) => titleHasTeam(entry.title, team, aliases))) return [];
    const format = detectYouTubeFormat(entry.title, entry.durationSeconds);
    if (!format || !source.formats.includes(format)) return [];

    const scan = scanSourceMetadata({
      title: entry.title,
      description: entry.description,
      thumbnailText: null,
    });
    const regionBlocked = entry.declaredRegionStatus === "blocked";
    const destinationRisks = ["comments", "recommendations", "thumbnail_unscanned", "youtube_player_metadata"];
    if (regionBlocked) destinationRisks.push("api_region_blocked");
    return [{
      access: source.access,
      competition: fixture.competition,
      destinationRisks,
      fixtureId: fixture.id,
      formats: [format],
      id: `${fixture.id}-${source.id}-${entry.videoId}`.toLocaleLowerCase("en").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, ""),
      itemUrl: entry.itemUrl,
      kickoffUtc: fixture.kickoffUtc,
      metadata: {
        checkedAt,
        descriptionObserved: entry.description,
        scanDecision: scan.decision,
        thumbnailState: "unscanned",
        ...(entry.thumbnailUrl ? { thumbnailUrlObserved: entry.thumbnailUrl } : {}),
        titleObserved: entry.title,
      },
      playback: { checkedAt, region, status: "links_unverified" },
      provenance: source.provenance,
      sourceId: source.id,
      stage: scan.decision === "block_auto_surface" || regionBlocked ? "blocked" : "candidate",
      teams: [...fixture.teams],
    }];
  });
}
