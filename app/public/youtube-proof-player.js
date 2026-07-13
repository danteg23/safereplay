const wrapper = document.querySelector("[data-proof-covered-player]");
const host = document.querySelector("[data-proof-player-host]");
const status = document.querySelector("[data-proof-status]");
const controls = document.querySelector("[data-proof-controls]");
const fullscreenButton = document.querySelector("[data-proof-fullscreen]");
const retryGate = document.querySelector("[data-proof-retry]");

let apiReady = false;
let player = null;
let resumeAt = 0;
let frameMetadataObserver = null;
let apiScript = null;
let apiTimeout = null;

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

function setRetryGate(message, { retryable = false } = {}) {
  retryGate.textContent = message;
  retryGate.tabIndex = retryable ? 0 : -1;
  retryGate.setAttribute("aria-disabled", String(!retryable));
  retryGate.style.cursor = retryable ? "pointer" : "";
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
  setRetryGate("Preparing…");
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

function connectPlayerApi() {
  if (!apiReady || player) return;
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
        const errorCode = Number(event.data);
        const permanentlyUnavailable = errorCode === 2
          || errorCode === 100
          || errorCode === 101
          || errorCode === 150;
        wrapper.dataset.lastError = Number.isFinite(errorCode) ? String(errorCode) : "unknown";
        player?.destroy();
        player = null;
        host.replaceChildren();
        wrapper.classList.remove("is-ready", "is-playing");
        setPlaybackControlsVisible(false);
        setRetryGate(permanentlyUnavailable ? "Unavailable" : "Retry", {
          retryable: !permanentlyUnavailable,
        });
        setStatus(permanentlyUnavailable
          ? "This replay is unavailable."
          : "YouTube did not load. Retry when ready.");
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
  if (typeof window.YT?.Player === "function") apiReady = true;
  if (apiReady) connectPlayerApi();
}

window.onYouTubeIframeAPIReady = () => {
  apiReady = true;
  window.clearTimeout(apiTimeout);
  connectPlayerApi();
};

setStatus("Preparing the covered player…");

fullscreenButton?.addEventListener("click", () => {
  if (!window.matchMedia("(min-width: 900px)").matches) return;
  requestPlayerFullscreen();
});

function loadPlayerApi() {
  if (typeof window.YT?.Player === "function") {
    apiReady = true;
    connectPlayerApi();
    return;
  }
  if (apiScript?.isConnected) return;

  setRetryGate("Preparing…");
  apiScript = document.createElement("script");
  apiScript.src = "https://www.youtube.com/iframe_api";
  apiScript.async = true;
  apiScript.addEventListener("error", () => {
    wrapper.dataset.youtubeApi = "unavailable";
    apiScript?.remove();
    apiScript = null;
    setRetryGate("Retry", { retryable: true });
    setStatus("YouTube did not load. Retry when ready.");
  });
  document.head.append(apiScript);

  window.clearTimeout(apiTimeout);
  apiTimeout = window.setTimeout(() => {
    if (typeof window.YT?.Player === "function") {
      apiReady = true;
      connectPlayerApi();
      return;
    }
    apiScript?.remove();
    apiScript = null;
    setRetryGate("Retry", { retryable: true });
    setStatus("YouTube did not load. Retry when ready.");
  }, 10_000);
}

function retryPlayer() {
  if (retryGate.getAttribute("aria-disabled") === "true") return;
  delete wrapper.dataset.lastError;
  delete wrapper.dataset.youtubeApi;
  resetCoveredPlayer("Preparing the covered player…");
  loadPlayerApi();
}

retryGate.addEventListener("click", retryPlayer);
retryGate.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  retryPlayer();
});

loadPlayerApi();
