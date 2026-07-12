#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${SAFEREPLAY_REPO_DIR:-/home/claude/safereplay-refresh}"
LOG_DIR="${SAFEREPLAY_LOG_DIR:-/home/claude/private-state/safereplay/logs}"
LOCK_FILE="${SAFEREPLAY_REFRESH_LOCK_FILE:-/tmp/safereplay-refresh.lock}"

mkdir -p "$LOG_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

cd "$REPO_DIR"
git fetch --quiet origin main
git merge --ff-only --quiet origin/main

SAFEREPLAY_YOUTUBE_LOCAL=1 npm run refresh:post-match -- --region=PH

if git diff --quiet -- config/replay-destinations.json; then
  printf '%s SafeReplay post-match refresh completed; no new public replay sources\n' "$(date -u +%FT%TZ)"
  exit 0
fi

npm test
git add config/replay-destinations.json
git commit -m "chore: publish post-match replay sources"
git push origin main
printf '%s SafeReplay post-match replay sources published\n' "$(date -u +%FT%TZ)"
