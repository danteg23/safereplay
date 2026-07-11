import assert from "node:assert/strict";
import test from "node:test";

import { scanSourceMetadata, scanSpoilerText } from "../src/spoiler-scan.mjs";

test("neutral fixture and format title is safe", () => {
  const result = scanSpoilerText("Arsenal v Barcelona | Extended highlights | 8 July 2026", "title");
  assert.deepEqual(result, { level: "safe", reasons: [] });
});

test("dates, kick-off times, seasons, rounds, halves, and durations are not scores", () => {
  const safeExamples = [
    "Match replay | 2026-07-09 | 20:00",
    "Premier League 2025/26 | Round 16",
    "1st Half | 45 minutes",
    "2nd Half | 52 min",
    "Runde 8 | 20 minutter",
    "UEFA Champions League highlights",
    "Liga de Campeones | Jornada 8",
  ];

  for (const example of safeExamples) {
    assert.equal(scanSpoilerText(example).level, "safe", example);
  }
});

test("scorelines and explicit outcomes block automatic surfacing", () => {
  const unsafeExamples = [
    "Arsenal 3-2 Barcelona highlights",
    "Barcelona wins on penalties",
    "City knocked out after late drama",
    "Norge vant på straffer",
    "España ganó y pasa a la final",
    "La France se qualifie en finale",
    "Champions 🏆",
  ];

  for (const example of unsafeExamples) {
    const result = scanSourceMetadata({ title: example, description: "", thumbnailText: "" });
    assert.equal(result.decision, "block_auto_surface", example);
  }
});

test("indirect goal and hype clues require review", () => {
  const reviewExamples = [
    "All goals and highlights",
    "Dramatic comeback | Highlights",
    "Mbappe brace | Highlights",
    "Todos los goles",
    "Festival de buts",
  ];

  for (const example of reviewExamples) {
    const result = scanSourceMetadata({ title: example, description: "", thumbnailText: "" });
    assert.equal(result.decision, "manual_review", example);
  }
});

test("spoiler in description or thumbnail blocks a neutral title", () => {
  const descriptionLeak = scanSourceMetadata({
    title: "Arsenal v Barcelona | Highlights",
    description: "Barcelona won the match",
    thumbnailText: "",
  });
  assert.equal(descriptionLeak.decision, "block_auto_surface");
  assert(descriptionLeak.reasons.some((reason) => reason.surface === "description"));

  const thumbnailLeak = scanSourceMetadata({
    title: "Arsenal v Barcelona | Highlights",
    description: "",
    thumbnailText: "3-2",
  });
  assert.equal(thumbnailLeak.decision, "block_auto_surface");
  assert(thumbnailLeak.reasons.some((reason) => reason.surface === "thumbnail"));
});

test("unscanned thumbnail prevents an automatic safe decision", () => {
  const result = scanSourceMetadata({
    title: "Arsenal v Barcelona | Highlights",
    description: "Official match highlights",
  });

  assert.equal(result.decision, "manual_review");
  assert(result.reasons.some((reason) => reason.code === "thumbnail_unscanned"));
});

test("fully scanned neutral metadata becomes a candidate", () => {
  const result = scanSourceMetadata({
    title: "Arsenal v Barcelona | Extended highlights | 8 July 2026",
    description: "Official match video",
    thumbnailText: "Arsenal v Barcelona",
  });

  assert.equal(result.decision, "candidate");
  assert.deepEqual(result.reasons, []);
});
