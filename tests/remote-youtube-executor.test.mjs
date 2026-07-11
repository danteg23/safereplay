import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  createRemoteYouTubeExecutor,
  RemoteYouTubeRouteMissingError,
} from "../scripts/remote-youtube-executor.mjs";

const parameters = {
  maxResults: 25,
  publishedAfter: "2026-07-07T20:00:00.000Z",
  query: "France Morocco",
  region: "PH",
  safeSearch: "moderate",
  topicId: "/m/02vx4",
};

function rawResponse() {
  return {
    account: "must not be cached",
    next_page_token: "must not be cached",
    query: "must not be cached",
    results: [{
      channel_id: "UCpcTrCXblq78GZrTUTLWeBw",
      channel_title: "FIFA",
      description: "Neutral tournament package.",
      published_at: "2026-07-09T22:00:00Z",
      thumbnail: "https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg",
      title: "France v Morocco | Highlights",
      url: "https://www.youtube.com/watch?v=AbCdEf12345",
      video_id: "AbCdEf12345",
    }],
  };
}

test("remote executor verifies scope and reuses a credential-free private cache", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "safereplay-remote-"));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const cacheUrl = pathToFileURL(join(directory, "youtube-search-cache.json"));
  const calls = [];
  const execFileImpl = async (_file, args) => {
    calls.push(args);
    if (args.at(-1).endsWith("scope-status")) return { stdout: "youtube.readonly: true\n" };
    return { stdout: JSON.stringify(rawResponse()) };
  };
  const executor = createRemoteYouTubeExecutor({ cacheUrl, execFileImpl, now: () => 1_000_000 });

  await executor.verify();
  const first = await executor.search(parameters);
  const second = await executor.search(parameters);
  assert.deepEqual(first, second);
  assert.equal(calls.length, 2);
  assert.deepEqual(executor.stats(), { cacheHits: 1, remoteSearches: 1 });
  assert.ok(calls[1].at(-1).includes("--safe-search"));
  assert.ok(calls[1].at(-1).includes("/m/02vx4"));

  const cacheText = await readFile(cacheUrl, "utf8");
  assert.doesNotMatch(cacheText, /must not be cached|next_page_token|account/);
  assert.match(cacheText, /France v Morocco/);
});

test("remote executor maps SSH and missing-scope failures to the exact route error", async () => {
  for (const execFileImpl of [
    async () => { throw new Error("raw ssh details"); },
    async () => ({ stdout: "youtube.readonly: false\n" }),
  ]) {
    const executor = createRemoteYouTubeExecutor({ execFileImpl });
    await assert.rejects(executor.verify(), (error) => {
      assert.ok(error instanceof RemoteYouTubeRouteMissingError);
      assert.equal(error.message, "cross-repo YouTube execution route missing");
      return true;
    });
  }
});

test("remote executor forwards a validated relevance language for preferred broadcasters", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "safereplay-remote-language-"));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const calls = [];
  const executor = createRemoteYouTubeExecutor({
    cacheUrl: pathToFileURL(join(directory, "cache.json")),
    execFileImpl: async (_file, args) => {
      calls.push(args);
      if (args.at(-1).endsWith("scope-status")) return { stdout: "youtube.readonly: true\n" };
      return { stdout: JSON.stringify(rawResponse()) };
    },
  });
  await executor.verify();
  await executor.search({ ...parameters, relevanceLanguage: "no" });
  assert.match(calls[1].at(-1), /--relevance-language.*no/);
});

test("VPS-local executor uses the authenticated binary directly without SSH", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "safereplay-local-youtube-"));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const calls = [];
  const executor = createRemoteYouTubeExecutor({
    cacheUrl: pathToFileURL(join(directory, "cache.json")),
    execFileImpl: async (file, args) => {
      calls.push({ args, file });
      if (args[0] === "scope-status") return { stdout: "youtube.readonly: true\n" };
      return { stdout: JSON.stringify(rawResponse()) };
    },
    local: true,
  });

  await executor.verify();
  await executor.search({ ...parameters, relevanceLanguage: "no" });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].file, "/home/claude/.local/bin/google-youtube");
  assert.deepEqual(calls[0].args, ["scope-status"]);
  assert.equal(calls[1].file, "/home/claude/.local/bin/google-youtube");
  assert.equal(calls[1].args[0], "--json");
  assert.ok(calls[1].args.includes("--relevance-language"));
  assert.ok(!calls[1].args.includes("ssh"));
});
