import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateTeamAliases } from "../src/team-aliases.mjs";

const aliases = JSON.parse(await readFile(new URL("../config/team-aliases.json", import.meta.url), "utf8"));

test("checked-in team aliases are normalized, unique, and unambiguous", () => {
  assert.equal(validateTeamAliases(aliases), aliases);
});

test("ambiguous or duplicate team aliases are rejected", () => {
  assert.throws(
    () => validateTeamAliases({ Arsenal: ["AFC"], "AFC Wimbledon": ["AFC"] }),
    /ambiguous/,
  );
  assert.throws(
    () => validateTeamAliases({ Barcelona: ["Barça", "Barca"] }),
    /duplicate/,
  );
});
