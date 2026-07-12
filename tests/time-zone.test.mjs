import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFixtureDates,
  dateKeyFor,
  displayTimeZoneLabel,
  localizeFixture,
  resolveDisplayTimeZone,
} from "../app/public/time-zone.js";

const fixture = {
  availability: "ready",
  competition: "World Cup",
  favorite: false,
  id: "france-morocco",
  kickoffUtc: "2026-07-09T20:00:00Z",
  teams: ["France", "Morocco"],
};

test("playback-region timezone resolves to Manila now and Oslo when the region changes", () => {
  assert.equal(resolveDisplayTimeZone("region", { region: "Philippines" }), "Asia/Manila");
  assert.equal(resolveDisplayTimeZone("region", { region: "Norway" }), "Europe/Oslo");
  assert.equal(resolveDisplayTimeZone("device", { deviceTimeZone: "Asia/Tokyo", region: "Norway" }), "Asia/Tokyo");
  assert.equal(resolveDisplayTimeZone("Asia/Manila", { region: "Norway" }), "Asia/Manila");
});

test("fixture localization handles Manila date rollover and Oslo daylight saving time", () => {
  const manila = localizeFixture(fixture, "Asia/Manila");
  assert.deepEqual(
    { dateKey: manila.dateKey, dateLabel: manila.dateLabel, kickoff: manila.kickoff },
    { dateKey: "2026-07-10", dateLabel: "Fri, Jul 10", kickoff: "04:00" },
  );
  const osloSummer = localizeFixture(fixture, "Europe/Oslo");
  assert.deepEqual(
    { dateKey: osloSummer.dateKey, dateLabel: osloSummer.dateLabel, kickoff: osloSummer.kickoff },
    { dateKey: "2026-07-09", dateLabel: "Thu, Jul 9", kickoff: "22:00" },
  );
  const osloWinter = localizeFixture({ ...fixture, kickoffUtc: "2026-12-01T20:00:00Z" }, "Europe/Oslo");
  assert.equal(osloWinter.kickoff, "21:00");
});

test("date rail derives from the localized fixture day and selected timezone", () => {
  const fixtures = [
    localizeFixture(fixture, "Asia/Manila"),
    localizeFixture({ ...fixture, id: "later", kickoffUtc: "2026-07-10T19:00:00Z" }, "Asia/Manila"),
  ];
  assert.equal(dateKeyFor(new Date("2026-07-10T12:00:00Z"), "Asia/Manila"), "2026-07-10");
  assert.deepEqual(buildFixtureDates(fixtures, { todayKey: "2026-07-10" }), [
    { key: "2026-07-10", label: "Today 10" },
    { key: "2026-07-11", label: "Sat 11" },
  ]);
  assert.equal(displayTimeZoneLabel("Asia/Manila"), "Manila time");
  assert.equal(displayTimeZoneLabel("Europe/Oslo"), "Oslo time");
});

test("midnight renders as 00:00 rather than an ambiguous 24:00", () => {
  const fixture = { kickoffUtc: "2026-07-09T16:00:00Z" };
  assert.equal(localizeFixture(fixture, "Asia/Manila").kickoff, "00:00");
});

test("an unconfirmed kickoff keeps its official date but never shows a made-up time", () => {
  const localized = localizeFixture({ kickoffTba: true, kickoffUtc: "2026-08-16T12:00:00Z" }, "Asia/Manila");
  assert.equal(localized.dateKey, "2026-08-16");
  assert.equal(localized.kickoff, "TBA");
});
