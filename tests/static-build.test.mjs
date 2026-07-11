import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

import { buildStaticSite } from "../scripts/build-static.mjs";
import { findForbiddenPublicKey } from "../src/public-contract.mjs";

test("static friend build preserves the spoiler boundary under a repository base path", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "safereplay-static-"));
  context.after(() => rm(directory, { force: true, recursive: true }));
  const outputUrl = pathToFileURL(`${directory}/`);
  const result = await buildStaticSite({ argv: ["--base=/safereplay/"], outputUrl });

  assert.equal(result.base, "/safereplay/");
  assert.ok(result.destinations > 20);
  assert.ok(result.players >= 10);

  const index = await readFile(new URL("index.html", outputUrl), "utf8");
  assert.match(index, /name="safereplay-base" content="\/safereplay\/"/);
  assert.match(index, /src="\/safereplay\/app\.js/);
  assert.match(index, /href="\/safereplay\/manifest\.webmanifest/);

  const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", outputUrl), "utf8"));
  assert.equal(manifest.start_url, "/safereplay/");
  assert.equal(manifest.scope, "/safereplay/");
  assert.equal(manifest.icons[0].src, "/safereplay/icon-512.png");

  const catalogue = JSON.parse(await readFile(new URL("api/catalogue.json", outputUrl), "utf8"));
  assert.equal(findForbiddenPublicKey(catalogue), null);
  assert.ok(catalogue.fixtures.some((fixture) => fixture.id === "argentina-egypt-2026-07-07"));

  const player = await readFile(new URL("watch/youtube/argentina-egypt-youtube-full/index.html", outputUrl), "utf8");
  assert.match(player, /src="\/safereplay\/youtube-proof-player\.js/);
  assert.match(player, /href="\/safereplay\/v2\.css/);
  assert.match(player, /Thumbnail and title hidden/);
  assert.doesNotMatch(player, /<iframe|watch\?v=|titleObserved|thumbnailUrlObserved/i);

  const redirect = await readFile(new URL("go/argentina-egypt-youtube-full/index.html", outputUrl), "utf8");
  assert.match(redirect, /\/safereplay\/watch\/youtube\/argentina-egypt-youtube-full/);
});
