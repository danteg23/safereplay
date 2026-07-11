import { surfaceableItems, validateItemCandidateRegistry } from "./item-registry.mjs";
import { validateSourceRegistry } from "./source-registry.mjs";

const PUBLIC_FORMATS = new Set(["extended", "full", "halves", "mini", "short"]);
const RISK_WEIGHT = new Map([
  ["comments", 3],
  ["recommendations", 3],
  ["spoiler_thumbnail", 4],
  ["surrounding_page", 3],
  ["youtube_player_metadata", 2],
]);

function destinationRiskScore(item) {
  return item.destinationRisks.reduce((total, risk) => total + (RISK_WEIGHT.get(risk) ?? 1), 0);
}

function sourceTieBreak(source) {
  if (source.discovery.includes("youtube_channel")) return 0;
  if (source.provenance === "verified_official") return 1;
  if (source.provenance === "aggregator") return 2;
  return 3;
}

function compareItems(left, right, sourceById) {
  const leftVector = [
    destinationRiskScore(left),
    left.access === "free" ? 0 : 1,
    sourceTieBreak(sourceById.get(left.sourceId)),
    left.destinationRisks.length,
    left.id,
  ];
  const rightVector = [
    destinationRiskScore(right),
    right.access === "free" ? 0 : 1,
    sourceTieBreak(sourceById.get(right.sourceId)),
    right.destinationRisks.length,
    right.id,
  ];
  for (let index = 0; index < leftVector.length; index += 1) {
    if (leftVector[index] < rightVector[index]) return -1;
    if (leftVector[index] > rightVector[index]) return 1;
  }
  return 0;
}

function riskPresentation(item) {
  if (item.destinationRisks.includes("comments") || item.destinationRisks.includes("recommendations")) {
    return { riskLabel: "Comments or recommendations may spoil", riskTone: "caution" };
  }
  if (item.destinationRisks.length > 0) {
    return { riskLabel: "Destination checked with warnings", riskTone: "caution" };
  }
  return { riskLabel: "Playback checked", riskTone: "checked" };
}

export function buildSurfaceProjection(items, sources, { fixtureIds = null } = {}) {
  validateSourceRegistry(sources);
  validateItemCandidateRegistry(items, sources);
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const allowedFixtures = fixtureIds ? new Set(fixtureIds) : null;
  const eligible = surfaceableItems(items)
    .filter((item) => !allowedFixtures || allowedFixtures.has(item.fixtureId))
    .sort((left, right) => compareItems(left, right, sourceById));

  const recordsByFixture = {};
  const destinations = {};
  for (const item of eligible) {
    const source = sourceById.get(item.sourceId);
    const risk = riskPresentation(item);
    destinations[item.id] = item.itemUrl;
    const formats = [...new Set(item.formats.filter((format) => PUBLIC_FORMATS.has(format)))];
    for (const format of formats) {
      const entry = {
        sourceId: item.sourceId,
        publicRecord: {
          accessLabel: item.access === "free" ? "Free" : "Free account",
          evidenceStatus: "item_observed",
          format,
          id: `${item.id}-${format}`,
          providerName: source.name,
          provenance: item.provenance,
          redirectPath: `/go/${item.id}`,
          ...risk,
        },
      };
      (recordsByFixture[item.fixtureId] ??= []).push(entry);
    }
  }

  return { destinations, recordsByFixture };
}

export function mergeSurfaceRecords(fixtureIds, staticSourcesByFixture, projection) {
  return Object.fromEntries(fixtureIds.map((fixtureId) => {
    const projected = projection.recordsByFixture[fixtureId] ?? [];
    const exactProviders = new Set(projected.map(({ publicRecord }) =>
      `${publicRecord.providerName}\u0000${publicRecord.format}`));
    const staticRecords = (staticSourcesByFixture[fixtureId] ?? []).filter((record) =>
      !exactProviders.has(`${record.providerName}\u0000${record.format}`));
    return [fixtureId, [...projected.map(({ publicRecord }) => publicRecord), ...staticRecords]];
  }));
}

export function mergeProviderDestinations(staticDestinations, projectedDestinations) {
  for (const id of Object.keys(projectedDestinations)) {
    if (Object.hasOwn(staticDestinations, id)) {
      throw new Error(`surface destination collides with static destination: ${id}`);
    }
  }
  return { ...staticDestinations, ...projectedDestinations };
}
