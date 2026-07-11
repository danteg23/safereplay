# SafeReplay visual specification

> **Superseded v1 reference.** This dark, status-heavy concept is preserved only for
> design history. Do not implement from this document. The approved and authoritative
> v2 direction is [`approved-v2.md`](./approved-v2.md), supported by
> `accepted-desktop-matches.png` and `accepted-mobile-detail.png` in this folder.

Status: concept set locked for the first vertical slice  
Primary viewport: 390 × 844 CSS pixels  
Desktop proof viewport: 1440 × 960 CSS pixels  
Primary concept: `docs/design/home-concept.png`  
Source concept: `docs/design/source-concept.png`  
Settings concept: `docs/design/settings-concept.png`  
Retired risk-sheet concept: `docs/design/risk-sheet-concept.png`  
Empty-format concept: `docs/design/empty-format-concept.png`  
Concept native sizes: 853 × 1844 pixels

## Visual idea

SafeReplay should feel like a quiet late-night cinema listing for football, not a sports
news site. The product is almost entirely typography, fine dividers, open list rhythm,
and a restrained fixture timeline. It intentionally contains no photography, crests,
thumbnails, result graphics, or decorative sports imagery.

The UI is dark because this is commonly used late at night or early in the morning, but
the palette is neutral rather than dramatic. Cool blue identifies selection and a
source-ready state. Amber means processing or caution. Gray means neutral, unavailable,
or not yet verified. Colors never stand in for provenance alone.

## Locked palette

These are implementation approximations to be checked against the concept screenshot:

```text
canvas              #090B0E
canvas-raised       #0D1014
text-primary        #F5F6F8
text-secondary      #A0A4AD
text-tertiary       #737983
divider             #2B3038
timeline            #545B65
accent              #3F98FF
accent-strong       #2F87F6
pending             #FFAD23
neutral-dot         #8A909A
focus               #74B6FF
```

No gradients or glows. Shadows are unnecessary on the home screen. Any modal/bottom
sheet may use only a small black elevation shadow plus the divider color.

## Typography

Use the iOS system stack first:

```css
font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display",
  "SF Pro Text", "Segoe UI", sans-serif;
```

Target CSS scale:

| Role | Size | Weight | Line height | Notes |
|---|---:|---:|---:|---|
| Screen heading | 42px | 700 | 0.98 | Tight display tracking around -0.04em |
| Brand | 20px | 700 | 1.1 | Quiet; never larger than screen heading |
| Team | 22px | 620 | 1.18 | Two stacked lines |
| Kickoff | 17px | 500 | 1.2 | Tabular numerals |
| Date number | 22px | 500 | 1.15 | Tabular numerals |
| Date/tab label | 15–16px | 500 | 1.2 | Selected state uses color and underline |
| Competition | 14px | 450 | 1.3 | Secondary color |
| Availability | 14px | 450 | 1.3 | Secondary color; dot carries state |
| Bottom navigation | 13px | 550 | 1.2 | Selected state uses accent |

All controls receive explicit font styles. Do not inherit browser-default button text.

## Layout and spacing

- Respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- Main horizontal gutter: 22px.
- Header top after safe area: approximately 26px.
- Screen heading begins roughly 38px below the header.
- Base spacing unit: 4px; common gaps are 8, 12, 16, 20, 24, 32, and 40px.
- Date rail uses three equal columns.
- Competition filter is a horizontally scrollable text tab rail with a fine bottom
  divider. Selection is shown by blue text and a 2px underline, never a rounded chip.

### Desktop adaptation

At 900px and wider, keep the same quiet visual system but use the available space:

- persistent 232px left navigation instead of a fixed bottom bar;
- centered main workspace up to 1120px wide;
- wide date and competition rails rather than a phone-width frame;
- two-column source cards and settings groups;
- centered modal warning instead of a bottom sheet;
- visible hover and keyboard-focus states.

Desktop must not render the mobile app inside a narrow phone-shaped column. All spoiler,
provenance, redirection, and neutral-state rules remain identical across breakpoints.
- Match list is full-width and open; no outer card or rounded wrapper.
- Fixture row minimum height: about 132px, with 20px vertical breathing room.
- Bottom navigation is fixed, approximately 76px plus the bottom safe area, with a top
  hairline divider.

## Home screen anatomy

### Allowed visible copy

```text
SafeReplay
Philippines
Matches
Thu 9
Today 10
Sat 11
All
Favorites
Premier League
World Cup
Manchester City
Arsenal
Barcelona
Real Sociedad
Norway
England
Bodø/Glimt
Rosenborg
Sources ready
Checking sources
No sources yet
Watched
Settings
```

Kickoff times `20:00`, `21:00`, `15:00`, and `18:00` are allowed demo data. No other
result-shaped numeric pairs are allowed.

### Fixture timeline motif

- One 1px vertical line aligns all match rows.
- Each row has one 12–14px ring centered on the line.
- Favorite/source-ready rows use an accent double ring.
- Other rows use a neutral gray ring.
- The timeline is structural, not decorative; it visually connects matches through the
  day.

### Availability states

- `Sources ready`: blue 7px dot.
- `Checking sources`: amber 7px dot.
- `No sources yet`: neutral gray 7px dot.
- Never show source count, score, exact runtime, or provider title in the home list.

## Match/source screen

The source-selection concept is locked. It uses the same palette, type, open-list
container model, divider logic, outline icon family, and bottom navigation. It includes:

- quiet back action `Matches`;
- two stacked team names and `Premier League · Today`;
- heading `Choose a version`;
- horizontal text tabs `All`, `Full`, `Mini`, `Extended`, `Short`;
- source rows showing only neutral format, provider display name, price class,
  provenance class, and a short spoiler-risk statement;
- no raw provider title, thumbnail, comments, exact runtime, score, or result clue;
- blue for a checked/safe metadata state, amber for destination caution, and gray for
  unknown/community status;
- no badges or rounded provider cards; use open rows and fine dividers.

Exact source-row copy for the concept:

```text
Full match
FootReplays
Free · Community / unverified
Surrounding page can spoil

Extended
Sports Is Cinema
Free · Aggregator
Destination needs caution

Short
True Highlights
Free · Aggregator
Title checked

Community thread
r/footballhighlights
Free · Community / unverified
Comments can spoil
```

These are illustrative evidence classifications, not legal judgments or promises that
the items exist for the sample fixture.

### Source-screen geometry

- Top back action begins at the main 22px gutter after the safe area; it is a plain
  chevron and text action, not a filled button.
- Competition/date context is muted and separated from the team names by roughly 12px.
- Team names use the same large display family as the home heading, on separate lines.
- `Choose a version` starts a distinct second block with about 38–44px of space above.
- The format rail spans the viewport with five equal text targets and a full-width
  divider. The selected underline is approximately 40px wide and 2px high.
- Source rows have about 20–22px horizontal inset and 18–22px vertical padding. A row
  holds four text levels: format, provider, access/provenance, and risk state.
- Provider names are 18–20px semibold; supporting lines are 14–16px and muted.
- A 6–7px state dot sits inline with the risk statement. The trailing chevron is
  optically centered in the row and never placed inside a separate container.
- Rows are separated only by hairlines. There are no provider cards, logos, images,
  source counts, or runtime labels.

## Icon inventory

All icons are simple outline SVGs with round caps/joins, roughly 1.7–2px CSS stroke:

- region chevron down;
- back chevron left;
- timeline/source state rings;
- availability dots;
- bottom navigation: football pitch for Matches, clock for Watched, gear for Settings;
- optional circular information icon on caution rows.

Do not substitute emoji, text arrows, filled icon styles, or unrelated metaphors.

## Interaction model

- Entire fixture/source rows are at least 44px tall and tappable.
- Date, competition, and format tabs update real local state.
- A match row opens its source screen.
- Every eligible source opens directly through its fixed internal `/go/` redirect.
- Before navigation, each row visibly tags format, access, provenance, and known risk.
- The back action preserves date/filter scroll state.
- Bottom navigation changes the actual visible surface.
- Respect `prefers-reduced-motion`; otherwise use only 140–180ms opacity/position
  transitions for selection and sheets.

## Settings screen

The settings concept is locked. It carries the same true near-black canvas, open-list
structure, gutters, typography, outline icons, fixed navigation, and restrained blue
selection treatment as the primary screens.

### Allowed visible copy

```text
Settings
Playback region
Philippines
Norway
Other
Favorite teams
Manchester City
Arsenal
Barcelona
Add team
Competitions
7 selected
Premier League · La Liga · Ligue 1 · Eliteserien · Champions League · World Cup · Euros
Sources
Community sources
Always shown as unverified
Show provenance
Always
App
Install app
Matches
Watched
```

### Settings geometry and controls

- `Settings` uses the same 42px display role as `Matches`, with a large quiet gap before
  the first section.
- Settings are grouped with whitespace and full-width section boundaries, not cards.
  Within a group, only inset hairlines divide adjacent rows.
- Section labels are 14–16px and muted. Primary setting labels are 17–20px; explanatory
  text is 14–15px and may wrap to two lines.
- Region and team selection use blue outline checkmarks aligned to the trailing gutter.
- Toggles are compact iOS-style controls with a blue on-state. They have accessible
  labels and must work independently.
- `Community sources` defaults on for broad discovery while its fixed supporting copy
  keeps the provenance limitation visible. It is never presented as a legal status.
- The competition summary is a disclosure row, not a multi-line control surface.
- The page scrolls behind the fixed bottom navigation when content exceeds the mobile
  viewport; the final action receives bottom padding so it is not obscured.

## Direct destination handoff

An eligible source row is a native link to a fixed, server-allowlisted `/go/:source-id`
redirect. There is no intermediate warning sheet. The link remains neutral and never
contains the external destination, raw title, thumbnail, score, or comments.

Each row must show four compact functional tags before navigation:

```text
Full community thread
Free links vary
Community / unverified
Comments can spoil
```

Provider-specific values come only from the sanitized source record. Tags report format,
access, provenance, and observed risk; they do not judge legality or promise safety.

## Empty format state

The empty-format concept is locked. It is shown when a selected neutral format has no
eligible sanitized source records. The state must distinguish “not found” from app
failure and offer the other useful lengths without inventing availability counts.

### Allowed visible copy

```text
No Mini source yet
We haven't found a Mini version for this match.
Try another version
Full match
Extended
Short
```

`Mini` is dynamic and may be replaced with another selected format. Alternative rows
come only from formats that currently have at least one sanitized source item; their
presence is the availability cue, so no counts or runtime labels are shown.

### Empty-state geometry and behavior

- The match header and five format tabs remain fixed in the same layout as the source
  screen. The unavailable format remains selected in blue.
- The absence message occupies the upper-middle of the content area with one restrained
  28–34px outline clock/length icon, a 24–26px semibold heading, and one muted sentence.
- Alternatives use the standard open-list row and chevron family below a muted section
  label. Selecting one switches the active format and renders its source rows without a
  route change.
- No retry promise, source count, exact runtime, provider data, warning color, or
  technical error copy belongs in this normal empty state.

## Absolute exclusions

No scores, results, winner language, goal counts, standings, raw titles, thumbnails,
comments, view counts, exact video durations, source-count metrics, team crests,
photography, card grids, bento layout, decorative badges/pills beyond the functional
source-detail tags, gradients, glows,
marketing hero, or invented product claims.

## Recorded first-slice deviation

Until automatic fixture refresh and exact per-match video matching are implemented, the
running app must show the plain muted notice `Fixtures checked 10 Jul · sources may be
directories`. A directory candidate uses `Fixture checked · source directory, exact
video unverified`, and its format row says `Full source directory`, never `Full match`.
An exact community-thread candidate uses `Fixture checked · community links, playback
varies`, `Full community thread`, and `Comments can spoil`. A blocked item page uses
`Full item page` and states the observed blocker.
This extra copy is an intentional honesty requirement and outranks the visual-copy lock.
It is not a badge or marketing label. Remove it only when the rendered source is backed
by item-level metadata and playback evidence.
