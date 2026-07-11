import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { scanPrivateYouTubeThumbnails } from "../src/youtube-thumbnail-ocr.mjs";

const execFile = promisify(execFileCallback);
const privateDirectory = new URL("../.private/", import.meta.url);
const thumbnailDirectory = new URL("thumbnails/", privateDirectory);
const ocrScript = fileURLToPath(new URL("./thumbnail-ocr.swift", import.meta.url));

async function saveImage(candidate, bytes) {
  await mkdir(thumbnailDirectory, { mode: 0o700, recursive: true });
  const fileUrl = new URL(`${candidate.id}.image`, thumbnailDirectory);
  await writeFile(fileUrl, bytes, { mode: 0o600 });
  return fileURLToPath(fileUrl);
}

async function recognizeText(imagePath) {
  const { stdout } = await execFile("swift", [ocrScript, imagePath], {
    maxBuffer: 1 * 1_024 * 1_024,
    timeout: 30_000,
  });
  const parsed = JSON.parse(stdout);
  if (!parsed || typeof parsed.text !== "string") throw new Error("ocr_invalid");
  return parsed.text;
}

export async function runThumbnailScan({
  fetchImpl = globalThis.fetch,
  ocrImpl = recognizeText,
  saveImageImpl = saveImage,
} = {}) {
  const candidates = JSON.parse(await readFile(new URL("youtube-candidates.json", privateDirectory), "utf8"));
  const reports = await scanPrivateYouTubeThumbnails({
    candidates,
    fetchImpl,
    ocrImpl,
    saveImage: saveImageImpl,
  });
  await mkdir(privateDirectory, { mode: 0o700, recursive: true });
  await writeFile(
    new URL("youtube-thumbnail-ocr.json", privateDirectory),
    `${JSON.stringify(reports, null, 2)}\n`,
    { mode: 0o600 },
  );
  return {
    checked: reports.length,
    reports,
    visualReviewStillRequired: reports.length,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const report = await runThumbnailScan();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch {
    process.stderr.write("Thumbnail OCR failed without exposing raw metadata\n");
    process.exitCode = 1;
  }
}
