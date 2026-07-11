import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const publicRoot = new URL("../app/public/", import.meta.url);

test("manifest is installable-looking and points at real PNG icons", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", publicRoot), "utf8"));
  assert.equal(manifest.name, "SafeReplay");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.background_color, "#f8f9fb");
  assert.equal(manifest.theme_color, "#ffffff");
  assert.deepEqual(manifest.icons.map(({ src, sizes, type }) => ({ src, sizes, type })), [
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
  ]);
  await access(new URL("icon-512.png", publicRoot), constants.R_OK);
  await access(new URL("apple-touch-icon.png", publicRoot), constants.R_OK);
});

test("iPhone shell has safe-area metadata and registers the service worker", async () => {
  const [html, app, serviceWorker] = await Promise.all([
    readFile(new URL("index.html", publicRoot), "utf8"),
    readFile(new URL("app.js", publicRoot), "utf8"),
    readFile(new URL("sw.js", publicRoot), "utf8"),
  ]);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /apple-touch-icon\.png/);
  assert.match(html, /styles\.css\?v=20260711-1/);
  assert.match(html, /v2\.css\?v=20260711-9/);
  assert.match(html, /app\.js\?v=20260711-10/);
  assert.match(html, /name="safereplay-base" content="\/"/);
  assert.match(serviceWorker, /safereplay-shell-v23/);
  assert.match(serviceWorker, /styles\.css\?v=20260711-1/);
  assert.match(serviceWorker, /v2\.css\?v=20260711-9/);
  assert.match(serviceWorker, /app\.js\?v=20260711-10/);
  assert.match(serviceWorker, /time-zone\.js/);
  assert.match(app, /navigator\.serviceWorker\.register\(appUrl\("sw\.js"\)\)/);
  assert.match(app, /fetch\(appUrl\("api\/catalogue\.json"\)/);
  assert.match(app, /sessionStorage\.setItem\(navigationStorageKey/);
  assert.doesNotMatch(app, /sessionStorage\.setItem\([^\n]*(?:providerName|titleObserved|itemUrl|thumbnail)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\(`\$\{scopePath\}api\/`\).*url\.pathname\.startsWith\(`\$\{scopePath\}go\/`\).*return/s);
});

test("responsive shell has deliberate desktop navigation and content layouts", async () => {
  const styles = await readFile(new URL("v2.css", publicRoot), "utf8");
  const desktop = styles.slice(styles.indexOf("@media (min-width: 900px)"));
  assert.match(desktop, /--desktop-nav-width:\s*280px/);
  assert.match(desktop, /\.app-shell\s*{[^}]*padding-left:\s*var\(--desktop-nav-width\)/s);
  assert.match(desktop, /\.bottom-nav\s*{[^}]*width:\s*var\(--desktop-nav-width\)[^}]*grid-template-columns:\s*1fr/s);
  assert.match(desktop, /\.source-screen\s*{[^}]*width:\s*min\(100%, 940px\)[^}]*margin:\s*0 auto/s);
  assert.match(desktop, /\.match-hero\s*{[^}]*padding:\s*30px 0 0/s);
  assert.match(desktop, /\.format-stack\s*{[^}]*padding:\s*28px 0 0/s);
  assert.match(desktop, /\.settings-grid\s*{[^}]*grid-template-columns:\s*repeat\(2,/s);
  assert.match(styles, /\.mobile-nav-action\s*{[^}]*border:\s*0[^}]*background:\s*transparent/s);
  assert.match(styles, /\.bottom-nav\s*{[^}]*display:\s*none/s);
  assert.doesNotMatch(desktop, /width:\s*430px/);
});

test("public browser files contain no provider destinations or iframe escape hatch", async () => {
  const paths = ["index.html", "app.js", "icons.js", "styles.css", "v2.css", "sw.js", "time-zone.js"];
  const text = (await Promise.all(paths.map((path) => readFile(new URL(path, publicRoot), "utf8")))).join("\n");
  assert.doesNotMatch(text, /https:\/\/(?:www\.)?(?:footreplays|sportsiscinema|truehighlights|reddit)\./i);
  assert.doesNotMatch(text, /<iframe/i);
});
