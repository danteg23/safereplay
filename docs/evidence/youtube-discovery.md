# YouTube-first discovery evidence and boundary

Checked: 2026-07-10  
Target regions: Philippines now, Norway from September 2026

## Decision

YouTube is the primary Pareto discovery layer for free Short and Extended football
highlights, and the first place to check for Full/live/archive matches when an official
channel offers them. SafeReplay must use it broadly across official club, competition,
broadcaster, media-partner, and community channels rather than treating one unsafe
generic embed as a reason to exclude the platform. Broadcaster-native pages and Reddit
remain additive sources for missing formats, regional options, and cases where the
YouTube item fails an item-level safety or playback gate.

The product distinction is:

```text
YouTube as discovery input: central
generic unscanned YouTube embed: not spoiler-safe
exact scanned YouTube item: candidate
exact scanned + thumbnail-reviewed + region-played item: surfaceable
```

## Implemented connector boundary

`src/youtube-discovery.mjs` fetches public channel Atom feeds without an API key. The
operator command uses a bounded system-curl adapter: HTTPS only, no redirect following,
an eight-second timeout, capped response size, and XML/Atom MIME checking. The optional
Data API path deliberately retains native server fetch so an API key is never exposed in
a process argument. `src/youtube-data-api.mjs` implements that optional key-injected
connector. Only
sources with a stable checked channel ID are feed-ready. Both paths then use the shared
matcher in `src/youtube-feed.mjs`, which:

1. rejects a feed or entry whose channel ID differs from the registry;
2. requires both fixture teams in the raw title, using only explicit aliases from
   `config/team-aliases.json`;
3. requires the upload or scheduled-live time to fall between 48 hours before kickoff
   and 14 days after kickoff;
4. rejects explicit historical years outside the adjacent season window and rejects
   women/youth/academy titles for fixtures scoped `senior_men`;
5. classifies Full, Halves, Mini, Extended, or Short conservatively;
6. scans raw title and description for score/result/outcome clues;
7. keeps the thumbnail `unscanned`, playback `links_unverified`, and item private;
8. emits no raw metadata to the public catalogue.

One failing channel feed is isolated and cannot suppress candidates from other channels.
No connector uses a paid service, client-side feed/API call, or public thumbnail/title
rendering. The API key is optional, injected only through the server environment, and is
never included in neutral reports or saved candidates.

The real PH keyless run on 2026-07-10 completed with no feed failures. YouTube's live
Atom response represented channel identity as the 22-character body of the canonical
24-character `UC…` channel ID; SafeReplay restores only that exact fixed prefix and still
rejects every other channel substitution. The run rediscovered the Aleph Arena Short and
Full France–Morocco items. Both remained private and metadata-blocked, with unverified
playback and visually unreviewed thumbnails.

The alias registry currently covers the priority clubs and multilingual names useful for
the checked national-team fixtures (for example `Manchester City` → `Man City` and
`Norway` → `Norge`). Validation rejects empty, duplicate, or cross-team ambiguous aliases.
An alias can satisfy one team name, but the existing two-team requirement remains: a
one-team compilation or training video is still ignored.

## Implemented optional YouTube Data API path

If the user approves a Google Cloud project/API key, enable this server-only path:

```text
channels.list(contentDetails) → uploads playlist
playlistItems.list(maxResults=50) → recent video IDs
videos.list(snippet,contentDetails,status) → duration/region/caption/status evidence
```

The implementation avoids broad search as the primary mechanism and batches video detail
lookups at no more than 50 IDs. It records exact duration, declared allowed or blocked
regions, channel ID, publish time, public status, and a private ytimg thumbnail URL.
Region metadata is evidence, not playback proof; thumbnail URLs still require private
spoiler review. The key must remain server-only and optional, with Atom feeds retained as
the no-key fallback.

Conservative gates are fixture-tested: a duration/title mismatch is ignored; video-detail
channel substitution is rejected; a declared PH block produces a blocked candidate while
playback remains `links_unverified`; malformed/non-ytimg thumbnail URLs are discarded;
scheduled live time can identify a stream created before the normal upload window; stale,
explicitly historical, and wrong-scope videos with the same teams are rejected; and
current candidate/blocked records still cannot reach the public catalogue.

Primary documentation:

- [Retrieve a channel's uploads playlist](https://developers.google.com/youtube/v3/guides/implementation/videos)
- [List up to 50 playlist items](https://developers.google.com/youtube/v3/docs/playlistItems/list)
- [Batch video details](https://developers.google.com/youtube/v3/docs/videos/list)
- [Duration, captions, region restriction, and status fields](https://developers.google.com/youtube/v3/docs/videos)
- [Current quota model](https://developers.google.com/youtube/v3/determine_quota_cost)
- [Caption downloads require OAuth](https://developers.google.com/youtube/v3/guides/implementation/captions)

Transcription is not currently justified. It does not solve thumbnail or comment
spoilers, and obtaining caption text or audio introduces OAuth, media-access, cost, and
scope issues. Revisit only if duration, verified channel, fixture matching, publish time,
metadata scanning, and thumbnail review still cannot distinguish the right version.

## Authenticated cross-repository search route

Checked again 2026-07-11. The SSH route below succeeded with `youtube.readonly` and did not
create or copy any credential into this repository:

```text
vps-claude → /home/claude/.local/bin/google-youtube --json search
```

SafeReplay now exposes it as `npm run discover:youtube:remote`. The connector:

- verifies the remote read-only scope before searching;
- runs sequentially with one format-aware query per fixture, not a query grid; each query
  repeats both teams on each side of YouTube's documented OR operator to search
  `highlights` or `full match` without spending a second call. The operator behavior is
  documented in Google's YouTube Data API client reference:
  `https://developers.google.com/resources/api-libraries/documentation/youtube/v3/java/latest/com/google/api/services/youtube/YouTube.Search.List.html`;
- uses region, a 48-hour pre-kickoff lower bound, moderate SafeSearch, and football topic;
- accepts only valid video/channel IDs and known source-registry channel identities;
- reconstructs the YouTube destination instead of trusting the returned URL;
- discards account labels, pagination tokens, channel display names, and unrelated fields;
- keeps raw result metadata and candidates in git-ignored `.private/` storage;
- caches identical searches for six hours;
- emits only neutral candidate/failure fields to the terminal;
- returns exactly `cross-repo YouTube execution route missing` if SSH access is absent.

The first real PH run spent four searches for four current fixtures and found two Aleph
Arena candidates for France–Morocco. A targeted highlights search later exposed a fresh
official FIFA item that the generic team-only query had missed. The format-aware query
was then implemented and run across the expanded 12-fixture discovery window: 12 base searches
produced five private candidates. France–Morocco now has blocked Aleph Short, blocked
Aleph Full, and blocked official FIFA Short. Spain–Belgium has blocked Aleph Short plus
a long-video candidate whose metadata requires manual review rather than an automatic
block. Only the Short was later exposed at Daniel's explicit request; the long candidate
was removed because runtime is not format proof.

TV 2 now receives one additional Norwegian-language, Norway-region query per selected
fixture. Results still must match the exact registered TV 2 channel ID; merely mentioning
TV 2 is insufficient. The first real 12-fixture preferred batch spent 12 additional calls
and found zero exact TV 2 items. Two separate Spain–Belgium TV 2 searches also found zero,
so no TV 2 row is shown for that match.

This remains a useful search complement to the now-working keyless Atom path, but it is
not a full Data API replacement: the returned search records do not include exact runtime,
declared region restrictions, scheduled-live detail, or observed playback.

## Private covered playback probes — 2026-07-11

The git-ignored candidate queue now feeds a separate `SOURCE_PROOF=1` route at
`/proof/youtube-player`. Normal app servers return 404 for this route. The private index
renders only teams, format, provider classification, access class, metadata decision,
and playback status; it exposes no title, description, thumbnail, direct link, or iframe.
Choosing a candidate loads no YouTube frame until an explicit Start action.

The covered player keeps both title and thumbnail hidden, starts muted, and removes the
cover only after the YouTube API reports `PLAYING`. Error 101/150 remains covered. A
SafeReplay `Pause safely` control calls the player API, replaces the cover immediately,
and hides SafeReplay's external controls before YouTube's related-video surface can be
visible. `ENDED` destroys the frame rather than leaving recommendations behind.

Observed in Browser/IAB from the Philippines:

- FIFA France–Morocco Short: error 150; uploader blocks embedded playback. No metadata
  was shown.
- Aleph Arena Spain–Belgium long-video candidate: playback observed, muted, with a
  2:32:06 runtime. Runtime alone does not establish that it is a full match.
- Aleph Arena Spain–Belgium Short: playback observed, muted.
- Pause → cover → resume works on the Short probe with no console warnings.
- YouTube related-video records exist inside the player DOM while playing. They were not
  visible in the playing screenshot, but reinforce the requirement to cover pause/end.
- Wrapper `Start + fullscreen` and the `F` fallback did not enter fullscreen in IAB.
  Fullscreen remains real-device Safari evidence, not a completed gate.

## Local thumbnail OCR evidence

`npm run scan:youtube-thumbnails` uses the built-in macOS Vision framework, not an
external transcription or vision service. The operator path accepts only HTTPS ytimg
URLs and revalidates the response's final host, content type, and five-megabyte size cap.
Candidate IDs are validated before private filenames or neutral report fields are built.
Downloaded images and the OCR report remain mode-600 files under `.private/`.

Normal output contains only fixture ID, source ID, format, OCR level, reason codes, and
`visualState`. It excludes OCR text, title, description, thumbnail URL, video ID, and
private path. Empty/failed OCR stays `unknown`; neutral OCR remains `visualState:
unreviewed` and cannot promote an item.

The latest run checked all five private candidates. Every thumbnail returned OCR level
`safe` with no reason codes, meaning Vision detected no score/winner pattern in recognized
thumbnail text. This is not a visual safety finding: score graphics missed by OCR,
celebration imagery, player identity, trophies, and other outcome clues remain possible.
All item records stay `thumbnailState: unscanned` and playback remains
`links_unverified` until visual and device proof exists.

## Mechanical daily remote refresh proof

The authenticated connector is now part of the same fail-closed daily sequence as the
fixture feeds:

```text
npm run refresh:daily:remote -- --region=PH
```

On 2026-07-11 the real command refreshed two fixture feeds into 89 neutral fixtures,
then used the `remote_search` connector for the 12 selected current fixtures. It retained
five private candidates, blocked four on metadata, reported no feed failures, reused all
12 cached searches, and spent zero new YouTube search calls. Standard output contained
only dates, region, connector state, and counts.

The loop uses no LLM or transcription API. Fixture selection, query construction,
channel identity, match identity, format classification, spoiler scanning, and private
queue writes are deterministic. Vision OCR is an optional separate local screening step;
visual thumbnail and device playback decisions remain human evidence gates. The command
is scheduler-ready, but no VPS cron or permanent deployment has been installed.

## Initial channel pool

Feed-ready and ownership-verified:

- FIFA — `@FIFA`
- Aleph Arena — `@AlephArena`
- Premier League — `@premierleague`
- LALIGA — `@LaLiga`
- Ligue 1 — `@Ligue1`
- UEFA — `@UEFA`
- Manchester City — `@mancity`
- Arsenal — `@arsenal`
- Manchester United — `@manutd`
- FC Barcelona — `@FCBarcelona`

Feed-ready, but ownership not first-party verified:

- TV 2 Sport — `@tv2sport`. A stable channel ID and matching YouTube channel page are
  recorded, so its feed can participate in private discovery. It remains `Community /
  unverified` until a primary TV 2 source confirms the ownership link. Feed discovery
  must preserve that label and can never silently upgrade it to `Official`.

Every feed-ready entry now carries an exact `/channel/<id>` identity-evidence URL.
Registry validation rejects a missing or mismatched identity URL. This is separate from
the first-party evidence required for the `Official` provenance label.

FOX Sports and ITVX also now have exact, official Brazil–Norway Extended/Short item
candidates in the private registry. Their ownership/rightsholder status is documented,
but Philippine playback, thumbnail state, and free access have not been observed.

## Reproducible real-device bridge

The normal app never exposes raw feed candidates. An explicit local operator path now
bridges discovery to a real iPhone without weakening that rule:

```text
npm run discover:youtube -- --region=PH --save-private
SOURCE_PROOF=1 HOST=0.0.0.0 npm run app
iPhone → http://<Mac LAN IP>:4173/proof/youtube
```

The discovery command writes raw records only to `.private/youtube-candidates.json`,
which is git-ignored. Its terminal output is a neutral allowlist and strips title,
description, destination, video ID details, and network error detail. The proof route is
off by default, reads only candidate-stage YouTube records, rejects source substitution
and non-YouTube destinations, and renders no provider title, description, thumbnail, or
external URL. Each candidate goes through a separate warning page before the server-only
redirect.

## Falsification and remaining gate

The in-app browser security policy rejected direct YouTube, FOX Sports, and ITVX
navigation in this session and forbids alternate-browser workarounds. A real
`npm run discover:youtube -- --region=PH --save-private` on 2026-07-10 successfully checked
all 11 feed-ready channels with no feed failures. It found two exact Aleph Arena candidates
for France–Morocco: one Short and one Full. Both remain private and blocked because their
metadata contains spoiler signals; thumbnails and playback are not fully verified. The
public report contains no provider title, description, thumbnail, item URL, or video ID.

Before any generated item reaches the app:

- execute the real feed from an allowed server environment;
- verify the match and format;
- inspect the actual thumbnail without showing it to the user;
- test free playback in the selected region;
- test iPhone first paint, pause, fullscreen, end screen, comments, recommendations, app
  handoff, and return-to-SafeReplay behavior;
- expose only neutral source tags and the internal redirect after all surface gates pass.

Automated state after the latest increment: `npm test` passes 134 tests, including feed/API identity
substitution, unrelated-video rejection, score-bearing-title blocking, format separation,
duration mismatch rejection, fixture-time/year/scope identity, scheduled-live handling,
50-ID batching, declared-region blocking, failure isolation,
stable-ID evidence, unverified-provenance preservation, multilingual alias matching,
ambiguity rejection, API-key-safe neutral CLI reporting, private-proof filtering, opt-in
route gating, server-only redirect behavior, and the public metadata firewall.
