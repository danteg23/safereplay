import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { discoverFixtureCandidates } from "../src/fixture-discovery.mjs";
import { curlJsonFetch } from "../src/curl-json-fetch.mjs";

function argument(argv, name) {
  const prefix = `--${name}=`;
  return argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function savePrivate(snapshot) {
  const directory = new URL("../.private/", import.meta.url);
  await mkdir(directory, { mode: 0o700, recursive: true });
  await writeFile(new URL("fixture-candidates.json", directory), `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
}

async function saveCatalogue(snapshot) {
  await writeFile(
    new URL("../config/fixture-feed-snapshot.json", import.meta.url),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    { mode: 0o644 },
  );
}

export async function runFixtureDiscovery({
  argv = process.argv.slice(2),
  checkedAt = new Date().toISOString().slice(0, 10),
  fetchImpl = curlJsonFetch,
  saveCatalogueImpl = saveCatalogue,
  savePrivateImpl = savePrivate,
} = {}) {
  const registry = JSON.parse(await readFile(new URL("../config/fixture-feeds.json", import.meta.url), "utf8"));
  const from = argument(argv, "from") ?? addDays(checkedAt, -2);
  const to = argument(argv, "to") ?? addDays(checkedAt, 90);
  const result = await discoverFixtureCandidates({ checkedAt, fetchImpl, from, registry, to });
  const catalogueRequested = argv.includes("--save-catalogue");
  if (catalogueRequested && (result.failures.length > 0 || result.snapshot.fixtures.length === 0)) {
    throw new Error("fixture catalogue promotion refused");
  }
  if (catalogueRequested) await saveCatalogueImpl(result.snapshot);
  if (argv.includes("--save-private")) await savePrivateImpl(result.snapshot);
  return {
    catalogueSnapshotSaved: catalogueRequested,
    checkedAt,
    failures: result.failures,
    feeds: result.snapshot.sources,
    fixtureCount: result.snapshot.fixtures.length,
    from,
    privateSnapshotSaved: argv.includes("--save-private"),
    to,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const report = await runFixtureDiscovery();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch {
    process.stderr.write("Fixture discovery failed without exposing raw feed data\n");
    process.exitCode = 1;
  }
}
