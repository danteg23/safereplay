const DIRECT_PATTERNS = [
  {
    code: "scoreline",
    pattern: /\b(?:[0-9]|1[0-9])\s*[-–—:]\s*(?:[0-9]|1[0-9])\b/u,
  },
  {
    code: "penalty_outcome",
    pattern: /\b(?:on penalties|penalty shoot-?out|shoot-?out win|straffesparkkonkurranse|vant på straffer|tirs? au but|aux tirs au but|por penaltis)\b/iu,
  },
  {
    code: "winner_or_loser",
    pattern: /\b(?:winner|winners|won|wins|victory|defeats?|beats?|knocks? out|knocked out|eliminated|title winners?|vant|vinner|seier|slo|slår|utslått|gana|ganó|victoria|vence|venció|eliminado|victoire|gagne|gagné|éliminé)\b/iu,
  },
  {
    code: "advancement_or_exit",
    pattern: /\b(?:advances?|through to|qualifies?|into the (?:final|semi-final|semifinal)|crashes out|sent home|videre til|klar for final|går videre|clasifica|pasa a la final|se qualifie|en finale)\b/iu,
  },
  {
    code: "trophy_signal",
    pattern: /(?:🏆|🥇|\b(?:lifts? the trophy|trophy lift|title clinch(?:er|ing)?|(?:are|crowned|become|new) champions?|(?:er|ble|blir) mestere?|(?:es|son|se proclama(?:n)?) campeones?|(?:est|sont|sacré(?:e|s)?) championne?s?)\b)/iu,
  },
];

const REVIEW_PATTERNS = [
  {
    code: "goal_detail",
    pattern: /\b(?:goal|goals|scores?|scorer|brace|hat-?trick|late winner|equaliser|equalizer|mål|målet|scoring|goles?|doblete|triplete|but|buts|doublé|triplé)\b/iu,
  },
  {
    code: "outcome_hype",
    pattern: /\b(?:comeback|thriller|rout|demolition|dominates?|stuns?|shocks?|dramatic finish|epic win|sensational win|remontada|goleada|festival de buts)\b/iu,
  },
  {
    code: "result_recap",
    pattern: /\b(?:all goals|every goal|result recap|match result|final score|score recap|alle mål|todos los goles|tous les buts)\b/iu,
  },
];

function assertText(value, path) {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new TypeError(`${path} must be a string, null, or undefined`);
  }
}

function removeBenignNumberPatterns(text) {
  return text
    .replace(/\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/gu, " ")
    .replace(/\b\d{1,2}[-/.]\d{1,2}[-/.](?:20)?\d{2}\b/gu, " ")
    .replace(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/gu, " ")
    .replace(/\b20\d{2}\s*[/–-]\s*\d{2}\b/gu, " ")
    .replace(/\b\d{1,3}\s*(?:m|min|mins|minute|minutes|minutter)\b/giu, " ")
    .replace(/\b(?:1st|2nd)\s+half\b/giu, " ")
    .replace(/\b(?:round|runde|jornada)\s+(?:of\s+)?\d{1,2}\b/giu, " ");
}

export function scanSpoilerText(text, surface = "text") {
  assertText(text, surface);
  const normalized = removeBenignNumberPatterns((text ?? "").normalize("NFKC"));
  const reasons = [];

  for (const { code, pattern } of DIRECT_PATTERNS) {
    if (pattern.test(normalized)) reasons.push({ code, severity: "unsafe", surface });
  }
  for (const { code, pattern } of REVIEW_PATTERNS) {
    if (pattern.test(normalized)) reasons.push({ code, severity: "review", surface });
  }

  const level = reasons.some((reason) => reason.severity === "unsafe")
    ? "unsafe"
    : reasons.length > 0
      ? "review"
      : "safe";

  return { level, reasons };
}

export function scanSourceMetadata({ title, description, thumbnailText } = {}) {
  assertText(title, "title");
  assertText(description, "description");
  assertText(thumbnailText, "thumbnailText");

  const surfaces = {
    title: scanSpoilerText(title, "title"),
    description: scanSpoilerText(description, "description"),
    thumbnail: thumbnailText == null
      ? { level: "unknown", reasons: [{ code: "thumbnail_unscanned", severity: "review", surface: "thumbnail" }] }
      : scanSpoilerText(thumbnailText, "thumbnail"),
  };

  const levels = Object.values(surfaces).map((surface) => surface.level);
  const decision = levels.includes("unsafe")
    ? "block_auto_surface"
    : levels.includes("review") || levels.includes("unknown")
      ? "manual_review"
      : "candidate";

  return {
    decision,
    reasons: Object.values(surfaces).flatMap((surface) => surface.reasons),
    surfaces,
  };
}
