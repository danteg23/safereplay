const REGION_TIME_ZONES = Object.freeze({
  Norway: "Europe/Oslo",
  Philippines: "Asia/Manila",
});

export function validTimeZone(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function resolveDisplayTimeZone(setting, { deviceTimeZone = null, region = "Philippines" } = {}) {
  if (setting === "region") return REGION_TIME_ZONES[region] ?? (validTimeZone(deviceTimeZone) ? deviceTimeZone : "UTC");
  if (setting === "device") return validTimeZone(deviceTimeZone) ? deviceTimeZone : (REGION_TIME_ZONES[region] ?? "UTC");
  return validTimeZone(setting) ? setting : (REGION_TIME_ZONES[region] ?? "UTC");
}

function partsFor(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  });
  return Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function dateKeyFor(date, timeZone) {
  const parts = partsFor(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function localizeFixture(fixture, timeZone) {
  const kickoffDate = new Date(fixture?.kickoffUtc);
  if (Number.isNaN(kickoffDate.valueOf())) throw new TypeError("fixture kickoffUtc is invalid");
  if (!validTimeZone(timeZone)) throw new TypeError("display time zone is invalid");
  const parts = partsFor(kickoffDate, timeZone);
  return {
    ...fixture,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    dateLabel: new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      timeZone,
      weekday: "short",
    }).format(kickoffDate),
    kickoff: `${parts.hour}:${parts.minute}`,
  };
}

export function buildFixtureDates(fixtures, { todayKey = null } = {}) {
  if (!Array.isArray(fixtures) || fixtures.length === 0) throw new TypeError("fixtures must not be empty");
  const keys = [...new Set(fixtures.map((fixture) => fixture.dateKey))].sort();
  return keys.map((key) => {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(key)) throw new TypeError("fixture dateKey is invalid");
    const date = new Date(`${key}T00:00:00Z`);
    if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== key) throw new TypeError("fixture dateKey is invalid");
    const day = String(date.getUTCDate());
    const weekday = new Intl.DateTimeFormat("en", { timeZone: "UTC", weekday: "short" }).format(date);
    return { key, label: key === todayKey ? `Today ${day}` : `${weekday} ${day}` };
  });
}

export function displayTimeZoneLabel(timeZone) {
  if (timeZone === "Asia/Manila") return "Manila time";
  if (timeZone === "Europe/Oslo") return "Oslo time";
  if (timeZone === "UTC") return "UTC";
  return `${timeZone.split("/").at(-1).replaceAll("_", " ")} time`;
}

export function isSupportedTimeZoneSetting(value) {
  return value === "region" || value === "device" || validTimeZone(value);
}
