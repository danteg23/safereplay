# SafeReplay decisions

## 2026-07-10 — report provenance, do not adjudicate legality

SafeReplay records observable facts: publisher/source owner when verifiable,
`official` or `community/unverified`, price/login requirement, region, format,
playback result, redirect/security friction, and spoiler exposure. It does not label a
third-party source legal or illegal.

Technical exclusions such as no hosting, proxying, downloading, DRM bypass, or
geo/access-control circumvention are product-scope boundaries.

## 2026-07-10 — explore broadly, surface honestly

Exploration is not limited to official sources. Search official providers, video
platforms, broadcaster/club pages, public indexes, search results, Reddit, and
community/unverified destinations for Full, halves, Mini, Extended, and Short formats.

Production ranking prioritizes requested format, actual playback, spoiler safety,
free access, region, and security friction. Provenance remains visible and only verified
ownership can receive the `official` label.

## 2026-07-10 — generic YouTube embed is not spoiler-safe

A 390 × 844 browser spike created a privacy-enhanced YouTube iframe only after a user
tap. The player still exposed original title, thumbnail, publisher identity, watch link,
and an end-screen recommendation before playback. `autoplay=1`, `playsinline=1`, and
`rel=0` did not remove that surface.

Therefore a generic YouTube embed cannot be marked spoiler-safe. A YouTube item may
still be usable when its individual metadata is verified safe or a later protected
handoff passes real-device testing.

## 2026-07-10 — retain a compliant compact-player path, but require embedding support

SafeReplay now has a delayed-load privacy-enhanced YouTube player for individual uploads:
the iframe is absent until Start, its viewport is 355×200 (never below YouTube's 200×200
minimum), comments are absent, and the iframe is destroyed when playback ends. It does
not cover or crop YouTube's controls.

Both exact France–Morocco Aleph uploads returned player error 150, meaning the uploader
disabled embedding. They therefore remain out of the working catalogue. SafeReplay may
use this player for future uploads only after embedded playback succeeds; direct links to
metadata-spoiling uploads require a separate explicit product decision.

## 2026-07-10 — compare non-compliant masking as a personal-use experiment

Daniel explicitly asked SafeReplay to test cropped and obscured YouTube players despite
YouTube's overlay restrictions because this is a personal-use prototype. These methods
live only in the solution lab and are not labeled safe. The normal catalogue remains
neutral until device evidence identifies a winner.

## 2026-07-11 — covered muted start leads; failed privacy frontends are demoted

Daniel's Manila test confirmed native video, direct YouTube, and the tiny window work.
Piped was too slow, Invidious exposed spoilers, and watch-popup failed with error 153, so
those three no longer appear as active tests. The leading embed now keeps the thumbnail
fully covered, starts muted from a SafeReplay button, and reveals only after YouTube
reports playback. Sound and fullscreen then use YouTube's own trusted controls. Native
video retains 360p as the fast fallback and adds a live-merged 720p option.

## 2026-07-10 — YouTube is the primary discovery backbone

The unsafe generic embed finding is a delivery constraint, not a reason to exclude
YouTube. Official club, competition, broadcaster, and media-partner channels are the
highest-yield free Short/Extended discovery class and can occasionally provide Full,
live, or archive matches.

SafeReplay therefore polls only stable channel IDs server-side, verifies feed identity,
matches both fixture teams, classifies format, and scans each title and description.
Raw feed metadata and thumbnails do not enter the public catalogue. Verified channel
ownership supplies only the `Official` provenance label; it never bypasses per-item
thumbnail, region, playback, comments, recommendation, end-screen, or iPhone handoff
checks. A stable TV 2 Sport channel ID can participate in private discovery while its
source remains `Community / unverified`; only first-party TV 2 ownership evidence can
upgrade the provenance label to `Official`.

## 2026-07-10 — prefer an optional YouTube Data API connector; do not require transcription

The keyless Atom connector remains a useful fallback, and an optional YouTube Data API
connector is now implemented for stronger discovery and classification. Server-side channel/upload-playlist and
video-detail calls can provide stable IDs, up to 50 recent uploads per page, exact ISO
8601 duration, caption availability, declared region restrictions, privacy/embeddable
status, and thumbnail URLs. These facts improve Full/Mini/Extended/Short matching and
reduce dependence on title keywords. They do not replace actual PH/NO playback or
thumbnail-spoiler testing.

The connector remains optional, uses a server-only environment variable, and never
send the API key or raw metadata to the client. No Google Cloud project or credential is
created without user approval. Prefer the uploads-playlist path over broad `search.list`
calls: it is channel-scoped, deterministic, and uses the general low-cost quota bucket.

Do not make transcription a first-version dependency. Video duration plus verified
channel, fixture names, publish time, and format metadata answer the primary “right
version” question more directly. YouTube caption listing/downloading requires OAuth 2.0,
while third-party transcription would require audio/media access, add cost and latency,
and cross the current no-download/media-processing product boundary. If ambiguity remains,
thumbnail OCR/vision review is more relevant to the spoiler problem than audio
transcription.

## 2026-07-10 — use authenticated remote search without moving credentials

The existing `youtube.readonly` capability on `vps-claude` was the preferred discovery
route while direct Atom access was blocked. SafeReplay invokes it over SSH, never creates
or copies Google credentials, and does not expose account data or raw results in normal
output. The route performs one format-aware query per fixture plus one Norwegian
TV 2-targeted query, filters every result back to source-registry channel IDs, reuses a
six-hour private cache, and passes every item through the existing fixture matcher and
spoiler scanner. With the current 12-fixture window this is 24 calls, below the roughly
100-call daily allocation.

Remote search complements rather than replaces channel uploads/video details. It finds
current items efficiently, but does not provide exact duration, declared-region status,
scheduled-live detail, thumbnail safety, or playback evidence. No remote result may skip
those later gates. If SSH access is absent, the tool reports exactly
`cross-repo YouTube execution route missing`; it must not create another credential.
The route later returned that exact failure after fixture coverage expanded, so it is
currently unavailable. Earlier cached discovery evidence remains evidence, not proof of
current connectivity.

Direct keyless Atom access later succeeded through the same bounded, shell-free curl
transport used for public fixture feeds. It is now the routine channel-scoped path and
rediscovered the two private blocked Aleph candidates without feed failures. The remote
route remains an optional search complement if its SSH execution path returns.

Two team names are not sufficient identity. Shared Atom/API matching also requires a
bounded publication or scheduled-live window around kickoff, rejects incompatible
explicit years, and uses a private fixture scope to exclude women/youth/academy titles
from `senior_men` fixtures. The scope is discarded by the public fixture sanitizer.

## 2026-07-10 — validated surface items automatically enter the neutral catalogue

An item marked `surface` after candidate metadata, neutral thumbnail, free/free-account
access, and observed regional playback now projects automatically into the public fixture
catalogue and server redirect allowlist. The projection strips raw title, description,
thumbnail, video URL, and risk internals. An exact observed provider/format replaces its
older directory row.

Ranking is evidence-first: lower residual destination risk, free access, then source
class. YouTube wins only an otherwise equal tie; a demonstrably safer observed
broadcaster item ranks ahead of a riskier YouTube item. Candidate, blocked, removed,
paid, stale-fixture, and format-inconsistent records never project. Halves is now a
first-class public format.

## 2026-07-10 — first slice uses a dependency-free server-render boundary

React/Vite installation was attempted once and failed because the workspace cannot
resolve the package registry. The first vertical slice therefore uses browser-native
component modules plus a small Node server. This is an environment-driven implementation
choice, not a change to the product boundary: the client still receives only a strict
sanitized DTO, and provider destinations remain server-side behind allowlisted `/go/`
routes.

## 2026-07-10 — mutable PWA shell assets must revalidate

A real 390 × 844 Browser/IAB pass found that a CSS fix remained invisible after reload
because the stylesheet had a one-hour freshness lifetime and no revision. SafeReplay now
uses a versioned stylesheet URL, an advanced service-worker shell cache, and `no-cache`
revalidation for HTML, JavaScript, CSS, and the web manifest. Install images may retain a
short public cache. This keeps the dependency-free PWA while preventing an installed or
long-lived browser session from pinning stale interaction/layout code.

## 2026-07-10 — local thumbnail OCR is screening, not visual approval

Use the built-in macOS Vision framework to screen private ytimg thumbnails for recognized
score/outcome text before spending a cloud API or exposing the image to the user. The
scanner revalidates redirect host, image type/size, and candidate identity; reports only
neutral reason codes and keeps images/OCR artifacts under `.private/`.

OCR-clear text is not equivalent to a safe thumbnail. Non-text score graphics,
celebrations, trophies, player identity, or missed lettering can still spoil a match.
Therefore OCR can add a blocker but can never set `neutral_observed` or promote an item;
visual review and destination playback evidence remain separate mandatory gates.

The running catalogue is explicitly labeled as a prototype and links to provider
directories rather than pretending they are item-level match results. That notice must
remain until current fixtures and item-level sources are genuinely matched.

## 2026-07-10 — retain Reddit thread candidates with visible tags and direct handoff

An exact neutral r/footballhighlights match thread may be shown as `Community /
unverified` even when its downstream video links have not passed the item-level playback
gate. The source row visibly tags its format, access, provenance, and comment risk, then
opens the allowlisted internal redirect directly without an extra warning sheet.

This thread route is distinct from claiming a verified or spoiler-safe video. It stays
available unless a concretely better destination is observed; a comment-free direct-link
handoff is a progressive enhancement.

On 2026-07-11, desktop PH testing proved that the exact FootReplays Full route reaches a
2:27:41 player and advances after the first click opens an ad tab. FootReplays is now
ranked above the Reddit thread and represented as Full, Halves, and Short. It is not
promoted as spoiler-safe: the player shows a match-frame collage before play, and iPhone
behavior remains unproved. The visible risk tag is `Spoiler thumbnail · ad popup`.

## 2026-07-11 — do not embed FootReplays without a sandbox

The provider publishes an embed route, so SafeReplay tested a four-panel cover that left
only the central play target visible. The iframe was sandboxed without popup,
top-navigation, or download permission. The route first exposed a rotating final-host
constraint, then explicitly returned `Sandboxed embed is not allowed!` after the current
host was narrowly allowlisted. No player was created.

Removing the sandbox could hide the thumbnail, but it would give the provider's ad code
the popup and navigation powers that caused the original friction. That is not a useful
spoiler-safety tradeoff. The lab route and UI entry were removed; FootReplays remains a
direct, visibly tagged `Community / unverified` fallback.

## 2026-07-11 — allow blocked YouTube metadata in a private covered probe only

A result-bearing title must remain blocked from the public catalogue, but that does not
prevent testing whether the underlying video can play safely behind a cover. The
default-off `SOURCE_PROOF=1` route therefore accepts both candidate and blocked private
YouTube records, exposes only neutral fixture/source facts, and provides no direct
YouTube handoff.

The cover disappears only on the YouTube `PLAYING` event. Embed errors stay covered;
pause re-covers; end destroys the frame. This separation proved useful immediately:
FIFA France–Morocco Short failed with error 150, while Aleph Spain–Belgium long-video and Short candidates
played. Playback evidence alone does not promote either item: visual thumbnail review,
access/region proof, and real iPhone fullscreen behavior remain separate gates.

## 2026-07-11 — make authenticated YouTube search an explicit daily mode

The ordinary daily refresh keeps the keyless Atom connector as a credential-free
fallback. A separate `refresh:daily:remote` command now forwards `--remote-search` into
the same fixture-first, fail-closed sequence. This avoids silently calling a feed-only
job “automatic YouTube search” while preserving a fallback that works without SSH.

The remote mode verifies `youtube.readonly`, uses one bounded query per selected fixture,
reuses the six-hour private cache, and reports only neutral counts. A real PH run refreshed
89 fixtures and five private candidates with 12 cache hits and zero new search calls.
No scheduler is installed until an always-on host is explicitly approved; the proven
command is the scheduler boundary.

## 2026-07-11 — expose Spain–Belgium choices now without upgrading their claims

Daniel asked to use the app immediately and to retain YouTube, Reddit, and replay-page
options. The match screen therefore exposes useful observed routes through neutral
internal links. YouTube Short uses the covered player; FootReplays and Reddit carry
explicit spoiler/comment/popup warnings.

A 2:32:06 runtime is not evidence that a video contains the full match. The long YouTube
candidate was therefore removed from the product; Full belongs to replay sources. This
use-now choice does not relax the automated promotion gate: future discovered items
remain private until their normal evidence requirements pass.

## 2026-07-11 — prefer provider-issued direct replay players over the listing page

The Spain–Belgium FootReplays page exposes distinct provider-issued play controls for
Full, first half, and second half. Their `onclick` destinations use stable HTTPS player
IDs. SafeReplay now allowlists those exact destinations behind neutral internal redirects
instead of making the listing page the primary Full handoff.

This removes one known spoiler surface—the listing thumbnail—and avoids the listing's
first-click advertising path. It does not make the player safe by declaration. Browser
evidence found a real Full media resource and video elements for both halves, but the
player posters are visually unreviewed and automated play did not advance. The cards keep
those risks visible, and exact runtime remains private.

Local Vision OCR found no score/outcome pattern in the two image assets referenced by the
direct Full player page. That is text evidence only, not visual clearance; the product
continues to mark the player poster unreviewed.

## 2026-07-11 — reject the masked Full iframe because provider framing is unstable

A private proof placed the direct Full player in a sandbox that allowed scripts,
same-origin behavior, and presentation, but denied popups, top navigation, forms, and
downloads. The first load produced a real video and Play control behind an opaque mask.
After a fresh server/reload, the same provider route returned a browser frame-block page,
while the same URL still loaded a video as a top-level destination.

That inconsistency makes the masked iframe unsuitable for the product. The proof route,
script, styles, and tests were removed. SafeReplay retains the top-level direct player,
which is the provider-supported route and still bypasses the listing page. This is a
delivery limitation, not a legal conclusion.

## 2026-07-10 — use a bounded Fixture Download slice for EPL priority teams

Fixture Download's 2026/27 EPL JSON returned the expected 380-row schema. The first ten
Manchester City/Arsenal fixtures matched the Premier League's official schedule after
UK summer times were converted to UTC. SafeReplay therefore enables this source only for
those priority teams. La Liga remains withheld after a date mismatch. Ligue 1 is also
withheld because later feed placeholders conflict with LFP's fixed marquee dates.

The fixture CLI uses a narrow `curl` transport because Node `fetch` timed out in this
environment while the same HTTPS endpoint succeeded through the system transport. It
does not follow redirects, is pinned by the registry to Fixture Download, caps time and
body size, requires JSON, and invokes `curl` without a shell. Raw rows may contain scores,
winner, and location, but explicit field selection discards them before either private or
checked-in snapshots. Catalogue promotion is opt-in and refused on any feed failure or an
empty selected set.

Checked-in FIFA and feed snapshots merge by unique fixture ID. YouTube discovery sees
the same merged fixture set but searches only a bounded recent/imminent window, avoiding
quota use on distant fixtures. The mobile date rail is horizontally scrollable so feed
breadth does not consume multiple screen rows.

## 2026-07-10 — use Eliteserien's official calendar as its fixture source

Eliteserien's own `/terminliste/subscribe` endpoint returns a keyless, redirect-free
`text/calendar` document from the same official host. SafeReplay accepts only that exact
host/path and MIME type, unfolds iCalendar lines, requires one UUID/SUMMARY/Oslo DTSTART
per event, rejects duplicate or DST-ambiguous identity, and discards description,
location, URL, and all other fields.

The current feed produced 79 scheduled future fixtures through 20 September in the
bounded catalogue horizon. Samples matched the official visible schedule. Local times
are converted through `Europe/Oslo`, not a fixed offset, and browser QA showed the same
fixture at 14:00 Norway and 20:00 Manila. Later rounds without fixed times do not appear
in the calendar snapshot, which is preferable to inventing placeholder kickoffs.
