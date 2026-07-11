import { fileURLToPath } from "node:url";

import { runFixtureDiscovery } from "./discover-fixtures.mjs";
import { runYouTubeDiscovery } from "./discover-youtube.mjs";

function regionArgument(argv) {
  const entry = argv.find((value) => value.startsWith("--region="));
  const region = (entry?.slice("--region=".length) || "PH").toUpperCase();
  if (!/^[A-Z]{2}$/u.test(region)) throw new Error("--region must be a two-letter code such as PH or NO");
  return region;
}

function youtubeArguments(argv, region) {
  return [
    `--region=${region}`,
    "--save-private",
    ...(argv.includes("--remote-search") ? ["--remote-search"] : []),
  ];
}

export async function runDailyRefresh({
  argv = process.argv.slice(2),
  checkedAt = new Date().toISOString().slice(0, 10),
  fixtureDiscovery = runFixtureDiscovery,
  youtubeDiscovery = runYouTubeDiscovery,
} = {}) {
  const region = regionArgument(argv);
  const fixtures = await fixtureDiscovery({
    argv: ["--save-private", "--save-catalogue"],
    checkedAt,
  });
  if (!fixtures.catalogueSnapshotSaved || fixtures.failures.length > 0) {
    throw new Error("daily refresh refused an incomplete fixture snapshot");
  }

  const youtube = await youtubeDiscovery({
    apiKey: process.env.YOUTUBE_API_KEY ?? null,
    argv: youtubeArguments(argv, region),
    checkedAt,
  });

  return {
    checkedAt,
    fixtures: {
      feedsChecked: fixtures.feeds.length,
      fixturesFound: fixtures.fixtureCount,
      publicSnapshotUpdated: true,
    },
    region,
    restartRequired: true,
    youtube: {
      candidatesBlocked: youtube.candidates.filter((candidate) => candidate.stage === "blocked").length,
      candidatesFound: youtube.candidates.length,
      connector: youtube.connector,
      feedFailures: youtube.failures.length,
      privateReviewQueueUpdated: true,
      ...(youtube.remote ? {
        cacheHits: youtube.remote.cacheHits,
        remoteSearches: youtube.remote.remoteSearches,
      } : {}),
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const report = await runDailyRefresh();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch {
    process.stderr.write("Daily refresh failed closed without publishing unsafe source metadata\n");
    process.exitCode = 1;
  }
}
