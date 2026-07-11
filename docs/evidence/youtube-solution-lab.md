# YouTube solution lab evidence

Checked: 2026-07-11

SafeReplay exposes `/lab/youtube/france-morocco` as a spoiler-neutral comparison page for
one known-playable control plus the exact Full and Short candidates. Four inline methods
render in place. Direct and tiny-window YouTube remain explicit external actions.

## Implemented experiments

1. Covered autoplay embed: opaque thumbnail shield, muted safe start, reveal only after
   YouTube reports `PLAYING`, permanent top metadata mask, and best-effort fullscreen.
2. Cropped privacy-enhanced YouTube embed, enlarged to 132% inside a 355×200 frame.
3. Obscured privacy-enhanced embed with 45px top and 42px bottom masks.
4. Native HTML5 video with fast combined 360p or live-merged 720p H.264/AAC.
5. Direct universal YouTube/app link.
6. Normal YouTube page requested in a 420×280 popup.

Watch-popup, Piped, and Invidious are shown only under dropped device findings.

Each method can be marked Works, Spoiled, or Failed separately for Playable test, Full,
and Short.
Verdicts persist locally as method IDs and labels only; source metadata is not stored.

## Current machine evidence

- Both exact match iframe candidates returned player error 150 because embedding
  is disabled by the uploader. Crop and masks therefore cannot make these particular
  embeds play, but remain useful for future embeddable uploads.
- The official YouTube IFrame API sample `M7lc1UVf-VE` is the default control. `yt-dlp`
  2026.7.4 resolves it, the native video reached `readyState: 4`, and no media error was
  present in Browser/IAB.
- Earlier off-region extraction attempts were blocked. From the current Manila network,
  `yt-dlp` now resolves both exact match items to validated `*.googlevideo.com` MP4
  streams. HTTP range probes for both returned `206`, `video/mp4`, and 1024 bytes. The
  automated browser created both native video elements without media errors.
- Daniel's Manila device test found: native works but 360p is inadequate; direct YouTube
  autoplays; tiny window behaves like direct YouTube; Piped takes too long; Invidious
  spoils; and watch-popup fails with error 153.
- `ffmpeg` 8.1.2 live-merges YouTube's separate 720p H.264 and AAC tracks without
  re-encoding. A partial stream probed as 1280×720 H.264 plus AAC, and Browser/IAB
  decoded it with `readyState: 4`, `videoWidth: 1280`, and `videoHeight: 720`.
- After a client interrupted the 720p response, the merger cleanup check reported zero
  remaining `ffmpeg` processes.
- The covered control rendered an opaque 355×200 shield over the entire thumbnail. A
  trusted click started muted playback, the player emitted `PLAYING`, and the shield
  reached opacity 0 only afterward. YouTube's real speaker/fullscreen controls remained
  visible. The automated browser did not expose the wrapper Fullscreen API, so automatic
  fullscreen remains best-effort rather than a claim.

## Verification

`npm test` passes 127/127 checks. Browser/IAB verified six active methods, four inline
previews, the complete covered-start state transition, Full/Short switching, both native
quality choices, 720p decode evidence, zero relevant console warnings/errors, and a
390×844 mobile layout with no horizontal overflow. Desktop screenshots captured both the
fully covered and playing states; mobile evidence captured the covered controls and
single-column layout.
