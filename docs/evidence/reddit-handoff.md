# r/footballhighlights handoff evidence

Checked: 2026-07-11  
Sample: France–Morocco, FIFA World Cup 2026 quarter-final  
Region target: Philippines

## Question

Can SafeReplay bypass the Reddit comment surface and send the user to a concretely
better Full-match destination without discarding Reddit as a useful fallback?

## Observed structure

- The neutral match thread exists at
  `https://www.reddit.com/r/footballhighlights/comments/1us2ust/france_vs_morocco_world_cup_09jul2026/`.
- Its main post link is labeled as a Full match in English and points directly to the
  exact FootReplays item already recorded by SafeReplay.
- The remaining alternatives are inside comments and lead mainly to file-host,
  file-sharing, transfer, or intermediate-link pages in several languages and qualities.
- At least one comment reports that in-browser audio may not work on its linked file
  host, and another explicitly warns of a possible spoiler in the player thumbnail.
- A prior 390 × 844 FootReplays interaction reached the exact item page, but its Full
  action was blocked by a subscription popup.
- A later desktop Chromium check followed the page's Full route through HGCloud to a
  2:27:41 player. The first play click opened a Lazada advertising tab; after closing it,
  the player loaded its HLS media and advanced past 28 seconds without an error.
- The provider's first paint is not spoiler-safe: it shows a large collage of match
  frames before playback. No iPhone playback proof exists yet.

## Decision

Rank the exact FootReplays page above the Reddit thread because its Full playback is now
observed and the Reddit main-post link reaches the same page. Show separate Full, Halves,
and Short rows, keep `Community / unverified`, and tag the observed spoiler-thumbnail and
ad-popup risk. Keep the neutral Reddit thread as a fallback without opening comments.
Do not claim that the other comment-hosted links play merely because they exist.

This is a ranking decision based on observed usability and spoiler exposure, not a legal
classification. A comment-free SafeReplay source list remains desirable, but each
extracted link needs its own redirect, metadata, playback, region, and end-state checks.

## Next useful experiment

Test the observed FootReplays Full route on a real iPhone and determine whether a
SafeReplay-controlled crop/cover can leave only the required play and fullscreen targets
without exposing the collage. If cross-origin ads make that unreliable, keep it as a
tagged fallback and prefer a cleaner observed destination when one appears.
