import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

import { sanitizeRemoteYouTubeSearchResponse } from "../src/youtube-remote-search.mjs";

const execFile = promisify(execFileCallback);
const REMOTE_BINARY = "/home/claude/.local/bin/google-youtube";
const CACHE_VERSION = 1;
const CACHE_TTL_MS = 6 * 60 * 60 * 1_000;

export class RemoteYouTubeRouteMissingError extends Error {
  constructor() {
    super("cross-repo YouTube execution route missing");
    this.name = "RemoteYouTubeRouteMissingError";
  }
}

function remoteQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

function cacheKey(parameters) {
  return createHash("sha256").update(JSON.stringify(parameters)).digest("hex");
}

async function loadCache(cacheUrl) {
  try {
    const value = JSON.parse(await readFile(cacheUrl, "utf8"));
    if (value?.version !== CACHE_VERSION || !value.entries || typeof value.entries !== "object") throw new Error();
    return value;
  } catch {
    return { entries: {}, version: CACHE_VERSION };
  }
}

export function createRemoteYouTubeExecutor({
  cacheUrl = new URL("../.private/youtube-search-cache.json", import.meta.url),
  execFileImpl = execFile,
  now = () => Date.now(),
} = {}) {
  let cachePromise = null;
  let cacheHits = 0;
  let remoteSearches = 0;
  const cache = () => cachePromise ??= loadCache(cacheUrl);

  return {
    stats() {
      return { cacheHits, remoteSearches };
    },
    async verify() {
      try {
        const { stdout } = await execFileImpl("ssh", [
          "-o", "BatchMode=yes",
          "-o", "ConnectTimeout=10",
          "vps-claude",
          `${REMOTE_BINARY} scope-status`,
        ], { maxBuffer: 256 * 1_024, timeout: 15_000 });
        if (!/^youtube\.readonly:\s*true$/mu.test(stdout)) throw new Error();
      } catch {
        throw new RemoteYouTubeRouteMissingError();
      }
    },
    async search(parameters) {
      const key = cacheKey(parameters);
      const currentCache = await cache();
      const cached = currentCache.entries[key];
      if (cached && Number.isFinite(cached.storedAt) && now() - cached.storedAt < CACHE_TTL_MS) {
        cacheHits += 1;
        return cached.response;
      }

      const commandArguments = [
        "--json", "search",
        "--q", parameters.query,
        "--max", String(parameters.maxResults),
        "--region-code", parameters.region,
        "--published-after", parameters.publishedAfter,
        "--safe-search", parameters.safeSearch,
        "--topic-id", parameters.topicId,
      ];
      if (typeof parameters.relevanceLanguage === "string" && /^[a-z]{2}$/u.test(parameters.relevanceLanguage)) {
        commandArguments.push("--relevance-language", parameters.relevanceLanguage);
      }
      const command = [REMOTE_BINARY, ...commandArguments].map(remoteQuote).join(" ");
      let stdout;
      try {
        ({ stdout } = await execFileImpl("ssh", ["vps-claude", command], {
          maxBuffer: 4 * 1_024 * 1_024,
          timeout: 30_000,
        }));
      } catch {
        throw new RemoteYouTubeRouteMissingError();
      }
      remoteSearches += 1;

      let parsed;
      try {
        parsed = JSON.parse(stdout);
        sanitizeRemoteYouTubeSearchResponse(parsed);
      } catch {
        throw new Error("remote YouTube search response is invalid");
      }
      const privateResponse = { results: parsed.results };
      currentCache.entries[key] = { response: privateResponse, storedAt: now() };
      await mkdir(new URL("./", cacheUrl), { mode: 0o700, recursive: true });
      await writeFile(cacheUrl, `${JSON.stringify(currentCache, null, 2)}\n`, { mode: 0o600 });
      return privateResponse;
    },
  };
}
