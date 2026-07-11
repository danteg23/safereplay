const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const LOCAL_DATE_TIME = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function dateBound(value, path, endOfDay = false) {
  assert(DATE.test(value ?? ""), `${path} must be YYYY-MM-DD`);
  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const date = new Date(`${value}${suffix}`);
  assert(!Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value, `${path} must be a real date`);
  return date.valueOf();
}

function partsAt(instant) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Oslo",
    year: "numeric",
  }).formatToParts(instant);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function osloLocalToUtc(value, path) {
  const match = LOCAL_DATE_TIME.exec(value ?? "");
  assert(match, `${path} must be a local basic date-time`);
  const [, year, month, day, hour, minute, second] = match;
  const localAsUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  const canonicalLocal = new Date(localAsUtc).toISOString().replaceAll(/[-:]/gu, "").slice(0, 15);
  assert(canonicalLocal === value, `${path} must be a real local date-time`);

  const matches = [];
  for (let deltaMinutes = -180; deltaMinutes <= 180; deltaMinutes += 1) {
    const candidate = new Date(localAsUtc + (deltaMinutes * 60_000));
    const parts = partsAt(candidate);
    if (`${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}` === value) {
      matches.push(candidate);
    }
  }
  assert(matches.length === 1, `${path} is ambiguous or unavailable in Europe/Oslo`);
  return matches[0].toISOString().replace(".000Z", "Z");
}

function text(value, path, maxLength = 100) {
  assert(typeof value === "string" && value.trim() && value.length <= maxLength, `${path} must be bounded text`);
  assert(!/[\\\p{Cc}\p{Cf}]/u.test(value), `${path} contains unsupported characters`);
  return value.trim();
}

function eventProperties(block, index) {
  const properties = new Map();
  for (const line of block.split("\n")) {
    if (!line || line === "BEGIN:VEVENT" || line === "END:VEVENT") continue;
    const separator = line.indexOf(":");
    assert(separator > 0, `events[${index}] contains an invalid content line`);
    const rawName = line.slice(0, separator);
    const name = rawName.split(";", 1)[0];
    if (!["UID", "SUMMARY", "DTSTART"].includes(name)) continue;
    assert(!properties.has(name), `events[${index}].${name} is duplicated`);
    properties.set(name, { rawName, value: line.slice(separator + 1) });
  }
  for (const required of ["UID", "SUMMARY", "DTSTART"]) {
    assert(properties.has(required), `events[${index}].${required} is required`);
  }
  return properties;
}

export function parseEliteserienCalendar(body, { from, to }) {
  assert(typeof body === "string", "calendar body must be text");
  assert(!body.includes("\0"), "calendar body contains NUL");
  const unfolded = body.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  assert(unfolded.startsWith("BEGIN:VCALENDAR\n") && unfolded.trimEnd().endsWith("END:VCALENDAR"), "calendar envelope is invalid");
  const blocks = [...unfolded.matchAll(/BEGIN:VEVENT\n[\s\S]*?\nEND:VEVENT/gu)].map((match) => match[0]);
  assert(blocks.length > 0, "calendar contains no events");

  const fromMs = dateBound(from, "from");
  const toMs = dateBound(to, "to", true);
  assert(fromMs <= toMs, "from must not be after to");
  const ids = new Set();
  const fixtures = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const properties = eventProperties(blocks[index], index);
    const uid = text(properties.get("UID").value, `events[${index}].UID`).toLowerCase();
    assert(UUID.test(uid) && !ids.has(uid), `events[${index}].UID is invalid or duplicated`);
    ids.add(uid);

    const summary = text(properties.get("SUMMARY").value, `events[${index}].SUMMARY`, 170);
    const teams = summary.split(" - ");
    assert(teams.length === 2, `events[${index}].SUMMARY must contain two teams`);
    teams[0] = text(teams[0], `events[${index}].home`, 80);
    teams[1] = text(teams[1], `events[${index}].away`, 80);
    assert(teams[0] !== teams[1], `events[${index}] teams must differ`);

    const start = properties.get("DTSTART");
    assert(start.rawName === "DTSTART;TZID=Europe/Oslo", `events[${index}].DTSTART timezone is unsupported`);
    const kickoffUtc = osloLocalToUtc(start.value, `events[${index}].DTSTART`);
    const kickoffMs = new Date(kickoffUtc).valueOf();
    if (kickoffMs < fromMs || kickoffMs > toMs) continue;
    fixtures.push({
      competition: "Eliteserien",
      id: `eliteserien-official-${uid}`,
      kickoffUtc,
      scope: "senior_men",
      teams,
    });
  }
  return fixtures.sort((left, right) => left.kickoffUtc.localeCompare(right.kickoffUtc) || left.id.localeCompare(right.id));
}
