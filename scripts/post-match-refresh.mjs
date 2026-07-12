import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { mergeFixtureSnapshots } from "../src/fixture-snapshot-set.mjs";
import {
  discoverReplaySources,
  validateReplaySourceSnapshot,
} from "../src/replay-source-discovery.mjs";
import { runYouTubeDiscovery } from "./discover-youtube.mjs";
import { createRemoteYouTubeExecutor } from "./remote-youtube-executor.mjs";

const execFile = promisify(execFileCallback);
const REDDIT_FEED = "https://www.reddit.com/r/footballhighlights/new/.rss?limit=100";
const REPLAY_SNAPSHOT_URL = new URL("../config/replay-destinations.json", import.meta.url);
const PRIVATE_CANDIDATES_URL = new URL("../.private/youtube-candidates.json", import.meta.url);

export function selectPostMatchFixtures(fixtures, {
  now = new Date(),
  startAfterMinutes = 135,
  stopAfterHours = 12,
} = {}) {
  if (!Array.isArray(fixtures)) throw new TypeError("fixtures must be an array");
  const nowMs = new Date(now).valueOf();
  if (!Number.isFinite(nowMs)) throw new TypeError("now must be a valid date");
  const newestKickoff = nowMs - startAfterMinutes * 60_000;
  const oldestKickoff = nowMs - stopAfterHours * 60 * 60_000;
  return fixtures.filter((fixture) => {
    if (fixture.kickoffTba === true) return false;
    const kickoff = new Date(fixture.kickoffUtc).valueOf();
    return Number.isFinite(kickoff) && kickoff >= oldestKickoff && kickoff <= newestKickoff;
  });
}

export async function fetchFootballHighlightsFeed({ execFileImpl = execFile } = {}) {
  const { stdout } = await execFileImpl("curl", [
    "--fail",
    "--location",
    "--silent",
    "--show-error",
    "--max-time", "15",
    "--user-agent", "Mozilla/5.0 SafeReplay/0.1",
    REDDIT_FEED,
  ], { maxBuffer: 2 * 1_024 * 1_024, timeout: 20_000 });
  if (!stdout.includes("<feed") || stdout.length > 2 * 1_024 * 1_024) throw new Error("footballhighlights feed is invalid");
  return stdout;
}

async function readJson(url, fallback) {
  try {
    return JSON.parse(await readFile(url, "utf8"));
  } catch {
    return fallback;
  }
}

export async function mergePrivateYouTubeCandidates(candidates, {
  url = PRIVATE_CANDIDATES_URL,
} = {}) {
  const existing = await readJson(url, []);
  const merged = new Map(Array.isArray(existing) ? existing.map((item) => [item.id, item]) : []);
  for (const candidate of candidates) merged.set(candidate.id, candidate);
  await mkdir(new URL("./", url), { mode: 0o700, recursive: true });
  await writeFile(url, `${JSON.stringify([...merged.values()], null, 2)}\n`, { mode: 0o600 });
}

export async function saveReplayDiscoveries(discovered, {
  fixtureIds,
  url = REPLAY_SNAPSHOT_URL,
} = {}) {
  const existing = validateReplaySourceSnapshot(await readJson(url, {
    checkedAt: discovered.checkedAt,
    sourcesByFixture: {},
  }), { fixtureIds });
  const sourcesByFixture = {
    ...existing.sourcesByFixture,
    ...discovered.sourcesByFixture,
  };
  if (JSON.stringify(sourcesByFixture) === JSON.stringify(existing.sourcesByFixture)) return false;
  const merged = validateReplaySourceSnapshot({
    checkedAt: discovered.checkedAt,
    sourcesByFixture,
  }, { fixtureIds });
  await writeFile(url, `${JSON.stringify(merged, null, 2)}\n`);
  return true;
}

export async function runPostMatchRefresh({
  now = new Date(),
  feedFetch = fetchFootballHighlightsFeed,
  youtubeDiscovery = runYouTubeDiscovery,
  remoteExecutor = createRemoteYouTubeExecutor({ cacheTtlMs: 60 * 60_000 }),
  replaySave = saveReplayDiscoveries,
  youtubeSave = mergePrivateYouTubeCandidates,
} = {}) {
  const official = JSON.parse(await readFile(new URL("../config/fixture-snapshot.json", import.meta.url), "utf8"));
  const feeds = JSON.parse(await readFile(new URL("../config/fixture-feed-snapshot.json", import.meta.url), "utf8"));
  const snapshot = mergeFixtureSnapshots([official, feeds]);
  const fixtures = selectPostMatchFixtures(snapshot.fixtures, { now });
  if (fixtures.length === 0) return { fixturesChecked: 0, publicSnapshotUpdated: false, youtube: null };

  const checkedAt = new Date(now).toISOString();
  const discovered = discoverReplaySources({
    checkedAt,
    fixtures,
    xml: await feedFetch(),
  });
  const publicSnapshotUpdated = await replaySave(discovered, {
    fixtureIds: snapshot.fixtures.map(({ id }) => id),
  });
  const youtube = await youtubeDiscovery({
    argv: [
      "--region=PH",
      "--remote-search",
      "--save-private",
      `--fixture-id=${fixtures.map(({ id }) => id).join(",")}`,
    ],
    checkedAt: checkedAt.slice(0, 10),
    remoteExecutor,
    savePrivate: youtubeSave,
  });

  return {
    fixturesChecked: fixtures.length,
    publicSnapshotUpdated,
    youtube: {
      cacheHits: youtube.remote?.cacheHits ?? 0,
      candidatesFound: youtube.candidatesFound,
      remoteSearches: youtube.remote?.remoteSearches ?? 0,
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${JSON.stringify(await runPostMatchRefresh(), null, 2)}\n`);
  } catch {
    process.stderr.write("Post-match refresh failed closed without publishing unverified sources\n");
    process.exitCode = 1;
  }
}
