import test from "node:test";
import assert from "node:assert/strict";
import { getPublicCatalogue } from "../src/catalogue.mjs";

function installBrowserShims({ navigationState = null, settingsState = null } = {}) {
  const rootListeners = new Map();
  const root = {
    innerHTML: "",
    addEventListener(type, listener) {
      const listeners = rootListeners.get(type) ?? [];
      listeners.push(listener);
      rootListeners.set(type, listeners);
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const storage = new Map(settingsState ? [["safereplay.settings.v1", settingsState]] : []);
  const session = new Map(navigationState ? [["safereplay.navigation.v1", navigationState]] : []);
  const windowListeners = new Map();
  Object.defineProperties(globalThis, {
    document: {
      configurable: true,
      value: {
        activeElement: null,
        addEventListener() {},
        body: { classList: { toggle() {} } },
        documentElement: { scrollTop: 0 },
        querySelector(selector) { return selector === "#app" ? root : null; },
        scrollingElement: { scrollTop: 0 },
      },
    },
    localStorage: {
      configurable: true,
      value: {
        getItem(key) { return storage.get(key) ?? null; },
        setItem(key, value) { storage.set(key, String(value)); },
      },
    },
    navigator: { configurable: true, value: {} },
    sessionStorage: {
      configurable: true,
      value: {
        getItem(key) { return session.get(key) ?? null; },
        setItem(key, value) { session.set(key, String(value)); },
      },
    },
    requestAnimationFrame: { configurable: true, value(callback) { callback(); return 1; } },
    window: {
      configurable: true,
      value: { addEventListener(type, listener) { windowListeners.set(type, listener); }, location: { reload() {} }, scrollTo() {} },
    },
  });
  return { root, session, storage, rootListeners };
}

async function loadUi(catalogue = getPublicCatalogue(), options = {}) {
  const shims = installBrowserShims(options);
  globalThis.__SAFE_REPLAY_TEST_NOW__ = "2026-07-10T12:00:00Z";
  globalThis.fetch = async () => ({ ok: true, json: async () => structuredClone(catalogue) });
  const module = await import(`../app/public/app.js?ui-v2-test=${Date.now()}-${Math.random()}`);
  module.__test.setNow("2026-07-10T12:00:00Z");
  module.__test.setCatalogue(structuredClone(catalogue));
  module.__test.render();
  return { ...shims, ui: module.__test };
}

function visibleText(html) {
  return html.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function withFixture(fixture) {
  const catalogue = getPublicCatalogue();
  catalogue.fixtures.push(fixture);
  catalogue.sourcesByFixture[fixture.id] = [];
  return catalogue;
}

test("Matches is minimal, status-free, and disables fixtures without a useful destination", async () => {
  const unavailable = {
    availability: "none",
    competition: "Eliteserien",
    favorite: false,
    id: "unavailable-test-fixture",
    kickoffUtc: "2026-07-11T08:00:00Z",
    teams: ["Fredrikstad", "Lillestrøm"],
  };
  const { root, ui } = await loadUi(withFixture(unavailable));
  assert.match(root.innerHTML, /<h1>Matches<\/h1>/);
  assert.doesNotMatch(root.innerHTML, /Sources ready|Checking sources|No sources yet|Watched/);
  assert.doesNotMatch(root.innerHTML, /class="(?:format|live)-play"/);
  assert.doesNotMatch(root.innerHTML, /data-screen="watched"/);

  ui.handleAction({ dataset: { action: "select-date", date: "2026-07-11" } });
  assert.match(root.innerHTML, /class="fixture-row is-unavailable" aria-disabled="true"/);
  assert.match(root.innerHTML, /Fredrikstad/);
  assert.doesNotMatch(root.innerHTML, /data-fixture-id="unavailable-test-fixture"/);
  assert.doesNotMatch(visibleText(root.innerHTML), /\b\d+\s*[-–—]\s*\d+\b/);
});

test("World Cup tab shows every remaining match across dates and keeps unresolved bracket matches inert", async () => {
  const { root, ui } = await loadUi();
  ui.setNow("2026-07-13T02:54:00Z");
  ui.handleAction({ dataset: { action: "select-competition", competition: "World Cup" } });
  assert.match(root.innerHTML, /Remaining World Cup matches/);
  for (const team of ["France", "Spain", "England", "Argentina", "Runner-up match 101", "Winner match 101"]) {
    assert.match(root.innerHTML, new RegExp(team));
  }
  assert.doesNotMatch(root.innerHTML, /Norway|Belgium|Morocco|date-rail/);
  const unresolved = root.innerHTML.match(/<article class="fixture-row is-unavailable"[\s\S]*?Winner match 102[\s\S]*?<\/article>/u)?.[0] ?? "";
  assert.match(unresolved, /Winner match 101/);
  assert.doesNotMatch(unresolved, /data-action="open-fixture"|live-play/);
});

test("Inter Miami is a default favorite and upgrades existing saved settings once", async () => {
  const legacySettings = JSON.stringify({
    communitySources: true,
    displayTimeZone: "Asia/Manila",
    favoriteTeams: ["Manchester City", "Arsenal", "Barcelona"],
    region: "Philippines",
  });
  const { root, ui } = await loadUi(getPublicCatalogue(), { settingsState: legacySettings });
  assert.ok(ui.getState().settings.favoriteTeams.includes("Inter Miami"));
  assert.equal(ui.getState().settings.favoriteTeamsVersion, 2);

  ui.setNow("2026-07-22T12:00:00Z");
  ui.setState({ selectedCompetition: "Favorites", selectedDate: "2026-07-23", screen: "matches" });
  ui.render();
  assert.match(root.innerHTML, /Inter Miami/);
  assert.match(root.innerHTML, /Chicago Fire FC/);
});

test("unconfirmed official fixtures show TBA instead of a placeholder kickoff", async () => {
  const { root, ui } = await loadUi();
  ui.setState({ selectedCompetition: "La Liga", selectedDate: "2026-08-16", screen: "matches" });
  ui.render();
  assert.match(root.innerHTML, /TBA/);
  assert.match(root.innerHTML, /Barcelona/);
  assert.match(root.innerHTML, /Athletic Club/);
  assert.doesNotMatch(root.innerHTML, /14:00|20:00/);
});

test("unavailable fixture actions are ignored while available fixtures open detail", async () => {
  const unavailable = {
    availability: "none",
    competition: "Eliteserien",
    favorite: false,
    id: "unavailable-action-test",
    kickoffUtc: "2026-07-11T08:00:00Z",
    teams: ["Fredrikstad", "Lillestrøm"],
  };
  const { root, ui } = await loadUi(withFixture(unavailable));
  ui.handleAction({ dataset: { action: "open-fixture", fixtureId: unavailable.id } });
  assert.equal(ui.getState().screen, "matches");

  ui.handleAction({ dataset: { action: "open-fixture", fixtureId: "fifa-world-cup-2026-match-98" } });
  assert.equal(ui.getState().screen, "sources");
  assert.match(root.innerHTML, /Spain <span>vs<\/span> Belgium/);
});

test("detail groups real sources into Highlights, Extended and Full match without metadata spoilers", async () => {
  const { root, ui } = await loadUi();
  ui.handleAction({ dataset: { action: "open-fixture", fixtureId: "fifa-world-cup-2026-match-98" } });
  assert.match(root.innerHTML, /id="highlights-heading">Highlights <span class="format-duration">\(3:38\)<\/span>/);
  assert.match(root.innerHTML, /id="extended-heading">Extended highlights/);
  assert.match(root.innerHTML, /id="full-heading">Full match/);
  assert.match(root.innerHTML, /class="format-card" aria-labelledby="extended-heading"/);
  assert.match(root.innerHTML, /href="\/go\/spain-belgium-youtube-short"/);
  assert.match(root.innerHTML, /href="\/go\/spain-belgium-footreplays-extended"/);
  assert.match(root.innerHTML, /href="\/go\/spain-belgium-reddit-extended"/);
  assert.match(root.innerHTML, /Alternative 1 · FootReplays/);
  assert.doesNotMatch(root.innerHTML, /spain-belgium-reddit-full/);
  assert.match(root.innerHTML, /First half/);
  assert.match(root.innerHTML, /Second half/);
  assert.match(root.innerHTML, /href="\/go\/spain-belgium-footreplays-first-half"/);
  assert.match(root.innerHTML, /href="\/go\/spain-belgium-footreplays-second-half"/);
  assert.doesNotMatch(root.innerHTML, /https?:\/\/|watch\?v=|<iframe/i);
  assert.doesNotMatch(root.innerHTML, /Covered player|poster|thumbnail|Comments can spoil|Search titles/);
  assert.doesNotMatch(visibleText(root.innerHTML), /\b\d+\s*[-–—]\s*\d+\b/);
});

test("alternative links remain native text links and never gain play controls", async () => {
  const { root, ui, rootListeners } = await loadUi();
  ui.handleAction({ dataset: { action: "open-fixture", fixtureId: "fifa-world-cup-2026-match-98" } });
  const alternatives = root.innerHTML.match(/<a class="alternative-link"[\s\S]*?<\/a>/g) ?? [];
  assert.ok(alternatives.length >= 3);
  assert.ok(alternatives.every((link) => !/play-icon|format-play/.test(link)));

  let prevented = false;
  for (const listener of rootListeners.get("click") ?? []) {
    listener({
      preventDefault() { prevented = true; },
      stopPropagation() {},
      target: { closest() { return null; } },
    });
  }
  assert.equal(prevented, false);
});

test("community switch removes risky alternatives while keeping a covered YouTube fallback", async () => {
  const { root, ui } = await loadUi();
  ui.handleAction({ dataset: { action: "open-fixture", fixtureId: "fifa-world-cup-2026-match-98" } });
  ui.setState({ settings: { ...ui.getState().settings, communitySources: false } });
  ui.render();
  assert.match(root.innerHTML, /href="\/go\/spain-belgium-youtube-short"/);
  assert.doesNotMatch(root.innerHTML, /FootReplays|r\/footballhighlights/);
  assert.match(root.innerHTML, /full-card is-unavailable/);
});

test("international live control uses an exact TotalSportek match page and keeps fallbacks in detail", async () => {
  const { root, ui } = await loadUi();
  ui.setNow("2026-07-10T19:30:00Z");
  ui.setState({ selectedDate: null, screen: "matches", selectedFixtureId: null });
  ui.render();
  assert.match(root.innerHTML, /class="fixture-row has-live"/);
  assert.match(root.innerHTML, /class="live-play" href="\/go\/live-totalsportek-fifa-world-cup-2026-match-98"/);
  assert.doesNotMatch(root.innerHTML, /live-camel-football|live-livsports-schedule/);

  ui.handleAction({ dataset: { action: "open-fixture", fixtureId: "fifa-world-cup-2026-match-98" } });
  assert.match(root.innerHTML, /<span class="live-label">Live now<\/span>/);
  assert.match(root.innerHTML, /href="\/go\/live-totalsportek-fifa-world-cup-2026-match-98"/);
  assert.match(root.innerHTML, /Alternative 1 · Camel Live/);
  assert.match(root.innerHTML, /Alternative 2 · Livsports/);
  assert.doesNotMatch(root.innerHTML, /Score808|RBTV/);

  ui.setNow("2026-07-10T22:00:01Z");
  ui.render();
  assert.doesNotMatch(root.innerHTML, /Live now|live-totalsportek|live-camel|live-livsports/);
});

test("Eliteserien live control prioritizes the exact Camel match page", async () => {
  const liveFixture = {
    availability: "none",
    competition: "Eliteserien",
    favorite: false,
    id: "eliteserien-live-test",
    kickoffUtc: "2026-07-11T14:00:00Z",
    teams: ["Aalesund", "Molde"],
  };
  const { root, ui } = await loadUi(withFixture(liveFixture));
  ui.setNow("2026-07-11T14:30:00Z");
  ui.setState({ selectedDate: "2026-07-11", screen: "matches", selectedFixtureId: null });
  ui.render();
  assert.match(root.innerHTML, /class="live-play" href="\/go\/live-camel-eliteserien-live-test"/);

  ui.handleAction({ dataset: { action: "open-fixture", fixtureId: liveFixture.id } });
  assert.match(root.innerHTML, /href="\/go\/live-camel-eliteserien-live-test"/);
  assert.match(root.innerHTML, /Alternative 1 · TotalSportek/);
  assert.match(root.innerHTML, /Alternative 2 · Livsports/);
});

test("timezone is changed only from Settings and Manila/Oslo are pinned", async () => {
  const { root, storage, ui } = await loadUi();
  assert.doesNotMatch(root.innerHTML, /open-time-zone/);
  ui.handleAction({ dataset: { action: "navigate", screen: "settings" } });
  assert.match(root.innerHTML, /data-action="open-time-zone"/);
  ui.handleAction({ dataset: { action: "open-time-zone" } });
  assert.match(root.innerHTML, /Search city or time zone/);
  assert.ok(root.innerHTML.indexOf("Manila time") < root.innerHTML.indexOf("All time zones"));
  assert.ok(root.innerHTML.indexOf("Oslo time") < root.innerHTML.indexOf("All time zones"));

  ui.handleAction({ dataset: { action: "setting-choice", settingType: "time-zone", settingValue: "Europe/Oslo" } });
  assert.equal(ui.getState().settings.displayTimeZone, "Europe/Oslo");
  assert.equal(ui.getState().sheet, null);
  assert.equal(JSON.parse(storage.get("safereplay.settings.v1")).displayTimeZone, "Europe/Oslo");
});

test("an arbitrary valid IANA timezone can persist without changing playback region", async () => {
  const first = await loadUi();
  first.ui.handleAction({ dataset: { action: "navigate", screen: "settings" } });
  first.ui.handleAction({ dataset: { action: "setting-choice", settingType: "time-zone", settingValue: "America/New_York" } });
  assert.equal(first.ui.getState().settings.region, "Philippines");
  const saved = first.storage.get("safereplay.settings.v1");
  const returned = await loadUi(getPublicCatalogue(), { settingsState: saved });
  assert.equal(returned.ui.getState().settings.displayTimeZone, "America/New_York");
  assert.equal(returned.ui.getState().settings.region, "Philippines");
});

test("neutral navigation persistence contains no provider or result metadata", async () => {
  const first = await loadUi();
  first.ui.handleAction({ dataset: { action: "open-fixture", fixtureId: "fifa-world-cup-2026-match-98" } });
  const saved = first.session.get("safereplay.navigation.v1");
  assert.deepEqual(JSON.parse(saved), {
    screen: "sources",
    selectedCompetition: "All",
    selectedDate: "2026-07-10",
    selectedFixtureId: "fifa-world-cup-2026-match-98",
  });
  assert.doesNotMatch(saved, /provider|title|thumbnail|result|score|url|watched/i);
});

test("stale restored detail state falls back to Matches", async () => {
  const stale = JSON.stringify({ screen: "sources", selectedCompetition: "All", selectedDate: "2099-01-01", selectedFixtureId: "removed-fixture", unsafeTitle: "do not render" });
  const { root, ui } = await loadUi(getPublicCatalogue(), { navigationState: stale });
  assert.equal(ui.getState().screen, "matches");
  assert.match(root.innerHTML, /<h1>Matches<\/h1>/);
  assert.doesNotMatch(root.innerHTML, /do not render/);
});
