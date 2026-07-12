const wrapper = document.querySelector("[data-proof-covered-player]");
const host = document.querySelector("[data-proof-player-host]");
const status = document.querySelector("[data-proof-status]");
const controls = document.querySelector("[data-proof-controls]");
const fullscreenButton = document.querySelector("[data-proof-fullscreen]");

let apiReady = false;
let player = null;
let resumeAt = 0;
let frameMetadataObserver = null;

function neutralizeFrameMetadata(frame) {
  const neutralTitle = "Covered YouTube player";
  frame.title = neutralTitle;
  frame.setAttribute("aria-label", neutralTitle);
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frameMetadataObserver?.disconnect();
  frameMetadataObserver = new MutationObserver(() => {
    if (frame.title !== neutralTitle) frame.title = neutralTitle;
  });
  frameMetadataObserver.observe(frame, { attributeFilter: ["title"], attributes: true });
}

function setStatus(message) {
  if (status) status.textContent = message;
}

function setPlaybackControlsVisible(value) {
  controls.hidden = !value;
  controls.classList.toggle("is-attention", value);
}

function requestPlayerFullscreen() {
  const requestFullscreen = wrapper.requestFullscreen?.bind(wrapper)
    ?? wrapper.webkitRequestFullscreen?.bind(wrapper);
  try {
    const result = requestFullscreen?.();
    result?.catch?.(() => setStatus("Fullscreen was blocked here. Continue watching safely in the page."));
  } catch {
    setStatus("Fullscreen was blocked here. Continue watching safely in the page.");
  }
}

function resetCoveredPlayer(message, { recreate = false, startAt = 0 } = {}) {
  resumeAt = Number.isFinite(startAt) && startAt > 1 ? Math.floor(startAt) : 0;
  frameMetadataObserver?.disconnect();
  frameMetadataObserver = null;
  player?.destroy();
  player = null;
  host.replaceChildren();
  wrapper.classList.remove("is-ready", "is-playing");
  setPlaybackControlsVisible(false);
  setStatus(message);
  if (recreate) queueMicrotask(startPlayer);
}

function getVideoId() {
  const videoId = wrapper.dataset.videoId;
  if (!/^[A-Za-z0-9_-]{11}$/u.test(videoId ?? "")) {
    setStatus("Candidate unavailable");
    return null;
  }
  return videoId;
}

function createFallbackFrame() {
  if (player || host.querySelector("iframe")) return;
  const videoId = getVideoId();
  if (!videoId) return;
  const frame = document.createElement("iframe");
  const parameters = new URLSearchParams({
    autoplay: "0",
    controls: "1",
    enablejsapi: "1",
    origin: window.location.origin,
    playsinline: "1",
    rel: "0",
  });
  if (resumeAt > 0) parameters.set("start", String(resumeAt));
  frame.id = "youtube-proof-player-frame";
  frame.title = "Covered YouTube playback probe";
  frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.allowFullscreen = true;
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${parameters}`;
  neutralizeFrameMetadata(frame);
  host.replaceChildren(frame);
  wrapper.classList.add("is-ready");
  setStatus(resumeAt > 0
    ? "Paused and covered. Tap YouTube's play symbol to resume with sound."
    : "Ready. Tap YouTube's play symbol to begin with sound.");
}

function connectPlayerApi() {
  if (!apiReady || player || host.querySelector("iframe")) return;
  const videoId = getVideoId();
  if (!videoId) return;
  player = new window.YT.Player(host, {
    host: "https://www.youtube-nocookie.com",
    videoId,
    playerVars: {
      autoplay: 0,
      controls: 1,
      origin: window.location.origin,
      playsinline: 1,
      rel: 0,
      start: resumeAt,
    },
    events: {
      onError(event) {
        const embeddingBlocked = event.data === 101 || event.data === 150;
        wrapper.dataset.lastError = String(event.data ?? "unknown");
        player?.destroy();
        player = null;
        host.replaceChildren();
        createFallbackFrame();
        setStatus(embeddingBlocked
          ? "YouTube's control layer failed. The direct covered player is ready."
          : "The direct covered player is ready.");
      },
      onAutoplayBlocked() {
        wrapper.classList.add("is-ready");
        setStatus("Ready. Tap YouTube's play symbol in the covered window.");
      },
      onReady() {
        neutralizeFrameMetadata(player.getIframe());
        wrapper.classList.add("is-ready");
        setStatus(resumeAt > 0
          ? "Paused and covered. Tap YouTube's play symbol to resume with sound."
          : "Ready. Tap YouTube's play symbol to begin with sound.");
      },
      onStateChange(event) {
        if (event.data === window.YT.PlayerState.PLAYING) {
          wrapper.classList.add("is-playing");
          setPlaybackControlsVisible(true);
          const muted = event.target.isMuted?.() !== false;
          setStatus(muted
            ? "Playing muted. Tap YouTube's speaker inside the player for sound."
            : window.matchMedia("(min-width: 900px)").matches
              ? "Playing with sound. Use Fullscreen when ready."
              : "Playing with sound. YouTube's cover returns automatically when paused.");
        }
        if (event.data === window.YT.PlayerState.PAUSED) {
          const currentTime = event.target.getCurrentTime?.() ?? resumeAt;
          resetCoveredPlayer("Paused safely. Preparing resume…", {
            recreate: true,
            startAt: currentTime,
          });
        }
        if (event.data === window.YT.PlayerState.ENDED) {
          resetCoveredPlayer("Finished safely. Preparing replay without related videos…", {
            recreate: true,
            startAt: 0,
          });
        }
      },
    },
  });
}

function startPlayer() {
  if (apiReady) connectPlayerApi();
  else createFallbackFrame();
}

window.onYouTubeIframeAPIReady = () => {
  apiReady = true;
  connectPlayerApi();
};

setStatus("Preparing the covered player…");

fullscreenButton?.addEventListener("click", () => {
  if (!window.matchMedia("(min-width: 900px)").matches) return;
  requestPlayerFullscreen();
});

const apiScript = document.createElement("script");
apiScript.src = "https://www.youtube.com/iframe_api";
apiScript.async = true;
apiScript.addEventListener("error", () => {
  wrapper.dataset.youtubeApi = "unavailable";
  createFallbackFrame();
});
document.head.append(apiScript);

const directPlayerFallback = window.setTimeout(createFallbackFrame, 1_500);

const apiFallbackPoll = window.setInterval(() => {
  if (typeof window.YT?.Player !== "function") return;
  apiReady = true;
  connectPlayerApi();
  window.clearTimeout(directPlayerFallback);
  window.clearInterval(apiFallbackPoll);
}, 250);
window.setTimeout(() => window.clearInterval(apiFallbackPoll), 10_000);
