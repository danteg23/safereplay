# First vertical slice evidence

Checked: 2026-07-10  
Target journey: fixture catalogue → requested format → tagged neutral provider row →
direct allowlisted handoff.

## Hypothesis

A useful mobile shell can complete the interaction journey without exposing raw source
metadata if:

1. the server emits only an explicit neutral-field allowlist;
2. external destinations never enter the catalogue DTO or client bundle;
3. every destination is reached through a fixed server allowlist;
4. every row shows format, access, provenance, and spoiler-surface facts before navigation;
5. absent formats lead to available alternatives without counts or result-shaped data.

## Implemented proof

- Dependency-free, mobile-first app shell in `app/public/` with Matches, Sources,
  Watched, Settings, Mini empty state, descriptive source tags, and direct source links.
- Node server in `app/server.mjs` for the static shell, `/api/catalogue`, and fixed
  `/go/:source-id` redirects.
- Strict DTO validator in `src/public-contract.mjs`; unexpected and raw keys are rejected,
  including nested score, result, title, description, thumbnail, comments, duration,
  events, external URL, and legal-status fields.
- Dated FIFA fixture snapshot in `config/fixture-snapshot.json`, sanitized by
  `src/fixture-sanitizer.mjs` and assembled in `src/catalogue.mjs`. The current UI shows
  France–Morocco, Spain–Belgium, Norway–England, and Argentina–Switzerland fixtures.
  The public DTO carries only UTC kickoffs; the browser displays Manila by default and
  supports region-following, device, Manila, or DST-correct Norway time.
- A real Fixture Download EPL projection adds the next ten City/Arsenal fixtures through
  8 October. The source schema and opening fixtures were checked against the Premier
  League schedule; only neutral fields survive into `config/fixture-feed-snapshot.json`.
- Eliteserien's official calendar contributes 79 scheduled future fixtures through 20
  September. Its ICS parser requires stable event identity and `Europe/Oslo` timestamps,
  rejects ambiguous DST, and strips descriptions, locations, URLs, and other raw fields.
- The exact France–Morocco FootReplays page is represented by Full, Halves, and Short
  rows. Desktop PH evidence proves the Full route reaches a 2:27:41 player and advances,
  so it is ranked first. It remains `Community / unverified` and tagged
  `Spoiler thumbnail · ad popup`; its iPhone behavior is still unproved.
- The exact r/footballhighlights match thread remains a lower-ranked `thread_candidate`
  tagged `Comments can spoil`. Its main-post Full link reaches the same FootReplays item;
  other comment-hosted links are not treated as observed videos.
- Aleph Arena appears only as a `directory_candidate` for the free Spain–Belgium
  broadcast. The UI says that the exact video metadata remains unverified.
- PWA manifest, safe-area metadata, service worker for the app shell, and 512px/180px
  install icons.
- Local preferences for region, fixture time zone, favorite teams, and community-source
  visibility. Provenance remains visible regardless of preference.
- Session-scoped return state for the selected neutral fixture, format, date, competition,
  and screen. Provider metadata, destination URLs, and scores are not
  persisted. A stale fixture ID falls back to Matches.
- Versioned local watched state containing fixture IDs only, with mark/unmark controls and
  a neutral Watched list that can reopen a current fixture. Stale IDs remain inert and
  malformed or duplicate values cannot inject stored text into the UI.
- Automatic promotion from validated `surface` item to neutral public row and server-only
  redirect. Current candidates still produce zero promoted rows.
- Full, Halves, Mini, Extended, and Short are now first-class public format values.

## Falsification and automated results

`npm test` passes 128/128 tests. The relevant failures the suite now prevents include:

- adding a raw or nested spoiler-bearing field to the public DTO;
- leaking an external destination into the API or public browser bundle;
- accepting an arbitrary redirect target;
- framing a provider page;
- caching `/api/` or `/go/` responses in the service worker;
- showing a score-shaped string in the rendered home journey;
- losing the Mini empty state, visible source tags, direct-link behavior, or community toggle;
- promoting an item candidate before observed playback and candidate-grade metadata.
- classifying a Reddit thread candidate as official or surfacing it without the
  community/unverified boundary.
- losing the selected match and format after a document reload following a provider
  handoff, or persisting provider metadata in session storage.
- projecting a candidate, blocked, removed, paid, stale-fixture, or source-format-
  inconsistent record; leaking raw item metadata during projection; or leaving a weaker
  directory row beside its exact observed replacement.
- matching a stale or explicitly historical same-team video to the current fixture,
  matching women/youth/academy content to a `senior_men` fixture, or missing a scheduled
  live stream merely because its video page was created earlier.
- persisting fixture names, source metadata, scores, or destinations as watched state;
  rendering stale stored IDs; or losing mark/unmark state across a document reload.
- accepting remote YouTube results from an unknown channel, trusting a returned external
  URL, caching account/pagination fields, repeating an identical quota-bearing search,
  swallowing the required SSH-route error, or printing raw remote metadata.
- fetching a thumbnail from an unrelated/redirected host, accepting a non-image or
  oversized response, using an unsafe candidate ID as a filename/report identity, leaking
  OCR text/video IDs/private paths, or treating OCR-clear text as visual safety.
- localizing the same UTC kickoff to the wrong Manila date or an Oslo time that ignores
  summer/winter daylight-saving offsets; overwriting an explicit time-zone choice when
  playback region changes; or leaking localized fixture fields into the public DTO.
- following a fixture-feed redirect, accepting non-JSON/oversized/schema-changed data,
  misreporting a transport failure as a schema error, saving raw score/winner/location
  fields, replacing the checked catalogue after failure/zero matches, duplicating fixture
  identity, or spending YouTube searches on distant future fixtures.
- accepting an unofficial/wrong-host calendar, wrong calendar MIME type, malformed or
  folded event identity, unsupported timezone, duplicate UID, impossible/ambiguous Oslo
  local time, or leaking calendar description/location/URL fields.

The DOM-light journey test executes the real client module and verifies:

```text
Matches
  → France / Morocco
  → Choose a version
  → Mini: No Mini source yet + alternatives
  → All: r/footballhighlights (Full community thread)
  → Full / Free links vary / Community / Comments can spoil tags
  → one-tap internal /go/france-morocco-reddit handoff
  → return → Mark watched
  → Watched → reopen France / Morocco
```

## Browser and device evidence

Rendered Browser/IAB proof was obtained on 2026-07-10 after local TCP binding became
available. The app ran at `127.0.0.1` with an explicit 390 × 844 viewport. The pass
visually and semantically exercised:

```text
Matches → France / Morocco → all six format tabs
        → Mini empty state → Full alternative
        → Mark watched → Watched list → reopen fixture
        → tagged r/footballhighlights internal link
server offline → neutral unavailable state → Try again → same neutral fixture/format
```

The source row exposes only the internal `/go/france-morocco-reddit` path and visibly
tags the comment risk. No provider URL, raw title, thumbnail, score, or result appeared
in the rendered SafeReplay UI.

The visual pass found a real CSS regression: `.screen > h1` overrode the intended team
heading gutter, placing France/Morocco against the viewport edge. A more specific source
heading selector fixed the measured left edge from 0px to the intended 22px. The first
reload still used stale CSS because styles had a one-hour cache lifetime and no asset
revision. The stylesheet URL and shell cache are now versioned, while HTML, JS, CSS, and
the web manifest revalidate. A new server contract test covers the mutable-asset policy.

The later fixture-feed pass found that ten future date tabs expanded the original grid
to four rows. The date rail is now one horizontally scrollable, snap-aligned row. The
rendered flow selected Arsenal–Coventry at 03:00 Manila on 22 August, opened its neutral
no-source screen, then showed the same UTC fixture at 21:00 Norway on 21 August. No raw
URL or score-shaped text appeared, and the console stayed clean.

The official-calendar pass added a first-class Eliteserien competition tab and rendered
Fredrikstad–Lillestrøm at 20:00 Manila and 14:00 Norway. Its six-format source view was
neutral and correctly said no source had yet been observed. No score-shaped text, raw URL,
framework overlay, or console warning appeared.

A responsive pass on the live HTTPS preview then replaced the explicit 430px desktop cap.
At 1440 × 960, the app rendered a persistent left navigation rail, wide date and
competition controls, two tagged source cards in one row, direct internal handoffs, and
two-column settings. The same build was measured at exactly 390 × 844 and retained the
existing phone home/source layouts. Both sizes completed match selection with zero
console warnings or errors; no raw destination, title, thumbnail, score, or result entered
the SafeReplay surface.

Watched fixture data survived reload, but one IAB reload returned to Matches instead of
retaining the active Watched tab. A later stable navigation remained on Watched until the
next reload. Treat active-tab restoration as unresolved browser/device behavior despite
the deterministic session-storage unit test.

This proves the closest-browser 390 × 844 rendering and offline/reconnect behavior. It
does **not** prove physical iPhone touch behavior, standalone PWA installation, Safari
first paint, rotation/fullscreen, actual bfcache/app switching, or provider playback.

## What this does and does not prove

Proved:

- the raw/public information boundary is enforceable in code;
- the complete local UI state journey, including watched persistence, exists and is
  deterministic;
- external URLs are server-only and allowlisted;
- the PWA shell artifacts are internally consistent;
- product copy classifies provenance and observed risk without legal judgments.
- the 390 × 844 local browser journey renders with correct source-heading gutter and a
  neutral offline/reconnect state.
- the 1440 × 960 desktop journey uses a real desktop layout and preserves the same
  neutral source and warning boundaries.

Not proved:

- that the Aleph directory currently exposes the exact match item or replay;
- that any downstream video linked from the Reddit thread plays safely or at all;
- that any destination currently plays in the Philippines or Norway;
- that source titles/thumbnails/comments stay hidden after leaving SafeReplay;
- real iPhone Safari or home-screen behavior.

## Next highest-yield proof

Visually inspect the OCR-screened Aleph Full thumbnail, then close that exact item through
free PH playback and first-paint/handoff observation. Keep the warned Reddit thread
unless a concretely better option is observed; a comment-free direct link remains useful
but is not a prerequisite. Then repeat the now-proven 390 × 844 return/mark-watched flow
on a physical iPhone in Safari and standalone mode.
