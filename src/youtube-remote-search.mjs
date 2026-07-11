import { buildYouTubeItemCandidatesFromEntries } from "./youtube-feed.mjs";

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/u;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/u;

export function formatAwareFixtureQuery(fixture) {
  if (!fixture || !Array.isArray(fixture.teams) || fixture.teams.length !== 2) {
    throw new TypeError("fixture must contain exactly two teams");
  }
  const teams = fixture.teams.join(" ");
  return `${teams} highlights|${teams} full match`;
}

export function preferredChannelFixtureQuery(fixture, source) {
  if (!fixture || !Array.isArray(fixture.teams) || fixture.teams.length !== 2) {
    throw new TypeError("fixture must contain exactly two teams");
  }
  if (!source || typeof source.name !== "string" || !source.name.trim()) {
    throw new TypeError("preferred source must have a name");
  }
  return `${fixture.teams.join(" ")} ${source.name} highlights`;
}

function safeThumbnailUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.hostname !== "i.ytimg.com" && !url.hostname.endsWith(".ytimg.com")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeRemoteYouTubeSearchResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("remote YouTube search response is invalid");
  }
  if (!Array.isArray(value.results)) throw new TypeError("remote YouTube search results are invalid");

  const results = value.results.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    if (!CHANNEL_ID.test(item.channel_id ?? "") || !VIDEO_ID.test(item.video_id ?? "")) return [];
    if (typeof item.title !== "string" || !item.title.trim()) return [];
    if (typeof item.published_at !== "string" || Number.isNaN(new Date(item.published_at).valueOf())) return [];
    const thumbnailUrl = safeThumbnailUrl(item.thumbnail);
    return [{
      channelId: item.channel_id,
      description: typeof item.description === "string" ? item.description : "",
      itemUrl: `https://www.youtube.com/watch?v=${item.video_id}`,
      published: item.published_at,
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
      title: item.title,
      videoId: item.video_id,
    }];
  });

  return { results };
}

export async function discoverRemoteYouTubeCandidates({
  aliases = {},
  checkedAt,
  fixtures,
  maxResults = 25,
  region,
  searchImpl,
  sources,
}) {
  if (typeof searchImpl !== "function") throw new TypeError("remote YouTube search implementation is required");
  if (!Array.isArray(fixtures) || !Array.isArray(sources)) throw new TypeError("fixtures and sources must be arrays");
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 50) {
    throw new TypeError("maxResults must be between 1 and 50");
  }
  if (!/^[A-Z]{2}$/u.test(region ?? "")) throw new TypeError("region must be a two-letter code");

  const sourceByChannelId = new Map(sources
    .filter((source) => source.discovery?.includes("youtube_channel") && CHANNEL_ID.test(source.channelId ?? ""))
    .map((source) => [source.channelId, source]));
  const candidatesById = new Map();
  const failures = [];

  for (const fixture of fixtures) {
    const publishedAfter = new Date(new Date(fixture.kickoffUtc).valueOf() - (48 * 60 * 60 * 1_000)).toISOString();
    const entriesBySource = new Map();
    const preferredSources = [...sourceByChannelId.values()]
      .filter((source) => source.id === "tv2-sport-youtube");
    const searches = [
      { query: formatAwareFixtureQuery(fixture), region },
      ...preferredSources.map((source) => ({
        preferredSourceId: source.id,
        query: preferredChannelFixtureQuery(fixture, source),
        region: "NO",
        relevanceLanguage: "no",
      })),
    ];

    for (const search of searches) {
      let response;
      try {
        response = sanitizeRemoteYouTubeSearchResponse(await searchImpl({
          maxResults,
          publishedAfter,
          query: search.query,
          region: search.region,
          ...(search.relevanceLanguage ? { relevanceLanguage: search.relevanceLanguage } : {}),
          safeSearch: "moderate",
          topicId: "/m/02vx4",
        }));
      } catch (error) {
        if (error?.name === "RemoteYouTubeRouteMissingError") throw error;
        failures.push({ code: "remote_search_unavailable", sourceId: search.preferredSourceId ?? fixture.id });
        continue;
      }

      for (const entry of response.results) {
        const source = sourceByChannelId.get(entry.channelId);
        if (!source || (search.preferredSourceId && source.id !== search.preferredSourceId)) continue;
        const entries = entriesBySource.get(source.id) ?? [];
        if (!entries.some((candidate) => candidate.videoId === entry.videoId)) entries.push(entry);
        entriesBySource.set(source.id, entries);
      }
    }
    for (const source of sourceByChannelId.values()) {
      const entries = entriesBySource.get(source.id) ?? [];
      for (const candidate of buildYouTubeItemCandidatesFromEntries({
        aliases,
        checkedAt,
        entries,
        fixture,
        region,
        source,
      })) candidatesById.set(candidate.id, candidate);
    }
  }

  return { candidates: [...candidatesById.values()], failures };
}
