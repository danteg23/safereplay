function normalize(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

export function validateTeamAliases(aliases) {
  if (!aliases || typeof aliases !== "object" || Array.isArray(aliases)) {
    throw new TypeError("team aliases must be an object");
  }

  const ownerByNormalizedName = new Map();
  for (const [team, candidates] of Object.entries(aliases)) {
    if (typeof team !== "string" || !normalize(team)) throw new Error("team alias key must be non-empty text");
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new Error(`team aliases for ${team} must be a non-empty array`);
    }

    const names = [team, ...candidates];
    const local = new Set();
    for (const name of names) {
      if (typeof name !== "string" || !normalize(name)) throw new Error(`team alias for ${team} must be non-empty text`);
      const normalized = normalize(name);
      if (local.has(normalized)) throw new Error(`team aliases for ${team} contain a duplicate`);
      local.add(normalized);

      const existingOwner = ownerByNormalizedName.get(normalized);
      if (existingOwner && existingOwner !== team) {
        throw new Error(`team alias ${name} is ambiguous between ${existingOwner} and ${team}`);
      }
      ownerByNormalizedName.set(normalized, team);
    }
  }

  return aliases;
}
