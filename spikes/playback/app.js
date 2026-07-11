const playerShell = document.querySelector("#player-shell");
const playerMount = document.querySelector("#player-mount");
const startButton = document.querySelector("#start-button");
const resetButton = document.querySelector("#reset-button");
const status = document.querySelector("#status");

const TEST_VIDEO_ID = "M7lc1UVf-VE";

function setState(state, message) {
  playerShell.dataset.state = state;
  status.textContent = message;
}

function startPlayback() {
  if (playerMount.querySelector("iframe")) return;

  setState("loading", "Player requested — inspect the frame");

  const iframe = document.createElement("iframe");
  const parameters = new URLSearchParams({
    autoplay: "1",
    playsinline: "1",
    rel: "0",
  });

  iframe.src = `https://www.youtube-nocookie.com/embed/${TEST_VIDEO_ID}?${parameters}`;
  iframe.title = "Video player";
  iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.addEventListener("load", () => setState("loaded", "Player frame loaded"), { once: true });

  playerMount.replaceChildren(iframe);
  startButton.disabled = true;
  resetButton.disabled = false;
}

function resetPlayback() {
  playerMount.replaceChildren();
  startButton.disabled = false;
  resetButton.disabled = true;
  setState("idle", "Source not loaded");
}

startButton.addEventListener("click", startPlayback);
resetButton.addEventListener("click", resetPlayback);
