import { createServer as createNodeServer } from "node:http";
import { execFile as execFileCallback, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { pipeline } from "node:stream";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { getPublicCatalogue, providerDestinations } from "../src/catalogue.mjs";
import {
  buildYouTubePlaybackProbeRecords,
  buildYouTubeProofRecords,
} from "../src/youtube-proof.mjs";
import {
  getYouTubePlayerRecord,
  getYouTubePlayerRecords,
} from "../src/youtube-player-catalogue.mjs";

const appDirectory = fileURLToPath(new URL(".", import.meta.url));
const publicDirectory = join(appDirectory, "public");
const privateCandidatesUrl = new URL("../.private/youtube-candidates.json", import.meta.url);
const sourcesUrl = new URL("../config/sources.json", import.meta.url);
const execFileAsync = promisify(execFileCallback);
const labStreamCache = new Map();
const labHighQualityCache = new Map();
let ffmpegAvailable;
const youtubeLabSampleRecord = Object.freeze({
  competition: "YouTube test",
  fixtureId: "youtube-api-sample",
  format: "sample",
  id: "youtube-api-playable-sample",
  providerName: "YouTube API sample",
  sourceId: "youtube-api-sample",
  teams: ["Playable", "Test video"],
  videoId: "M7lc1UVf-VE",
});

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
]);

const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'none'",
    "connect-src 'self'",
    "font-src 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "img-src 'self' data:",
    "manifest-src 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "worker-src 'self'",
  ].join("; "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

const youtubePlayerSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'none'",
  "connect-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "font-src 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "frame-src https://www.youtube-nocookie.com",
  "img-src 'self' data:",
  "manifest-src 'self'",
  "object-src 'none'",
  "script-src 'self' https://www.youtube.com",
  "style-src 'self'",
  "worker-src 'self'",
].join("; ");

const youtubeLabSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'none'",
  "connect-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "font-src 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "frame-src https://www.youtube-nocookie.com",
  "img-src 'self' data:",
  "manifest-src 'self'",
  "media-src 'self' https://*.googlevideo.com",
  "object-src 'none'",
  "script-src 'self' https://www.youtube.com",
  "style-src 'self'",
  "worker-src 'self'",
].join("; ");

function send(response, status, headers, body = "") {
  response.writeHead(status, { ...securityHeaders, ...headers });
  response.end(body);
}

function sendJson(response, status, value) {
  send(response, status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  }, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function labRecordForVariant(variant) {
  if (variant === "sample") return structuredClone(youtubeLabSampleRecord);
  return getYouTubePlayerRecords().find((record) => record.format === variant) ?? null;
}

function isGoogleVideoUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "googlevideo.com" || url.hostname.endsWith(".googlevideo.com"));
  } catch {
    return false;
  }
}

async function resolveYouTubeLabStream(record) {
  const cached = labStreamCache.get(record.id);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "--no-warnings",
      "--no-playlist",
      "-f",
      "best[ext=mp4][height<=480]/best[height<=480]/best",
      "-g",
      `https://www.youtube.com/watch?v=${record.videoId}`,
    ], { maxBuffer: 512 * 1024, timeout: 25_000 });
    const url = stdout.trim().split(/\r?\n/u)[0] ?? "";
    const result = isGoogleVideoUrl(url)
      ? { status: "stream_ready", url }
      : { status: "extractor_failed" };
    labStreamCache.set(record.id, { expiresAt: Date.now() + 4 * 60_000, result });
    return result;
  } catch (error) {
    const stderr = typeof error?.stderr === "string" ? error.stderr : "";
    if (error?.code === "ENOENT") return { status: "extractor_unavailable" };
    if (stderr.includes("not made this video available in your country")) return { status: "region_blocked" };
    if (stderr.includes("Sign in to confirm")) return { status: "authentication_blocked" };
    return { status: "extractor_failed" };
  }
}

async function hasFfmpeg() {
  if (typeof ffmpegAvailable === "boolean") return ffmpegAvailable;
  try {
    await execFileAsync("ffmpeg", ["-version"], { timeout: 5_000 });
    ffmpegAvailable = true;
  } catch {
    ffmpegAvailable = false;
  }
  return ffmpegAvailable;
}

async function resolveYouTubeLabHighQuality(record) {
  const cached = labHighQualityCache.get(record.id);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  if (!await hasFfmpeg()) return { status: "merger_unavailable" };
  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "--no-warnings",
      "--no-playlist",
      "-f",
      "bestvideo[ext=mp4][height<=720][vcodec^=avc1]+bestaudio[ext=m4a]",
      "-g",
      `https://www.youtube.com/watch?v=${record.videoId}`,
    ], { maxBuffer: 1024 * 1024, timeout: 25_000 });
    const [videoUrl, audioUrl] = stdout.trim().split(/\r?\n/u);
    const result = isGoogleVideoUrl(videoUrl) && isGoogleVideoUrl(audioUrl)
      ? { audioUrl, height: 720, status: "stream_ready", videoUrl }
      : { status: "extractor_failed" };
    labHighQualityCache.set(record.id, { expiresAt: Date.now() + 4 * 60_000, result });
    return result;
  } catch (error) {
    const stderr = typeof error?.stderr === "string" ? error.stderr : "";
    if (error?.code === "ENOENT") return { status: "extractor_unavailable" };
    if (stderr.includes("not made this video available in your country")) return { status: "region_blocked" };
    if (stderr.includes("Sign in to confirm")) return { status: "authentication_blocked" };
    return { status: "extractor_failed" };
  }
}

async function streamYouTubeLabHighQuality(request, response, record, resolveHighQualityStream) {
  const result = await resolveHighQualityStream(record);
  if (result.status !== "stream_ready" || !isGoogleVideoUrl(result.videoUrl) || !isGoogleVideoUrl(result.audioUrl)) {
    sendJson(response, 409, { status: result.status });
    return;
  }
  const headers = {
    ...securityHeaders,
    "Accept-Ranges": "none",
    "Cache-Control": "no-store",
    "Content-Type": "video/mp4",
  };
  if ((request.method ?? "GET") === "HEAD") {
    response.writeHead(200, headers);
    response.end();
    return;
  }
  const merger = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-i", result.videoUrl,
    "-i", result.audioUrl,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c", "copy",
    "-movflags", "frag_keyframe+empty_moov+default_base_moof",
    "-f", "mp4", "pipe:1",
  ], { stdio: ["ignore", "pipe", "ignore"] });
  let started = false;
  const stopMerger = () => {
    if (!merger.killed) merger.kill("SIGTERM");
  };
  merger.once("spawn", () => {
    started = true;
    response.writeHead(200, headers);
    pipeline(merger.stdout, response, stopMerger);
  });
  merger.once("error", () => {
    if (!started) sendJson(response, 503, { status: "merger_unavailable" });
    else response.destroy();
  });
  merger.once("close", (code) => {
    if (started && code !== 0 && !response.writableEnded) response.end();
  });
  response.once?.("close", stopMerger);
  response.socket?.once?.("close", stopMerger);
}

async function loadPrivateYouTubeProofRecords() {
  try {
    const [itemsText, sourcesText] = await Promise.all([
      readFile(privateCandidatesUrl, "utf8"),
      readFile(sourcesUrl, "utf8"),
    ]);
    return buildYouTubeProofRecords(JSON.parse(itemsText), JSON.parse(sourcesText));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function loadPrivateYouTubeProbeRecords() {
  try {
    const [itemsText, sourcesText] = await Promise.all([
      readFile(privateCandidatesUrl, "utf8"),
      readFile(sourcesUrl, "utf8"),
    ]);
    return buildYouTubePlaybackProbeRecords(JSON.parse(itemsText), JSON.parse(sourcesText));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function proofDocument(title, body) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#fbfcfe" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(title)} · SafeReplay proof</title>
    <link rel="stylesheet" href="/styles.css?v=20260711-1" />
    <link rel="stylesheet" href="/v2.css?v=20260711-1" />
  </head>
  <body><div class="app-shell">${body}</div></body>
</html>`;
}

function proofIndex(records) {
  const rows = records.length > 0
    ? records.map(({ publicRecord: record }) => `<a class="source-row" href="/proof/youtube/${encodeURIComponent(record.id)}">
        <span class="source-copy">
          <span class="source-format">${escapeHtml(record.formats.join(" / "))} proof candidate</span>
          <strong>${escapeHtml(record.teams.join(" · "))}</strong>
          <span>${escapeHtml(record.providerName)} · ${escapeHtml(record.provenance === "verified_official" ? "Official" : "Community / unverified")}</span>
          <span class="risk risk-caution"><i></i>Thumbnail and playback still unverified</span>
        </span><span class="row-chevron" aria-hidden="true">›</span>
      </a>`).join("")
    : `<div class="simple-empty"><h2>No private candidates</h2><p>Run the YouTube discovery command with --save-private first.</p></div>`;
  return proofDocument("YouTube candidates", `<main class="screen source-screen">
    <p class="match-context">Local operator mode</p>
    <p class="prototype-note source-prototype-note">No provider titles, thumbnails, or results are rendered here</p>
    <h1 class="team-heading"><span>YouTube</span><span>device proof</span></h1>
    <h2 class="source-heading">Choose a candidate</h2>
    <section class="source-list">${rows}</section>
  </main>`);
}

function proofConfirmation(record) {
  return proofDocument("Review candidate", `<main class="screen source-screen">
    <a class="back-button" href="/proof/youtube"><span aria-hidden="true">‹</span><span>Candidates</span></a>
    <p class="match-context">${escapeHtml(record.competition)} · ${escapeHtml(record.formats.join(" / "))}</p>
    <p class="prototype-note source-prototype-note">Exact item matched · destination behavior unverified</p>
    <h1 class="team-heading"><span>${escapeHtml(record.teams[0])}</span><span>${escapeHtml(record.teams[1])}</span></h1>
    <h2 class="source-heading">Before opening YouTube</h2>
    <section class="format-empty">
      <div class="format-empty-message">
        <p>The destination may reveal its title, thumbnail, comments, recommendations, or result. Check first paint, free playback, pause, fullscreen, end screen, and return behavior.</p>
      </div>
      <a class="primary-button full-width" href="${escapeHtml(record.redirectPath)}" rel="noreferrer">Open candidate</a>
    </section>
  </main>`);
}

function proofPlayerIndex(records) {
  const rows = records.length > 0
    ? records.map(({ publicRecord: record }) => `<a class="source-row" href="/proof/youtube-player/${encodeURIComponent(record.id)}">
        <span class="source-copy">
          <span class="source-format">${escapeHtml(record.formats.join(" / "))} covered probe</span>
          <strong>${escapeHtml(record.teams.join(" · "))}</strong>
          <span>${escapeHtml(record.providerName)} · ${escapeHtml(record.provenance === "verified_official" ? "Official" : "Community / unverified")}</span>
          <span class="risk risk-caution"><i></i>${escapeHtml(record.metadataDecision === "block_auto_surface" ? "Metadata blocked · private playback test" : "Metadata needs review · private playback test")}</span>
        </span><span class="row-chevron" aria-hidden="true">›</span>
      </a>`).join("")
    : `<div class="simple-empty"><h2>No playback probes</h2><p>Run the private YouTube discovery first.</p></div>`;
  return proofDocument("Covered YouTube probes", `<main class="screen source-screen">
    <p class="match-context">Local operator mode</p>
    <p class="prototype-note source-prototype-note">Titles, thumbnails, results, comments, and direct links stay hidden</p>
    <h1 class="team-heading"><span>YouTube</span><span>covered probes</span></h1>
    <h2 class="source-heading">Choose a private candidate</h2>
    <section class="source-list">${rows}</section>
  </main>`);
}

function proofCoveredPlayerDocument(record) {
  const format = record.publicRecord.formats[0] ?? "video";
  const access = record.publicRecord.access === "free" ? "Free" : "Free status varies";
  const provenance = record.publicRecord.provenance === "verified_official" ? "Official" : "Community / unverified";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#090b0e" />
    <meta name="color-scheme" content="dark" />
    <title>${escapeHtml(record.publicRecord.teams.join(" vs "))} · Covered YouTube proof</title>
    <link rel="icon" href="/brand-mark.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/styles.css?v=20260711-2" />
    <script type="module" src="/youtube-proof-player.js?v=20260711-9"></script>
  </head>
  <body class="youtube-watch-page">
    <main class="youtube-watch-screen">
      <a class="back-button" href="/proof/youtube-player"><span aria-hidden="true">‹</span><span>Private candidates</span></a>
      <p class="match-context">${escapeHtml(record.publicRecord.competition)} · ${escapeHtml(format)}</p>
      <p class="prototype-note source-prototype-note">Private covered probe · comments and direct links are not loaded</p>
      <h1 class="team-heading"><span>${escapeHtml(record.publicRecord.teams[0])}</span><span>${escapeHtml(record.publicRecord.teams[1])}</span></h1>
      <div class="source-tags youtube-player-tags" aria-label="Probe details">
        <span class="source-tag source-tag-format">${escapeHtml(format)}</span>
        <span class="source-tag">${escapeHtml(access)}</span>
        <span class="source-tag">${escapeHtml(provenance)}</span>
        <span class="source-tag source-tag-risk risk-caution"><i></i>${escapeHtml(record.publicRecord.metadataDecision === "block_auto_surface" ? "Metadata blocked" : "Metadata needs review")}</span>
      </div>
      <section class="youtube-player-card" aria-labelledby="proof-player-heading">
        <h2 id="proof-player-heading">Covered playback test</h2>
        <div class="lab-covered-player" data-proof-covered-player data-video-id="${escapeHtml(record.videoId)}">
          <div class="lab-covered-player-host" data-proof-player-host aria-hidden="true"></div>
          <span class="lab-covered-top-mask" aria-hidden="true"></span>
          <div class="lab-covered-shield" data-proof-shield>
            <span class="lab-covered-panel lab-covered-panel-top" aria-hidden="true"></span>
            <span class="lab-covered-panel lab-covered-panel-right" aria-hidden="true"></span>
            <span class="lab-covered-panel lab-covered-panel-bottom" aria-hidden="true"></span>
            <span class="lab-covered-panel lab-covered-panel-left" aria-hidden="true"></span>
            <span class="lab-covered-start-gate" aria-hidden="true">Preparing…</span>
            <span class="lab-covered-play-ring" aria-hidden="true"></span>
            <span class="lab-covered-prompt">Thumbnail and title hidden · tap the play symbol</span>
          </div>
        </div>
        <p class="lab-covered-status" data-proof-status aria-live="polite">Preparing the covered player…</p>
        <div class="youtube-proof-controls" data-proof-controls hidden>
          <button type="button" data-proof-fullscreen>Fullscreen</button>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

export function youtubePlayerDocument(record) {
  const format = record.format === "full"
    ? "Full match"
    : record.format === "extended" || record.format === "mini"
      ? "Extended highlights"
      : "Highlights";
  const duration = record.durationLabel ? ` · ${record.durationLabel}` : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#fbfcfe" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(record.teams.join(" vs "))} · SafeReplay</title>
    <link rel="icon" href="/brand-mark.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/styles.css?v=20260711-1" />
    <link rel="stylesheet" href="/v2.css?v=20260712-1" />
    <script type="module" src="/youtube-proof-player.js?v=20260711-9"></script>
  </head>
  <body class="youtube-watch-page">
    <main class="youtube-watch-screen">
      <header class="detail-header"><a class="back-button" href="/" aria-label="Back to SafeReplay"><span aria-hidden="true">‹</span></a><span class="brand"><img src="/brand-mark.svg" alt=""><span>SafeReplay</span></span></header>
      <section class="watch-heading"><h1>${escapeHtml(record.teams.join(" vs "))}</h1><p>${escapeHtml(format)} · YouTube${escapeHtml(duration)}</p></section>
      <section class="youtube-player-card" aria-labelledby="player-heading">
        <h2 id="player-heading">Ready to play</h2>
        <div class="lab-covered-player" data-proof-covered-player data-video-id="${escapeHtml(record.videoId)}">
          <div class="lab-covered-player-host" data-proof-player-host aria-hidden="true"></div>
          <span class="lab-covered-top-mask" aria-hidden="true"></span>
          <div class="lab-covered-shield" data-proof-shield>
            <span class="lab-covered-panel lab-covered-panel-top" aria-hidden="true"></span>
            <span class="lab-covered-panel lab-covered-panel-right" aria-hidden="true"></span>
            <span class="lab-covered-panel lab-covered-panel-bottom" aria-hidden="true"></span>
            <span class="lab-covered-panel lab-covered-panel-left" aria-hidden="true"></span>
            <span class="lab-covered-start-gate" aria-hidden="true">Preparing…</span>
            <span class="lab-covered-play-ring" aria-hidden="true"></span>
            <span class="lab-covered-prompt">Thumbnail and title hidden · tap the play symbol</span>
          </div>
        </div>
        <p class="lab-covered-status" data-proof-status aria-live="polite">Preparing the covered player…</p>
        <div class="youtube-proof-controls" data-proof-controls hidden>
          <button type="button" data-proof-fullscreen>Fullscreen</button>
        </div>
        <dialog class="fullscreen-warning" data-fullscreen-warning aria-labelledby="fullscreen-warning-title">
          <form method="dialog">
            <p class="fullscreen-warning-kicker">Spoiler warning</p>
            <h3 id="fullscreen-warning-title">Look away for the first 3 seconds</h3>
            <p>YouTube may briefly show the video title at the top. Keep the cursor still while watching—moving it can reveal the title again.</p>
            <div class="fullscreen-warning-actions">
              <button type="submit" value="cancel">Cancel</button>
              <button type="button" data-confirm-fullscreen>Enter fullscreen</button>
            </div>
          </form>
        </dialog>
      </section>
    </main>
  </body>
</html>`;
}

function labMethod({ action, autoPreview = false, button, description, finding, id, number, risk, title }) {
  return `<article class="lab-method" data-method-id="${escapeHtml(id)}"${autoPreview ? ' data-auto-preview="true"' : ""}>
    <div class="lab-method-heading">
      <span class="lab-method-number">${String(number).padStart(2, "0")}</span>
      <div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div>
    </div>
    <div class="source-tags lab-method-tags"><span class="source-tag source-tag-risk risk-caution"><i></i>${escapeHtml(risk)}</span></div>
    ${finding ? `<p class="lab-device-finding">${escapeHtml(finding)}</p>` : ""}
    <div class="lab-stage" data-lab-stage hidden></div>
    <div class="lab-method-actions">
      ${autoPreview
        ? '<span class="lab-live-label"><i></i>Live preview</span>'
        : `<button class="primary-button" type="button" data-lab-action="${escapeHtml(action)}">${escapeHtml(button)}</button>`}
      <div class="lab-verdicts" aria-label="Your verdict">
        <button type="button" data-lab-verdict="works">Works</button>
        <button type="button" data-lab-verdict="spoiled">Spoiled</button>
        <button type="button" data-lab-verdict="failed">Failed</button>
      </div>
    </div>
  </article>`;
}

function youtubeLabDocument() {
  const records = getYouTubePlayerRecords();
  const full = records.find((record) => record.format === "full");
  const short = records.find((record) => record.format === "short");
  if (!full || !short) throw new Error("YouTube lab records are missing");
  const methods = [
    {
      action: "covered-autoplay", button: "Start safely", id: "covered-autoplay", number: 1,
      autoPreview: true,
      title: "Covered autoplay player", risk: "Thumbnail fully hidden · embedding varies by video",
      description: "Loads YouTube behind a neutral cover, starts it from SafeReplay, and reveals only after playback begins.",
      finding: "New candidate based on your direct-YouTube workflow.",
    },
    {
      action: "embed-crop", button: "Try cropped player", id: "cropped-embed", number: 2,
      autoPreview: true,
      title: "Cropped YouTube embed", risk: "Crops title area · thumbnail still visible",
      description: "Zooms the player beyond its frame so the title area and edges are cut away.",
      finding: "Promising, but your test showed the thumbnail can still spoil.",
    },
    {
      action: "embed-mask", button: "Try obscured player", id: "masked-embed", number: 3,
      autoPreview: true,
      title: "Obscured YouTube embed", risk: "Masks metadata · thumbnail still visible",
      description: "Places black strips over YouTube's top and bottom metadata surfaces.",
      finding: "Promising, but your test showed the thumbnail can still spoil.",
    },
    {
      action: "extract-stream", button: "Try clean stream", id: "clean-stream", number: 4,
      autoPreview: true,
      title: "Native clean video", risk: "No YouTube title or thumbnail · 360p or experimental 720p",
      description: "Plays the fast combined file, or live-merges separate 720p video and audio tracks.",
      finding: "Worked on your device; quality was the missing piece.",
    },
    {
      action: "open-direct", button: "Open YouTube", id: "direct-youtube", number: 5,
      title: "Direct YouTube / app", risk: "Worked · close eyes until fullscreen",
      description: "Lets iPhone hand off to YouTube normally. Best control, least protection.",
      finding: "Worked and autoplayed in your Manila test.",
    },
    {
      action: "open-tiny", button: "Open tiny window", id: "tiny-popup", number: 6,
      title: "Tiny YouTube window", risk: "Worked · same protection as direct YouTube",
      description: "Opens the normal video page in a deliberately narrow 420×280 popup.",
      finding: "Worked like Direct YouTube in your desktop test.",
    },
  ];
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#090b0e" />
    <meta name="color-scheme" content="dark" />
    <title>YouTube solution lab · SafeReplay</title>
    <link rel="stylesheet" href="/styles.css?v=20260711-2" />
    <script src="https://www.youtube.com/iframe_api"></script>
    <script type="module" src="/youtube-lab.js?v=20260711-2"></script>
  </head>
  <body class="youtube-lab-page">
    <main class="youtube-lab-screen" data-sample-video-id="${escapeHtml(youtubeLabSampleRecord.videoId)}" data-full-video-id="${escapeHtml(full.videoId)}" data-short-video-id="${escapeHtml(short.videoId)}">
      <a class="back-button" href="/"><span aria-hidden="true">‹</span><span>SafeReplay</span></a>
      <header class="lab-header">
        <p class="match-context">France · Morocco</p>
        <h1>YouTube solution lab</h1>
        <p>Test the covered autoplay flow first. It hides the thumbnail completely, starts playback from SafeReplay, and attempts fullscreen from the same tap.</p>
      </header>
      <div class="lab-toolbar">
        <div class="lab-version-switch" role="group" aria-label="Video version">
          <button type="button" data-lab-version="sample" aria-pressed="true">Playable test</button>
          <button type="button" data-lab-version="full" aria-pressed="false">Full</button>
          <button type="button" data-lab-version="short" aria-pressed="false">Short</button>
        </div>
        <button class="lab-copy-results" type="button" data-lab-copy>Copy my results</button>
      </div>
      <section class="lab-summary" aria-live="polite">
        <strong>Your marked results</strong>
        <p data-lab-summary>No methods marked yet.</p>
      </section>
      <section class="lab-grid" aria-label="Playback experiments">
        ${methods.map(labMethod).join("")}
      </section>
      <section class="lab-rejected" aria-labelledby="rejected-heading">
        <div><p class="match-context">Your device findings</p><h2 id="rejected-heading">Dropped from active testing</h2></div>
        <ul>
          <li><strong>YouTube watch-popup</strong><span>Failed with player error 153.</span></li>
          <li><strong>Piped</strong><span>Too slow to be useful.</span></li>
          <li><strong>Invidious</strong><span>Spoiled the result.</span></li>
        </ul>
      </section>
    </main>
  </body>
</html>`;
}

function resolvePublicPath(pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const normalizedPath = normalize(requestedPath).replace(/^[/\\]+/, "");
  const resolved = join(publicDirectory, normalizedPath);
  return resolved.startsWith(publicDirectory) ? resolved : null;
}

async function serveStatic(pathname, response) {
  const filePath = resolvePublicPath(pathname);
  if (!filePath) {
    send(response, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found");
    return;
  }

  try {
    const body = await readFile(filePath);
    const extension = extname(filePath);
    const cacheControl = [".html", ".js", ".css", ".webmanifest"].includes(extension)
      ? "no-cache"
      : "public, max-age=3600";
    send(response, 200, {
      "Cache-Control": cacheControl,
      "Content-Type": contentTypes.get(extension) ?? "application/octet-stream",
    }, body);
  } catch (error) {
    if (error?.code === "ENOENT") {
      send(response, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found");
      return;
    }
    send(response, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Unable to load SafeReplay");
  }
}

export async function handleRequest(request, response, {
  getPlayerRecord = getYouTubePlayerRecord,
  loadProofRecords = loadPrivateYouTubeProofRecords,
  loadProbeRecords = loadPrivateYouTubeProbeRecords,
  proofEnabled = globalThis.process?.env?.SOURCE_PROOF === "1",
  resolveLabStream = resolveYouTubeLabStream,
  resolveHighQualityStream = resolveYouTubeLabHighQuality,
  streamHighQuality = streamYouTubeLabHighQuality,
} = {}) {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  const method = request.method ?? "GET";

  if (method !== "GET" && method !== "HEAD") {
    send(response, 405, { "Allow": "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" }, "Method not allowed");
    return;
  }

  if (requestUrl.pathname === "/__health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (requestUrl.pathname === "/api/catalogue" || requestUrl.pathname === "/api/catalogue.json") {
    sendJson(response, 200, getPublicCatalogue());
    return;
  }

  if (requestUrl.pathname === "/lab/youtube/france-morocco") {
    let body;
    try {
      body = youtubeLabDocument();
    } catch {
      send(response, 500, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" }, "YouTube lab unavailable");
      return;
    }
    send(response, 200, {
      "Cache-Control": "no-store",
      "Content-Security-Policy": youtubeLabSecurityPolicy,
      "Content-Type": "text/html; charset=utf-8",
      "Permissions-Policy": 'autoplay=(self "https://www.youtube-nocookie.com"), camera=(), fullscreen=(self "https://www.youtube-nocookie.com"), geolocation=(), microphone=()',
    }, body);
    return;
  }

  const labApiMatch = requestUrl.pathname.match(/^\/api\/lab\/youtube\/(sample|full|short)\/(extract|stream|hq-extract|hq-stream)$/u);
  if (labApiMatch) {
    const [, variant, action] = labApiMatch;
    const record = labRecordForVariant(variant);
    if (!record) {
      sendJson(response, 404, { status: "unknown_variant" });
      return;
    }
    if (action === "hq-stream") {
      await streamHighQuality(request, response, record, resolveHighQualityStream);
      return;
    }
    if (action === "hq-extract") {
      const result = await resolveHighQualityStream(record);
      sendJson(response, 200, {
        height: result.status === "stream_ready" ? result.height : null,
        status: result.status,
        streamPath: result.status === "stream_ready" ? `/api/lab/youtube/${variant}/hq-stream` : null,
      });
      return;
    }
    const result = await resolveLabStream(record);
    if (action === "extract") {
      sendJson(response, 200, {
        status: result.status,
        streamPath: result.status === "stream_ready" ? `/api/lab/youtube/${variant}/stream` : null,
      });
      return;
    }
    if (result.status !== "stream_ready" || !isGoogleVideoUrl(result.url)) {
      sendJson(response, 409, { status: result.status });
      return;
    }
    send(response, 302, { "Cache-Control": "no-store", "Location": result.url });
    return;
  }

  if (requestUrl.pathname.startsWith("/watch/youtube/")) {
    let playerId;
    try {
      playerId = decodeURIComponent(requestUrl.pathname.slice("/watch/youtube/".length));
    } catch {
      playerId = "";
    }
    const record = getPlayerRecord(playerId);
    if (!record) {
      send(response, 404, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" }, "Unknown replay");
      return;
    }
    send(response, 200, {
      "Cache-Control": "no-store",
      "Content-Security-Policy": youtubePlayerSecurityPolicy,
      "Content-Type": "text/html; charset=utf-8",
      "Permissions-Policy": 'autoplay=(self "https://www.youtube-nocookie.com"), camera=(), fullscreen=(self "https://www.youtube-nocookie.com"), geolocation=(), microphone=()',
    }, youtubePlayerDocument(record));
    return;
  }

  if (requestUrl.pathname === "/proof/youtube-player" || requestUrl.pathname.startsWith("/proof/youtube-player/")) {
    if (!proofEnabled) {
      send(response, 404, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" }, "Not found");
      return;
    }
    let records;
    try {
      records = await loadProbeRecords();
    } catch {
      send(response, 500, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" }, "Unable to load private playback probes");
      return;
    }
    if (requestUrl.pathname === "/proof/youtube-player") {
      send(response, 200, { "Cache-Control": "no-store", "Content-Type": "text/html; charset=utf-8" }, proofPlayerIndex(records));
      return;
    }
    let candidateId;
    try {
      candidateId = decodeURIComponent(requestUrl.pathname.slice("/proof/youtube-player/".length));
    } catch {
      candidateId = "";
    }
    const record = records.find(({ publicRecord }) => publicRecord.id === candidateId);
    if (!record) {
      send(response, 404, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" }, "Unknown playback probe");
      return;
    }
    send(response, 200, {
      "Cache-Control": "no-store",
      "Content-Security-Policy": youtubePlayerSecurityPolicy,
      "Content-Type": "text/html; charset=utf-8",
      "Permissions-Policy": 'autoplay=(self "https://www.youtube-nocookie.com"), camera=(), fullscreen=(self "https://www.youtube-nocookie.com"), geolocation=(), microphone=()',
    }, proofCoveredPlayerDocument(record));
    return;
  }

  if (requestUrl.pathname === "/proof/youtube" || requestUrl.pathname.startsWith("/proof/youtube/") || requestUrl.pathname.startsWith("/go/youtube-proof/")) {
    if (!proofEnabled) {
      send(response, 404, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" }, "Not found");
      return;
    }
    let records;
    try {
      records = await loadProofRecords();
    } catch {
      send(response, 500, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" }, "Unable to load private proof candidates");
      return;
    }
    if (requestUrl.pathname === "/proof/youtube") {
      send(response, 200, { "Cache-Control": "no-store", "Content-Type": "text/html; charset=utf-8" }, proofIndex(records));
      return;
    }
    const proofPrefix = requestUrl.pathname.startsWith("/go/youtube-proof/")
      ? "/go/youtube-proof/"
      : "/proof/youtube/";
    let candidateId;
    try {
      candidateId = decodeURIComponent(requestUrl.pathname.slice(proofPrefix.length));
    } catch {
      send(response, 404, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" }, "Unknown proof candidate");
      return;
    }
    const record = records.find(({ publicRecord }) => publicRecord.id === candidateId);
    if (!record) {
      send(response, 404, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" }, "Unknown proof candidate");
      return;
    }
    if (proofPrefix === "/go/youtube-proof/") {
      send(response, 302, { "Cache-Control": "no-store", "Location": record.destination });
      return;
    }
    send(response, 200, { "Cache-Control": "no-store", "Content-Type": "text/html; charset=utf-8" }, proofConfirmation(record.publicRecord));
    return;
  }

  if (requestUrl.pathname.startsWith("/go/")) {
    const sourceId = requestUrl.pathname.slice(4);
    const destination = providerDestinations[sourceId];
    if (!destination) {
      send(response, 404, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" }, "Unknown source");
      return;
    }
    send(response, 302, { "Cache-Control": "no-store", "Location": destination });
    return;
  }

  await serveStatic(requestUrl.pathname, response);
}

export function createAppServer() {
  return createNodeServer(handleRequest);
}

if (globalThis.process?.argv?.[1] === fileURLToPath(import.meta.url)) {
  const port = Number.parseInt(globalThis.process.env.PORT ?? "4173", 10);
  const host = globalThis.process.env.HOST ?? "127.0.0.1";
  const server = createAppServer();
  server.listen(port, host, () => {
    process.stdout.write(`SafeReplay listening on http://${host}:${port}\n`);
  });
}
