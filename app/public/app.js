import { icons } from "./icons.js?v=20260711-1";
import {
  buildFixtureDates,
  dateKeyFor,
  displayTimeZoneLabel,
  isSupportedTimeZoneSetting,
  localizeFixture,
  resolveDisplayTimeZone,
} from "./time-zone.js";

const root = document.querySelector("#app");
const configuredBase = document.querySelector('meta[name="safereplay-base"]')?.content ?? "/";
const appBase = `/${configuredBase.replace(/^\/+|\/+$/gu, "")}${configuredBase === "/" ? "" : "/"}`;

function appUrl(path) {
  const value = String(path ?? "");
  if (/^https?:\/\//u.test(value)) return value;
  return `${appBase}${value.replace(/^\/+/, "")}`;
}
const competitionOrder = [
  "Premier League",
  "La Liga",
  "Ligue 1",
  "MLS",
  "Eliteserien",
  "Champions League",
  "World Cup",
  "Euros",
];
const competitionValues = ["All", "Favorites", ...competitionOrder];
const storageKey = "safereplay.settings.v1";
const navigationStorageKey = "safereplay.navigation.v1";
const favoriteTeamsVersion = 2;
const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;
const internationalLiveSources = Object.freeze([
  { label: "TotalSportek", provider: "totalsportek" },
  { label: "Camel Live", provider: "camel" },
  { label: "Livsports", redirectPath: "/go/live-livsports-schedule" },
]);
const norwegianLiveSources = Object.freeze([
  { label: "Camel Live", provider: "camel" },
  { label: "TotalSportek", provider: "totalsportek" },
  { label: "Livsports", redirectPath: "/go/live-livsports-schedule" },
]);
const commonTimeZones = Object.freeze([
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
]);

function loadNavigationState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(navigationStorageKey) ?? "null");
    if (!saved || typeof saved !== "object") return {};
    return {
      screen: ["matches", "sources", "settings"].includes(saved.screen) ? saved.screen : "matches",
      selectedCompetition: competitionValues.includes(saved.selectedCompetition) ? saved.selectedCompetition : "All",
      selectedDate: typeof saved.selectedDate === "string" ? saved.selectedDate : null,
      selectedFixtureId: typeof saved.selectedFixtureId === "string" ? saved.selectedFixtureId : null,
    };
  } catch {
    return {};
  }
}

function saveNavigationState() {
  try {
    sessionStorage.setItem(navigationStorageKey, JSON.stringify({
      screen: state.screen,
      selectedCompetition: state.selectedCompetition,
      selectedDate: state.selectedDate,
      selectedFixtureId: state.selectedFixtureId,
    }));
  } catch {
    // Navigation remains functional when storage is unavailable.
  }
}

function loadSettings() {
  const defaults = {
    communitySources: true,
    displayTimeZone: "Asia/Manila",
    favoriteTeams: ["Manchester City", "Arsenal", "Barcelona", "Inter Miami"],
    favoriteTeamsVersion,
    region: "Philippines",
  };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (!saved || typeof saved !== "object") return defaults;
    const savedFavoriteTeams = Array.isArray(saved.favoriteTeams) ? saved.favoriteTeams : defaults.favoriteTeams;
    const migratedFavoriteTeams = saved.favoriteTeamsVersion === favoriteTeamsVersion
      ? savedFavoriteTeams
      : [...new Set([...savedFavoriteTeams, "Inter Miami"])];
    return {
      communitySources: saved.communitySources !== false,
      displayTimeZone: isSupportedTimeZoneSetting(saved.displayTimeZone) ? saved.displayTimeZone : defaults.displayTimeZone,
      favoriteTeams: migratedFavoriteTeams,
      favoriteTeamsVersion,
      region: ["Philippines", "Norway", "Other"].includes(saved.region) ? saved.region : defaults.region,
    };
  } catch {
    return defaults;
  }
}

function saveSettings() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state.settings));
  } catch {
    // Settings still work for the current session.
  }
}

let catalogue = null;
let installPrompt = null;
let lastFocusedElement = null;
let sheetTouchStartY = null;
let nowProvider = () => globalThis.__SAFE_REPLAY_TEST_NOW__
  ? new Date(globalThis.__SAFE_REPLAY_TEST_NOW__)
  : new Date();
let state = {
  screen: "matches",
  selectedDate: null,
  selectedCompetition: "All",
  selectedFixtureId: null,
  sheet: null,
  timeZoneQuery: "",
  settings: loadSettings(),
  ...loadNavigationState(),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

function activeTimeZone() {
  return resolveDisplayTimeZone(state.settings.displayTimeZone, {
    deviceTimeZone: deviceTimeZone(),
    region: state.settings.region,
  });
}

function localizedFixtures() {
  const timeZone = activeTimeZone();
  return catalogue.fixtures.map((fixture) => localizeFixture(fixture, timeZone));
}

function localizedDates(fixtures = localizedFixtures()) {
  return buildFixtureDates(fixtures, { todayKey: todayKey() });
}

function todayKey() {
  return dateKeyFor(nowProvider(), activeTimeZone());
}

function activeCompetitionTabs() {
  const present = new Set(catalogue.fixtures.map((fixture) => fixture.competition));
  return ["All", "Favorites", ...competitionOrder.filter((competition) => present.has(competition))];
}

function brandMarkup() {
  return `<span class="brand"><img src="${appUrl("brand-mark.svg")}" alt=""><span>SafeReplay</span></span>`;
}

function mobileHeader(screen) {
  const destination = screen === "settings" ? "matches" : "settings";
  const label = destination === "settings" ? "Settings" : "Matches";
  const icon = destination === "settings" ? icons.gear : icons.football;
  return `<header class="mobile-header">${brandMarkup()}<button class="mobile-nav-action" data-action="navigate" data-screen="${destination}" aria-label="${label}">${icon}<span>${label}</span></button></header>`;
}

function navItem(screen, label, icon) {
  const selected = state.screen === screen || (screen === "matches" && state.screen === "sources");
  return `
    <button class="nav-item${selected ? " is-selected" : ""}" data-action="navigate" data-screen="${screen}"${selected ? ' aria-current="page"' : ""}>
      ${icon}<span>${label}</span>
    </button>`;
}

function primaryNav() {
  return `
    <nav class="bottom-nav" aria-label="Primary">
      <div class="nav-brand">${brandMarkup()}</div>
      ${navItem("matches", "Matches", icons.football)}
      ${navItem("settings", "Settings", icons.gear)}
    </nav>`;
}

function dateTab(date) {
  const [word, day] = date.label.split(" ");
  return `
    <button role="tab" class="date-tab${state.selectedDate === date.key ? " is-selected" : ""}" aria-selected="${state.selectedDate === date.key}" data-action="select-date" data-date="${date.key}">
      <span>${escapeHtml(word)}</span><strong>${escapeHtml(day ?? "")}</strong>
    </button>`;
}

function sourcesForFixture(fixtureId) {
  const records = catalogue.sourcesByFixture[fixtureId] ?? [];
  return state.settings.communitySources
    ? records
    : records.filter((source) => source.provenance !== "community_unverified");
}

function fixtureIsLive(fixture) {
  const kickoff = new Date(fixture.kickoffUtc).valueOf();
  const now = nowProvider().valueOf();
  return Number.isFinite(kickoff) && now >= kickoff && now < kickoff + LIVE_WINDOW_MS;
}

function fixtureIsActionable(fixture) {
  return sourcesForFixture(fixture.id).length > 0 || fixtureIsLive(fixture);
}

function liveSourcesForFixture(fixture) {
  const sources = fixture.competition === "Eliteserien" ? norwegianLiveSources : internationalLiveSources;
  return sources.map((source) => ({
    label: source.label,
    redirectPath: source.redirectPath ?? `/go/live-${source.provider}-${fixture.id}`,
  }));
}

function fixtureRow(fixture) {
  const actionable = fixtureIsActionable(fixture);
  const live = fixtureIsLive(fixture);
  const primaryLiveSource = live ? liveSourcesForFixture(fixture)[0] : null;
  const copy = `
    <span class="fixture-time"><strong>${escapeHtml(fixture.kickoff)}</strong><small>${escapeHtml(fixture.competition)}</small></span>
    <span class="fixture-teams"><strong>${escapeHtml(fixture.teams[0])}</strong><strong>${escapeHtml(fixture.teams[1])}</strong></span>`;
  return `
    <article class="fixture-row${live ? " has-live" : ""}${actionable ? "" : " is-unavailable"}"${actionable ? "" : ' aria-disabled="true"'}>
      ${actionable ? `
        <button class="fixture-main" data-action="open-fixture" data-fixture-id="${escapeHtml(fixture.id)}" aria-label="Open ${escapeHtml(fixture.teams.join(" versus "))}">
          ${copy}<span class="fixture-chevron">${icons.chevron}</span>
        </button>` : `<div class="fixture-main">${copy}</div>`}
      ${primaryLiveSource ? `<a class="live-play" href="${appUrl(primaryLiveSource.redirectPath)}" rel="noreferrer" aria-label="Watch ${escapeHtml(fixture.teams.join(" versus "))} live on ${escapeHtml(primaryLiveSource.label)}">${icons.play}</a>` : ""}
    </article>`;
}

function homeScreen() {
  const allFixtures = localizedFixtures();
  const dates = localizedDates(allFixtures);
  const fixtures = allFixtures.filter((fixture) => {
    if (fixture.dateKey !== state.selectedDate) return false;
    if (state.selectedCompetition === "Favorites") {
      return fixture.teams.some((team) => state.settings.favoriteTeams.includes(team));
    }
    return state.selectedCompetition === "All" || fixture.competition === state.selectedCompetition;
  });
  return `
    <div class="app-shell">
      <main class="screen home-screen">
        ${mobileHeader("matches")}
        <h1>Matches</h1>
        <div class="date-rail" role="tablist" aria-label="Match date">${dates.map(dateTab).join("")}</div>
        <div class="text-tabs competition-tabs" role="tablist" aria-label="Competition">
          ${activeCompetitionTabs().map((tab) => `<button role="tab" aria-selected="${state.selectedCompetition === tab}" class="text-tab${state.selectedCompetition === tab ? " is-selected" : ""}" data-action="select-competition" data-competition="${escapeHtml(tab)}">${escapeHtml(tab)}</button>`).join("")}
        </div>
        <section class="fixture-list" aria-label="Fixtures">
          ${fixtures.length ? fixtures.map(fixtureRow).join("") : `<div class="simple-empty"><h2>No matches here</h2><p>Try another date or competition.</p></div>`}
        </section>
      </main>
      ${primaryNav()}
    </div>`;
}

function sourcePriority(source) {
  if (source.provenance === "verified_official" && source.evidenceStatus === "player_candidate") return 0;
  if (source.provenance === "verified_official") return 1;
  if (source.evidenceStatus === "item_observed") return 2;
  if (source.evidenceStatus === "player_candidate") return 3;
  if (source.evidenceStatus === "directory_candidate") return 4;
  return 5;
}

function uniqueSources(sources) {
  const paths = new Set();
  return sources.filter((source) => {
    if (paths.has(source.redirectPath)) return false;
    paths.add(source.redirectPath);
    return true;
  });
}

function providerLabel(source) {
  if (/youtube/iu.test(source.providerName)) return "YouTube";
  if (/r\/footballhighlights/iu.test(source.providerName)) return "r/footballhighlights";
  return source.providerName.split(" · ")[0];
}

function sourceLabel(source) {
  const duration = source.durationLabel ? ` (${source.durationLabel})` : "";
  return `${providerLabel(source)}${duration}`;
}

function alternativeLinks(sources) {
  const labels = new Set();
  return uniqueSources(sources).filter((source) => {
    const label = providerLabel(source).toLowerCase();
    if (labels.has(label)) return false;
    labels.add(label);
    return true;
  }).map((source, index) => `
    <a class="alternative-link" href="${escapeHtml(appUrl(source.redirectPath))}" rel="noreferrer">Alternative ${index + 1} · ${escapeHtml(sourceLabel(source))}</a>`).join("");
}

function standardFormatCard({ id, label, sources }) {
  const sorted = [...sources].sort((a, b) => sourcePriority(a) - sourcePriority(b));
  const primary = sorted[0] ?? null;
  const alternatives = primary ? sorted.filter((source) => source !== primary) : [];
  const duration = primary?.durationLabel ? ` <span class="format-duration">(${escapeHtml(primary.durationLabel)})</span>` : "";
  return `
    <section class="format-card${primary ? "" : " is-unavailable"}" aria-labelledby="${id}-heading">
      <div class="format-card-heading">
        <h2 id="${id}-heading">${label}${duration}</h2>
        ${primary ? `<a class="format-play" href="${escapeHtml(appUrl(primary.redirectPath))}" rel="noreferrer" aria-label="Play ${label}">${icons.play}</a>` : ""}
      </div>
      ${alternatives.length ? `<div class="format-alternatives">${alternativeLinks(alternatives)}</div>` : ""}
    </section>`;
}

function fullMatchCard(sources) {
  const firstHalf = sources.find((source) => /first half/iu.test(source.providerName));
  const secondHalf = sources.find((source) => /second half/iu.test(source.providerName));
  const claimed = new Set([firstHalf, secondHalf].filter(Boolean));
  const alternatives = sources.filter((source) => !claimed.has(source));
  const available = sources.length > 0;
  return `
    <section class="format-card full-card${available ? "" : " is-unavailable"}" aria-labelledby="full-heading">
      <div class="format-card-heading"><h2 id="full-heading">Full match</h2></div>
      ${(firstHalf || secondHalf) ? `<div class="half-list">
        ${firstHalf ? `<a class="half-row" href="${escapeHtml(appUrl(firstHalf.redirectPath))}" rel="noreferrer"><span>First half</span><span class="format-play" aria-hidden="true">${icons.play}</span></a>` : ""}
        ${secondHalf ? `<a class="half-row" href="${escapeHtml(appUrl(secondHalf.redirectPath))}" rel="noreferrer"><span>Second half</span><span class="format-play" aria-hidden="true">${icons.play}</span></a>` : ""}
      </div>` : ""}
      <div class="format-alternatives">${alternativeLinks(alternatives)}</div>
    </section>`;
}

function liveCard(fixture) {
  if (!fixtureIsLive(fixture)) return "";
  const sources = liveSourcesForFixture(fixture);
  return `
    <section class="live-card" aria-labelledby="live-heading">
      <div class="format-card-heading">
        <div><span class="live-label">Live now</span><h2 id="live-heading">Watch live</h2></div>
        <a class="format-play" href="${appUrl(sources[0].redirectPath)}" rel="noreferrer" aria-label="Open ${escapeHtml(sources[0].label)} live source">${icons.play}</a>
      </div>
      <div class="format-alternatives">${sources.slice(1).map((source, index) => `<a class="alternative-link" href="${appUrl(source.redirectPath)}" rel="noreferrer">Alternative ${index + 1} · ${source.label}</a>`).join("")}</div>
    </section>`;
}

function sourceScreen() {
  const fixture = localizedFixtures().find((candidate) => candidate.id === state.selectedFixtureId);
  if (!fixture) return homeScreen();
  const sources = sourcesForFixture(fixture.id);
  const highlights = sources.filter((source) => source.format === "short" || source.format === "mini");
  const extended = sources.filter((source) => source.format === "extended");
  const full = sources.filter((source) => source.format === "full" || source.format === "halves");
  const timeZoneName = displayTimeZoneLabel(activeTimeZone()).replace(/ time$/u, "");
  return `
    <div class="app-shell">
      <main class="screen source-screen">
        <header class="detail-header">
          <button class="back-button" data-action="back-to-matches" aria-label="Back to matches">${icons.back}</button>
          ${brandMarkup()}
        </header>
        <section class="match-hero">
          <h1>${escapeHtml(fixture.teams[0])} <span>vs</span> ${escapeHtml(fixture.teams[1])}</h1>
          <p>${escapeHtml(fixture.competition)} · ${escapeHtml(fixture.dateLabel)} · ${escapeHtml(fixture.kickoff)} ${escapeHtml(timeZoneName)}</p>
        </section>
        <div class="format-stack">
          ${liveCard(fixture)}
          ${standardFormatCard({ id: "highlights", label: "Highlights", sources: highlights })}
          ${standardFormatCard({ id: "extended", label: "Extended highlights", sources: extended })}
          ${fullMatchCard(full)}
        </div>
      </main>
      ${primaryNav()}
      ${state.sheet ? sheetMarkup() : ""}
    </div>`;
}

function settingChoice(type, label, selected, value = label) {
  return `<button class="setting-row" data-action="setting-choice" data-setting-type="${type}" data-setting-value="${escapeHtml(value)}" aria-pressed="${selected}"><span>${escapeHtml(label)}</span>${selected ? `<span class="setting-check">${icons.check}</span>` : ""}</button>`;
}

function toggleRow(key, label, description, checked) {
  return `<button class="setting-row setting-row-tall" role="switch" aria-checked="${checked}" data-action="toggle-setting" data-setting-key="${key}"><span><strong>${label}</strong><small>${description}</small></span><span class="switch${checked ? " is-on" : ""}" aria-hidden="true"><i></i></span></button>`;
}

function settingsScreen() {
  return `
    <div class="app-shell">
      <main class="screen settings-screen">
        ${mobileHeader("settings")}
        <h1>Settings</h1>
        <div class="settings-grid">
          <section class="settings-group"><h2>Playback region</h2>${["Philippines", "Norway", "Other"].map((region) => settingChoice("region", region, state.settings.region === region)).join("")}</section>
          <section class="settings-group"><h2>Time zone</h2><button class="setting-row setting-row-tall" data-action="open-time-zone"><span><strong>${escapeHtml(displayTimeZoneLabel(activeTimeZone()))}</strong><small>Used for every kickoff time</small></span>${icons.chevron}</button></section>
          <section class="settings-group"><h2>Favorite teams</h2>${["Manchester City", "Arsenal", "Barcelona", "Inter Miami"].map((team) => settingChoice("favorite", team, state.settings.favoriteTeams.includes(team))).join("")}<button class="setting-row" data-action="show-team-note"><span>Add team</span>${icons.chevron}</button></section>
          <section class="settings-group"><h2>Competitions</h2><button class="setting-row setting-row-tall" data-action="show-competitions"><span><strong>8 selected</strong><small>Premier League · La Liga · Ligue 1 · MLS · Eliteserien · Champions League · World Cup · Euros</small></span>${icons.chevron}</button></section>
          <section class="settings-group"><h2>Sources</h2>${toggleRow("communitySources", "Community sources", "Always shown as unverified", state.settings.communitySources)}<div class="setting-row static-row"><span>Show provenance</span><span class="setting-value">Always</span></div></section>
          <section class="settings-group"><h2>App</h2><button class="setting-row" data-action="install"><span>Install app</span>${icons.chevron}</button></section>
        </div>
      </main>
      ${primaryNav()}
      ${state.sheet ? sheetMarkup() : ""}
    </div>`;
}

function timeZoneLabel(value) {
  if (value === "Asia/Manila") return "Manila time";
  if (value === "Europe/Oslo") return "Oslo time";
  if (value === "UTC") return "UTC";
  return `${value.split("/").at(-1).replaceAll("_", " ")} time`;
}

function timeZoneOffset(value) {
  try {
    const name = new Intl.DateTimeFormat("en", { timeZone: value, timeZoneName: "shortOffset" })
      .formatToParts(nowProvider()).find((part) => part.type === "timeZoneName")?.value;
    return name?.replace("GMT", "UTC") ?? value;
  } catch {
    return value;
  }
}

function supportedTimeZones() {
  try {
    const values = Intl.supportedValuesOf?.("timeZone") ?? commonTimeZones;
    return [...new Set([...values, ...commonTimeZones])];
  } catch {
    return [...commonTimeZones];
  }
}

function timeZoneOption(value) {
  const selected = activeTimeZone() === value;
  return `<button class="time-zone-option" data-action="setting-choice" data-setting-type="time-zone" data-setting-value="${escapeHtml(value)}" aria-pressed="${selected}"><span><strong>${escapeHtml(timeZoneLabel(value))}</strong><small>${escapeHtml(timeZoneOffset(value))}</small></span>${selected ? `<span class="setting-check">${icons.check}</span>` : ""}</button>`;
}

function timeZoneResults(query = state.timeZoneQuery) {
  const normalized = query.trim().toLowerCase();
  return supportedTimeZones()
    .filter((value) => !["Asia/Manila", "Europe/Oslo"].includes(value))
    .filter((value) => !normalized || `${value} ${timeZoneLabel(value)}`.toLowerCase().includes(normalized))
    .slice(0, normalized ? 80 : 30)
    .map(timeZoneOption).join("") || `<p class="time-zone-empty">No time zones found.</p>`;
}

function timeZoneSheet() {
  return `
    <div class="sheet-layer" data-action="dismiss-sheet">
      <section class="bottom-sheet time-zone-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" data-sheet-panel>
        <div class="sheet-handle" aria-hidden="true"></div>
        <header><h2 id="sheet-title">Time zone</h2><button data-action="dismiss-sheet" aria-label="Close">${icons.close}</button></header>
        <label class="time-zone-search">${icons.search}<input type="search" value="${escapeHtml(state.timeZoneQuery)}" placeholder="Search city or time zone" data-action="search-time-zone" autocomplete="off"></label>
        <div class="pinned-time-zones">${timeZoneOption("Asia/Manila")}${timeZoneOption("Europe/Oslo")}</div>
        <p class="time-zone-section-label">All time zones</p>
        <div class="time-zone-results" data-time-zone-results>${timeZoneResults()}</div>
      </section>
    </div>`;
}

function infoSheet(sheet) {
  return `<div class="sheet-layer" data-action="dismiss-sheet"><section class="bottom-sheet info-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" data-sheet-panel><div class="sheet-handle" aria-hidden="true"></div><h2 id="sheet-title">${escapeHtml(sheet.title)}</h2><p>${escapeHtml(sheet.message)}</p><button class="primary-button full-width" data-action="dismiss-sheet">Done</button></section></div>`;
}

function sheetMarkup() {
  return state.sheet?.type === "time-zone" ? timeZoneSheet() : infoSheet(state.sheet);
}

function render({ resetScroll = false } = {}) {
  if (!catalogue) return;
  const fixtures = localizedFixtures();
  const dates = localizedDates(fixtures);
  if (!dates.some((date) => date.key === state.selectedDate)) {
    const today = todayKey();
    state.selectedDate = dates.find((date) => date.key >= today)?.key ?? dates.at(-1)?.key ?? null;
  }
  if (state.screen === "sources" && !catalogue.fixtures.some((fixture) => fixture.id === state.selectedFixtureId)) {
    state.screen = "matches";
    state.selectedFixtureId = null;
  }
  saveNavigationState();
  const scrollTop = document.scrollingElement?.scrollTop ?? 0;
  root.innerHTML = state.screen === "sources" ? sourceScreen() : state.screen === "settings" ? settingsScreen() : homeScreen();
  if (state.screen === "matches") requestAnimationFrame(() => root.querySelector(".date-tab.is-selected")?.scrollIntoView({ block: "nearest", inline: "center" }));
  document.body.classList.toggle("sheet-open", Boolean(state.sheet));
  if (state.sheet) {
    root.querySelector(".screen")?.setAttribute("inert", "");
    root.querySelector(".screen")?.setAttribute("aria-hidden", "true");
    root.querySelector(".bottom-nav")?.setAttribute("inert", "");
    root.querySelector(".bottom-nav")?.setAttribute("aria-hidden", "true");
  }
  if (resetScroll) {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  } else if (state.screen !== "settings") {
    document.documentElement.scrollTop = scrollTop;
  }
  if (state.sheet) requestAnimationFrame(() => root.querySelector(".bottom-sheet input, .bottom-sheet button")?.focus());
}

function openInfo(title, message) {
  lastFocusedElement = document.activeElement;
  state.sheet = { type: "info", title, message };
  render();
}

function restoreFocus() {
  if (typeof lastFocusedElement?.focus === "function") lastFocusedElement.focus();
}

function handleAction(target) {
  const action = target.dataset.action;
  if (action === "navigate") {
    state.screen = target.dataset.screen;
    state.sheet = null;
    render({ resetScroll: true });
    return;
  }
  if (action === "select-date") {
    state.selectedDate = target.dataset.date;
    render();
    return;
  }
  if (action === "select-competition") {
    state.selectedCompetition = target.dataset.competition;
    render();
    return;
  }
  if (action === "open-fixture") {
    const fixture = localizedFixtures().find((candidate) => candidate.id === target.dataset.fixtureId);
    if (!fixture || !fixtureIsActionable(fixture)) return;
    state.selectedFixtureId = fixture.id;
    state.screen = "sources";
    render({ resetScroll: true });
    return;
  }
  if (action === "back-to-matches") {
    state.screen = "matches";
    render({ resetScroll: true });
    return;
  }
  if (action === "open-time-zone") {
    lastFocusedElement = document.activeElement;
    state.timeZoneQuery = "";
    state.sheet = { type: "time-zone" };
    render();
    return;
  }
  if (action === "dismiss-sheet") {
    state.sheet = null;
    render();
    requestAnimationFrame(restoreFocus);
    return;
  }
  if (action === "setting-choice") {
    const type = target.dataset.settingType;
    const value = target.dataset.settingValue;
    if (type === "region") state.settings.region = value;
    if (type === "time-zone" && isSupportedTimeZoneSetting(value)) {
      state.settings.displayTimeZone = value;
      state.sheet = null;
    }
    if (type === "favorite") {
      const favorites = new Set(state.settings.favoriteTeams);
      favorites.has(value) ? favorites.delete(value) : favorites.add(value);
      state.settings.favoriteTeams = [...favorites];
    }
    saveSettings();
    render();
    return;
  }
  if (action === "toggle-setting") {
    const key = target.dataset.settingKey;
    state.settings[key] = !state.settings[key];
    saveSettings();
    render();
    return;
  }
  if (action === "show-team-note") {
    openInfo("Favorite teams", "City, Arsenal, Barcelona and Inter Miami are ready. More team controls can follow the fixture feed.");
    return;
  }
  if (action === "show-competitions") {
    openInfo("Competitions", "Premier League, La Liga, Ligue 1, MLS, Eliteserien, Champions League, World Cup and Euros are selected.");
    return;
  }
  if (action === "install") {
    if (installPrompt) installPrompt.prompt();
    else openInfo("Install SafeReplay", "On iPhone, use Safari Share → Add to Home Screen. On desktop, use your browser's Install app option.");
  }
}

root.addEventListener("click", (event) => {
  const panel = event.target.closest("[data-sheet-panel]");
  const target = event.target.closest("[data-action]");
  if (!target || target.dataset.action === "search-time-zone") return;
  if (panel && !panel.contains(target)) return;
  event.preventDefault();
  event.stopPropagation();
  handleAction(target);
});

root.addEventListener("input", (event) => {
  const target = event.target.closest("[data-action='search-time-zone']");
  if (!target) return;
  state.timeZoneQuery = target.value;
  const results = root.querySelector("[data-time-zone-results]");
  if (results) results.innerHTML = timeZoneResults();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.sheet) {
    state.sheet = null;
    render();
    requestAnimationFrame(restoreFocus);
  }
});

root.addEventListener("touchstart", (event) => {
  if (!state.sheet || !event.target.closest(".bottom-sheet")) return;
  sheetTouchStartY = event.changedTouches[0]?.clientY ?? null;
}, { passive: true });

root.addEventListener("touchend", (event) => {
  if (!state.sheet || sheetTouchStartY === null) return;
  const endY = event.changedTouches[0]?.clientY ?? sheetTouchStartY;
  if (endY - sheetTouchStartY >= 80) {
    state.sheet = null;
    render();
    requestAnimationFrame(restoreFocus);
  }
  sheetTouchStartY = null;
}, { passive: true });

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
});

window.addEventListener("pageshow", (event) => {
  if (!event.persisted || !state.sheet) return;
  state.sheet = null;
  render();
});

async function start() {
  try {
    const response = await fetch(appUrl("api/catalogue.json"), { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Catalogue returned ${response.status}`);
    catalogue = await response.json();
    render();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register(appUrl("sw.js")).catch(() => {});
  } catch {
    root.innerHTML = `<main class="boot-state error-state"><div class="boot-brand">${brandMarkup()}</div><h1>SafeReplay is unavailable</h1><p>The spoiler-safe catalogue could not be loaded.</p><button data-action="reload">Try again</button></main>`;
    root.querySelector("[data-action='reload']")?.addEventListener("click", () => window.location.reload());
  }
}

start();

export const __test = Object.freeze({
  getHtml: () => root.innerHTML,
  getState: () => structuredClone(state),
  handleAction,
  render,
  setCatalogue(value) { catalogue = value; },
  setNow(value) {
    const instant = new Date(value);
    if (Number.isNaN(instant.valueOf())) throw new TypeError("test instant is invalid");
    nowProvider = () => new Date(instant);
  },
  setState(value) { state = { ...state, ...value }; },
});
