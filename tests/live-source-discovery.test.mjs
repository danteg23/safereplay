import assert from "node:assert/strict";
import test from "node:test";

import {
  discoverProviderLinks,
  fetchLiveSourcePage,
  liveTeamSlug,
  validateLiveDestinationSnapshot,
} from "../src/live-source-discovery.mjs";

const fixtures = [
  { id: "world-cup-match-1", teams: ["Norway", "England"] },
  { id: "eliteserien-match-1", teams: ["Aalesund", "Molde"] },
];
const aliases = {
  Aalesund: ["Aalesund FK"],
  Molde: ["Molde FK"],
  Norway: ["Norge"],
};

test("live team slugs normalize accents and punctuation deterministically", () => {
  assert.equal(liveTeamSlug("Bodø/Glimt"), "bodo-glimt");
  assert.equal(liveTeamSlug("Côte d'Ivoire"), "cote-divoire");
  assert.equal(liveTeamSlug("Brighton & Hove Albion"), "brighton-and-hove-albion");
});

test("TotalSportek discovery accepts one exact two-team match and ignores near matches", () => {
  const html = `
    <a href="https://totalsportek.cat/game/norway-u19-vs-england-u19-111">wrong</a>
    <a href="https://totalsportek.cat/game/norway-vs-england-7445162393?tracking=1">right</a>
    <a href="https://evil.example/game/norway-vs-england-999">hostile</a>`;
  assert.deepEqual(discoverProviderLinks({ aliases, fixtures, html, provider: "totalsportek" }), {
    "world-cup-match-1": "https://totalsportek.cat/game/norway-vs-england-7445162393",
  });
});

test("Camel discovery uses aliases and accepts stable upcoming or live match pages", () => {
  const html = `
    <a href="/football/norway-vs-england/23xmvkh60yz0qg8">upcoming</a>
    <a href="/football/aalesund-fk-vs-molde/live/6ypq3nhv7w0xmd7">live</a>
    <a href="/football/aalesund-fk-vs-molde/animation/not-a-stream">animation</a>`;
  assert.deepEqual(discoverProviderLinks({ aliases, fixtures, html, provider: "camel" }), {
    "eliteserien-match-1": "https://www.camel1.tv/football/aalesund-fk-vs-molde/live/6ypq3nhv7w0xmd7",
    "world-cup-match-1": "https://www.camel1.tv/football/norway-vs-england/23xmvkh60yz0qg8",
  });
});

test("live page fetch refuses redirects, non-HTML responses, and oversized pages", async () => {
  const response = (contentType, body, ok = true) => ({
    headers: { get: () => contentType },
    ok,
    text: async () => body,
  });
  await assert.rejects(
    () => fetchLiveSourcePage("totalsportek", { fetchImpl: async () => response("application/json", "{}") }),
    /schema_changed/,
  );
  await assert.rejects(
    () => fetchLiveSourcePage("camel", { fetchImpl: async () => response("text/html", "x".repeat(2_097_153)) }),
    /too_large/,
  );
});

test("live destination snapshots reject unknown fixtures, providers, and hosts", () => {
  const valid = {
    checkedAt: "2026-07-12T00:00:00.000Z",
    sourcesByFixture: {
      "world-cup-match-1": {
        totalsportek: "https://totalsportek.cat/game/norway-vs-england-7445162393",
      },
    },
  };
  assert.equal(validateLiveDestinationSnapshot(valid, { fixtureIds: ["world-cup-match-1"] }), valid);

  const hostile = structuredClone(valid);
  hostile.sourcesByFixture["world-cup-match-1"].totalsportek = "https://evil.example/game/norway-vs-england-1";
  assert.throws(
    () => validateLiveDestinationSnapshot(hostile, { fixtureIds: ["world-cup-match-1"] }),
    /allowlist/,
  );

  const unknown = structuredClone(valid);
  unknown.sourcesByFixture["other-match"] = unknown.sourcesByFixture["world-cup-match-1"];
  assert.throws(
    () => validateLiveDestinationSnapshot(unknown, { fixtureIds: ["world-cup-match-1"] }),
    /fixture id/,
  );
});
