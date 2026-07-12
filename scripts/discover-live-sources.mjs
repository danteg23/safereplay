import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  discoverProviderLinks,
  fetchLiveSourcePage,
  liveSourceProviders,
  pruneLiveDestinationSnapshot,
  validateLiveDestinationSnapshot,
} from "../src/live-source-discovery.mjs";

const root = new URL("../", import.meta.url);

async function json(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

function uniqueFixtures(snapshots) {
  const fixtures = new Map();
  for (const snapshot of snapshots) {
    for (const fixture of snapshot.fixtures ?? []) fixtures.set(fixture.id, fixture);
  }
  return [...fixtures.values()];
}

function sortedObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

export async function runLiveSourceDiscovery({
  checkedAt = new Date().toISOString(),
  fetchPage = fetchLiveSourcePage,
  save = false,
} = {}) {
  const [official, feed, aliases, previous] = await Promise.all([
    json("config/fixture-snapshot.json"),
    json("config/fixture-feed-snapshot.json"),
    json("config/team-aliases.json"),
    json("config/live-destinations.json"),
  ]);
  const fixtures = uniqueFixtures([official, feed]);
  const fixtureIds = fixtures.map(({ id }) => id);
  const currentPrevious = pruneLiveDestinationSnapshot(previous, { fixtureIds });
  const sourcesByFixture = structuredClone(currentPrevious.sourcesByFixture);
  const failures = [];
  let linksFound = 0;

  for (const provider of liveSourceProviders) {
    try {
      const html = await fetchPage(provider);
      const found = discoverProviderLinks({ aliases, fixtures, html, provider });
      linksFound += Object.keys(found).length;
      for (const [fixtureId, destination] of Object.entries(found)) {
        sourcesByFixture[fixtureId] = {
          ...(sourcesByFixture[fixtureId] ?? {}),
          [provider]: destination,
        };
      }
    } catch {
      failures.push({ code: "live_source_unavailable", provider });
    }
  }

  const currentFixtureIds = new Set(fixtureIds);
  const cleaned = {};
  for (const [fixtureId, sources] of Object.entries(sourcesByFixture)) {
    if (!currentFixtureIds.has(fixtureId)) continue;
    cleaned[fixtureId] = sortedObject(sources);
  }
  const sourcesChanged = JSON.stringify(sortedObject(previous.sourcesByFixture ?? {})) !== JSON.stringify(sortedObject(cleaned));
  const snapshot = {
    checkedAt: sourcesChanged ? checkedAt : previous.checkedAt,
    sourcesByFixture: sortedObject(cleaned),
  };
  validateLiveDestinationSnapshot(snapshot, { fixtureIds });
  if (save && sourcesChanged && failures.length < liveSourceProviders.length) {
    await writeFile(new URL("config/live-destinations.json", root), `${JSON.stringify(snapshot, null, 2)}\n`);
  }
  return {
    checkedAt,
    failures,
    linksFound,
    providersChecked: liveSourceProviders.length,
    publicSnapshotUpdated: save && sourcesChanged && failures.length < liveSourceProviders.length,
    snapshot,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const report = await runLiveSourceDiscovery({ save: process.argv.includes("--save") });
    process.stdout.write(`${JSON.stringify({
      checkedAt: report.checkedAt,
      failures: report.failures,
      linksFound: report.linksFound,
      providersChecked: report.providersChecked,
      publicSnapshotUpdated: report.publicSnapshotUpdated,
    }, null, 2)}\n`);
  } catch {
    process.stderr.write("Live source discovery failed closed without publishing provider HTML\n");
    process.exitCode = 1;
  }
}
