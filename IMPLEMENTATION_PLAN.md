# SafeReplay — product and implementation plan

Status: ready for iterative implementation  
Updated: 2026-07-11  
Workspace: `/Users/user/Documents/Youtube - don't spoil results`

Current checkpoint: the mobile shell, public DTO firewall, provider redirect boundary,
PWA artifacts, source registries, and tests are implemented. The catalogue now uses a
checked FIFA/NFF schedule snapshot for all six Norway World Cup matches, the recent
Argentina–Egypt match, four current quarter-finals, and a real Fixture
Download slice for the next ten Manchester City/Arsenal EPL fixtures through 8 October.
The EPL schema and opening priority fixtures were cross-checked against the official
Premier League schedule; the bounded CLI strips score/winner/location fields and refuses
failed or empty catalogue promotion. The same pipeline now ingests 79 upcoming fixtures
from Eliteserien's own same-host iCalendar feed, with strict event identity and DST-aware
`Europe/Oslo` conversion. All fixtures are sanitized into canonical UTC
kickoffs. The browser alone localizes them to the selected IANA time zone;
the default follows playback region (Manila now, Norway after the region change), while
Device, Manila, and Norway remain explicit persistent options. Oslo summer/winter DST
and Manila date rollover are automated-test evidence. The exact France–Morocco
FootReplays page is now represented by separate Full, Halves, and Short rows ahead of
the retained r/footballhighlights `thread_candidate`. Desktop PH testing proved that
the Full route reaches a 2:27:41 player and advances, but the first click opens an ad
tab and the provider's pre-play image collage can spoil; the row is therefore tagged
`Community / unverified` and `Spoiler thumbnail · ad popup`, not presented as safe.
The Reddit main-post Full link reaches that same item, while its comment-hosted links
remain unverified. Spain–Belgium now exposes all useful known routes at Daniel's explicit
request: covered YouTube Short, direct FootReplays Full/first-half/second-half players,
the exact FootReplays match page fallback, and a filtered r/footballhighlights search.
The direct routes bypass the listing thumbnail; Full loaded media and both halves exposed
video elements in PH Browser/IAB. Their player posters and physical-iPhone play remain
unverified. The long YouTube candidate was deliberately removed because
runtime alone is not format proof; Full comes from replay sources. These are use-now
risk-labelled choices, not automatic surface-gate
promotion. See `README.md` and `docs/evidence/vertical-slice.md` for
current proof and blockers. YouTube is now the primary discovery backbone rather than a
deferred source class: FIFA, Aleph Arena, Premier League, LALIGA, Ligue 1, UEFA, four
priority club channels, and TV 2 Sport are feed-ready through a keyless, server-only Atom
connector. TV 2 Sport remains `Community / unverified` because its stable channel ID is
known but ownership has not been confirmed from a first-party TV 2 source. A
disabled-by-default
local proof route can carry
private candidates to a real iPhone without rendering raw metadata. No generated YouTube
item is surfaced before thumbnail, playback, region, and iPhone handoff gates. An optional
server-only YouTube Data API path is implemented behind `YOUTUBE_API_KEY`; keyless Atom
feeds remain the fallback. Both paths share a current-fixture identity gate using both
teams, bounded upload/scheduled-live time, explicit year compatibility, and private
senior-team scope. Once an
item is explicitly promoted to `surface`, the catalogue now projects it automatically to
a neutral public row and server-only redirect; no additional hardcoded UI edit is needed.
The keyless production command now uses a bounded, redirect-free system-curl transport.
The authenticated remote connector uses one format-aware OR query per fixture, repeating
both teams for `highlights` and `full match` alternatives. A real 2026-07-11 PH run over
the expanded 12-fixture window saved five private candidates, including a fresh official
FIFA Short for France–Morocco and an Aleph Full/manual-review candidate for Spain–Belgium.
The registry currently spans 30 source definitions; 11 exact YouTube channels are
feed-ready. `npm run refresh:daily -- --region=PH` now performs the fixture refresh and
YouTube discovery in a fail-closed deterministic sequence. It updates neutral fixtures
and the private YouTube review queue, then requires the app process to restart. It uses no
LLM. `npm run refresh:daily:remote -- --region=PH` performs the same sequence through
Daniel's existing authenticated `youtube.readonly` route on `vps-claude`, with bounded
fixture queries, six-hour cache reuse, and neutral count-only output. This is the intended
daily scheduler command. A friend-safe static GitHub Pages build and deployment workflow
are implemented; the first production deployment is the remaining hosting gate. The
scheduler is not configured yet.
The approved local journey deliberately omits Watched/history. Only neutral navigation
and user settings persist; provider metadata, destinations, titles, thumbnails, and
results remain outside browser state. This behavior is automated-test and Browser/IAB
evidence, not yet physical-iPhone evidence.

The workspace also has a conditional discovery execution route: Daniel's
existing `youtube.readonly` capability on `vps-claude`. It is invoked over SSH without
creating, retrieving, copying, printing, or storing Google credentials. It runs one
targeted query per fixture, filters every result back to the checked channel registry,
passes metadata through the same private matcher/scanner, and reuses a six-hour private
cache. The first real PH batch found Aleph Arena Short and Full candidates for
France–Morocco, but correctly blocked both on metadata evidence before public projection.
Both were also tested in a delayed-load 355×200 privacy-enhanced player. Each returned
YouTube error 150 because the uploader disabled embedding. SafeReplay keeps the compact
player implementation for future embeddable uploads but does not surface these two as
working players. Showing their direct YouTube links is an explicit product choice because
the destination metadata can reveal the result.
Rather than decide that tradeoff theoretically, the app exposes a France–Morocco solution
lab with a verified control plus Full and Short. Daniel's first device pass removed
watch-popup (error 153), Piped (too slow), and Invidious (spoiler). Six active approaches
remain. The selected embed is covered by four panels that expose only YouTube's native
play target. A genuine native click starts with sound; only then does the app reveal the
video while retaining a title mask and safe pause/fullscreen controls. Direct YouTube and
the tiny window remain useful fallbacks. The native path offers YouTube's combined 360p file
and a live-merged 720p H.264/AAC stream using `ffmpeg`, with automatic cleanup when a
viewer switches quality or leaves the page.
This route improves discovery only; it does not supply exact duration, declared-region
detail, thumbnail safety, or playback proof. On 2026-07-11 the authenticated remote
route again verified `youtube.readonly`, then the format-aware batch completed 12 base
searches plus 12 Norwegian TV 2-priority searches and created no local credential. It
retained five private candidates and found no exact TV 2-channel item; none has
yet passed visual, playback, region, and iPhone proof.

A free local macOS Vision OCR helper now screens private ytimg thumbnails without a
cloud/transcription service. It revalidates the final host after redirects, enforces
image type/size and neutral-ID boundaries, saves only under `.private/`, and emits no OCR
text, video ID, URL, or image path in normal reports. Both current Aleph thumbnails had
no OCR-detected spoiler text. OCR does not inspect non-text visual clues and therefore
leaves `visualState: unreviewed`; it can never satisfy the thumbnail or playback surface
gate by itself.

The private candidate bridge now includes a covered YouTube playback route, enabled only
with `SOURCE_PROOF=1`. It accepts both manual-review and metadata-blocked candidates for
testing without exposing their raw metadata or direct links. On 2026-07-11, the fresh
FIFA France–Morocco Short failed safely with embed error 150, while Aleph Spain–Belgium
long-video and Short candidates both played in PH Browser/IAB. The long video's runtime
was 2:32:06, which does not prove it contains a full match. SafeReplay's
external pause control re-covers the player and the end state destroys it before related
videos can remain visible. Fullscreen is still unproved outside IAB.

On 2026-07-11 the selected public player also passed Playwright WebKit using an iPhone 15
profile: the native target started with sound, safe pause recreated the covered player at
the saved position, and resume retained sound. The run exposed and fixed a hidden iframe
title leak by neutralizing title mutations and accessibility-hiding the third-party frame.
No iOS Simulator runtime is installed in the environment, so physical iPhone Safari and
standalone-PWA behavior remain the final device gate.

The local app is render-tested in Browser/IAB at 390 × 844. The current pass confirmed
Matches → vertical detail → primary/Alternative handoff, top-level Settings without a
sticky bottom bar, and the neutral offline/reconnect state. It also exposed and fixed a source-heading gutter bug
that DOM tests missed, plus stale CSS caused by a one-hour unversioned asset cache. The
stylesheet is now versioned, the shell cache was advanced, and mutable code/style/
manifest assets revalidate. This remains closest-browser evidence, not real iPhone,
standalone PWA, or provider-playback proof.

The expanded fixture catalogue received a separate 390 × 844 pass. It exposed and fixed
a four-row date-rail regression by converting the rail to one horizontally scrollable,
snap-aligned row. The flow opened Arsenal–Coventry from the future rail at 03:00 Manila
on 22 August and 21:00 Norway on 21 August, then reached a neutral no-source screen.
The official Eliteserien flow was then rendered as its own competition: Fredrikstad–
Lillestrøm at 20:00 Manila and 14:00 Norway, again with a neutral no-source screen.

The shell is deliberately responsive rather than a phone strip on large screens. A
desktop Browser/IAB pass verified persistent left navigation, wide match rails,
vertically stacked detail cards, two-column Settings, and direct allowlisted handoffs.
The same live build was rechecked at 390 × 844 with top-header Matches/Settings
navigation and one-column detail without console warnings.

## 1. Purpose of this document

This is the durable context and decision framework for building SafeReplay. It is
not a fixed backlog. The implementing agent should preserve the mission and safety
boundaries, but may change architecture, order, data sources, and artifacts when
testing produces better evidence.

The development style is deliberately empirical:

```text
important uncertainty → smallest useful experiment → test → learn → adapt
```

Every increment must either improve the product for the user or retire an important
risk. Documentation, probes, prototypes, tests, or deciding not to build something
can all be the correct next step.

## 2. Mission

Build the easiest practical way to find and watch a football match replay or
highlight on an iPhone without first seeing the score, winner, result-bearing title,
thumbnail, comments, recommendations, or other obvious spoilers.

The application is a spoiler-safe catalogue and handoff layer. It does not host,
download, proxy, or restream video.

Working name: **SafeReplay**. The name is disposable.

## 3. Known user context

- Primary device: iPhone.
- Current playback region: Philippines.
- Expected playback region from September 2026: Norway.
- Budget: no paid viewing services; useful options must be free to watch, although a
  free account may be acceptable.
- Main sport: men's football, with occasional other sports only after football works.
- Priority clubs: Manchester City, Arsenal, FC Barcelona.
- Priority competitions:
  - Premier League
  - La Liga
  - Ligue 1
  - Eliteserien
  - UEFA Champions League
  - FIFA World Cup
  - UEFA European Championship
- Desired formats, in priority order chosen at viewing time:
  - Full match
  - Mini match / condensed match
  - Extended highlights
  - Short highlights
- r/footballhighlights is worth checking and may be surfaced as a neutral match-thread
  handoff when it is the best available option. It stays `Community / unverified` and
  warns the user not to scroll into spoiler-bearing comments. A clean direct-link
  handoff is a valuable later improvement, not a prerequisite for retaining Reddit.

Preferences should remain editable. Playback region and display time zone are distinct:
region changes source eligibility, while time zone changes fixture dates and clocks.
The time zone follows region by default but supports explicit Device, Manila, and Norway
choices that survive later region changes. It must never be inferred from the competition.

## 4. Honest product promise

SafeReplay should make accidental spoilers much less likely and should never
intentionally render result-bearing metadata.

It must not promise that every match has a free full replay, or that a third-party
player can be made perfectly spoiler-free. Recent full-match rights are scarce and
territorial. When only highlights exist, the app says so neutrally. When a destination
cannot be proven safe enough, the app hides or clearly gates it instead of pretending.

The app does not make legal determinations about third-party material. It reports
observable provenance and risk: who appears to publish it, whether that publisher is
verified as an official club/competition/rightsholder channel, whether payment or login
is required, where it played during testing, and what spoiler exposure was observed.

Exploration should be broad. A source is not excluded from research merely because it
is unofficial. Product ranking is based first on usefulness for the requested format,
observed spoiler safety, playback success, price, and region; provenance is shown as a
separate fact rather than used as a blanket veto.

The important product hierarchy is:

1. Free, tested spoiler-safe, correct format, and currently playable.
2. Free and useful with a clearly explained residual handoff or verification risk.
3. Optional community/unverified sources with provenance and security risk made clear.
4. Paid sources and access methods requiring bypass or circumvention are outside the
   chosen product scope.

“Free” means no payment is required for that item. It may require a free provider
account. Free trials that automatically become paid are not treated as free.

## 5. Smallest proof that the product is worthwhile

On the user's iPhone, in the Philippines:

1. Open an installed or bookmarked SafeReplay web app.
2. Find a recent match involving City, Arsenal, or Barcelona without seeing its result.
3. See only neutral choices such as `Full`, `Extended`, or `Short`.
4. Tap one free choice whose provenance and risk are clear and reach playback without
   an obvious spoiler flash.
5. Return to the same neutral match detail without provider metadata entering history.

This one real-device journey is more valuable than broad but untested provider
coverage. If it cannot be achieved reliably, the next step is to narrow the promise or
change the viewing approach before building more catalogue infrastructure.

## 6. Non-negotiable boundaries

### Spoiler safety

- Never expose scores, winners, goal events, standings, original video titles,
  descriptions, thumbnails, comments, view counts, or result-bearing runtimes in public UI,
  page metadata, accessibility labels, logs, analytics, URLs, notifications, or caches.
- Fixture and source data sent to the client is constructed from an explicit allowlist;
  raw third-party objects are never forwarded or object-spread into a response.
- A known highlight duration may appear as a neutral format aid. Full-match runtime stays
  private because it can reveal extra time or penalties.
- Browser tab titles and link previews use only the generic app name.
- A failure must produce a neutral error, not include a provider response body.

### Source provenance and product boundaries

- Do not download, rehost, proxy, restream, transcode, or cache audiovisual media.
- Do not bypass DRM, authentication, payment, regional restrictions, or provider apps.
- Do not scrape authenticated pages or use undocumented private endpoints.
- Only an ownership/rightsholder allowlist can confer `official` status.
- An external redirect is allowed only to an approved HTTPS hostname and must be
  revalidated after redirects.
- Reddit exploration may inspect the neutral match thread and public downstream
  destinations to document provider, format, spoiler behavior, redirects, popups, and
  playback. Do not download media, execute untrusted downloads, bypass access controls,
  or present downstream links as official, verified, or safe without evidence.
- Do not label a third-party source `legal` or `illegal`; this product is not a legal
  adjudicator.

### Scope and cost

- Core development and normal operation should use free tiers or local tooling.
- Do not silently add paid APIs, hosting, viewing subscriptions, App Store enrollment,
  or other recurring costs.
- Keep one deployable web application until evidence justifies another application or
  service.
- Do not build a native macOS application for the core product.

## 7. Product shape

### Primary surface

A mobile-first web app/PWA optimized for iPhone Safari and standalone home-screen use.
It should also work in normal desktop browsers, but mobile correctness comes first.

The first useful surface is intentionally small:

- recent and upcoming matches;
- favorite teams first;
- date and competition filtering;
- explicit `Philippines`, `Norway`, or another playback region;
- neutral format cards with primary play controls and quiet Alternative links;
- empty, pending, unavailable, stale, offline, and error states;
- install guidance that is actually tested on iPhone.

No scores, league tables, match ratings, “worth watching” signals, news, social feeds,
or decorative third-party imagery belong in the product.

### Source presentation

A match may show:

```text
Full match · FIFA+ · Free official
Extended · UEFA.tv · Free official
Short · Official YouTube · Free official
Community thread · Unverified
```

Only labels generated from trusted fixture and provider data are shown. If the app has
not recently verified availability in the selected region, it says `Needs verification`
or omits the source; it never implies guaranteed playback.

Community/unverified options must remain visually distinguishable from verified
official sources. They are currently shown by default behind a concise risk
acknowledgement and can be hidden in Settings. Revisit this only with usability evidence.

### Playback and handoff

There are three approaches to evaluate early rather than assume:

1. A supported provider embed inside a neutral SafeReplay page.
2. A direct handoff to a provider page whose current metadata is verified safe.
3. Safari protection for destinations whose own page leaks spoilers.

The simplest approach that passes real iPhone testing wins. No overlay, cropping, ad
blocking, or player-control obstruction may be used to disguise YouTube metadata.

A Safari Web Extension is a gated option, not an assumed requirement. It adds
installation, maintenance, signing, and possible App Store costs. Explore it only if a
PWA plus safe embeds/handoffs cannot deliver the core journey and a small real-device
spike shows that the extension can prevent first-paint flashes.

## 8. Source strategy

Provider availability is data that changes over time and by region. Keep a checked-in
provider registry with evidence, regions, discovery method, formats, cost class, login
requirement, provenance class, last verification time, playback result, redirect/security
observations, and spoiler-safety status. Exploration may add any relevant public source;
production surfacing requires a current sample and an honest risk classification.

### Broad source classes to explore

- Official club, league, tournament, broadcaster, and rights-holder YouTube channels are
  the primary Pareto discovery backbone for free Short and Extended coverage and an
  occasional Full/live/archive path. Poll verified channel feeds server-side without
  rendering their listings; match fixtures and formats, scan every item, and preserve
  channel ownership evidence. Exact availability and metadata safety remain per item,
  channel, region, and destination state.
- [FIFA+ Archive](https://www.plus.fifa.com/en/catalogue/archive), which currently
  exposes filters for full-match replays, extended highlights, and highlights. This is
  a strong full-match source for World Cup archive content, but not a promise of every
  current match.
- [UEFA.tv](https://www.uefa.com/uefatv-faq/), which currently offers free registration,
  highlights across UEFA competitions, and selected re-runs/on-demand material.
- [Barça One](https://www.fcbarcelona.com/en/watch-barca-one-on-all-devices), which has
  a mixture of free, registered, and subscription content. The app must classify the
  individual item, not the whole provider, as free.
- [Arsenal Video](https://www.arsenal.com/video), where official highlights and some
  full-match replays have historically appeared. Verify current men's-team access and
  both regions before relying on it.
- Official Norwegian league, club, federation, or rights-holder channels for
  Eliteserien highlights. This requires a current region-specific discovery spike.
- Public video platforms and broadcaster pages that carry match-specific replays or
  highlights, including region-specific channels and language variants.
- Public replay/highlight indexes and aggregators. Record where they lead, how many
  redirects or popups occur, whether playback is direct, which format is present, and
  whether the destination leaks spoilers. Do not infer official status from branding.
- Search-engine results and provider-specific site searches, which can discover sources
  that do not expose stable feeds.
- r/footballhighlights match threads and their public source ecosystem, explored across
  Full, first/second half, Mini, Extended, and Short formats.

Known paid examples such as CITY+ may be recorded as research evidence but are hidden
from this user's normal results. They are not substitutes for a free option.

### Community discovery

r/footballhighlights can help answer whether a thread exists and which neutral formats
the community claims to have. It does not establish who controls a downstream video,
whether it is safe, whether it still works, or whether it is malware-free. Exploration
should map the downstream provider ecosystem without downloading content or weakening
device security. Product integration can range from a neutral thread link to direct
unverified source options when current evidence supports a safe enough handoff. The app
must preserve the provenance label and should not claim to resolve legal status. Do not
discard a neutral match thread merely because comments can spoil: warn before handoff,
rank a demonstrably better destination above it when one exists, and investigate a
comment-free or direct-link route as a progressive enhancement.

### Matching and classification

Prefer simple deterministic rules over an LLM:

- exact approved channel/domain;
- both teams or a club-owned channel plus opponent;
- plausible publication window around kickoff;
- competition and format vocabulary;
- explicit conflict penalties;
- conservative confidence thresholds.

Unknown or ambiguous candidates stay private for manual review. Coverage should lose
to correctness.

Source scanning is per item. A channel that was safe last week may publish a
result-bearing title tomorrow.

For YouTube specifically, channel ownership and item safety are separate gates. A
verified club/broadcaster channel may provide the `official` label, but it never bypasses
title, description, thumbnail, playback, comments, recommendation, or end-screen checks.
Raw feed fields remain server-only. A generic embed is not the default delivery path;
the simplest exact-item handoff that passes real iPhone testing wins.

## 9. Fixture strategy

Fixture ingestion needs only teams, competition, canonical UTC kickoff time, and a neutral lifecycle
state. Scores and match events should never be stored in the public fixture model.

Keep UTC through ingestion, caching, sanitization, and the public DTO. Localize only in
the client using an IANA zone. Date rails, fixture grouping, and source context must all
derive from the same active zone so midnight crossings cannot split the UI.
The `Today` label derives from the current device instant in that same zone, never from
the fixture snapshot's `checkedAt` freshness timestamp.
`Europe/Oslo` must use platform time-zone data rather than fixed UTC offsets because
Norway observes daylight-saving time; `Asia/Manila` is the current default via region.

Start by testing free and official/established fixture paths rather than committing to
one vendor:

- Fixture Download is now the proven EPL path for the City/Arsenal slice. It returns all
  380 rows, but SafeReplay stores only selected neutral fixtures. Its own site warns that
  fixtures may change, so refresh remains explicit and freshness remains visible.
- La Liga from the same provider remains withheld after a mismatch with LALIGA's official
  Barcelona schedule. Ligue 1 is also withheld: its later placeholder dates conflict with
  LFP's fixed high-profile dates even though the opening-round pairings match.
- Eliteserien now uses the competition's official `text/calendar` subscription. The
  endpoint is keyless, same-host, redirect-free, and currently emits only scheduled
  future fixtures; unberammet later rounds do not enter the snapshot.

- [football-data.org](https://www.football-data.org/coverage) currently lists a free
  tier covering Premier League, La Liga, Ligue 1, Champions League, and World Cup.
- Euro/European Championship coverage on the free tier must be confirmed for the
  relevant tournament cycle.
- A small checked-in/demo fixture set is acceptable for UI and safety work while feed
  questions are unresolved.

Choose the smallest combination that gives reliable fixtures without placing score
payloads near the client. Paid fixture APIs are a fallback requiring explicit approval,
not the default.

## 10. Technical direction, with room to adapt

Use Build Web Apps practices for the core product. The likely starting point is one
strictly typed Next.js application because it can hold the mobile UI, server-only
sanitization, redirect boundary, lightweight ingestion, and PWA in one deployable.
React/Vite or a simpler local architecture is acceptable if an early spike proves it
reduces complexity without weakening server-side spoiler isolation.

Likely ingredients, to be selected only when they earn their cost:

- TypeScript strict mode;
- runtime schemas at external and public boundaries;
- a small persistence layer or checked-in cache;
- unit/integration tests for ingestion and sanitization;
- Playwright for user journeys and leak scanning;
- a service worker that caches only the safe app shell and sanitized data;
- free deployment/cron tiers, or manual refresh during early dogfooding.

Avoid early microservices, queues, accounts, cross-device sync, analytics, AI matching,
design-system packages, native apps, and a full browser-extension matrix.

### Core information boundary

```text
external fixture/source payload
            ↓
server-only raw zone
            ↓ explicit field selection + classification
spoiler firewall and strict public schema
            ↓
neutral fixture/source DTO
            ↓
iPhone PWA → validated provider handoff
```

The public DTO should need only neutral fixture identity, canonical UTC kickoff, availability, format,
provider display name, free/official/safety classification, and an internal redirect
path. Raw title, description, thumbnail, score, events, comments, and exact duration
remain outside it.

## 11. Design approach

Before significant UI implementation, use Build Web Apps plus an image-generated
visual concept for the complete mobile experience: home, match sources, settings, and
risk/empty/error states. The concept should feel calm and utilitarian, not like a sports
news site. It must avoid visual patterns that imply scores or invite scanning.

Get user feedback on the concept, then treat the accepted version as the visual spec.
Build a small token set and reusable primitives, but do not overdesign.

Important iPhone details to test:

- one-handed tap targets and bottom-safe-area spacing;
- 390 × 844 and smaller widths;
- browser mode and standalone PWA mode;
- text resizing, VoiceOver-friendly labels, contrast, and reduced motion;
- back navigation after a provider handoff;
- slow connection, cold load, rotation, fullscreen playback, and video ending;
- no title, thumbnail, recommendation, notification, or tab-title flash.

## 12. Testing and learning while building

Testing is part of every increment, not a final phase.

For each meaningful next step:

1. State the hypothesis and user value.
2. Name the smallest falsifiable proof before implementation.
3. Add the narrow automated test where one is useful.
4. Exercise the actual user flow in a browser.
5. For mobile or provider behavior, test on iPhone/Safari or the closest available
   simulator immediately rather than extrapolating from desktop.
6. Inspect rendered text, DOM, accessibility tree, page metadata, requests, errors,
   logs, and caches for spoiler-bearing material.
7. Record what was learned and change the plan or provider registry when evidence
   invalidates an assumption.

Use Browser/in-app browser and Playwright for repeatable web QA. Use Computer Use only
for behavior that depends on real local UI, such as Safari settings, Add to Home Screen,
provider-app handoff, or extension installation. Computer Use does not replace automated
tests.

### High-value test families

- Sanitizer and public-schema tests with nested malicious score/result fields.
- Per-video title/description/thumbnail scanning and conservative rejection.
- Domain and redirect validation, including off-domain and spoiler-bearing URLs.
- Source matching and format classification around ambiguous team names.
- Region, cost, login, stale, removed, and unavailable filtering.
- E2E journeys for first use, favorites, no source, safe source, failed handoff,
  offline shell, and community disabled/enabled.
- Leak tests covering visible text, HTML attributes, accessibility names, document
  title, Open Graph/JSON-LD, API payloads, cache storage, and safe error messages.
- Real-device first-paint and end-of-video checks for every playback method offered.

No arbitrary percentage target should substitute for testing the trust boundaries and
the user's common journey.

## 13. Discovery-driven delivery sequence

The following is a direction, not a rigid phase contract. Reorder it when evidence says
another step has higher leverage.

### Establish feasibility

- Sample recent priority matches and map as many relevant free Full, Mini, Extended,
  and Short source classes as practical in the Philippines; repeat representative
  checks for Norway. Do not narrow exploration to official sources.
- Test the candidate playback approaches on iPhone for spoiler flashes and usability.
- Prove at least one sustainable fixture path and identify the Eliteserien gap.
- Build the smallest spoiler-firewall proof with hostile fixture/source examples.

The outcome is a written evidence table and a go/narrow/change decision, not necessarily
production code.

### Prove one vertical slice

Build only enough catalogue, source discovery/manual entry, sanitization, neutral UI,
and handoff to complete the smallest proof in section 5. Use real provider data where
safe and deterministic demo data elsewhere. Test it in iPhone Safari and PWA mode.

### Make it personally useful

Expand coverage for City, Arsenal, and Barcelona; add the priority competitions in the
order actual viewing demand and free-source evidence justify. Add automatic discovery
source by source only after per-item spoiler scanning and provenance classification
work. Improve empty and stale states so missing full matches do not feel like
application failure.

### Add carefully gated breadth

Consider UEFA/FIFA archives, Barça/Arsenal web connectors, Eliteserien sources,
r/footballhighlights thread discovery, and additional sports one at a time. Each new
connector must bring evidence, fixtures, safety tests, and a removal/failure path.

### Harden only what survives dogfooding

After several real match cycles, strengthen the workflows actually used: refresh
scheduling, persistence, deployment, monitoring, accessibility, and perhaps Safari
protection. Do not operationalize unused complexity.

## 14. Evidence and decision log

Keep lightweight durable evidence in the repository, for example:

```text
docs/evidence/source-coverage.md
docs/evidence/iphone-playback.md
docs/evidence/fixture-feeds.md
docs/decisions.md
```

For each provider or technical choice, record date, region, device/browser, sample URL
or non-spoiler identifier, result, residual risk, and next recheck. Never paste a score,
spoiler-bearing title, thumbnail, or comment into a public screenshot or normal log.

Update this plan only when a durable product boundary, priority, or architectural
direction changes. Put temporary discoveries in the evidence log.

## 15. Decision gates

### PWA gate

Continue with the PWA when it can deliver the smallest proof on iPhone. If Safari/PWA
cannot prevent destination spoilers for enough useful sources, narrow to verified-safe
sources while testing the next viewing approach.

### Extension gate

Invest in Safari protection only when all are true:

- spoiler leakage outside the catalogue is the dominant remaining problem;
- a meaningful number of free verified sources would become usable;
- a document-start real-device spike prevents flashes across cold load, slow network,
  pause/fullscreen/end, and navigation;
- installation, signing, distribution, and maintenance cost are acceptable.

Otherwise, exclude unsafe destinations.

### Provider gate

Surface a provider only when provenance class, free status, region behavior, discovery
method, current playback, spoiler behavior, redirect/security behavior, and failure
behavior have evidence. Verified ownership is required only for the `official` label,
not for exploration or a clearly marked `community/unverified` classification. Recheck
volatile providers.

### Deployment gate

Do not incur paid infrastructure or publish broadly until the personal workflow is
useful over multiple match cycles and the spoiler firewall has adversarial tests.

## 16. Success measures

Initial success is qualitative and operational:

- The user completes the core journey on iPhone without encountering a spoiler.
- A recent priority match with the best available free source is discoverable soon
  enough to be useful, with provenance and risk shown honestly.
- The app honestly distinguishes Full, Halves, Mini, Extended, Short, unavailable, and risky.
- Moving the region between Philippines and Norway changes source eligibility without
  changing the spoiler-safe fixture catalogue, and updates displayed fixture time when
  time-zone mode follows region. An explicit time-zone override remains unchanged.
- Provider failure or missing coverage produces a calm neutral state.
- Adding or changing a connector cannot silently leak raw metadata through the public
  boundary.

After dogfooding, measure source hit rate by competition/region/format, false matches,
stale links, time from publication to discovery, handoff success, and any spoiler
incident. Do not collect more personal analytics than needed; a local/manual log is
enough initially.

## 17. Known uncertainties

- How often useful free full-match replays exist across official, platform, index, and
  community sources for recent men's Premier League, La Liga, Ligue 1, Champions
  League, and Eliteserien matches in each region.
- Whether official embeds or provider pages can pass spoiler-flash testing on iPhone.
- The most sustainable free Eliteserien highlight sources; the fixture path is now the
  official competition calendar.
- Whether free fixture coverage includes the relevant Euro cycle.
- How provider login walls, regional restrictions, and native-app handoff change between
  the Philippines and Norway.
- Whether extracting a stable, comment-free downstream handoff from r/footballhighlights
  materially improves the already useful warned thread journey.

These are reasons to test early, not reasons to freeze the project.

## 18. Guidance for the implementing agent

- Read this document before meaningful work and treat it as context plus guardrails,
  not a checklist.
- Re-inspect the repository, evidence, tests, and current provider reality before each
  major choice.
- Choose the highest-value uncertainty or user improvement and prove it minimally.
- Prefer modifying or removing existing machinery over adding parallel systems.
- Keep implementation and tests close together; test the rendered experience as soon as
  a flow exists.
- Let observed iPhone behavior override desktop assumptions and attractive architecture.
- If coverage and safety conflict, choose safety and report the coverage limitation.
- Ask before any cost, credential creation, production deployment, App Store/signing
  action, external upload, or material scope expansion.
- Stop when remaining work is blocked, unsafe, outside scope, approval-dependent,
  unclear, or low-value; report evidence and the best next step.
