import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../app/server.mjs";
import { findForbiddenPublicKey, validatePublicCatalogue } from "../src/public-contract.mjs";

async function request(url, method = "GET", options) {
  const result = { body: null, headers: null, status: null };
  await handleRequest(
    { method, url },
    {
      writeHead(status, headers) {
        result.status = status;
        result.headers = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)]));
      },
      end(body = "") {
        result.body = Buffer.isBuffer(body) ? body.toString("utf8") : String(body);
      },
    },
    options,
  );
  return result;
}

const proofCandidate = {
  destination: "https://www.youtube.com/watch?v=AbCdEf12345",
  publicRecord: {
    access: "free",
    competition: "World Cup",
    fixtureId: "fixture-1",
    formats: ["extended"],
    id: "fixture-1-fifa-youtube-abcdefghijk",
    metadataDecision: "manual_review",
    playbackStatus: "links_unverified",
    provenance: "verified_official",
    providerName: "FIFA on YouTube",
    redirectPath: "/go/youtube-proof/fixture-1-fifa-youtube-abcdefghijk",
    sourceId: "fifa-youtube",
    teams: ["Norway", "England"],
    thumbnailState: "unscanned",
  },
};
const playbackProbe = {
  publicRecord: {
    access: "free",
    competition: "World Cup",
    formats: ["short"],
    id: "fixture-1-fifa-youtube-abcdefghijk",
    metadataDecision: "block_auto_surface",
    playbackStatus: "links_unverified",
    provenance: "verified_official",
    providerName: "FIFA on YouTube",
    sourceId: "fifa-youtube",
    teams: ["Norway", "England"],
    thumbnailState: "unscanned",
  },
  videoId: "AbCdEf12345",
};

test("catalogue endpoint serves the validated public contract with no-store", async () => {
  const response = await request("/api/catalogue");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-security-policy"), /frame-src 'none'/);
  const catalogue = JSON.parse(response.body);
  assert.equal(validatePublicCatalogue(catalogue), catalogue);
  assert.equal(findForbiddenPublicKey(catalogue), null);
});

test("provider handoff is allowlisted and does not accept arbitrary URLs", async () => {
  const known = await request("/go/aleph-arena-youtube");
  assert.equal(known.status, 302);
  assert.equal(known.headers.get("location"), "https://www.youtube.com/@AlephArena");
  assert.equal(known.headers.get("cache-control"), "no-store");

  const reddit = await request("/go/france-morocco-reddit");
  assert.equal(reddit.status, 302);
  assert.equal(
    reddit.headers.get("location"),
    "https://www.reddit.com/r/footballhighlights/comments/1us2ust/france_vs_morocco_world_cup_09jul2026/",
  );

  const coveredShort = await request("/go/spain-belgium-youtube-short");
  assert.equal(coveredShort.status, 302);
  assert.equal(coveredShort.headers.get("location"), "/watch/youtube/spain-belgium-youtube-short");

  const replayFull = await request("/go/spain-belgium-footreplays-full");
  assert.equal(replayFull.status, 302);
  assert.equal(replayFull.headers.get("location"), "https://hgcloud.to/9b4o12yhq4ud");

  const replayFirstHalf = await request("/go/spain-belgium-footreplays-first-half");
  assert.equal(replayFirstHalf.status, 302);
  assert.equal(replayFirstHalf.headers.get("location"), "https://hgcloud.to/vxmnzbifbraz");

  const replaySecondHalf = await request("/go/spain-belgium-footreplays-second-half");
  assert.equal(replaySecondHalf.status, 302);
  assert.equal(replaySecondHalf.headers.get("location"), "https://hgcloud.to/jxxrdxanlc6d");

  const replayPage = await request("/go/spain-belgium-footreplays");
  assert.equal(replayPage.status, 302);
  assert.equal(
    replayPage.headers.get("location"),
    "https://www.footreplays.com/international/world-cup-2026/spain-vs-belgium-10-07-2026/",
  );

  const redditSearch = await request("/go/spain-belgium-reddit");
  assert.equal(redditSearch.status, 302);
  assert.match(redditSearch.headers.get("location"), /^https:\/\/www\.reddit\.com\/r\/footballhighlights\/search\//u);

  const score808 = await request("/go/live-score808");
  assert.equal(score808.status, 302);
  assert.equal(score808.headers.get("location"), "https://www.score808live.tv/");

  const retiredRbtv = await request("/go/live-rbtv");
  assert.equal(retiredRbtv.status, 404);
  assert.equal(retiredRbtv.headers.get("location"), undefined);

  const totalsportek = await request("/go/live-totalsportek");
  assert.equal(totalsportek.status, 302);
  assert.equal(totalsportek.headers.get("location"), "https://totalsportek.com/");

  const unknown = await request("/go/https:%2F%2Fevil.example");
  assert.equal(unknown.status, 404);
});

test("public YouTube page stays covered and permits only the privacy-enhanced frame host", async () => {
  const playerRecord = {
    competition: "World Cup",
    fixtureId: "fixture-1",
    format: "full",
    id: "fixture-1-youtube-full",
    providerName: "Official channel on YouTube",
    sourceId: "official-youtube",
    teams: ["France", "Morocco"],
    videoId: "AbCdEf12345",
  };
  const response = await request("/watch/youtube/fixture-1-youtube-full", "GET", {
    getPlayerRecord: (id) => id === playerRecord.id ? playerRecord : null,
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-security-policy"), /frame-src https:\/\/www\.youtube-nocookie\.com/);
  assert.doesNotMatch(response.headers.get("content-security-policy"), /frame-src '\*'|frame-src https:\/\/www\.youtube\.com/);
  assert.match(response.body, /Thumbnail and title hidden/);
  assert.match(response.body, /v2\.css\?v=20260711-9/);
  assert.match(response.body, /Thumbnail and title hidden/);
  assert.match(response.body, /tap the play symbol/);
  assert.match(response.body, /lab-covered-panel-top/);
  assert.match(response.body, /data-proof-player-host aria-hidden="true"/);
  assert.doesNotMatch(response.body, /data-proof-start|data-proof-sound/);
  assert.doesNotMatch(response.body, /Start \+ fullscreen/);
  assert.doesNotMatch(response.body, /Pause safely|data-proof-pause/);
  assert.match(response.body, /Look away for the first 3 seconds/);
  assert.match(response.body, /moving it can reveal the title again/);
  assert.match(response.body, /youtube-proof-player\.js/);
  assert.match(response.body, /data-video-id="[A-Za-z0-9_-]{11}"/);
  assert.doesNotMatch(response.body, /<iframe|youtube\.com\/embed|youtube-nocookie\.com\/embed/i);
  assert.doesNotMatch(response.body, /titleObserved|descriptionObserved|thumbnailUrlObserved|watch\?v=/i);

  const missing = await request("/watch/youtube/not-a-replay");
  assert.equal(missing.status, 404);
});

test("YouTube solution lab exposes six active experiments with four automatic previews", async () => {
  const response = await request("/lab/youtube/france-morocco");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-security-policy"), /frame-src https:\/\/www\.youtube-nocookie\.com/);
  assert.match(response.headers.get("content-security-policy"), /script-src 'self' https:\/\/www\.youtube\.com/);
  assert.match(response.headers.get("content-security-policy"), /media-src 'self' https:\/\/\*\.googlevideo\.com/);
  assert.match(response.body, /YouTube solution lab/);
  assert.match(response.body, /Compare|Cropped YouTube embed/);
  assert.equal((response.body.match(/class="lab-method"/g) ?? []).length, 6);
  assert.equal((response.body.match(/data-auto-preview="true"/g) ?? []).length, 4);
  assert.equal((response.body.match(/Live preview/g) ?? []).length, 4);
  assert.match(response.body, /Covered autoplay player/);
  assert.match(response.body, /Dropped from active testing/);
  assert.match(response.body, /Failed with player error 153/);
  assert.match(response.body, /Too slow to be useful/);
  assert.match(response.body, /Spoiled the result/);
  assert.match(response.body, /data-sample-video-id="M7lc1UVf-VE"/);
  assert.match(response.body, /data-full-video-id="[A-Za-z0-9_-]{11}"/);
  assert.match(response.body, /data-short-video-id="[A-Za-z0-9_-]{11}"/);
  assert.doesNotMatch(response.body, /<iframe|watch\?v=|titleObserved|descriptionObserved|thumbnailUrlObserved/i);
});

test("YouTube solution lab starts with a verified playable control video", async () => {
  const response = await request("/api/lab/youtube/sample/extract", "GET", {
    resolveLabStream: async (record) => ({
      status: record.id === "youtube-api-playable-sample" ? "stream_ready" : "extractor_failed",
      url: "https://r1---safe.googlevideo.com/videoplayback?token=sample",
    }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), {
    status: "stream_ready",
    streamPath: "/api/lab/youtube/sample/stream",
  });
});

test("clean-stream lab API reports neutral status and exposes only validated media redirects", async () => {
  const blocked = await request("/api/lab/youtube/full/extract", "GET", {
    resolveLabStream: async () => ({ status: "region_blocked" }),
  });
  assert.equal(blocked.status, 200);
  assert.deepEqual(JSON.parse(blocked.body), { status: "region_blocked", streamPath: null });

  const streamUrl = "https://r1---safe.googlevideo.com/videoplayback?token=private";
  const readyOptions = { resolveLabStream: async () => ({ status: "stream_ready", url: streamUrl }) };
  const ready = await request("/api/lab/youtube/short/extract", "GET", readyOptions);
  assert.deepEqual(JSON.parse(ready.body), {
    status: "stream_ready",
    streamPath: "/api/lab/youtube/short/stream",
  });
  assert.doesNotMatch(ready.body, /googlevideo|token|private/);

  const stream = await request("/api/lab/youtube/short/stream", "GET", readyOptions);
  assert.equal(stream.status, 302);
  assert.equal(stream.headers.get("location"), streamUrl);

  const hostile = await request("/api/lab/youtube/full/stream", "GET", {
    resolveLabStream: async () => ({ status: "stream_ready", url: "https://evil.example/video" }),
  });
  assert.equal(hostile.status, 409);
  assert.doesNotMatch(hostile.body, /evil\.example/);
});

test("high-quality lab API exposes a neutral 720p merger path without upstream URLs", async () => {
  const upstream = {
    audioUrl: "https://r2---safe.googlevideo.com/videoplayback?token=audio",
    height: 720,
    status: "stream_ready",
    videoUrl: "https://r1---safe.googlevideo.com/videoplayback?token=video",
  };
  const response = await request("/api/lab/youtube/short/hq-extract", "GET", {
    resolveHighQualityStream: async () => upstream,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), {
    height: 720,
    status: "stream_ready",
    streamPath: "/api/lab/youtube/short/hq-stream",
  });
  assert.doesNotMatch(response.body, /googlevideo|token|audioUrl|videoUrl/);
});

test("app shell is self-contained and cannot frame provider pages", async () => {
  const response = await request("/");
  assert.equal(response.status, 200);
  assert.match(response.body, /<title>SafeReplay<\/title>/);
  assert.doesNotMatch(response.body, /<iframe/i);
  assert.match(response.headers.get("content-security-policy"), /frame-src 'none'/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});

test("mutable app-shell assets revalidate instead of pinning stale PWA code or CSS", async () => {
  for (const path of ["/", "/app.js", "/styles.css", "/manifest.webmanifest"]) {
    const response = await request(path);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-cache");
  }
});

test("static path traversal and non-GET mutations are rejected", async () => {
  const traversal = await request("/..%2F..%2Fpackage.json");
  assert.equal(traversal.status, 404);

  const mutation = await request("/api/catalogue", "POST");
  assert.equal(mutation.status, 405);
});

test("local YouTube proof flow is disabled by default and neutral when enabled", async () => {
  const disabled = await request("/proof/youtube");
  assert.equal(disabled.status, 404);

  const options = { loadProofRecords: async () => [proofCandidate], proofEnabled: true };
  const index = await request("/proof/youtube", "GET", options);
  assert.equal(index.status, 200);
  assert.equal(index.headers.get("cache-control"), "no-store");
  assert.match(index.body, /Norway · England/);
  assert.match(index.body, /FIFA on YouTube · Official/);
  assert.match(index.body, /Thumbnail and playback still unverified/);
  assert.match(index.body, /styles\.css\?v=20260711-1/);
  assert.doesNotMatch(index.body, /youtube\.com|watch\?v=|Raw provider|<iframe/i);

  const confirmation = await request(`/proof/youtube/${proofCandidate.publicRecord.id}`, "GET", options);
  assert.equal(confirmation.status, 200);
  assert.match(confirmation.body, /Before opening YouTube/);
  assert.match(confirmation.body, new RegExp(proofCandidate.publicRecord.redirectPath));
  assert.doesNotMatch(confirmation.body, /youtube\.com|watch\?v=/i);

  const handoff = await request(proofCandidate.publicRecord.redirectPath, "GET", options);
  assert.equal(handoff.status, 302);
  assert.equal(handoff.headers.get("location"), proofCandidate.destination);
});

test("private covered-player proof includes blocked candidates but no direct handoff", async () => {
  const disabled = await request("/proof/youtube-player");
  assert.equal(disabled.status, 404);

  const options = { loadProbeRecords: async () => [playbackProbe], proofEnabled: true };
  const index = await request("/proof/youtube-player", "GET", options);
  assert.equal(index.status, 200);
  assert.match(index.body, /YouTube.*covered probes/s);
  assert.match(index.body, /Norway · England/);
  assert.match(index.body, /FIFA on YouTube · Official/);
  assert.match(index.body, /Metadata blocked · private playback test/);
  assert.match(index.body, new RegExp(`/proof/youtube-player/${playbackProbe.publicRecord.id}`));
  assert.doesNotMatch(index.body, /watch\?v=|youtube\.com|ytimg\.com|<iframe/i);

  const player = await request(`/proof/youtube-player/${playbackProbe.publicRecord.id}`, "GET", options);
  assert.equal(player.status, 200);
  assert.match(player.headers.get("content-security-policy"), /frame-src https:\/\/www\.youtube-nocookie\.com/);
  assert.match(player.body, /Thumbnail and title hidden/);
  assert.match(player.body, /data-video-id="AbCdEf12345"/);
  assert.match(player.body, /tap the play symbol/);
  assert.match(player.body, /lab-covered-panel-top/);
  assert.doesNotMatch(player.body, /data-proof-start|data-proof-sound/);
  assert.doesNotMatch(player.body, /Start \+ fullscreen/);
  assert.doesNotMatch(player.body, /Pause safely|data-proof-pause/);
  assert.match(player.body, /youtube-proof-player\.js/);
  assert.doesNotMatch(player.body, /<iframe|watch\?v=|Raw provider|titleObserved|descriptionObserved|thumbnailUrlObserved/i);

  const missing = await request("/proof/youtube-player/not-a-candidate", "GET", options);
  assert.equal(missing.status, 404);
});
