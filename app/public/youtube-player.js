const host = document.querySelector("#youtube-player-host");
const placeholder = document.querySelector("#youtube-player-placeholder");
const startButton = document.querySelector("#youtube-player-start");
const status = document.querySelector("#youtube-player-status");

let apiReady = false;
let startRequested = false;
let player = null;

function setStatus(message) {
  status.textContent = message;
}

function showFinishedState() {
  player?.destroy();
  player = null;
  host.hidden = true;
  host.replaceChildren();
  placeholder.hidden = false;
  startButton.disabled = false;
  startButton.textContent = "Watch again";
  startRequested = false;
  setStatus("Replay finished · YouTube recommendations were removed");
}

function createPlayer() {
  if (!apiReady || !startRequested || player) return;
  const videoId = host.dataset.videoId;
  if (!/^[A-Za-z0-9_-]{11}$/u.test(videoId ?? "")) {
    setStatus("Replay unavailable");
    startButton.disabled = false;
    return;
  }

  const frame = document.createElement("iframe");
  const parameters = new URLSearchParams({
    autoplay: "1",
    controls: "1",
    enablejsapi: "1",
    origin: window.location.origin,
    playsinline: "1",
    rel: "0",
  });
  frame.id = "youtube-player-frame";
  frame.title = "YouTube replay player";
  frame.width = "355";
  frame.height = "200";
  frame.allow = "autoplay; encrypted-media; picture-in-picture";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${parameters}`;
  host.replaceChildren(frame);
  placeholder.hidden = true;
  host.hidden = false;
  setStatus("Starting replay…");

  player = new window.YT.Player(frame, {
    events: {
      onAutoplayBlocked() {
        setStatus("Use the YouTube play control to begin");
      },
      onError(event) {
        const embeddingBlocked = event.data === 101 || event.data === 150;
        player?.destroy();
        player = null;
        host.hidden = true;
        host.dataset.lastError = String(event.data ?? "unknown");
        placeholder.hidden = false;
        startButton.disabled = false;
        setStatus(embeddingBlocked
          ? "This upload does not allow embedded playback"
          : "This replay could not be played here");
      },
      onReady(event) {
        event.target.playVideo();
      },
      onStateChange(event) {
        if (event.data === window.YT.PlayerState.PLAYING) setStatus("Playing in compact mode");
        if (event.data === window.YT.PlayerState.ENDED) showFinishedState();
      },
    },
  });
}

window.onYouTubeIframeAPIReady = () => {
  apiReady = true;
  createPlayer();
};

startButton.addEventListener("click", () => {
  startRequested = true;
  startButton.disabled = true;
  setStatus(apiReady ? "Starting replay…" : "Preparing YouTube player…");
  createPlayer();
});

const apiScript = document.createElement("script");
apiScript.src = "https://www.youtube.com/iframe_api";
apiScript.async = true;
document.head.append(apiScript);
