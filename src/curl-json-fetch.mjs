import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const MAX_BODY_BYTES = 5 * 1_024 * 1_024;
const MAX_BUFFER_BYTES = MAX_BODY_BYTES + (64 * 1_024);
const ALLOWED_ACCEPTS = new Set([
  "application/atom+xml, application/xml;q=0.9",
  "application/json",
  "text/calendar",
]);

function assertHttpsUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new TypeError("curl JSON URL must be credential-free HTTPS");
  }
  return url;
}

function metadata(stderr) {
  const lines = stderr.trim().split("\n");
  if (lines.length !== 5) throw new Error("fixture_feed_unavailable");
  const [statusText, contentType, url, sizeText, redirectsText] = lines;
  const status = Number(statusText);
  const size = Number(sizeText);
  const redirects = Number(redirectsText);
  if (!Number.isSafeInteger(status) || status < 100 || status > 599) throw new Error("fixture_feed_unavailable");
  if (!Number.isSafeInteger(size) || size < 0) throw new Error("fixture_feed_unavailable");
  if (!Number.isSafeInteger(redirects) || redirects < 0) throw new Error("fixture_feed_unavailable");
  return { contentType, redirects, size, status, url };
}

export async function curlJsonFetch(value, {
  execFileImpl = execFile,
  headers = {},
  timeoutMs = 20_000,
} = {}) {
  const url = assertHttpsUrl(value);
  const accept = headers.accept ?? "application/json";
  if (!ALLOWED_ACCEPTS.has(accept)) throw new TypeError("curl Accept type is unsupported");
  const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1_000));
  const args = [
    "--fail",
    "--silent",
    "--show-error",
    "--proto",
    "=https",
    "--proto-redir",
    "=https",
    "--max-redirs",
    "0",
    "--connect-timeout",
    String(Math.min(timeoutSeconds, 10)),
    "--max-time",
    String(timeoutSeconds),
    "--max-filesize",
    String(MAX_BODY_BYTES),
    "--header",
    `Accept: ${accept}`,
    "--write-out",
    "%{stderr}%{http_code}\\n%{content_type}\\n%{url_effective}\\n%{size_download}\\n%{num_redirects}",
    url.toString(),
  ];

  let result;
  try {
    result = await execFileImpl("curl", args, {
      encoding: "utf8",
      maxBuffer: MAX_BUFFER_BYTES,
      timeout: timeoutMs + 1_000,
    });
  } catch (error) {
    if (error?.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" || error?.code === 63) {
      throw new Error("fixture_feed_too_large");
    }
    throw new Error("fixture_feed_unavailable");
  }

  const info = metadata(result.stderr ?? "");
  if (info.size > MAX_BODY_BYTES || Buffer.byteLength(result.stdout ?? "", "utf8") > MAX_BODY_BYTES) {
    throw new Error("fixture_feed_too_large");
  }
  if (info.redirects !== 0) throw new Error("fixture_feed_redirect_rejected");

  const body = result.stdout ?? "";
  return {
    headers: {
      get(name) {
        const normalized = String(name).toLowerCase();
        if (normalized === "content-type") return info.contentType;
        if (normalized === "content-length") return String(info.size);
        return null;
      },
    },
    ok: info.status >= 200 && info.status < 300,
    json: async () => JSON.parse(body),
    status: info.status,
    text: async () => body,
    url: info.url,
  };
}
