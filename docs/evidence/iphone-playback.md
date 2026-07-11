# iPhone playback evidence

Last updated: 2026-07-11

## Decision being tested

Can a mobile web/PWA flow open a free verified video source without SafeReplay
rendering third-party metadata, and without the playback surface producing an obvious
metadata flash?

This document records observed behavior. It does not decide or label the legal status
of third-party material. Provider provenance, free/paid status, region, playback
availability, and spoiler exposure are separate facts.

## Strategy for the first spike

### Expected user value

Retire the largest architectural uncertainty before building ingestion and catalogue
infrastructure. If a supported embed is safe enough, the product can remain a simple
PWA. If it exposes titles/thumbnails/recommendations, SafeReplay must limit candidates,
change the handoff, or justify a Safari-protection spike.

### Approach

Build a deliberately plain, non-product technical page that:

1. Contains no third-party iframe or metadata before the user acts.
2. Creates a privacy-enhanced YouTube embed only after a deliberate tap.
3. Uses documented player parameters (`autoplay`, `playsinline`, `rel=0`) without
   overlays, cropping, or blocked controls.
4. Exposes a debug-only reset so cold-load and repeated playback can be tested.
5. Uses a benign YouTube IFrame API demonstration video; no football result is involved.

### Smallest falsifiable proof

At a 390 × 844 mobile viewport:

- Before tap: no YouTube request, iframe, title, thumbnail, or third-party text exists.
- After tap: the player loads and is usable inline.
- Visual inspection records whether YouTube itself renders a title, thumbnail,
  recommendation, channel identity, or other metadata before/during playback.
- Reset returns to a state with no iframe.
- The page title and accessibility labels remain generic.

### Strategy loopholes and mitigations

| Loophole | Mitigation |
|---|---|
| A desktop browser is not iPhone Safari | Run the built-in browser first, then a WebKit iPhone-sized check; require a real iPhone check before claiming device safety. |
| A benign video may behave differently from a sports upload | This spike tests player chrome and loading behavior. Later provider evidence must repeat the check per source class. |
| Autoplay behavior depends on user gesture and audio policy | Create the iframe synchronously from the tap and record whether playback actually begins. Do not silently mute as a workaround. |
| The app cannot inspect cross-origin player DOM | Treat screenshot/video observation as required evidence and do not infer safety from the parent DOM. |
| End cards can leak after playback | First establish initial-load feasibility; add an end-of-video probe before enabling the source class in product. |
| Emulation can miss real Safari/PWA behavior | Keep real-device status explicitly `not tested`; it is a release gate, not an assumed pass. |

Strategy gate result: no known loophole invalidates running this narrow experiment.
The experiment cannot prove complete iPhone safety; it can disprove the simplest embed
approach or justify the next device test.

## Results

### Run 1 — built-in browser at iPhone-sized viewport

Date: 2026-07-10  
Viewport: 390 × 844  
Engine/device: Codex in-app browser; this is not a real iPhone or proof of Safari/PWA
behavior.

Before the tap:

- document title was exactly `SafeReplay`;
- the rendered accessibility snapshot contained only the neutral probe copy and two
  controls;
- iframe count was `0`;
- image count was `0`;
- console errors/warnings were empty;
- the visual frame contained only the neutral placeholder.

After `Start video`:

- exactly one iframe was created on the expected `youtube-nocookie.com/embed/...` URL;
- the parent page still exposed no third-party metadata of its own;
- the expanded iframe accessibility snapshot exposed the original video title,
  publisher/channel, thumbnail control, subscriber information, a YouTube watch link,
  and an unrelated end-screen recommendation;
- the screenshot visibly showed the original title and thumbnail before playback;
- autoplay did not remove the pre-play metadata surface;
- console errors/warnings remained empty.

After `Reset test`:

- iframe count returned to `0`;
- the neutral status returned;
- `Start video` became enabled again;
- the snapshot again contained no source metadata.

Automated static safeguards: `3/3` Node tests passed. They verify that the initial HTML
contains no iframe or YouTube hostname, the iframe is created only from the explicit
action with documented parameters, and the spike server disables image fetching while
allowing only the privacy-enhanced YouTube frame host.

### Run 2 — selected covered player in Playwright WebKit

Date: 2026-07-11  
Engine/device profile: Playwright WebKit 26.5, iPhone 15 profile (`393px` CSS width).  
This is materially closer to iPhone Safari than Chromium emulation, but still not a
physical device or standalone home-screen PWA.

Observed results:

- Matches, the one-column detail hierarchy, Settings without a back button, and the
  pinned Manila/Oslo time-zone sheet rendered without horizontal overflow.
- The four-panel YouTube cover exposed only the native play target visually.
- Clicking that native target started the real Spain–Belgium upload with sound. The
  custom fullscreen action stayed absent at the mobile breakpoint.
- `Pause safely` destroyed and recreated the player behind the cover at the saved
  position. The native play target returned, and the next click resumed with sound.
- YouTube changed the parent iframe's `title` attribute to the result-bearing upload
  title. SafeReplay now continuously restores the neutral `Covered YouTube player`
  label and marks both the host and iframe accessibility-hidden while leaving pointer
  playback available.
- YouTube emitted one cross-origin `postMessage` console error in WebKit, but player
  readiness, time advancement, sound, pause, and resume all continued to work.
- A WebKit offline reload kept the cached Matches shell rendered, although Playwright
  itself reported an internal reload error; this is supporting evidence, not a clean
  standalone-PWA pass.

The selected covered approach therefore passes the strongest available local WebKit
proof. Physical iPhone Safari remains the final device gate.

## Decision

**The uncovered generic YouTube embed approach is falsified as a spoiler-safe default.** The
privacy-enhanced hostname and documented player parameters do not suppress the video's
own title, thumbnail, channel identity, watch link, or recommendations. SafeReplay must
not label an arbitrary YouTube embed spoiler-safe merely because the parent page hides
metadata.

YouTube can still be a valuable discovery and playback source when one of these is
proven:

- the individual video's current title and thumbnail are themselves spoiler-safe;
- another supported handoff passes the relevant device test; or
- a later Safari-protection approach passes the plan's extension gate.

Real iPhone Safari and standalone-PWA behavior remain **not tested**. The selected
covered native-play approach now passes Browser/IAB and Playwright WebKit, so the
physical device run is for confirming that stronger replacement rather than revisiting
the already-rejected uncovered embed.

Next-leverage consequence: broaden source discovery and compare other Full/Mini/
Extended/Short provider classes instead of investing further in cosmetic embed masking.

## Prepared real-iPhone item proof

The YouTube-first connector now has an opt-in local device route. It is preparation, not
device evidence: it has not been executed on a real iPhone yet.

On a network that permits public YouTube feeds, run:

```bash
npm run discover:youtube -- --region=PH --save-private
SOURCE_PROOF=1 HOST=0.0.0.0 npm run app
```

Open `http://<Mac LAN IP>:4173/proof/youtube` on the iPhone. The route renders only
neutral SafeReplay fields and stays disabled in ordinary app runs. For one candidate,
record all of the following before changing its registry status:

1. first paint before playback: title, score, thumbnail, comments, or recommendations;
2. whether playback starts without payment or a paid account;
3. actual region and network used;
4. portrait and landscape/fullscreen behavior;
5. pause/resume metadata;
6. end-screen recommendations;
7. whether comments appear before or only below the player;
8. YouTube app versus Safari handoff;
9. return-to-SafeReplay behavior and whether the app retained the selected match;
10. any spoiler incident, popup, error, or unavailable message.

The raw discovered records remain in `.private/` and are never returned by the catalogue
API. The proof list and confirmation pages were contract-tested for raw title,
description, external URL, iframe, and disabled-by-default leaks.

## Neutral return-state proof

The client now stores only this session-scoped navigation record before a provider
handoff:

```text
screen · selected date · competition filter · fixture ID · format filter
```

It does not store the provider, provider title, thumbnail, destination URL, result,
score, or comments. A DOM-level reload test opens a fixture, selects Full, verifies the
direct internal source link, and reloads from the saved neutral state. The same neutral
fixture and format return without persisting provider data.
A stale fixture ID falls back to the Matches screen. This proves deterministic client
behavior, not actual iOS bfcache, YouTube-app switching, or standalone-PWA behavior;
those remain on the real-device checklist above.

## Closest-browser mobile shell proof

The local PWA shell has been exercised in Browser/IAB at 390 × 844 and in Playwright
WebKit using an iPhone 15 profile. Matches, vertical detail, primary and Alternative
links, Settings, the time-zone sheet, covered sound-enabled playback, and safe resume
rendered without horizontal overflow. Watched/history was deliberately removed from the
approved product, and mobile top-level navigation now lives in the header rather than a
sticky lower-right control.

This evidence covers the local SafeReplay shell only. It does not change any candidate's
playback status and does not substitute for YouTube first-paint, fullscreen, end-screen,
app-handoff, or physical-iPhone testing.

The later direct-handoff revision removed the warning sheet. Rendered desktop and WebKit
QA confirms each source is a native one-tap internal `/go/` link; the primary source is
represented only by its play control and Alternatives are quiet text links. Physical
iPhone behavior still needs the existing operator check.
