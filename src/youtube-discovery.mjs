import { buildYouTubeItemCandidates } from "./youtube-feed.mjs";

export function youtubeFeedUrl(channelId) {
  if (!/^UC[A-Za-z0-9_-]{22}$/u.test(channelId ?? "")) throw new TypeError("channelId is invalid");
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

export async function discoverYouTubeCandidates({
  aliases = {},
  checkedAt,
  fetchImpl = globalThis.fetch,
  fixtures,
  region,
  sources,
  timeoutMs = 8_000,
}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetch implementation is required");
  if (!Array.isArray(fixtures) || !Array.isArray(sources)) throw new TypeError("fixtures and sources must be arrays");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new TypeError("timeoutMs must be a positive integer");

  const feedSources = sources.filter((source) =>
    source.discovery?.includes("youtube_channel") && typeof source.channelId === "string",
  );
  const sourceResults = await Promise.all(feedSources.map(async (source) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(youtubeFeedUrl(source.channelId), {
        headers: { accept: "application/atom+xml, application/xml;q=0.9" },
        signal: controller.signal,
      });
      if (!response?.ok) throw new Error(`feed_http_${response?.status ?? "unknown"}`);
      const xml = await response.text();
      const candidates = [];
      for (const fixture of fixtures) {
        candidates.push(...buildYouTubeItemCandidates({ aliases, checkedAt, fixture, region, source, xml }));
      }
      return { candidates, failure: null };
    } catch (error) {
      return { candidates: [], failure: {
        code: error instanceof Error && /^feed_http_/u.test(error.message) ? error.message : "feed_invalid_or_unavailable",
        sourceId: source.id,
      } };
    } finally {
      clearTimeout(timeout);
    }
  }));

  const candidatesById = new Map();
  const failures = [];
  for (const result of sourceResults) {
    for (const candidate of result.candidates) candidatesById.set(candidate.id, candidate);
    if (result.failure) failures.push(result.failure);
  }

  return { candidates: [...candidatesById.values()], failures };
}
