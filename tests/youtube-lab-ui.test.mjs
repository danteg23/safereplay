import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicRoot = new URL("../app/public/", import.meta.url);

test("YouTube lab covers autoplay, offers native quality, and keeps external routes explicit", async () => {
  const [script, styles] = await Promise.all([
    readFile(new URL("youtube-lab.js", publicRoot), "utf8"),
    readFile(new URL("styles.css", publicRoot), "utf8"),
  ]);
  assert.match(script, /data-lab-action/);
  assert.match(script, /youtube-nocookie\.com\/embed/);
  assert.match(script, /function createCoveredPlayer\(stage\)/);
  assert.match(script, /dataCoveredStart|dataset\.coveredStart/);
  assert.match(script, /requestFullscreen/);
  assert.match(script, /YT\.PlayerState\.PLAYING/);
  assert.match(script, /\/api\/lab\/youtube\/\$\{version\}\/\$\{endpoint\}/);
  assert.match(script, /hq-extract/);
  assert.match(script, /Higher quality 720p/);
  assert.match(script, /safereplay\.youtubeLab\.v1/);
  assert.match(script, /let version = "sample"/);
  assert.match(script, /screen\.dataset\.sampleVideoId/);
  assert.match(script, /function renderAutoPreviews\(\)/);
  assert.match(script, /refreshVerdicts\(\);\s*renderAutoPreviews\(\);/s);
  assert.match(script, /autoplay:\s*(?:"0"|0)/);
  assert.doesNotMatch(script, /watch_popup|piped\.video|invidious\./);
  assert.doesNotMatch(script, /localStorage\.setItem\([^\n]*(?:videoId|title|thumbnail|description)/i);
  assert.match(styles, /\.lab-embed-crop iframe\s*{[^}]*width:\s*132%[^}]*transform:/s);
  assert.match(styles, /\.lab-player-mask-top\s*{[^}]*height:\s*45px/s);
  assert.match(styles, /\.lab-covered-shield\s*{[^}]*background:\s*#050607/s);
  assert.match(styles, /\.lab-covered-player\.is-playing \.lab-covered-shield/);
  assert.match(styles, /\.lab-covered-player:fullscreen/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.lab-grid\s*{[^}]*grid-template-columns:\s*1fr/s);
});
