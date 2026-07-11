const CANDIDATE_FIELDS = Object.freeze([
  "access",
  "fixtureId",
  "formats",
  "provenance",
  "sourceId",
  "stage",
]);

export function buildNeutralYouTubeReport({ candidates, failures }, { checkedAt, region }) {
  if (!Array.isArray(candidates) || !Array.isArray(failures)) throw new TypeError("discovery result is invalid");
  return {
    candidates: candidates.map((candidate) => {
      const neutral = {};
      for (const field of CANDIDATE_FIELDS) neutral[field] = candidate[field];
      neutral.metadataDecision = candidate.metadata?.scanDecision ?? "unknown";
      neutral.playbackStatus = candidate.playback?.status ?? "unknown";
      neutral.thumbnailState = candidate.metadata?.thumbnailState ?? "unknown";
      return neutral;
    }),
    checkedAt,
    failures: failures.map(({ code, sourceId }) => ({ code, sourceId })),
    region,
  };
}
