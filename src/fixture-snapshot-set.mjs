const DATE = /^\d{4}-\d{2}-\d{2}$/u;

function realDate(value, path) {
  if (!DATE.test(value ?? "")) throw new Error(`${path} must be YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${path} must be a real date`);
  }
  return date;
}

export function mergeFixtureSnapshots(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) throw new TypeError("fixture snapshots must not be empty");
  const ids = new Set();
  const fixtures = [];
  let checkedAt = null;
  for (let index = 0; index < snapshots.length; index += 1) {
    const snapshot = snapshots[index];
    if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.fixtures)) {
      throw new TypeError(`fixture snapshots[${index}] is invalid`);
    }
    realDate(snapshot.checkedAt, `fixture snapshots[${index}].checkedAt`);
    if (!checkedAt || snapshot.checkedAt > checkedAt) checkedAt = snapshot.checkedAt;
    for (const fixture of snapshot.fixtures) {
      if (typeof fixture?.id !== "string" || !fixture.id) throw new Error("fixture snapshot id is invalid");
      if (ids.has(fixture.id)) throw new Error(`fixture snapshot id is duplicated: ${fixture.id}`);
      ids.add(fixture.id);
      fixtures.push(fixture);
    }
  }
  if (fixtures.length === 0) throw new Error("merged fixture snapshot must not be empty");
  fixtures.sort((left, right) => left.kickoffUtc.localeCompare(right.kickoffUtc) || left.id.localeCompare(right.id));
  return { checkedAt, fixtures };
}

export function selectDiscoveryFixtures(fixtures, {
  checkedAt,
  futureDays = 2,
  pastDays = 7,
} = {}) {
  if (!Array.isArray(fixtures)) throw new TypeError("fixtures must be an array");
  const day = realDate(checkedAt, "checkedAt");
  const from = day.valueOf() - (pastDays * 86_400_000);
  const to = day.valueOf() + ((futureDays + 1) * 86_400_000) - 1;
  return fixtures.filter((fixture) => {
    if (fixture?.kickoffTba === true || fixture?.participantsTba === true) return false;
    const kickoff = new Date(fixture?.kickoffUtc).valueOf();
    return Number.isFinite(kickoff) && kickoff >= from && kickoff <= to;
  });
}
