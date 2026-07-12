import { scanSpoilerText } from "./spoiler-scan.mjs";

const REDDIT_THREAD = /^https:\/\/www\.reddit\.com\/r\/footballhighlights\/comments\/[a-z0-9]+\/[a-z0-9_]+\/?$/u;
const FOOTREPLAYS_ITEM = /^https:\/\/www\.footreplays\.com\/international\/[a-z0-9-]+\/[a-z0-9-]+\/?$/u;
const FORMATS = new Set(["extended", "full", "short"]);

function decodeEntities(value) {
  return String(value ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function entryValue(entry, name) {
  return decodeEntities(entry.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "u"))?.[1] ?? "").trim();
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function titleMatchesFixture(title, fixture) {
  const normalized = normalize(title);
  return fixture.teams.every((team) => normalized.includes(normalize(team)));
}

function entryFormat(title, content) {
  const text = `${title} ${decodeEntities(content)}`;
  if (/\bextended\s+highlights?\b/iu.test(text)) return "extended";
  if (/\bfull(?:\s+match)?\b/iu.test(text)) return "full";
  if (/\bhighlights?\b/iu.test(text)) return "short";
  return null;
}

function safeRedditUrl(entry) {
  const url = decodeEntities(entry.match(/<link\s+href="([^"]+)"/u)?.[1] ?? "");
  return REDDIT_THREAD.test(url) ? url : null;
}

function footReplaysUrl(content) {
  const decoded = decodeEntities(content);
  const url = decoded.match(/https:\/\/www\.footreplays\.com\/international\/[a-z0-9-]+\/[a-z0-9-]+\/?/u)?.[0] ?? null;
  return url && FOOTREPLAYS_ITEM.test(url) ? url : null;
}

export function parseFootballHighlightsFeed(xml) {
  if (typeof xml !== "string" || !xml.includes("<feed")) throw new TypeError("footballhighlights feed is invalid");
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gu)].flatMap((match) => {
    const raw = match[1];
    const title = entryValue(raw, "title");
    const content = entryValue(raw, "content");
    const url = safeRedditUrl(raw);
    const published = entryValue(raw, "published") || entryValue(raw, "updated");
    if (!title || !url || Number.isNaN(new Date(published).valueOf())) return [];
    return [{ content, published, title, url }];
  });
}

export function discoverReplaySources({ checkedAt, fixtures, xml }) {
  if (!Array.isArray(fixtures)) throw new TypeError("fixtures must be an array");
  if (Number.isNaN(new Date(checkedAt).valueOf())) throw new TypeError("checkedAt must be ISO time");
  const entries = parseFootballHighlightsFeed(xml);
  const sourcesByFixture = {};

  for (const fixture of fixtures) {
    const matching = entries
      .filter((entry) => titleMatchesFixture(entry.title, fixture))
      .filter((entry) => scanSpoilerText(entry.title, "reddit_title").level !== "unsafe")
      .sort((left, right) => right.published.localeCompare(left.published));
    const selected = new Map();
    let footreplays = null;
    let footreplaysFormat = null;
    for (const entry of matching) {
      const format = entryFormat(entry.title, entry.content);
      if (format && format !== "full" && !selected.has(format)) selected.set(format, entry.url);
      const foundFootreplays = footReplaysUrl(entry.content);
      if (!footreplays && foundFootreplays) {
        footreplays = foundFootreplays;
        footreplaysFormat = format === "full" ? "full" : "extended";
      }
    }
    const sources = [...selected].map(([format, url]) => ({
      format,
      id: `${fixture.id}-reddit-${format}`,
      provider: "reddit",
      url,
    }));
    if (footreplays) {
      sources.push({
        format: footreplaysFormat,
        id: `${fixture.id}-footreplays-${footreplaysFormat}`,
        provider: "footreplays",
        url: footreplays,
      });
    }
    sourcesByFixture[fixture.id] = sources;
  }

  return validateReplaySourceSnapshot({ checkedAt, sourcesByFixture }, {
    fixtureIds: fixtures.map(({ id }) => id),
  });
}

export function validateReplaySourceSnapshot(snapshot, { fixtureIds }) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw new TypeError("replay source snapshot is invalid");
  if (Number.isNaN(new Date(snapshot.checkedAt).valueOf())) throw new Error("replay source snapshot checkedAt is invalid");
  if (!snapshot.sourcesByFixture || typeof snapshot.sourcesByFixture !== "object" || Array.isArray(snapshot.sourcesByFixture)) {
    throw new Error("replay source snapshot sourcesByFixture is invalid");
  }
  const allowedFixtures = new Set(fixtureIds);
  const ids = new Set();
  for (const [fixtureId, sources] of Object.entries(snapshot.sourcesByFixture)) {
    if (!allowedFixtures.has(fixtureId)) throw new Error(`replay source fixture id is unknown: ${fixtureId}`);
    if (!Array.isArray(sources)) throw new Error(`replay sources for ${fixtureId} must be an array`);
    for (const source of sources) {
      if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("replay source is invalid");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(source.id ?? "") || ids.has(source.id)) throw new Error("replay source id is invalid or duplicated");
      ids.add(source.id);
      if (!FORMATS.has(source.format)) throw new Error(`replay source format is invalid: ${source.format}`);
      if (source.provider === "reddit" && !REDDIT_THREAD.test(source.url ?? "")) throw new Error("reddit replay source is outside the allowlist");
      if (source.provider === "footreplays" && !FOOTREPLAYS_ITEM.test(source.url ?? "")) throw new Error("FootReplays source is outside the allowlist");
      if (source.provider !== "reddit" && source.provider !== "footreplays") throw new Error("replay source provider is invalid");
    }
  }
  return snapshot;
}

export function buildReplaySourceProjection(snapshot) {
  const sourcesByFixture = {};
  const destinations = {};
  for (const [fixtureId, sources] of Object.entries(snapshot.sourcesByFixture)) {
    sourcesByFixture[fixtureId] = [...sources]
      .sort((left, right) => Number(left.provider === "reddit") - Number(right.provider === "reddit"))
      .map((source) => {
      destinations[source.id] = source.url;
      const reddit = source.provider === "reddit";
      return {
        accessLabel: reddit ? "Free links vary" : "Free status unverified",
        evidenceStatus: reddit ? "thread_candidate" : "directory_candidate",
        format: source.format,
        id: source.id,
        providerName: reddit ? "r/footballhighlights" : "FootReplays",
        provenance: "community_unverified",
        redirectPath: `/go/${source.id}`,
        riskLabel: reddit ? "Comments can spoil · highlight links unverified" : "Match page · thumbnail and popup risk",
        riskTone: "caution",
      };
    });
  }
  return { destinations, sourcesByFixture };
}
