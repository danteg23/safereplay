#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${SAFEREPLAY_REPO_DIR:-/home/claude/safereplay-refresh}"
LOG_DIR="${SAFEREPLAY_LOG_DIR:-/home/claude/private-state/safereplay/logs}"
LOCK_FILE="${SAFEREPLAY_LOCK_FILE:-/tmp/safereplay-refresh.lock}"

mkdir -p "$LOG_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

cd "$REPO_DIR"
git fetch --quiet origin main
git merge --ff-only --quiet origin/main

SAFEREPLAY_YOUTUBE_LOCAL=1 npm run refresh:daily:remote -- --region=PH
npm test

if git diff --quiet -- config/fixture-feed-snapshot.json; then
  printf '%s SafeReplay refresh completed; no public fixture changes\n' "$(date -u +%FT%TZ)"
  exit 0
fi

git add config/fixture-feed-snapshot.json
git commit -m "chore: refresh SafeReplay fixtures"
git push origin main
printf '%s SafeReplay fixture refresh published\n' "$(date -u +%FT%TZ)"
