const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "youtu.be"]);

function isNeutralCandidate(item, source) {
  if (!item || !source || item.stage !== "candidate") return false;
  if (item.metadata?.scanDecision === "block_auto_surface") return false;
  if (item.sourceId !== source.id || !source.discovery?.includes("youtube_channel")) return false;
  if (item.provenance !== source.provenance) return false;
  if (!Array.isArray(item.teams) || item.teams.length !== 2) return false;
  if (!Array.isArray(item.formats) || item.formats.length === 0) return false;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(item.id ?? "")) return false;
  try {
    return YOUTUBE_HOSTS.has(new URL(item.itemUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function videoIdFromItemUrl(value) {
  try {
    const url = new URL(value);
    if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;
    const videoId = url.hostname.toLowerCase() === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : url.searchParams.get("v");
    return /^[A-Za-z0-9_-]{11}$/u.test(videoId ?? "") ? videoId : null;
  } catch {
    return null;
  }
}

function isPlaybackProbeCandidate(item, source) {
  if (!item || !source || !["blocked", "candidate"].includes(item.stage)) return false;
  if (item.sourceId !== source.id || !source.discovery?.includes("youtube_channel")) return false;
  if (item.provenance !== source.provenance) return false;
  if (!Array.isArray(item.teams) || item.teams.length !== 2) return false;
  if (!Array.isArray(item.formats) || item.formats.length === 0) return false;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(item.id ?? "")) return false;
  return videoIdFromItemUrl(item.itemUrl) !== null;
}

export function buildYouTubeProofRecords(items, sources) {
  if (!Array.isArray(items) || !Array.isArray(sources)) throw new TypeError("proof registries must be arrays");
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  return items.flatMap((item) => {
    const source = sourceById.get(item.sourceId);
    if (!isNeutralCandidate(item, source)) return [];
    return [{
      destination: item.itemUrl,
      publicRecord: {
        access: item.access,
        competition: item.competition,
        fixtureId: item.fixtureId,
        formats: [...item.formats],
        id: item.id,
        metadataDecision: item.metadata.scanDecision,
        playbackStatus: item.playback?.status ?? "unknown",
        provenance: item.provenance,
        providerName: source.name,
        redirectPath: `/go/youtube-proof/${item.id}`,
        sourceId: item.sourceId,
        teams: [...item.teams],
        thumbnailState: item.metadata.thumbnailState,
      },
    }];
  });
}

export function buildYouTubePlaybackProbeRecords(items, sources) {
  if (!Array.isArray(items) || !Array.isArray(sources)) throw new TypeError("probe registries must be arrays");
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  return items.flatMap((item) => {
    const source = sourceById.get(item.sourceId);
    if (!isPlaybackProbeCandidate(item, source)) return [];
    return [{
      publicRecord: {
        access: item.access,
        competition: item.competition,
        formats: [...item.formats],
        id: item.id,
        metadataDecision: item.metadata?.scanDecision ?? "unknown",
        playbackStatus: item.playback?.status ?? "unknown",
        provenance: item.provenance,
        providerName: source.name,
        sourceId: item.sourceId,
        teams: [...item.teams],
        thumbnailState: item.metadata?.thumbnailState ?? "unknown",
      },
      videoId: videoIdFromItemUrl(item.itemUrl),
    }];
  });
}
