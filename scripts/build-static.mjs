import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { youtubePlayerDocument } from "../app/server.mjs";
import { getPublicCatalogue, providerDestinations } from "../src/catalogue.mjs";
import { getYouTubePlayerRecords } from "../src/youtube-player-catalogue.mjs";

function baseArgument(argv) {
  const value = argv.find((entry) => entry.startsWith("--base="))?.slice("--base=".length) ?? "/";
  const normalized = `/${value.replace(/^\/+|\/+$/gu, "")}`;
  return normalized === "/" ? "/" : `${normalized}/`;
}

function withBase(html, base) {
  return html
    .replaceAll('href="/', `href="${base}`)
    .replaceAll('src="/', `src="${base}`);
}

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function redirectDocument(destination) {
  const escaped = htmlEscape(destination);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="referrer" content="no-referrer" />
    <meta http-equiv="refresh" content="0;url=${escaped}" />
    <title>SafeReplay</title>
    <script>location.replace(${JSON.stringify(destination)});</script>
  </head>
  <body><p>Opening source…</p></body>
</html>`;
}

export async function buildStaticSite({
  argv = process.argv.slice(2),
  outputUrl = new URL("../dist/", import.meta.url),
} = {}) {
  const base = baseArgument(argv);
  const publicUrl = new URL("../app/public/", import.meta.url);
  await rm(outputUrl, { force: true, recursive: true });
  await mkdir(outputUrl, { recursive: true });
  await cp(publicUrl, outputUrl, { recursive: true });

  const indexUrl = new URL("index.html", outputUrl);
  const index = (await readFile(indexUrl, "utf8"))
    .replace('name="safereplay-base" content="/"', `name="safereplay-base" content="${base}"`);
  await writeFile(indexUrl, withBase(index, base));

  const manifestUrl = new URL("manifest.webmanifest", outputUrl);
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  manifest.start_url = base;
  manifest.scope = base;
  manifest.icons = manifest.icons.map((icon) => ({ ...icon, src: `${base}${icon.src.replace(/^\/+/, "")}` }));
  await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`);

  const apiDirectory = new URL("api/", outputUrl);
  await mkdir(apiDirectory, { recursive: true });
  await writeFile(new URL("catalogue.json", apiDirectory), `${JSON.stringify(getPublicCatalogue())}\n`);

  for (const record of getYouTubePlayerRecords()) {
    const directory = new URL(`watch/youtube/${encodeURIComponent(record.id)}/`, outputUrl);
    await mkdir(directory, { recursive: true });
    await writeFile(new URL("index.html", directory), withBase(youtubePlayerDocument(record), base));
  }

  for (const [id, rawDestination] of Object.entries(providerDestinations)) {
    const destination = rawDestination.startsWith("/")
      ? `${base}${rawDestination.replace(/^\/+/, "")}`
      : rawDestination;
    const directory = new URL(`go/${encodeURIComponent(id)}/`, outputUrl);
    await mkdir(directory, { recursive: true });
    await writeFile(new URL("index.html", directory), redirectDocument(destination));
  }

  await writeFile(new URL(".nojekyll", outputUrl), "");
  await writeFile(new URL("404.html", outputUrl), `<!doctype html><title>SafeReplay</title><p><a href="${base}">Return to SafeReplay</a></p>`);
  return {
    base,
    destinations: Object.keys(providerDestinations).length,
    players: getYouTubePlayerRecords().length,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await buildStaticSite();
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
