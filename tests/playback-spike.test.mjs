import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = new URL("../spikes/playback/index.html", import.meta.url);
const scriptPath = new URL("../spikes/playback/app.js", import.meta.url);
const serverPath = new URL("../spikes/playback/server.mjs", import.meta.url);

test("initial document contains no third-party embed or source metadata", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.doesNotMatch(html, /<iframe/i);
  assert.doesNotMatch(html, /youtube(?:-nocookie)?\.com/i);
  assert.match(html, /<title>SafeReplay<\/title>/);
  assert.match(html, /id="start-button"/);
});

test("player is created only from the explicit start action", async () => {
  const script = await readFile(scriptPath, "utf8");

  assert.match(script, /startButton\.addEventListener\("click", startPlayback\)/);
  assert.match(script, /document\.createElement\("iframe"\)/);
  assert.match(script, /youtube-nocookie\.com\/embed/);
  assert.match(script, /autoplay: "1"/);
  assert.match(script, /playsinline: "1"/);
  assert.match(script, /rel: "0"/);
  assert.match(script, /Player requested — inspect the frame/);
  assert.doesNotMatch(script, /thumbnail|description|comments|duration/i);
});

test("server prevents metadata prefetch and limits frames to the probe host", async () => {
  const server = await readFile(serverPath, "utf8");

  assert.match(server, /frame-src https:\/\/www\.youtube-nocookie\.com/);
  assert.match(server, /img-src 'none'/);
  assert.match(server, /Cache-Control": "no-store"/);
});
