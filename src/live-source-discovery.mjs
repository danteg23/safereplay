const PROVIDERS = Object.freeze({
  camel: Object.freeze({
    baseUrl: "https://www.camel1.tv/",
    host: "www.camel1.tv",
  }),
  totalsportek: Object.freeze({
    baseUrl: "https://totalsportek.cat/",
    host: "totalsportek.cat",
  }),
});

const MAX_PAGE_BYTES = 2 * 1024 * 1024;

function assertFixture(fixture) {
  if (!fixture || typeof fixture !== "object" || !Array.isArray(fixture.teams) || fixture.teams.length !== 2) {
    throw new TypeError("live source fixture must contain two teams");
  }
  if (typeof fixture.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(fixture.id)) {
    throw new TypeError("live source fixture id is invalid");
  }
}

export function liveTeamSlug(value) {
  return String(value)
    .replace(/[øØ]/gu, "o")
    .replace(/[æÆ]/gu, "ae")
    .replace(/[œŒ]/gu, "oe")
    .replace(/ß/gu, "ss")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/&/gu, " and ")
    .replace(/[’']/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function teamSlugs(team, aliases) {
  return new Set([team, ...(aliases[team] ?? [])].map(liveTeamSlug).filter(Boolean));
}

function expectedFixtureSlugs(fixture, aliases) {
  assertFixture(fixture);
  const [home, away] = fixture.teams.map((team) => teamSlugs(team, aliases));
  const values = new Set();
  for (const homeSlug of home) {
    for (const awaySlug of away) {
      values.add(`${homeSlug}-vs-${awaySlug}`);
      values.add(`${awaySlug}-vs-${homeSlug}`);
    }
  }
  return values;
}

function anchorUrls(html, baseUrl) {
  const values = [];
  for (const match of String(html).matchAll(/href\s*=\s*["']([^"']+)["']/giu)) {
    try {
      values.push(new URL(match[1], baseUrl));
    } catch {
      // Ignore malformed third-party anchors.
    }
  }
  return values;
}

function totalSportekSlug(url) {
  if (url.protocol !== "https:" || url.hostname !== PROVIDERS.totalsportek.host) return null;
  const match = url.pathname.match(/^\/game\/([a-z0-9-]+)-\d+\/?$/u);
  return match?.[1] ?? null;
}

function camelSlug(url) {
  if (url.protocol !== "https:" || url.hostname !== PROVIDERS.camel.host) return null;
  const match = url.pathname.match(/^\/football\/([a-z0-9-]+)\/(?:live\/|[a-z0-9]+\/?$)/u);
  return match?.[1] ?? null;
}

function sanitizedDestination(url, provider) {
  const expected = PROVIDERS[provider];
  if (!expected || url.protocol !== "https:" || url.hostname !== expected.host || url.username || url.password) {
    throw new Error("live source destination is outside the provider allowlist");
  }
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/u, "");
}

export function discoverProviderLinks({ aliases = {}, fixtures, html, provider }) {
  if (!Array.isArray(fixtures)) throw new TypeError("live source fixtures must be an array");
  const definition = PROVIDERS[provider];
  if (!definition) throw new TypeError("live source provider is unsupported");
  const slugForUrl = provider === "totalsportek" ? totalSportekSlug : camelSlug;
  const destinationsBySlug = new Map();
  for (const url of anchorUrls(html, definition.baseUrl)) {
    const slug = slugForUrl(url);
    if (!slug || destinationsBySlug.has(slug)) continue;
    destinationsBySlug.set(slug, sanitizedDestination(url, provider));
  }

  const found = {};
  for (const fixture of fixtures) {
    const expected = expectedFixtureSlugs(fixture, aliases);
    const matchingSlugs = [...expected].filter((slug) => destinationsBySlug.has(slug));
    if (matchingSlugs.length !== 1) continue;
    found[fixture.id] = destinationsBySlug.get(matchingSlugs[0]);
  }
  return found;
}

export function validateLiveDestinationSnapshot(value, { fixtureIds } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("live destination snapshot must be an object");
  }
  if (Object.keys(value).some((key) => !["checkedAt", "sourcesByFixture"].includes(key))) {
    throw new Error("live destination snapshot contains an unsupported field");
  }
  const checkedAt = new Date(value.checkedAt);
  if (Number.isNaN(checkedAt.valueOf()) || checkedAt.toISOString() !== value.checkedAt) {
    throw new Error("live destination snapshot checkedAt is invalid");
  }
  if (!value.sourcesByFixture || typeof value.sourcesByFixture !== "object" || Array.isArray(value.sourcesByFixture)) {
    throw new Error("live destination snapshot sourcesByFixture is invalid");
  }
  const allowedFixtureIds = fixtureIds ? new Set(fixtureIds) : null;
  for (const [fixtureId, sources] of Object.entries(value.sourcesByFixture)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(fixtureId) || (allowedFixtureIds && !allowedFixtureIds.has(fixtureId))) {
      throw new Error("live destination snapshot fixture id is invalid");
    }
    if (!sources || typeof sources !== "object" || Array.isArray(sources) || Object.keys(sources).length === 0) {
      throw new Error("live destination snapshot fixture sources are invalid");
    }
    for (const [provider, destination] of Object.entries(sources)) {
      if (!Object.hasOwn(PROVIDERS, provider) || typeof destination !== "string") {
        throw new Error("live destination snapshot provider is invalid");
      }
      const url = new URL(destination);
      if (sanitizedDestination(url, provider) !== destination) {
        throw new Error("live destination snapshot URL is not canonical");
      }
    }
  }
  return value;
}

export function pruneLiveDestinationSnapshot(value, { fixtureIds }) {
  validateLiveDestinationSnapshot(value);
  const allowed = new Set(fixtureIds);
  const sourcesByFixture = Object.fromEntries(Object.entries(value.sourcesByFixture)
    .filter(([fixtureId]) => allowed.has(fixtureId)));
  return validateLiveDestinationSnapshot({
    checkedAt: value.checkedAt,
    sourcesByFixture,
  }, { fixtureIds });
}

export async function fetchLiveSourcePage(provider, {
  fetchImpl = fetch,
  timeoutMs = 20_000,
} = {}) {
  const definition = PROVIDERS[provider];
  if (!definition) throw new TypeError("live source provider is unsupported");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(definition.baseUrl, {
      headers: { accept: "text/html" },
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("live_source_unavailable");
    const contentType = response.headers.get("content-type") ?? "";
    if (!/^text\/html(?:;|$)/iu.test(contentType)) throw new Error("live_source_schema_changed");
    const html = await response.text();
    if (Buffer.byteLength(html, "utf8") > MAX_PAGE_BYTES) throw new Error("live_source_too_large");
    return html;
  } finally {
    clearTimeout(timeout);
  }
}

export const liveSourceProviders = Object.freeze(Object.keys(PROVIDERS));
