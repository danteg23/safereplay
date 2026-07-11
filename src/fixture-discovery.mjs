import {
  allowedFixtureFeedUrl,
  parseFixtureDownloadRows,
  validateFixtureFeedRegistry,
} from "./fixture-download.mjs";
import { parseEliteserienCalendar } from "./eliteserien-calendar.mjs";

const MAX_FEED_BYTES = 5 * 1_024 * 1_024;

async function feedBody(feed, { fetchImpl, timeoutMs }) {
  const requestedUrl = allowedFixtureFeedUrl(feed, feed.feedUrl);
  const accept = feed.kind === "official_ical" ? "text/calendar" : "application/json";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response;
    try {
      response = await fetchImpl(requestedUrl.toString(), {
        headers: { accept },
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (error) {
      if (["fixture_feed_too_large", "fixture_feed_redirect_rejected"].includes(error?.message)) throw error;
      throw new Error("fixture_feed_unavailable");
    }
    if (response?.status >= 300 && response.status < 400) throw new Error("fixture_feed_redirect_rejected");
    if (!response?.ok) throw new Error("fixture_feed_unavailable");
    const finalUrl = allowedFixtureFeedUrl(feed, response.url);
    if (finalUrl.toString() !== requestedUrl.toString()) throw new Error("fixture_feed_redirect_rejected");
    const contentType = response.headers?.get?.("content-type") ?? "";
    const expectedContentType = feed.kind === "official_ical"
      ? /^text\/calendar(?:;|$)/iu
      : /^application\/json(?:;|$)/iu;
    if (!expectedContentType.test(contentType)) throw new Error("fixture_feed_wrong_content_type");
    const declaredLength = Number(response.headers?.get?.("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_FEED_BYTES) throw new Error("fixture_feed_too_large");
    const body = await response.text();
    if (Buffer.byteLength(body, "utf8") > MAX_FEED_BYTES) throw new Error("fixture_feed_too_large");
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

export async function discoverFixtureCandidates({
  checkedAt,
  fetchImpl = globalThis.fetch,
  from,
  registry,
  timeoutMs = 10_000,
  to,
}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fixture fetch implementation is required");
  const feeds = validateFixtureFeedRegistry(registry).filter((feed) => feed.state === "enabled_candidate");
  const fixtures = [];
  const failures = [];
  const sources = [];
  for (const feed of feeds) {
    try {
      const body = await feedBody(feed, { fetchImpl, timeoutMs });
      const parsed = feed.kind === "official_ical"
        ? parseEliteserienCalendar(body, { from, to })
        : parseFixtureDownloadRows(JSON.parse(body), feed, { from, to });
      fixtures.push(...parsed);
      sources.push({ feedId: feed.id, fixtureCount: parsed.length });
    } catch (error) {
      const rawCode = error instanceof Error ? error.message : "";
      const code = [
        "fixture_feed_redirect_rejected",
        "fixture_feed_unavailable",
        "fixture_feed_wrong_content_type",
        "fixture_feed_too_large",
      ].includes(rawCode) ? rawCode : "fixture_feed_invalid";
      failures.push({ code, feedId: feed.id });
    }
  }
  return {
    snapshot: {
      checkedAt,
      fixtures: fixtures.sort((left, right) => left.kickoffUtc.localeCompare(right.kickoffUtc) || left.id.localeCompare(right.id)),
      sourceName: "Fixture Download candidate feeds",
      sources,
    },
    failures,
  };
}
