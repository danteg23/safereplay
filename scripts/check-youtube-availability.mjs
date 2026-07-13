import { execFile as execFileCallback } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  classifyYouTubeProbeFailure,
  refreshYouTubeAvailability,
} from "../src/youtube-availability.mjs";
import { getYouTubePlayerRecords } from "../src/youtube-player-catalogue.mjs";

const execFile = promisify(execFileCallback);
const availabilityUrl = new URL("../config/youtube-availability.json", import.meta.url);

export async function probeYouTubeWatchPage(videoId, { request = fetch } = {}) {
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("url", `https://www.youtube.com/watch?v=${videoId}`);
  try {
    const response = await request(endpoint, {
      headers: { "User-Agent": "SafeReplay-availability-check/1.0" },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 200) return { proves: "watch", status: "available" };
    if ([400, 401, 404, 410].includes(response.status)) {
      return { reason: "unavailable", status: "permanent" };
    }
    return { reason: "probe_blocked", status: "transient" };
  } catch {
    return { reason: "probe_failed", status: "transient" };
  }
}

export async function probeYouTubeVideo(videoId, {
  binary = process.env.YT_DLP_BINARY ?? "yt-dlp",
  execute = execFile,
} = {}) {
  try {
    const { stdout } = await execute(binary, [
      "--ignore-config",
      "--no-warnings",
      "--no-playlist",
      "--quiet",
      "--simulate",
      "--socket-timeout", "15",
      "--retries", "1",
      "--extractor-retries", "1",
      "--extractor-args", "youtube:player_client=web_embedded",
      "--print", "id",
      `https://www.youtube.com/watch?v=${videoId}`,
    ], { maxBuffer: 256 * 1024, timeout: 45_000 });
    return stdout.trim() === videoId
      ? { proves: "embed", status: "available" }
      : { reason: "unexpected_response", status: "transient" };
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error("yt-dlp is required for the YouTube availability check");
    return classifyYouTubeProbeFailure(error?.stderr ?? error?.message ?? "");
  }
}

export async function checkYouTubeAvailability({
  concurrency = 3,
  now = new Date().toISOString(),
  probe = probeYouTubeWatchPage,
  records = getYouTubePlayerRecords({ includeUnavailable: true }),
  snapshot,
} = {}) {
  const current = snapshot ?? JSON.parse(await readFile(availabilityUrl, "utf8"));
  const probes = new Map();
  let cursor = 0;
  async function worker() {
    while (cursor < records.length) {
      const record = records[cursor];
      cursor += 1;
      probes.set(record.id, await probe(record.videoId));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, records.length) }, () => worker()));
  return refreshYouTubeAvailability({ now, probes, records, snapshot: current });
}

async function main() {
  const result = await checkYouTubeAvailability();
  if (result.counts.transient > 0 && result.counts.available + result.counts.permanent === 0) {
    throw new Error("All YouTube availability probes failed transiently; the previous snapshot was preserved");
  }
  if (result.changed) {
    await writeFile(availabilityUrl, `${JSON.stringify(result.snapshot, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify({
    changed: result.changed,
    checked: Object.values(result.counts).reduce((total, count) => total + count, 0),
    hidden: Object.keys(result.snapshot.unavailable).length,
    permanentlyUnavailable: result.counts.permanent,
    transientFailures: result.counts.transient,
  })}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
