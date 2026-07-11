# SafeReplay

> **Current product direction (v2, 2026-07-11):** SafeReplay now uses the approved
> premium white Matches → match-detail flow documented in
> [`docs/design/approved-v2.md`](docs/design/approved-v2.md). Matches with no replay are
> washed out and non-interactive; available matches open a detail page grouped into
> Highlights, Extended highlights, and Full match. Alternatives are quiet text links,
> while Full match exposes separate First half and Second half controls. During a live
> window, the match list may show one exceptional play control that opens the preferred
> live directory. Timezone is changed only in Settings. The legacy dark visual spec is
> retained solely as historical context and is not authoritative.

SafeReplay is an iPhone-first, desktop-responsive football source finder that keeps result-bearing provider
metadata out of its public UI. It reports observable facts — provider, provenance,
access, region evidence, requested format, playback evidence, and spoiler surface — and
does not make legal judgments about third-party sources.

The current build is a tested vertical slice with a checked FIFA/NFF schedule snapshot
covering all six Norway World Cup matches, the recent Argentina–Egypt match, four current
quarter-finals, a real free EPL slice containing the next ten Manchester
City/Arsenal fixtures, and 79 upcoming fixtures from Eliteserien's own public calendar.
The EPL slice was cross-checked against the Premier League's official 2026/27 schedule;
the Eliteserien events were checked against the league's live schedule and converted
from `Europe/Oslo` with DST-aware logic. Kickoffs
remain canonical UTC in the server/public contract
and are localized only in the browser. The default follows playback region: Manila now,
Norway when the region changes; Device, Manila, and Norway are also explicit choices.
Desktop browsers use a full-width workspace with persistent left navigation, wide date
and competition rails, vertically stacked format cards, and two-column Settings. On
iPhone, Matches and Settings are top-level header actions rather than a sticky bottom bar;
match detail stays one compact vertical column.
Every completed Norway World Cup match now has a neutral detail view with covered
YouTube highlights, direct FootReplays Full/first-half/second-half/highlight routes,
the FootReplays match page as Extended, and a warned r/footballhighlights fallback.
Norway–Senegal additionally has a public full-match YouTube upload behind the cover.
Argentina–Egypt has the same complete format set plus a covered full-match upload. TV 2
Sport received a dedicated Norway-region search for every fixture but returned no exact
channel match, so SafeReplay does not invent a TV 2 source. Norway–England is listed
neutrally and gains the live control only inside its configured live window.

The first usable journey is France–Morocco → FootReplays, with separate Full, Halves,
and Short rows. Desktop browser evidence now proves that its Full route reaches and
plays a 2:27:41 video in the Philippines. It remains visibly `Community / unverified`
and carries a `Spoiler thumbnail · ad popup` tag because the provider shows a match-image
collage and the first play click opens an advertising tab. The exact
`r/footballhighlights` thread remains below it as a fallback with a `Comments can spoil`
tag; its main-post Full link points to the same FootReplays item. Neither is presented as
official or spoiler-safe. Spain–Belgium is now the first use-now multi-source fixture:
its source screen contains a covered Aleph Arena YouTube Short, direct FootReplays
players for Full/first half/second half, the FootReplays match page as fallback, a fixture-filtered
r/footballhighlights search for Full/Short. A long YouTube candidate was deliberately
removed from the app because its 2:32:06 runtime did not prove that it contained a full
match; Full now comes from the replay sources.
YouTube is the primary discovery connector, not a fallback. Stable channel IDs for FIFA,
Aleph Arena, Premier League, LALIGA, Ligue 1, UEFA, City, Arsenal, United, Barcelona, and
TV 2 Sport feed a server-only matcher and spoiler scanner. The keyless Atom path works
through a bounded system-curl transport without credentials. A real PH run completed
without feed failures and rediscovered two private Aleph Arena candidates; both remained
metadata-blocked. An optional YouTube Data API path is implemented for stronger duration,
region, upload-playlist, and thumbnail evidence. For Short
and Extended formats, official YouTube items are searched and ranked before broadcaster
pages and community sources when their item-level evidence is otherwise comparable.
YouTube is also searched first for Full/live/archive items where a channel offers them.
Reddit remains available for formats and fixtures that YouTube does not cover well.
TV 2 Sport is feed-ready for private exploration but remains `Community / unverified`
until a first-party TV 2 source confirms ownership; stable channel identity and official
provenance are separate claims. Remote discovery now gives TV 2 one extra Norwegian,
Norway-region query per current fixture and still requires its exact channel ID. The
first 12-fixture run found no TV 2 items, including no Spain–Belgium highlight, so the app
does not invent a TV 2 option.

This workspace can also use Daniel's existing authenticated YouTube search remotely over
the `vps-claude` SSH alias. That connector creates and copies no credentials, searches
once per fixture rather than across a query grid, accepts results only from channel IDs
already in the source registry, and caches the private response for six hours. It is a
useful discovery path when available; Atom and the optional direct Data API connector
remain independent fallback and comparison paths. On 2026-07-11 the route again verified
`youtube.readonly` and completed the bounded current-fixture search with cache reuse. It
created no local credential and retained five private items: three France–Morocco
candidates and Spain–Belgium long-video and Short candidates. Four were metadata-blocked.
Private covered-player testing later proved that the two Spain–Belgium items play on
desktop in the Philippines, while the official FIFA item rejects embedding. Daniel then
asked to use the app immediately, so the Short is available through the public covered
player with explicit uncertainty rather than presented as surface-safe. The Short public
journey was rendered and played behind the cover with no console errors.

The FootReplays Full row now bypasses the listing page and its known listing thumbnail.
The provider's own Full control resolved to a stable direct player route; Browser/IAB
loaded a real video medium and identified its duration privately. The first- and
second-half controls also resolve to separate direct players, and both exposed a video
element in PH testing. The player poster remains visually unreviewed and automated play
did not advance, so the cards say exactly that rather than claiming spoiler-safe playback.
Two player-page image assets also passed local Vision OCR with no detected score/outcome
text. They remain visually unreviewed because OCR cannot identify celebration imagery or
other non-text spoilers.

A sandboxed masked-iframe proof was also tried and removed. It initially loaded the real
player behind a small Play hole, but the same provider route later returned a frame-block
page after a fresh reload while still working top-level. SafeReplay therefore keeps the
direct top-level handoff instead of presenting an intermittent embed as reliable.

## Run locally

Requirements: Node.js 20 or newer. The normal app needs no package installation and
fixture refresh uses macOS's system `curl`. The optional native YouTube lab needs
`yt-dlp`; its experimental 720p live merge also needs `ffmpeg`:

```bash
brew install yt-dlp ffmpeg
```

```bash
npm run app
```

Then open `http://127.0.0.1:4173/` in a normal desktop browser. The same URL responds at
tablet and phone widths; the primary phone proof viewport is 390 × 844. For an iPhone on the
same network, run with `HOST=0.0.0.0 npm run app` and open the Mac's LAN address. Do this
only on a trusted local network; the prototype has no authentication.

## Build and deploy the friend-safe static site

The production build keeps the public catalogue static, generates one neutral redirect
page per allowlisted destination, and pre-generates every covered YouTube player. Raw
provider metadata and private discovery files are never included.

```bash
npm run build:static -- --base=/safereplay/
```

GitHub Pages deploys `dist/` through `.github/workflows/pages.yml` after the complete test
suite passes. The repository base path is handled by the catalogue, redirect, player,
manifest, and service-worker routes rather than assuming a root-domain deployment.

Run every automated proof with:

```bash
npm test
```

## Refresh the neutral fixture catalogue

Fixture Download is enabled only for Arsenal and Manchester City EPL fixtures.
Eliteserien uses the competition's own same-host `text/calendar` subscription. La Liga
and Ligue 1 remain withheld after official-date mismatches.

Preview a neutral private snapshot:

```bash
npm run discover:fixtures -- --save-private
```

After checking the neutral report, replace the checked-in feed snapshot explicitly:

```bash
npm run discover:fixtures -- --save-private --save-catalogue
```

Promotion is refused if discovery fails or yields no selected fixtures. The bounded
transport accepts only configured HTTPS hosts, rejects redirects and wrong MIME types or
oversized responses, and the JSON/ICS parsers project only neutral fixture identity fields.
Upstream score, winner, location, and extra fields never enter the saved snapshot or
public catalogue.

### Run the mechanical daily refresh

```bash
npm run refresh:daily -- --region=PH
```

This runs fixture discovery first, then checks the 11 feed-ready YouTube channels. Safe
fixture fields update automatically; YouTube candidates stay in the git-ignored private
review queue until metadata, thumbnail, free access, and playback are safe enough to
surface. The job is deterministic and does not use an LLM. On macOS, thumbnail text can
additionally be screened with local Vision OCR. A VPS scheduler can run the command once
per day. Restart the
app process after a successful refresh so it loads the new catalogue.

To use Daniel's existing authenticated YouTube search capability on `vps-claude`, while
keeping every Google credential on that VPS, run:

```bash
npm run refresh:daily:remote -- --region=PH
```

This is the intended scheduler command. It performs one bounded format-aware query per
selected fixture, reuses the private six-hour cache, reports only counts and connector
status, and fails closed if the SSH execution route or its `youtube.readonly` scope is
missing. It does not use AI: matching and spoiler blocking are deterministic. The static
friend deployment is independent of this optional refresh scheduler; publishing a newly
reviewed catalogue still requires a tested repository push.

### Compare YouTube playback workarounds

Open `/lab/youtube/france-morocco` from the running app, or use the
`Test spoiler-safe YouTube` link on that fixture. The lab starts with a verified playable
control video and can switch to the France–Morocco Full or Short candidate. Six active
approaches remain: a fully covered autoplay player, cropped and masked embeds, native
video, direct YouTube/app handoff, and a tiny YouTube window. The failed watch-popup,
slow Piped, and spoiler-bearing Invidious options are retained only as device findings.
Each active method has Works, Spoiled, and Failed verdict buttons plus a copyable summary.

The covered player loads the YouTube thumbnail behind four opaque SafeReplay panels,
leaving only YouTube's native play symbol clickable. That genuine media click starts with
sound; the panels disappear only after YouTube reports playback. Desktop offers one
Fullscreen action and first warns the viewer to look away for three seconds and keep the
cursor still because YouTube can briefly reveal its title. Mobile hides the custom
fullscreen action. Pausing through YouTube automatically recreates a covered native-play
state at the saved position, and finishing destroys the player before related videos can
remain visible.

The native-video experiment uses free `yt-dlp`. YouTube supplies a combined 360p file;
the new 720p option uses `ffmpeg` to live-merge separate H.264 picture and AAC audio
without re-encoding. Both match candidates resolve from the current Manila network. The
720p short test decoded at 1280×720, and interrupted mergers are terminated automatically.

## Run the private YouTube device proof

On a network that can reach public YouTube channel feeds:

```bash
npm run discover:youtube -- --region=PH --save-private
SOURCE_PROOF=1 HOST=0.0.0.0 npm run app
```

Then open `http://<your-mac-lan-address>:4173/proof/youtube` on the iPhone. Use only a
trusted local network. The proof route is disabled unless `SOURCE_PROOF=1`, and the raw
candidate file is stored under the git-ignored `.private/` directory. The page shows
only neutral fixture, format, provider, provenance, and risk fields. Opening a candidate
can still reveal YouTube metadata; the confirmation page names the exact device checks
to record before an item can enter the normal catalogue.

### Authenticated remote search without local credentials

When the `vps-claude` SSH alias is available, use the existing remote read-only scope:

```bash
npm run discover:youtube:remote -- --region=PH --save-private
```

The command verifies `youtube.readonly`, performs at most one targeted search per current
fixture, and writes a six-hour cache plus optional candidates only under `.private/`.
Repeating the same command reuses cached results. The terminal report contains neutral
fixture/source/status fields only. It never retrieves, prints, copies, or stores Google
OAuth credentials. If the SSH route is absent, it prints exactly
`cross-repo YouTube execution route missing` and does not create another credential.

For candidates with a private ytimg thumbnail URL, macOS can run local Vision OCR
without a transcription or cloud service:

```bash
npm run scan:youtube-thumbnails
```

The scanner revalidates HTTPS ytimg redirects, caps image type/size, stores only under
`.private/`, and prints fixture/source/format plus OCR reason codes. OCR can detect
spoiler text but never marks the image visually safe; visual review remains required.

### Optional YouTube Data API

The discovery command automatically selects the Data API when `YOUTUBE_API_KEY` exists
in the server environment; otherwise it uses Atom feeds:

```bash
export YOUTUBE_API_KEY="<set this in your shell or secret manager>"
npm run discover:youtube -- --region=PH --save-private
```

Do not commit the key or put it in client code. `.env` variants are git-ignored, but this
prototype does not load dotenv files automatically. The terminal report identifies only
`youtube_data_api` versus `atom_feed` and never prints the key, raw titles, descriptions,
thumbnails, video IDs, or destination URLs. Public list calls use the API key; SafeReplay
does not request YouTube-account OAuth.

## Current user journey

```text
Matches
  → choose date / favorites / competition
  → choose fixture
  → choose Highlights, Extended highlights, or a Full-match half
  → use the primary play control or a quiet Alternative text link
  → open the source through an allowlisted server redirect
  → return to the same neutral match view
```

Settings persist region, fixture time zone, City/Arsenal/Barcelona favorites, and
community-source visibility in versioned local storage.
The default time-zone choice follows playback region without conflating the two settings;
an explicit Device, Manila, or Norway choice survives later region changes. Norway time
uses the IANA `Europe/Oslo` zone, so daylight-saving transitions are automatic.
Community sources default on
for broad discovery and remain labeled `Community / unverified`.
The selected neutral fixture, date, competition, and format also persist for the current
browser session so returning from a provider can resume the same place. Provider titles,
thumbnails, URLs, and results are never stored there.
Watched/history UI was deliberately removed because it added navigation and state without
helping the core spoiler-safe viewing job.

## Trust boundary

```text
raw source research / item registry
      + YouTube Atom / optional Data API / authenticated remote search
              ↓
metadata scan + explicit public-field allowlist
              ↓
neutral catalogue DTO (no destination URL)
              ↓
mobile UI
              ↓
one-tap server-allowlisted /go/:source-id redirect
```

The public contract rejects raw title, description, thumbnail, score, result, events,
comments, exact duration, winner, goal, external URL, and legal-status fields. The app
does not embed third-party pages. It does not host, proxy, download, restream, bypass
DRM, or circumvent geo/access controls.

## Repository map

- `IMPLEMENTATION_PLAN.md` — durable product context, adaptive sequence, and scope.
- `CODEX_GOAL.md` — compact next-leverage mission for a continuing Codex run.
- `docs/design/spec.md` — locked mobile visual spec and concept inventory.
- `docs/evidence/` — source, playback, and vertical-slice findings.
- `config/sources.json` — broad provider-class registry.
- `config/team-aliases.json` — explicit, ambiguity-checked club and national-team names
  used by server-side YouTube matching.
- `config/fixture-snapshot.json` — dated neutral FIFA schedule evidence.
- `config/fixture-feed-snapshot.json` — dated, neutral EPL and Eliteserien projection.
- `config/fixture-feeds.json` — allowlisted fixture-feed candidates, aliases, and
  withhold reasons.
- `config/item-candidates.json` — current item-level evidence; server/raw zone only.
- `src/spoiler-scan.mjs` — multilingual metadata scanner.
- `src/youtube-discovery.mjs` and `src/youtube-feed.mjs` — keyless, server-only official
  channel ingestion, fixture/time/year/scope matching, format detection, and spoiler gating.
- `src/youtube-data-api.mjs` — optional server-only uploads-playlist and batched video
  detail connector with duration, declared-region, identity, and private thumbnail evidence.
- `src/youtube-remote-search.mjs` and `scripts/remote-youtube-executor.mjs` — strict,
  allowlisted remote search ingestion plus read-only SSH verification and private caching.
- `src/youtube-thumbnail-ocr.mjs`, `scripts/scan-youtube-thumbnails.mjs`, and the local
  Vision helper — private ytimg OCR with neutral reason-code reporting.
- `scripts/discover-youtube.mjs` and `/proof/youtube` — neutral operator report, private
  candidate store, and opt-in iPhone destination proof.
- `src/fixture-discovery.mjs`, `src/fixture-download.mjs`, and
  `src/curl-json-fetch.mjs` — bounded fixture transport and schema routing.
- `src/eliteserien-calendar.mjs` — strict official-calendar parser and Oslo-to-UTC gate.
- `src/fixture-sanitizer.mjs` — fixture public-field firewall; browser localization is
  isolated in `app/public/time-zone.js`.
- `src/source-registry.mjs` and `src/item-registry.mjs` — evidence validators and gates.
- `src/catalogue.mjs` — sanitized current catalogue assembly.
- `src/catalogue-projection.mjs` — validated surface-item projection, evidence-first
  ranking, directory replacement, and server-only redirect promotion.
- `src/public-contract.mjs` — strict client DTO allowlist.
- `app/server.mjs` — static/API/redirect boundary.
- `app/public/` — dependency-free mobile PWA shell.
- `scripts/refresh-daily.mjs` — fail-closed mechanical fixture + YouTube refresh.
- `tests/` — contract, leak, UI-state, PWA, provider, and spike tests.

## Known blockers

- The app shell runs locally and has been exercised in Browser/IAB at explicit desktop
  and 390 × 844 phone viewports, plus Playwright WebKit with an iPhone 15 profile.
  Matches, Settings, the vertical detail hierarchy, alternatives, washed-out fixtures,
  covered YouTube playback with sound, safe pause/resume, and desktop fullscreen were
  rendered. This remains browser-engine evidence, not physical iPhone Safari or
  standalone-PWA evidence.
- Direct YouTube, FOX Sports, ITVX, and FIFA+ playback validation remains incomplete in
  the current browser surface. Keyless YouTube Atom discovery works independently; the
  authenticated remote route also completed again on 2026-07-11, but neither discovery
  path substitutes for destination playback observation.
- A compliant compact-player experiment was run against both exact France–Morocco Aleph
  uploads. It delayed loading until Start, used the minimum 355×200 privacy-enhanced
  player, loaded no comments, and removed end screens in code. Both uploads returned
  YouTube error 150 because the uploader disabled embedding, so they are not shown as
  working player choices. The remaining choice is whether to expose direct YouTube links
  despite their result-bearing metadata.
- A public solution lab now makes that choice empirical. Daniel confirmed that native
  video works, direct YouTube autoplays, and the tiny window behaves similarly; he rejected
  Piped as too slow, Invidious as spoiler-bearing, and watch-popup after error 153. Six
  active approaches remain. The selected player fully covers the thumbnail except for
  YouTube's native play target, starts with sound, and reveals only after playback begins.
  Native playback now offers fast 360p and an
  experimental live-merged 720p option.
- The direct Data API connector is fixture-tested but has not been called with a local
  key. Authenticated remote-search evidence remains valid and the route worked again on
  2026-07-11. Its search JSON still lacks exact duration and declared-region detail
  and cannot replace PH/NO playback or private thumbnail review.
- Exact SBS, RTÉ, and ZEE5 broadcaster items were recorded as comparison evidence. SBS
  still lacks PH/NO playback proof, RTÉ's description reveals the outcome, and ZEE5 is
  paid and India-only, so none displaces YouTube or enters normal free results.
- FootReplays matched a current Brazil–Norway item whose mobile action remained blocked
  by a subscription popup. A later desktop browser check of the exact France–Morocco
  page reached separate first-half, second-half, Full, and Highlight routes. The Full
  route opened a 2:27:41 player and playback advanced, but its first click opened an ad
  tab and its pre-play collage can spoil. A later covered-iframe experiment failed because
  the provider explicitly refuses sandboxed embeds; SafeReplay removed it instead of
  restoring popup and top-navigation rights. The indexed ReFooty item returned 404. The exact
  France–Morocco Reddit thread remains as a comment-spoiler fallback; its main-post Full
  link resolves to the same observed FootReplays item.
- The remote connector now uses one format-aware OR query per fixture: both teams plus
  `highlights`, or both teams plus `full match`. This remains one cached call per fixture
  but fixed a real recall gap. The 2026-07-11 PH run searched the expanded 12-fixture
  window and saved five private candidates: three for France–Morocco (Aleph Short, Aleph
  Full, and official FIFA Short) and two for Spain–Belgium (Aleph Short and a long-video
  candidate). Four are metadata-blocked. Local OCR found no spoiler-text reason in any
  thumbnail but cannot establish visual safety.
- A private, default-off covered-player route now tests any candidate from the git-ignored
  queue without rendering its title, description, thumbnail, comments, or direct link.
  FIFA France–Morocco Short returned embed error 150 and stayed covered. Aleph
  Spain–Belgium long-video and Short candidates both played in PH Browser/IAB; the long
  candidate was then removed from the product because its runtime was not format proof.
  SafeReplay now provides `Pause safely`, which recreates a covered native-play state at
  the saved position, and destroys the iframe at the end. Browser/IAB proved desktop
  wrapper fullscreen; Playwright WebKit proved mobile sound, pause, and resume. Physical
  iPhone Safari remains required for the final device claim.
- The Spain–Belgium items are exposed because Daniel explicitly requested every known
  useful link for immediate personal use. The simple approved UI does not insert a
  warning interstitial; the automated discovery/promotion gate itself is unchanged.
- EPL fixtures are now sustainable through a real free feed, but only City and Arsenal
  are enabled. Eliteserien fixtures use the official league calendar. Barcelona/La Liga,
  Ligue 1, Champions League, Euros, and the
  next World Cup refresh still need separate proven fixture paths.
- Real iPhone Safari, standalone-PWA install, actual bfcache/app-switch return, and
  provider handoff tests remain required. Watched/history no longer exists in the approved
  product; neutral Matches/detail restoration remains automated-test evidence.

## Next best step

Run the existing physical-iPhone operator check against the LAN app: open Spain–Belgium,
start the covered YouTube highlight, verify sound, safe pause/resume, rotation, and return;
then verify one FootReplays handoff and the top-level Settings/time-zone flow. If that
passes, permanent free hosting plus the cached daily VPS refresh become the next launch
step. A new local API key or transcription service is still not justified.
