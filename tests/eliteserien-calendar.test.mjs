import assert from "node:assert/strict";
import test from "node:test";

import { parseEliteserienCalendar } from "../src/eliteserien-calendar.mjs";

function calendar(events) {
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${events.join("\r\n")}\r\nEND:VCALENDAR\r\n`;
}

function event({
  start = "20260711T140000",
  summary = "Fredrikstad - Lillestrøm",
  uid = "a76adb3a-b111-4530-acb8-bf341895f3d9",
} = {}) {
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `SUMMARY:${summary}`,
    `DTSTART;TZID=Europe/Oslo:${start}`,
    "DESCRIPTION:Raw score and result fields must be discarded",
    "LOCATION:Raw stadium",
    "URL:https://www.eliteserien.no/",
    "END:VEVENT",
  ].join("\r\n");
}

test("official Eliteserien calendar becomes neutral UTC fixtures across Oslo DST", () => {
  const fixtures = parseEliteserienCalendar(calendar([
    event(),
    event({
      start: "20261213T170000",
      summary: "Molde - Brann",
      uid: "b76adb3a-b111-4530-acb8-bf341895f3d9",
    }),
  ]), { from: "2026-07-01", to: "2026-12-31" });
  assert.deepEqual(fixtures.map(({ kickoffUtc, teams }) => ({ kickoffUtc, teams })), [
    { kickoffUtc: "2026-07-11T12:00:00Z", teams: ["Fredrikstad", "Lillestrøm"] },
    { kickoffUtc: "2026-12-13T16:00:00Z", teams: ["Molde", "Brann"] },
  ]);
  assert.doesNotMatch(JSON.stringify(fixtures), /score|result|stadium|description|url/i);
});

test("calendar parser rejects wrong timezone, duplicate identity, and ambiguous local time", () => {
  assert.throws(
    () => parseEliteserienCalendar(calendar([event().replace("Europe/Oslo", "UTC")]), { from: "2026-07-01", to: "2026-12-31" }),
    /timezone is unsupported/,
  );
  assert.throws(
    () => parseEliteserienCalendar(calendar([event(), event()]), { from: "2026-07-01", to: "2026-12-31" }),
    /UID is invalid or duplicated/,
  );
  assert.throws(
    () => parseEliteserienCalendar(calendar([event({ start: "20261025T023000" })]), { from: "2026-07-01", to: "2026-12-31" }),
    /ambiguous or unavailable/,
  );
});
