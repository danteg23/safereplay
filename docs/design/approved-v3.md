# SafeReplay approved v3 product contract

This revision keeps the v2 shell and replaces the match-detail/source hierarchy with the
final compact implementation verified on desktop (1280×900) and mobile (390×844).

- Matches stays status-free. Fixtures without a useful destination are washed out and
  cannot be activated; available fixtures open a separate detail screen.
- Detail stacks Highlights, Extended highlights, and Full match vertically on every
  device. Desktop does not place formats side by side.
- A format's primary source is represented only by its outlined play button. It is not
  repeated as a text link.
- Alternatives are quiet native text links, one per line, below the primary action.
- Known duration is neutral metadata in the format heading, for example
  `Highlights (5:16)`.
- FootReplays is the primary Extended highlights source for Spain–Belgium. The exact
  r/footballhighlights thread is its text alternative.
- Full match has no overall play button. First half and Second half each have their own
  play button; full-match alternatives remain text links.
- YouTube opens in the SafeReplay covered player. Four cover panels hide the thumbnail
  and title while leaving only YouTube's small native play symbol clickable. This keeps
  the first action spoiler-safe while giving the browser a genuine media click that can
  start with sound. After YouTube confirms playback, the cover is fully removed while a
  top mask remains over YouTube metadata.
- Desktop playback exposes one Fullscreen action. Before entering fullscreen, SafeReplay
  warns that YouTube can show the title for roughly three seconds and that moving the
  cursor can reveal it again. Mobile hides both the custom fullscreen action and warning.
  If playback is muted, the user taps YouTube's own speaker control inside the player;
  SafeReplay does not attempt an unreliable cross-origin unmute call.
- Timezone remains configurable only in Settings. Manila and Oslo stay pinned.
- On mobile, Matches and Settings are top-level actions in the header. There is no
  sticky/floating Settings control and Settings never uses a back button. Desktop keeps
  the persistent left navigation.
- During a live match, the exceptional match-list play control sits immediately left of
  the ordinary detail chevron. Every chevron shares the same right edge. The desktop
  sidebar contains only brand, Matches, and Settings; the redundant time-zone footer is
  removed because time zone is already managed in Settings and shown in match context.
- Pausing through YouTube automatically recreates a covered native-play state at the saved
  playback position, so a separate SafeReplay pause control is unnecessary.
- The third-party iframe stays accessibility-hidden and a mutation observer continuously
  replaces YouTube's result-bearing iframe title with a neutral label. This prevents a
  visually covered thumbnail from still leaking through accessibility metadata.

Browser proof for this revision covered desktop and mobile Matches, detail, covered
player before playback, playback after shield removal, muted-browser fallback, and
console logs. The full automated suite is the second acceptance gate.
