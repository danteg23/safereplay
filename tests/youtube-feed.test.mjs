import assert from "node:assert/strict";
import test from "node:test";

import {
  buildYouTubeItemCandidates,
  detectYouTubeFormat,
  isYouTubeEntryCompatibleWithFixture,
  parseYouTubeFeed,
} from "../src/youtube-feed.mjs";

const source = {
  access: "free",
  channelId: "UCpryVRk_VDudG8SHXgWcG0w",
  formats: ["extended", "short"],
  id: "arsenal-youtube",
  provenance: "verified_official",
};
const fixture = {
  competition: "Example Cup",
  id: "arsenal-barcelona-example",
  kickoffUtc: "2026-07-10T12:00:00Z",
  teams: ["Arsenal", "Barcelona"],
};

function feed(entries, channelId = source.channelId) {
  return `<?xml version="1.0" encoding="UTF-8"?>
    <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
      <yt:channelId>${channelId}</yt:channelId>
      ${entries.join("\n")}
    </feed>`;
}

function entry({
  channelId = source.channelId,
  description = "Watch the neutral match package.",
  title = "Arsenal v Barcelona | Extended highlights",
  videoId = "AbCdEf12345",
} = {}) {
  return `<entry>
    <yt:videoId>${videoId}</yt:videoId>
    <yt:channelId>${channelId}</yt:channelId>
    <title>${title}</title>
    <published>2026-07-10T14:00:00+00:00</published>
    <media:group><media:description>${description}</media:description></media:group>
  </entry>`;
}

test("YouTube format detection separates Full, Mini, Extended, and Short", () => {
  assert.equal(detectYouTubeFormat("FULL MATCH | Arsenal v Barcelona"), "full");
  assert.equal(detectYouTubeFormat("30 Minute Recap | Arsenal v Barcelona"), "mini");
  assert.equal(detectYouTubeFormat("Arsenal v Barcelona | Extended Highlights"), "extended");
  assert.equal(detectYouTubeFormat("Arsenal v Barcelona | Highlights"), "short");
  assert.equal(detectYouTubeFormat("Training before Barcelona"), null);
  assert.equal(detectYouTubeFormat("Arsenal v Barcelona | First Half", 2_850), "halves");
  assert.equal(detectYouTubeFormat("Arsenal v Barcelona | Full Match", 600), null);
  assert.equal(detectYouTubeFormat("Arsenal v Barcelona", 6_000), "full");
});

test("fixture identity rejects stale, historical-year, and wrong-scope videos", () => {
  const scopedFixture = { ...fixture, scope: "senior_men" };
  const current = {
    published: "2026-07-10T14:00:00Z",
    title: "Arsenal v Barcelona | Highlights | 2026",
  };
  assert.equal(isYouTubeEntryCompatibleWithFixture(current, scopedFixture), true);
  assert.equal(isYouTubeEntryCompatibleWithFixture({ ...current, published: "2026-05-01T12:00:00Z" }, scopedFixture), false);
  assert.equal(isYouTubeEntryCompatibleWithFixture({ ...current, title: "Arsenal v Barcelona | 2017 Full Match" }, scopedFixture), false);
  assert.equal(isYouTubeEntryCompatibleWithFixture({ ...current, title: "Arsenal Women v Barcelona Women | Highlights" }, scopedFixture), false);
  assert.equal(isYouTubeEntryCompatibleWithFixture({
    ...current,
    published: "2026-05-01T12:00:00Z",
    scheduledStartTime: "2026-07-10T12:00:00Z",
  }, scopedFixture), true);
});

test("official channel feed becomes a private item candidate with unscanned thumbnail", () => {
  const candidates = buildYouTubeItemCandidates({
    checkedAt: "2026-07-10",
    fixture,
    region: "PH",
    source,
    xml: feed([entry()]),
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].sourceId, "arsenal-youtube");
  assert.deepEqual(candidates[0].formats, ["extended"]);
  assert.equal(candidates[0].metadata.scanDecision, "manual_review");
  assert.equal(candidates[0].metadata.thumbnailState, "unscanned");
  assert.equal(candidates[0].metadata.thumbnailUrlObserved, "https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg");
  assert.equal(candidates[0].playback.status, "links_unverified");
  assert.equal(candidates[0].stage, "candidate");
});

test("both teams may match explicit multilingual aliases without weakening the two-team gate", () => {
  const aliasFixture = {
    competition: "Example Cup",
    id: "manchester-city-norway-example",
    kickoffUtc: "2026-07-10T12:00:00Z",
    teams: ["Manchester City", "Norway"],
  };
  const aliasSource = { ...source, formats: ["short"] };
  const candidates = buildYouTubeItemCandidates({
    aliases: { "Manchester City": ["Man City"], Norway: ["Norge"] },
    checkedAt: "2026-07-10",
    fixture: aliasFixture,
    region: "NO",
    source: aliasSource,
    xml: feed([entry({ title: "Man City v Norge | Highlights" })]),
  });
  assert.equal(candidates.length, 1);

  const oneTeamOnly = buildYouTubeItemCandidates({
    aliases: { "Manchester City": ["Man City"], Norway: ["Norge"] },
    checkedAt: "2026-07-10",
    fixture: aliasFixture,
    region: "NO",
    source: aliasSource,
    xml: feed([entry({ title: "Man City match highlights" })]),
  });
  assert.deepEqual(oneTeamOnly, []);
});

test("score-bearing YouTube metadata is blocked before the public catalogue", () => {
  const [candidate] = buildYouTubeItemCandidates({
    checkedAt: "2026-07-10",
    fixture,
    region: "PH",
    source,
    xml: feed([entry({ title: "Arsenal 3-1 Barcelona | Highlights" })]),
  });
  assert.equal(candidate.metadata.scanDecision, "block_auto_surface");
  assert.equal(candidate.stage, "blocked");
});

test("feed ingestion rejects channel substitution and ignores unrelated videos", () => {
  assert.throws(
    () => parseYouTubeFeed(feed([entry()], "UCxxxxxxxxxxxxxxxxxxxxxx"), source),
    /does not match source registry/,
  );
  const candidates = buildYouTubeItemCandidates({
    checkedAt: "2026-07-10",
    fixture,
    region: "PH",
    source,
    xml: feed([entry({ title: "Arsenal training session | Highlights" })]),
  });
  assert.deepEqual(candidates, []);
});

test("live Atom channel IDs without the fixed UC prefix retain canonical registry identity", () => {
  const shortId = source.channelId.slice(2);
  const [parsed] = parseYouTubeFeed(feed([entry({ channelId: shortId })], shortId), source);
  assert.equal(parsed.channelId, source.channelId);
});

test("YouTube channel without a stable ID cannot enter feed ingestion", () => {
  assert.throws(
    () => parseYouTubeFeed(feed([entry()]), { ...source, channelId: undefined }),
    /stable channelId/,
  );
});
