import { buildYouTubeItemCandidatesFromEntries } from "./youtube-feed.mjs";

const API_ORIGIN = "https://www.googleapis.com";
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/u;
const PLAYLIST_ID = /^UU[A-Za-z0-9_-]{22}$/u;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/u;

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function apiJson(path, parameters, { apiKey, fetchImpl, timeoutMs }) {
  const url = new URL(`/youtube/v3/${path}`, API_ORIGIN);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, String(value));
  url.searchParams.set("key", apiKey);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url.toString(), {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response?.ok) throw new Error("api_request_failed");
    const value = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("api_response_invalid");
    return value;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseYouTubeDurationSeconds(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/u);
  if (!match || match.slice(1).every((part) => part === undefined)) return null;
  const [days, hours, minutes, seconds] = match.slice(1).map((part) => Number(part ?? 0));
  return (((days * 24) + hours) * 60 + minutes) * 60 + seconds;
}

export function declaredYouTubeRegionStatus(regionRestriction, region) {
  if (!regionRestriction || typeof regionRestriction !== "object") return "unknown";
  if (Array.isArray(regionRestriction.allowed)) {
    return regionRestriction.allowed.includes(region) ? "available" : "blocked";
  }
  if (Array.isArray(regionRestriction.blocked)) {
    return regionRestriction.blocked.includes(region) ? "blocked" : "available";
  }
  return "unknown";
}

function thumbnailUrl(thumbnails) {
  if (!thumbnails || typeof thumbnails !== "object") return null;
  for (const key of ["maxres", "standard", "high", "medium", "default"]) {
    const candidate = thumbnails[key]?.url;
    if (typeof candidate !== "string") continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" && (url.hostname === "i.ytimg.com" || url.hostname.endsWith(".ytimg.com"))) {
        return url.toString();
      }
    } catch {
      // Ignore malformed or unrelated thumbnail destinations.
    }
  }
  return null;
}

export async function discoverYouTubeDataApiCandidates({
  aliases = {},
  apiKey,
  checkedAt,
  fetchImpl = globalThis.fetch,
  fixtures,
  region,
  sources,
  timeoutMs = 8_000,
}) {
  if (typeof apiKey !== "string" || apiKey.trim().length < 8) throw new TypeError("YouTube API key is required");
  if (typeof fetchImpl !== "function") throw new TypeError("fetch implementation is required");
  if (!Array.isArray(fixtures) || !Array.isArray(sources)) throw new TypeError("fixtures and sources must be arrays");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new TypeError("timeoutMs must be a positive integer");

  const feedSources = sources.filter((source) =>
    source.discovery?.includes("youtube_channel") && CHANNEL_ID.test(source.channelId ?? ""));
  const sourceByChannelId = new Map(feedSources.map((source) => [source.channelId, source]));
  const failuresBySource = new Map();
  const fail = (sourceId, code) => {
    if (!failuresBySource.has(sourceId)) failuresBySource.set(sourceId, { code, sourceId });
  };

  const uploadsByChannelId = new Map();
  for (const channelBatch of chunks(feedSources, 50)) {
    try {
      const response = await apiJson("channels", {
        fields: "items(id,contentDetails/relatedPlaylists/uploads)",
        id: channelBatch.map((source) => source.channelId).join(","),
        part: "contentDetails",
      }, { apiKey, fetchImpl, timeoutMs });
      const returned = new Set();
      for (const item of Array.isArray(response.items) ? response.items : []) {
        if (!CHANNEL_ID.test(item?.id ?? "") || !sourceByChannelId.has(item.id)) continue;
        returned.add(item.id);
        const uploads = item.contentDetails?.relatedPlaylists?.uploads;
        if (PLAYLIST_ID.test(uploads ?? "")) uploadsByChannelId.set(item.id, uploads);
        else fail(sourceByChannelId.get(item.id).id, "api_uploads_missing");
      }
      for (const source of channelBatch) {
        if (!returned.has(source.channelId)) fail(source.id, "api_channel_missing");
      }
    } catch {
      for (const source of channelBatch) fail(source.id, "api_channels_unavailable");
    }
  }

  const videoOwner = new Map();
  await Promise.all(feedSources.map(async (source) => {
    const playlistId = uploadsByChannelId.get(source.channelId);
    if (!playlistId) return;
    try {
      const response = await apiJson("playlistItems", {
        fields: "items(contentDetails/videoId)",
        maxResults: 50,
        part: "contentDetails",
        playlistId,
      }, { apiKey, fetchImpl, timeoutMs });
      for (const item of Array.isArray(response.items) ? response.items : []) {
        const videoId = item?.contentDetails?.videoId;
        if (VIDEO_ID.test(videoId ?? "")) videoOwner.set(videoId, source);
      }
    } catch {
      fail(source.id, "api_playlist_unavailable");
    }
  }));

  const entriesBySource = new Map(feedSources.map((source) => [source.id, []]));
  const returnedVideoIds = new Set();
  for (const videoBatch of chunks([...videoOwner.keys()], 50)) {
    try {
      const response = await apiJson("videos", {
        fields: "items(id,snippet(channelId,title,description,publishedAt,thumbnails),contentDetails(duration,caption,regionRestriction),liveStreamingDetails(scheduledStartTime),status(privacyStatus,embeddable))",
        id: videoBatch.join(","),
        part: "snippet,contentDetails,liveStreamingDetails,status",
      }, { apiKey, fetchImpl, timeoutMs });
      for (const item of Array.isArray(response.items) ? response.items : []) {
        if (!VIDEO_ID.test(item?.id ?? "") || !videoOwner.has(item.id)) continue;
        returnedVideoIds.add(item.id);
        const source = videoOwner.get(item.id);
        if (item.snippet?.channelId !== source.channelId) {
          fail(source.id, "api_channel_mismatch");
          continue;
        }
        if (item.status?.privacyStatus !== "public") continue;
        const title = item.snippet?.title;
        const published = item.snippet?.publishedAt;
        if (typeof title !== "string" || !title.trim() || Number.isNaN(new Date(published).valueOf())) {
          fail(source.id, "api_video_invalid");
          continue;
        }
        entriesBySource.get(source.id).push({
          channelId: source.channelId,
          declaredRegionStatus: declaredYouTubeRegionStatus(item.contentDetails?.regionRestriction, region),
          description: typeof item.snippet.description === "string" ? item.snippet.description : "",
          durationSeconds: parseYouTubeDurationSeconds(item.contentDetails?.duration),
          itemUrl: `https://www.youtube.com/watch?v=${item.id}`,
          published,
          scheduledStartTime: typeof item.liveStreamingDetails?.scheduledStartTime === "string"
            ? item.liveStreamingDetails.scheduledStartTime
            : null,
          thumbnailUrl: thumbnailUrl(item.snippet.thumbnails),
          title,
          videoId: item.id,
        });
      }
    } catch {
      for (const videoId of videoBatch) fail(videoOwner.get(videoId).id, "api_videos_unavailable");
    }
  }
  for (const [videoId, source] of videoOwner) {
    if (!returnedVideoIds.has(videoId) && !failuresBySource.has(source.id)) fail(source.id, "api_video_missing");
  }

  const candidatesById = new Map();
  for (const source of feedSources) {
    const entries = entriesBySource.get(source.id);
    for (const fixture of fixtures) {
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

  return { candidates: [...candidatesById.values()], failures: [...failuresBySource.values()] };
}
