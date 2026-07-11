const screen = document.querySelector(".youtube-lab-screen");
const summary = document.querySelector("[data-lab-summary]");
const storageKey = "safereplay.youtubeLab.v1";
let version = "sample";
let coveredSequence = 0;
let renderToken = 0;
const coveredPlayers = new WeakMap();

function videoId() {
  if (version === "sample") return screen.dataset.sampleVideoId;
  return version === "full" ? screen.dataset.fullVideoId : screen.dataset.shortVideoId;
}

function loadVerdicts() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

let verdicts = loadVerdicts();

function saveVerdicts() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(verdicts));
  } catch {
    // The lab still works when private browsing blocks storage.
  }
}

function currentVerdicts() {
  return verdicts[version] && typeof verdicts[version] === "object" ? verdicts[version] : {};
}

function methodTitle(card) {
  return card.querySelector("h2")?.textContent?.trim() ?? card.dataset.methodId;
}

function refreshVerdicts() {
  const selected = currentVerdicts();
  for (const card of document.querySelectorAll("[data-method-id]")) {
    const value = selected[card.dataset.methodId] ?? null;
    for (const button of card.querySelectorAll("[data-lab-verdict]")) {
      const active = button.dataset.labVerdict === value;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", String(active));
    }
  }
  const marked = [...document.querySelectorAll("[data-method-id]")]
    .flatMap((card) => selected[card.dataset.methodId]
      ? [`${methodTitle(card)}: ${selected[card.dataset.methodId]}`]
      : []);
  summary.textContent = marked.length > 0 ? marked.join(" · ") : "No methods marked yet.";
}

function clearStages() {
  for (const stage of document.querySelectorAll("[data-lab-stage]")) {
    stage.replaceChildren();
    stage.hidden = true;
  }
}

function createEmbed(stage, mode) {
  const wrapper = document.createElement("div");
  wrapper.className = `lab-embed lab-embed-${mode}`;
  const iframe = document.createElement("iframe");
  const params = new URLSearchParams({
    autoplay: "0",
    controls: "1",
    playsinline: "1",
    rel: "0",
  });
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId())}?${params}`;
  const versionLabel = version === "sample" ? "Playable test" : version === "full" ? "Full" : "Short";
  iframe.title = `${versionLabel} YouTube experiment`;
  iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  wrapper.append(iframe);
  if (mode === "mask") {
    const topMask = document.createElement("span");
    const bottomMask = document.createElement("span");
    topMask.className = "lab-player-mask lab-player-mask-top";
    bottomMask.className = "lab-player-mask lab-player-mask-bottom";
    topMask.setAttribute("aria-hidden", "true");
    bottomMask.setAttribute("aria-hidden", "true");
    wrapper.append(topMask, bottomMask);
  }
  stage.replaceChildren(wrapper);
  stage.hidden = false;
}

function youtubeApiReady() {
  if (globalThis.YT?.Player) return Promise.resolve(globalThis.YT);
  return new Promise((resolve, reject) => {
    const priorCallback = globalThis.onYouTubeIframeAPIReady;
    const timeout = globalThis.setTimeout(() => reject(new Error("YouTube API timeout")), 10_000);
    globalThis.onYouTubeIframeAPIReady = () => {
      priorCallback?.();
      globalThis.clearTimeout(timeout);
      resolve(globalThis.YT);
    };
  });
}

function coveredStatus(wrapper, message) {
  const status = wrapper.querySelector("[data-covered-status]");
  if (status) status.textContent = message;
}

function revealCoveredPlayer(wrapper) {
  wrapper.classList.remove("is-starting");
  wrapper.classList.add("is-playing");
  const player = coveredPlayers.get(wrapper);
  const muted = player?.isMuted?.() !== false;
  player?.getIframe?.().focus?.();
  coveredStatus(wrapper, muted
    ? "Playing safely without sound. Use YouTube's speaker control, then press F or tap fullscreen."
    : "Playing with sound. Press F on desktop or use the fullscreen control on iPhone.");
}

function createCoveredPlayer(stage) {
  const token = renderToken;
  const wrapper = document.createElement("div");
  wrapper.className = "lab-covered-player";

  const host = document.createElement("div");
  host.id = `safe-covered-player-${++coveredSequence}`;
  host.className = "lab-covered-player-host";

  const topMask = document.createElement("span");
  topMask.className = "lab-covered-top-mask";
  topMask.setAttribute("aria-hidden", "true");

  const cover = document.createElement("div");
  cover.className = "lab-covered-shield";
  const coverTitle = document.createElement("strong");
  coverTitle.textContent = "Thumbnail hidden";
  const coverText = document.createElement("span");
  coverText.textContent = "SafeReplay starts the player behind this cover and reveals it only after playback begins.";
  const buttons = document.createElement("div");
  buttons.className = "lab-covered-buttons";
  const start = document.createElement("button");
  start.type = "button";
  start.dataset.coveredStart = "inline";
  start.textContent = "Start safely";
  const fullscreen = document.createElement("button");
  fullscreen.type = "button";
  fullscreen.dataset.coveredStart = "fullscreen";
  fullscreen.textContent = "Start + fullscreen";
  const reveal = document.createElement("button");
  reveal.type = "button";
  reveal.dataset.coveredReveal = "true";
  reveal.className = "lab-covered-reveal";
  reveal.textContent = "Reveal controls manually";
  reveal.hidden = true;
  buttons.append(start, fullscreen, reveal);
  cover.append(coverTitle, coverText, buttons);

  const status = document.createElement("p");
  status.className = "lab-covered-status";
  status.dataset.coveredStatus = "true";
  status.setAttribute("aria-live", "polite");
  status.textContent = "Preparing the hidden player…";
  wrapper.append(host, topMask, cover, status);
  stage.replaceChildren(wrapper);
  stage.hidden = false;

  void youtubeApiReady().then((YT) => {
    if (token !== renderToken || !wrapper.isConnected) return;
    const player = new YT.Player(host.id, {
      height: "100%",
      host: "https://www.youtube-nocookie.com",
      videoId: videoId(),
      width: "100%",
      playerVars: {
        autoplay: 0,
        controls: 1,
        disablekb: 0,
        fs: 1,
        origin: globalThis.location.origin,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onError: () => coveredStatus(wrapper, "This upload blocks embedded playback. It stayed covered; try Direct YouTube instead."),
        onReady: () => coveredStatus(wrapper, "Ready. The thumbnail is still completely covered."),
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.PLAYING) revealCoveredPlayer(wrapper);
          if (event.data === YT.PlayerState.PAUSED && wrapper.classList.contains("is-playing")) {
            coveredStatus(wrapper, "Playback is paused. The thumbnail was never shown before the safe start.");
          }
        },
      },
    });
    coveredPlayers.set(wrapper, player);
  }).catch(() => coveredStatus(wrapper, "The hidden YouTube player could not initialize."));
}

function externalUrl(action) {
  const id = encodeURIComponent(videoId());
  const urls = {
    "open-direct": `https://youtu.be/${id}`,
    "open-tiny": `https://www.youtube.com/watch?v=${id}&app=desktop`,
  };
  return urls[action] ?? null;
}

function stageMessage(stage, message, tone = "neutral") {
  const paragraph = document.createElement("p");
  paragraph.className = `lab-stage-message lab-stage-message-${tone}`;
  paragraph.textContent = message;
  stage.replaceChildren(paragraph);
  stage.hidden = false;
}

async function tryCleanStream(stage, quality = "fast") {
  const endpoint = quality === "high" ? "hq-extract" : "extract";
  stageMessage(stage, quality === "high" ? "Preparing separate 720p video and audio…" : "Asking this server for the fast clean stream…");
  try {
    const response = await fetch(`/api/lab/youtube/${version}/${endpoint}`, { headers: { Accept: "application/json" } });
    const result = await response.json();
    if (result.status === "stream_ready" && typeof result.streamPath === "string") {
      const shell = document.createElement("div");
      shell.className = "lab-native-shell";
      const qualitySwitch = document.createElement("div");
      qualitySwitch.className = "lab-quality-switch";
      qualitySwitch.setAttribute("aria-label", "Native video quality");
      for (const [value, label] of [["fast", "Fast 360p"], ["high", "Higher quality 720p"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.nativeQuality = value;
        button.setAttribute("aria-pressed", String(value === quality));
        button.textContent = label;
        qualitySwitch.append(button);
      }
      const video = document.createElement("video");
      video.controls = true;
      video.autoplay = false;
      video.playsInline = true;
      video.preload = quality === "high" ? "none" : "metadata";
      video.src = result.streamPath;
      video.addEventListener("error", () => stageMessage(stage, "The stream resolved, but this device could not play it.", "failed"), { once: true });
      const note = document.createElement("p");
      note.className = "lab-native-note";
      note.textContent = quality === "high"
        ? "Experimental: this Mac merges 720p picture and audio live. Press the video play control to begin."
        : "Fast and proven, but YouTube only supplies this combined file at 360p.";
      shell.append(qualitySwitch, video, note);
      stage.replaceChildren(shell);
      stage.hidden = false;
      return;
    }
    const messages = {
      authentication_blocked: "YouTube asked this server to sign in.",
      extractor_failed: "The extractor could not produce a playable stream.",
      extractor_unavailable: "The free extractor is not installed on this server.",
      merger_unavailable: "The free high-quality merger is not installed on this server.",
      region_blocked: "This server is outside the Philippines, so YouTube refused the stream.",
    };
    stageMessage(stage, messages[result.status] ?? "The clean stream is unavailable.", "failed");
  } catch {
    stageMessage(stage, "The clean-stream test could not reach the server.", "failed");
  }
}

function renderAutoPreviews() {
  const coveredStage = document.querySelector('[data-method-id="covered-autoplay"] [data-lab-stage]');
  const croppedStage = document.querySelector('[data-method-id="cropped-embed"] [data-lab-stage]');
  const maskedStage = document.querySelector('[data-method-id="masked-embed"] [data-lab-stage]');
  const cleanStage = document.querySelector('[data-method-id="clean-stream"] [data-lab-stage]');
  createCoveredPlayer(coveredStage);
  createEmbed(croppedStage, "crop");
  createEmbed(maskedStage, "mask");
  void tryCleanStream(cleanStage);
}

document.addEventListener("click", (event) => {
  const versionButton = event.target.closest("[data-lab-version]");
  if (versionButton) {
    version = versionButton.dataset.labVersion;
    renderToken += 1;
    for (const button of document.querySelectorAll("[data-lab-version]")) {
      button.setAttribute("aria-pressed", String(button === versionButton));
    }
    clearStages();
    refreshVerdicts();
    renderAutoPreviews();
    return;
  }

  const coveredStart = event.target.closest("[data-covered-start]");
  if (coveredStart) {
    const wrapper = coveredStart.closest(".lab-covered-player");
    const player = coveredPlayers.get(wrapper);
    if (!player?.playVideo) {
      coveredStatus(wrapper, "The hidden player is still preparing. Try again in a moment.");
      return;
    }
    wrapper.classList.add("is-starting");
    for (const button of wrapper.querySelectorAll("[data-covered-start]")) button.disabled = true;
    if (coveredStart.dataset.coveredStart === "fullscreen") {
      const requestFullscreen = wrapper.requestFullscreen?.bind(wrapper) ?? wrapper.webkitRequestFullscreen?.bind(wrapper);
      if (requestFullscreen) {
        try {
          const result = requestFullscreen();
          result?.catch?.(() => coveredStatus(wrapper, "Fullscreen was blocked, but playback is starting safely. Use the player control after reveal."));
        } catch {
          coveredStatus(wrapper, "Fullscreen was blocked, but playback is starting safely. Use the player control after reveal.");
        }
      }
    }
    player.mute?.();
    player.playVideo();
    coveredStatus(wrapper, "Starting behind the cover…");
    globalThis.setTimeout(() => {
      if (!wrapper.classList.contains("is-playing")) {
        const reveal = wrapper.querySelector("[data-covered-reveal]");
        if (reveal) reveal.hidden = false;
        for (const button of wrapper.querySelectorAll("[data-covered-start]")) button.disabled = false;
        coveredStatus(wrapper, "Autoplay may have been blocked or embedding failed. The thumbnail is still hidden.");
      }
    }, 6_000);
    return;
  }

  const coveredReveal = event.target.closest("[data-covered-reveal]");
  if (coveredReveal) {
    revealCoveredPlayer(coveredReveal.closest(".lab-covered-player"));
    return;
  }

  const nativeQuality = event.target.closest("[data-native-quality]");
  if (nativeQuality) {
    const stage = nativeQuality.closest("[data-lab-stage]");
    void tryCleanStream(stage, nativeQuality.dataset.nativeQuality);
    return;
  }

  const verdictButton = event.target.closest("[data-lab-verdict]");
  if (verdictButton) {
    const card = verdictButton.closest("[data-method-id]");
    verdicts[version] = { ...currentVerdicts(), [card.dataset.methodId]: verdictButton.dataset.labVerdict };
    saveVerdicts();
    refreshVerdicts();
    return;
  }

  const actionButton = event.target.closest("[data-lab-action]");
  if (actionButton) {
    const action = actionButton.dataset.labAction;
    const stage = actionButton.closest("[data-method-id]").querySelector("[data-lab-stage]");
    if (action === "embed-crop") return createEmbed(stage, "crop");
    if (action === "embed-mask") return createEmbed(stage, "mask");
    if (action === "extract-stream") return void tryCleanStream(stage);
    const url = externalUrl(action);
    if (!url) return;
    const features = action === "open-tiny"
      ? "popup,width=420,height=280,noopener,noreferrer"
      : "noopener,noreferrer";
    window.open(url, "_blank", features);
    stageMessage(stage, "Opened outside SafeReplay. Return here and mark what happened.");
    return;
  }

  if (event.target.closest("[data-lab-copy]")) {
    const text = `SafeReplay ${version} tests — ${summary.textContent}`;
    navigator.clipboard?.writeText(text).then(
      () => { event.target.closest("[data-lab-copy]").textContent = "Results copied"; },
      () => { summary.textContent = `${summary.textContent} · Copy unavailable`; },
    );
  }
});

refreshVerdicts();
renderAutoPreviews();
