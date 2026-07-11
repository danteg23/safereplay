import assert from "node:assert/strict";
import test from "node:test";

import { scanPrivateYouTubeThumbnails } from "../src/youtube-thumbnail-ocr.mjs";

function candidate(overrides = {}) {
  return {
    fixtureId: "fixture-1",
    formats: ["full"],
    id: "fixture-1-fifa-youtube-abcdefghijk",
    metadata: { thumbnailUrlObserved: "https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg" },
    sourceId: "fifa-youtube",
    ...overrides,
  };
}

function imageResponse(bytes = new Uint8Array([1, 2, 3]), contentType = "image/jpeg") {
  return {
    arrayBuffer: async () => bytes.buffer,
    headers: { get(name) { return name.toLowerCase() === "content-type" ? contentType : String(bytes.length); } },
    ok: true,
    url: "https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg",
  };
}

test("thumbnail OCR emits reason codes without raw OCR text, URL, video ID, or image path", async () => {
  const reports = await scanPrivateYouTubeThumbnails({
    candidates: [candidate()],
    fetchImpl: async () => imageResponse(),
    ocrImpl: async () => "France 3-1 Morocco",
    saveImage: async () => "/private/raw-thumbnail.image",
  });
  assert.deepEqual(reports, [{
    fixtureId: "fixture-1",
    formats: ["full"],
    ocrLevel: "unsafe",
    reasonCodes: ["scoreline"],
    sourceId: "fifa-youtube",
    visualState: "unreviewed",
  }]);
  assert.doesNotMatch(JSON.stringify(reports), /France|Morocco|3-1|ytimg|AbCdEf12345|raw-thumbnail/);
});

test("OCR never claims visual safety and rejects unrelated hosts or non-images", async () => {
  let fetches = 0;
  const reports = await scanPrivateYouTubeThumbnails({
    candidates: [
      candidate({ metadata: { thumbnailUrlObserved: "https://example.test/image.jpg" } }),
      candidate({ id: "fixture-2", fixtureId: "fixture-2" }),
    ],
    fetchImpl: async () => { fetches += 1; return imageResponse(new Uint8Array([1]), "text/html"); },
    ocrImpl: async () => "Neutral fixture image",
    saveImage: async () => "/private/image",
  });
  assert.equal(fetches, 1);
  assert.deepEqual(reports.map(({ ocrLevel, reasonCodes, visualState }) => ({ ocrLevel, reasonCodes, visualState })), [
    { ocrLevel: "unknown", reasonCodes: ["thumbnail_url_rejected"], visualState: "unreviewed" },
    { ocrLevel: "unknown", reasonCodes: ["thumbnail_not_image"], visualState: "unreviewed" },
  ]);
});

test("empty or neutral OCR text stays visually unreviewed", async () => {
  const makeScan = (ocrText) => scanPrivateYouTubeThumbnails({
    candidates: [candidate()],
    fetchImpl: async () => imageResponse(),
    ocrImpl: async () => ocrText,
    saveImage: async () => "/private/image",
  });
  const empty = await makeScan("");
  assert.equal(empty[0].ocrLevel, "unknown");
  assert.deepEqual(empty[0].reasonCodes, ["no_text_detected"]);
  const neutral = await makeScan("World Cup Quarter Final");
  assert.equal(neutral[0].ocrLevel, "safe");
  assert.equal(neutral[0].visualState, "unreviewed");
});

test("thumbnail scan revalidates redirects and neutral identity without leaking hostile values", async () => {
  const redirected = imageResponse();
  redirected.url = "https://example.test/redirected.jpg";
  const reports = await scanPrivateYouTubeThumbnails({
    candidates: [candidate(), candidate({ id: "../../raw title", fixtureId: "unsafe fixture" })],
    fetchImpl: async () => redirected,
    ocrImpl: async () => "not reached",
    saveImage: async () => "/private/not-reached",
  });
  assert.deepEqual(reports.map(({ fixtureId, reasonCodes }) => ({ fixtureId, reasonCodes })), [
    { fixtureId: "fixture-1", reasonCodes: ["thumbnail_redirect_rejected"] },
    { fixtureId: "unknown", reasonCodes: ["candidate_invalid"] },
  ]);
  assert.doesNotMatch(JSON.stringify(reports), /raw title|unsafe fixture|example\.test/);
});
