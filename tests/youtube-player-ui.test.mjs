import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicRoot = new URL("../app/public/", import.meta.url);

test("compact YouTube player is created only after Start and uses the minimum compliant height", async () => {
  const [script, styles] = await Promise.all([
    readFile(new URL("youtube-player.js", publicRoot), "utf8"),
    readFile(new URL("styles.css", publicRoot), "utf8"),
  ]);
  assert.match(script, /startButton\.addEventListener\("click"/);
  assert.match(script, /document\.createElement\("iframe"\)/);
  assert.ok(script.indexOf("startButton.addEventListener") < script.indexOf("createPlayer();\n});"));
  assert.match(script, /youtube-nocookie\.com\/embed/);
  assert.match(script, /frame\.width = "355"/);
  assert.match(script, /frame\.height = "200"/);
  assert.match(script, /PlayerState\.ENDED\) showFinishedState/);
  assert.match(styles, /\.youtube-player-host\s*{[^}]*width:\s*min\(100%, 355px\)[^}]*height:\s*200px/s);
  assert.doesNotMatch(styles, /\.youtube-player-(?:overlay|mask|crop)/);
});

test("private playback probe stays covered until YouTube reports playing", async () => {
  const script = await readFile(new URL("youtube-proof-player.js", publicRoot), "utf8");
  assert.match(script, /document\.createElement\("iframe"\)/);
  assert.match(script, /youtube-nocookie\.com\/embed/);
  assert.match(script, /onAutoplayBlocked/);
  assert.match(script, /Tap YouTube's play symbol/);
  assert.match(script, /frame\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(script, /MutationObserver/);
  assert.match(script, /if \(frame\.title !== neutralTitle\) frame\.title = neutralTitle/);
  assert.doesNotMatch(script, /player\.(?:unMute|mute|setVolume|playVideo)\(/);
  assert.match(script, /PlayerState\.PLAYING/);
  assert.match(script, /PlayerState\.PAUSED/);
  assert.match(script, /Paused and covered\. Tap YouTube's play symbol to resume with sound/);
  assert.match(script, /PlayerState\.ENDED/);
  assert.match(script, /Finished safely\. Preparing replay without related videos/);
  assert.match(script, /recreate: true/);
  assert.match(script, /classList\.add\("is-playing"\)/);
  assert.ok(script.indexOf("PlayerState.PLAYING") < script.indexOf('classList.add("is-playing")'));
  assert.match(script, /This upload blocks embedded playback\. It stayed covered\./);
  assert.match(script, /requestFullscreen/);
  assert.match(script, /wrapper\.requestFullscreen/);
  assert.doesNotMatch(script, /frame\.requestFullscreen/);
  assert.doesNotMatch(script, /pauseButton|data-proof-pause/);
  assert.doesNotMatch(script, /fullscreenWarning|confirmFullscreenButton|showModal/);
  assert.match(script, /fullscreenButton\?\.addEventListener\("click"/);
  assert.match(script, /parameters\.set\("start", String\(resumeAt\)\)/);
  assert.doesNotMatch(script, /player\.pauseVideo\(\)/);
  assert.doesNotMatch(script, /window\.open|location\.(?:assign|replace)|watch\?v=/);
});

test("public covered player fully removes the shield after playback and keeps desktop-only fullscreen", async () => {
  const styles = await readFile(new URL("v2.css", publicRoot), "utf8");
  assert.match(styles, /--covered-play-hole-width:\s*70px/);
  assert.match(styles, /--covered-play-hole-height:\s*50px/);
  assert.match(styles, /\.youtube-watch-page \.lab-covered-player\.is-playing \.lab-covered-shield\s*{[^}]*visibility:\s*hidden/s);
  assert.match(styles, /\.safe-fullscreen-button\s*{[^}]*grid-template-columns:\s*44px minmax\(0, 1fr\) 20px[^}]*background:\s*#f3f6ff/s);
  assert.match(styles, /safe-fullscreen-attention 1\.4s ease-out 2/);
  assert.match(styles, /@media \(max-width:\s*899px\)[\s\S]*?\.youtube-watch-page \.youtube-proof-controls\s*{\s*display:\s*none !important;/s);
});
