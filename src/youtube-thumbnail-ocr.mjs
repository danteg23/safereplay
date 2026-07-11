import { scanSpoilerText } from "./spoiler-scan.mjs";

const MAX_THUMBNAIL_BYTES = 5 * 1_024 * 1_024;
const NEUTRAL_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const FORMATS = new Set(["extended", "full", "halves", "mini", "partial", "short"]);

function safeThumbnailUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.hostname !== "i.ytimg.com" && !url.hostname.endsWith(".ytimg.com")) return null;
    return url;
  } catch {
    return null;
  }
}

async function thumbnailBytes(url, { fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url.toString(), {
      headers: { accept: "image/avif,image/webp,image/png,image/jpeg" },
      signal: controller.signal,
    });
    if (!response?.ok) throw new Error("thumbnail_unavailable");
    if (!safeThumbnailUrl(response.url)) throw new Error("thumbnail_redirect_rejected");
    const contentType = response.headers?.get?.("content-type") ?? "";
    if (!/^image\/(?:avif|jpeg|png|webp)(?:;|$)/iu.test(contentType)) throw new Error("thumbnail_not_image");
    const declaredLength = Number(response.headers?.get?.("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_THUMBNAIL_BYTES) throw new Error("thumbnail_too_large");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_THUMBNAIL_BYTES) throw new Error("thumbnail_too_large");
    return bytes;
  } finally {
    clearTimeout(timeout);
  }
}

function candidateIdentity(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  if (![candidate.id, candidate.fixtureId, candidate.sourceId].every((value) => NEUTRAL_ID.test(value ?? ""))) return null;
  if (!Array.isArray(candidate.formats) || candidate.formats.length === 0 ||
      candidate.formats.some((format) => !FORMATS.has(format))) return null;
  return {
    fixtureId: candidate.fixtureId,
    formats: [...candidate.formats],
    sourceId: candidate.sourceId,
  };
}

function neutralFailure(identity, code) {
  return {
    fixtureId: identity.fixtureId,
    formats: [...identity.formats],
    ocrLevel: "unknown",
    reasonCodes: [code],
    sourceId: identity.sourceId,
    visualState: "unreviewed",
  };
}

export async function scanPrivateYouTubeThumbnails({
  candidates,
  fetchImpl = globalThis.fetch,
  ocrImpl,
  saveImage,
  timeoutMs = 10_000,
}) {
  if (!Array.isArray(candidates)) throw new TypeError("candidates must be an array");
  if (typeof fetchImpl !== "function" || typeof ocrImpl !== "function" || typeof saveImage !== "function") {
    throw new TypeError("thumbnail fetch, OCR, and private image storage are required");
  }

  const reports = [];
  for (const candidate of candidates) {
    const identity = candidateIdentity(candidate);
    if (!identity) {
      reports.push(neutralFailure({ fixtureId: "unknown", formats: [], sourceId: "unknown" }, "candidate_invalid"));
      continue;
    }
    const url = safeThumbnailUrl(candidate?.metadata?.thumbnailUrlObserved);
    if (!url) {
      reports.push(neutralFailure(identity, "thumbnail_url_rejected"));
      continue;
    }
    try {
      const bytes = await thumbnailBytes(url, { fetchImpl, timeoutMs });
      const imagePath = await saveImage(candidate, bytes);
      const ocrText = await ocrImpl(imagePath);
      if (typeof ocrText !== "string" || ocrText.length > 100_000) throw new Error("ocr_invalid");
      if (!ocrText.trim()) {
        reports.push(neutralFailure(identity, "no_text_detected"));
        continue;
      }
      const scan = scanSpoilerText(ocrText, "thumbnail");
      reports.push({
        fixtureId: identity.fixtureId,
        formats: [...identity.formats],
        ocrLevel: scan.level,
        reasonCodes: [...new Set(scan.reasons.map((reason) => reason.code))],
        sourceId: identity.sourceId,
        visualState: "unreviewed",
      });
    } catch (error) {
      const code = ["thumbnail_redirect_rejected", "thumbnail_unavailable", "thumbnail_not_image", "thumbnail_too_large"]
        .includes(error instanceof Error ? error.message : "")
        ? error.message
        : "ocr_unavailable";
      reports.push(neutralFailure(identity, code));
    }
  }
  return reports;
}
