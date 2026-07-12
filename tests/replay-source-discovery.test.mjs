import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReplaySourceProjection,
  discoverReplaySources,
  parseFootballHighlightsFeed,
  validateReplaySourceSnapshot,
} from "../src/replay-source-discovery.mjs";

const fixture = {
  id: "world-cup-match-99",
  teams: ["Norway", "England"],
};

const feed = `<?xml version="1.0"?><feed>
  <entry><content type="html">&lt;a href=&quot;https://www.footreplays.com/international/world-cup-2026/norway-vs-england-11-07-2026/&quot;&gt;Full Match&lt;/a&gt;</content><link href="https://www.reddit.com/r/footballhighlights/comments/abc123/norway_vs_england/" /><published>2026-07-12T00:30:00Z</published><title>Norway vs England, World Cup, 11-Jul-2026</title></entry>
  <entry><content type="html">Extended package</content><link href="https://www.reddit.com/r/footballhighlights/comments/def456/england_norway_extended/" /><published>2026-07-12T01:30:00Z</published><title>England v Norway -- Extended Highlights, 11-Jul-2026</title></entry>
  <entry><content type="html">Highlights package</content><link href="https://www.reddit.com/r/footballhighlights/comments/ghi789/england_norway_highlights/" /><published>2026-07-12T01:00:00Z</published><title>England v Norway Highlights, 11-Jul-2026</title></entry>
  <entry><content type="html">Unsafe result</content><link href="https://www.reddit.com/r/footballhighlights/comments/jkl012/unsafe_result/" /><published>2026-07-12T02:00:00Z</published><title>Norway 1-2 England highlights</title></entry>
</feed>`;

test("footballhighlights feed produces exact format links and a FootReplays fallback", () => {
  assert.equal(parseFootballHighlightsFeed(feed).length, 4);
  const snapshot = discoverReplaySources({
    checkedAt: "2026-07-12T02:00:00Z",
    fixtures: [fixture],
    xml: feed,
  });
  assert.deepEqual(snapshot.sourcesByFixture[fixture.id].map(({ provider, format }) => [provider, format]), [
    ["reddit", "extended"],
    ["reddit", "short"],
    ["reddit", "full"],
    ["footreplays", "extended"],
  ]);
  assert.doesNotMatch(JSON.stringify(snapshot), /unsafe_result|1-2/u);

  const projection = buildReplaySourceProjection(snapshot);
  assert.equal(projection.sourcesByFixture[fixture.id].length, 4);
  assert.equal(projection.sourcesByFixture[fixture.id][0].providerName, "FootReplays");
  assert.equal(Object.keys(projection.destinations).length, 4);
});

test("replay snapshot rejects unknown fixtures and hostile destinations", () => {
  const valid = discoverReplaySources({
    checkedAt: "2026-07-12T02:00:00Z",
    fixtures: [fixture],
    xml: feed,
  });
  assert.equal(validateReplaySourceSnapshot(valid, { fixtureIds: [fixture.id] }), valid);
  const hostile = structuredClone(valid);
  hostile.sourcesByFixture[fixture.id][0].url = "https://evil.example/replay";
  assert.throws(() => validateReplaySourceSnapshot(hostile, { fixtureIds: [fixture.id] }), /allowlist/u);
  assert.throws(() => validateReplaySourceSnapshot(valid, { fixtureIds: [] }), /fixture id/u);
});
