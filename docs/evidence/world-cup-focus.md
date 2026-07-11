# Norway and Argentina World Cup catalogue evidence

Checked: 2026-07-11  
Playback region: Philippines  
Display-time reference: Europe/Oslo and Asia/Manila

## Neutral fixture identity

The Norwegian Football Federation's 2026 World Cup media guide is the authoritative
source for Norway's six tournament fixtures and Norwegian kick-off times:

- Iraq–Norway, 17 June
- Norway–Senegal, 23 June
- Norway–France, 26 June
- Ivory Coast–Norway, 30 June
- Brazil–Norway, 5 July
- Norway–England, 11 July

Source: <https://www.fotball.no/landslag/norge-a-herrer/vm-2026/>

Argentina–Egypt on 7 July is backed by FIFA's match preview:
<https://www.fifa.com/en/articles/argentina-egypt-preview-live-stream-team-news-tickets>

Only teams, competition, and canonical UTC kick-off enter the public catalogue. Results,
venues, reports, and event data are deliberately discarded.

## Source discovery

The existing authenticated read-only YouTube route ran one format-aware search plus one
Norway-region TV 2 Sport search per fixture. No exact item from the registered TV 2
channel was found, so the public catalogue does not label any item as TV 2. Official FIFA
and Aleph Arena uploads were retained privately; result-bearing metadata remained blocked.

Five completed Norway fixtures and Argentina–Egypt have exact FootReplays match pages.
Each page exposed Full, first half, second half, and highlight controls. The public app
uses neutral allowlisted redirects and keeps the match page visibly community/unverified.
The provider pages and direct players remain susceptible to posters, popups, and other
third-party risks.

## Covered YouTube proof

All retained YouTube items were public and reported embed support. SafeReplay exposes the
useful five-minute class through the covered player. Norway–Senegal and Argentina–Egypt
also have long-form uploads whose private runtimes are consistent with complete coverage;
both started with sound in the public covered player. Their result-bearing thumbnails are
never sent to or rendered by SafeReplay before playback.

Browser/IAB proof covered:

- Argentina–Egypt date selection and complete mobile detail hierarchy;
- covered Argentina–Egypt and Norway–Senegal long-form playback with sound;
- static GitHub Pages artifact under `/safereplay/`;
- static redirect → covered player;
- no relevant console warnings.

The complete automated suite includes a public-contract assertion for all six Norway
fixtures, Argentina–Egypt, every required format on completed fixtures, the static build,
base-path routing, and the spoiler-field firewall.
