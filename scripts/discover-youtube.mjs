import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { discoverYouTubeCandidates } from "../src/youtube-discovery.mjs";
import { discoverYouTubeDataApiCandidates } from "../src/youtube-data-api.mjs";
import { discoverRemoteYouTubeCandidates } from "../src/youtube-remote-search.mjs";
import { buildNeutralYouTubeReport } from "../src/youtube-report.mjs";
import { validateTeamAliases } from "../src/team-aliases.mjs";
import { mergeFixtureSnapshots, selectDiscoveryFixtures } from "../src/fixture-snapshot-set.mjs";
import { curlJsonFetch } from "../src/curl-json-fetch.mjs";
import {
  createRemoteYouTubeExecutor,
  RemoteYouTubeRouteMissingError,
} from "./remote-youtube-executor.mjs";

function regionArgument(argv) {
  const entry = argv.find((value) => value.startsWith("--region="));
  const region = (entry?.slice("--region=".length) || "PH").toUpperCase();
  if (!/^[A-Z]{2}$/u.test(region)) throw new Error("--region must be a two-letter code such as PH or NO");
  return region;
}

function fixtureIdArguments(argv) {
  const ids = argv
    .filter((value) => value.startsWith("--fixture-id="))
    .flatMap((value) => value.slice("--fixture-id=".length).split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

async function savePrivateCandidates(candidates) {
  const privateDirectory = new URL("../.private/", import.meta.url);
  await mkdir(privateDirectory, { mode: 0o700, recursive: true });
  await writeFile(
    new URL("youtube-candidates.json", privateDirectory),
    `${JSON.stringify(candidates, null, 2)}\n`,
    { mode: 0o600 },
  );
}

export async function runYouTubeDiscovery({
  apiKey = null,
  argv = process.argv.slice(2),
  checkedAt = new Date().toISOString().slice(0, 10),
  fetchImpl = null,
  remoteExecutor = null,
  savePrivate = savePrivateCandidates,
} = {}) {
  const sources = JSON.parse(await readFile(new URL("../config/sources.json", import.meta.url), "utf8"));
  const officialSnapshot = JSON.parse(await readFile(new URL("../config/fixture-snapshot.json", import.meta.url), "utf8"));
  const feedSnapshot = JSON.parse(await readFile(new URL("../config/fixture-feed-snapshot.json", import.meta.url), "utf8"));
  const snapshot = mergeFixtureSnapshots([officialSnapshot, feedSnapshot]);
  const requestedFixtureIds = fixtureIdArguments(argv);
  const discoveryFixtures = requestedFixtureIds.length > 0
    ? snapshot.fixtures.filter((fixture) => requestedFixtureIds.includes(fixture.id))
    : selectDiscoveryFixtures(snapshot.fixtures, { checkedAt });
  if (requestedFixtureIds.length > 0 && discoveryFixtures.length !== requestedFixtureIds.length) {
    const found = new Set(discoveryFixtures.map((fixture) => fixture.id));
    const missing = requestedFixtureIds.filter((id) => !found.has(id));
    throw new Error(`unknown --fixture-id: ${missing.join(", ")}`);
  }
  const aliases = validateTeamAliases(JSON.parse(await readFile(new URL("../config/team-aliases.json", import.meta.url), "utf8")));
  const region = regionArgument(argv);
  const useRemoteSearch = argv.includes("--remote-search");
  const connector = useRemoteSearch
    ? "remote_search"
    : typeof apiKey === "string" && apiKey.trim()
      ? "youtube_data_api"
      : "atom_feed";
  const discover = connector === "remote_search"
    ? discoverRemoteYouTubeCandidates
    : connector === "youtube_data_api"
      ? discoverYouTubeDataApiCandidates
      : discoverYouTubeCandidates;
  const executor = connector === "remote_search" ? (remoteExecutor ?? createRemoteYouTubeExecutor()) : null;
  const connectorFetch = fetchImpl ?? (connector === "atom_feed"
    ? ((url, options) => curlJsonFetch(url, { ...options, timeoutMs: 8_000 }))
    : globalThis.fetch);
  if (executor) await executor.verify();
  const result = await discover({
    aliases,
    ...(connector === "youtube_data_api" ? { apiKey: apiKey.trim() } : {}),
    ...(connector === "remote_search" ? { searchImpl: executor.search } : {}),
    checkedAt,
    fetchImpl: connectorFetch,
    fixtures: discoveryFixtures,
    region,
    sources,
  });
  if (argv.includes("--save-private")) {
    await savePrivate(result.candidates);
  }
  const report = {
    ...buildNeutralYouTubeReport(result, { checkedAt, region }),
    connector,
    privateCandidatesSaved: argv.includes("--save-private") ? result.candidates.length : 0,
  };
  if (executor) report.remote = executor.stats();
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const report = await runYouTubeDiscovery({ apiKey: process.env.YOUTUBE_API_KEY ?? null });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    if (error instanceof RemoteYouTubeRouteMissingError) {
      process.stderr.write("cross-repo YouTube execution route missing\n");
    } else {
      process.stderr.write(`YouTube discovery failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
    }
    process.exitCode = 1;
  }
}
