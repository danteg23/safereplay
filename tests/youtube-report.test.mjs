import assert from "node:assert/strict";
import test from "node:test";

import { buildNeutralYouTubeReport } from "../src/youtube-report.mjs";

test("operator report strips raw YouTube metadata and destinations", () => {
  const report = buildNeutralYouTubeReport({
    candidates: [{
      access: "free",
      fixtureId: "fixture-1",
      formats: ["extended"],
      itemUrl: "https://www.youtube.com/watch?v=AbCdEf12345",
      metadata: {
        descriptionObserved: "Outcome-bearing raw description",
        scanDecision: "manual_review",
        thumbnailState: "unscanned",
        thumbnailUrlObserved: "https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg",
        titleObserved: "Raw provider title",
      },
      playback: { status: "links_unverified" },
      provenance: "verified_official",
      sourceId: "fifa-youtube",
      stage: "candidate",
    }],
    failures: [{ code: "feed_http_503", detail: "raw network detail", sourceId: "another-source" }],
  }, { checkedAt: "2026-07-10", region: "PH" });

  assert.deepEqual(report.candidates[0], {
    access: "free",
    fixtureId: "fixture-1",
    formats: ["extended"],
    metadataDecision: "manual_review",
    playbackStatus: "links_unverified",
    provenance: "verified_official",
    sourceId: "fifa-youtube",
    stage: "candidate",
    thumbnailState: "unscanned",
  });
  const serialized = JSON.stringify(report);
  for (const forbidden of ["Raw provider title", "Outcome-bearing", "itemUrl", "youtube.com", "ytimg.com", "thumbnailUrlObserved", "raw network detail"]) {
    assert.equal(serialized.includes(forbidden), false, `report leaked ${forbidden}`);
  }
});
