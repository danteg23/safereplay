# Fixture feed evidence

Checked: 2026-07-10  
Current user region/timezone: Philippines / `Asia/Manila`

## Selected source

The first catalogue slice uses FIFA's official World Cup 2026 schedule page:

<https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums>

The page states that schedule times are Eastern Time. Its current quarter-final section
identified:

| FIFA match | Schedule entry (ET) | SafeReplay display (Manila) |
|---|---|---|
| 98 | Spain–Belgium, 10 Jul 15:00 | 11 Jul 03:00 |
| 99 | Norway–England, 11 Jul 17:00 | 12 Jul 05:00 |
| 100 | Argentina–Switzerland, 11 Jul 21:00 | 12 Jul 09:00 |

The checked snapshot lives at `config/fixture-snapshot.json`. It records only source,
check date, fixture identifier, competition, UTC kickoff, scope, and teams.
It is a snapshot, not an automated feed, and must be refreshed before later matchdays.

## Spoiler boundary

The FIFA page combines upcoming fixtures with finished scores, video recaps, results,
photos, and editorial copy. SafeReplay therefore does not expose or cache its page.
`src/fixture-sanitizer.mjs` selects only:

```text
id
competition
teams[2]
kickoffUtc
favorite (derived locally)
availability (derived from SafeReplay evidence)
```

More precisely, the server-side sanitizer selects and publishes canonical `kickoffUtc`.
The browser derives `dateKey`, `dateLabel`, and `kickoff` for the active IANA time zone;
those localized fields never enter the public catalogue contract or fixture feed cache.
`Today` is derived from the current device instant in that zone, not the snapshot check
date.
The default follows playback region (`Asia/Manila` or `Europe/Oslo`), while Device,
Manila, and Norway can be selected explicitly. Automated tests cover Manila date rollover
and both summer and winter Oslo offsets.

Automated hostile-input tests add score, result/winner, event/goal, title, and thumbnail
fields to a raw fixture and verify that none survive serialization. This proves the
field-selection boundary for the checked format; it does not prove a future FIFA page
parser.

## Current FIFA decision

Keep the dated FIFA snapshot because it immediately removes fabricated World Cup fixtures
without a paid API or account. Do not call it automatic or fresh beyond `checkedAt`.

## Proven EPL feed slice

Fixture Download's 2026/27 EPL JSON was fetched successfully on 2026-07-10 and contained
380 rows with the expected match number, UTC date, teams, score, winner, location, group,
and round fields. SafeReplay selected 74 season fixtures involving Arsenal or Manchester
City, then bounded the checked catalogue snapshot to ten fixtures through 2026-10-08.

The ten opening priority fixtures matched the Premier League's official 2026/27 schedule,
including explicitly scheduled Friday, Sunday, and Monday matches and UK summer-time
conversion to UTC. Team aliases normalize `Man City`, `Man Utd`, `Coventry`,
`Bournemouth`, and `Brighton` before fixture identity reaches YouTube matching.

Node's native fetch timed out in this workspace, while the system `curl` transport
returned HTTP 200 JSON. `src/curl-json-fetch.mjs` is therefore the CLI transport. It is
not general browsing machinery: the registry pins the HTTPS host/path, redirects are not
followed, time and body size are capped, content type is checked, and `execFile` invokes
curl without a shell. The normal report contains counts and neutral IDs only.

Raw score, winner, location, and unexpected fields are discarded by explicit projection.
`--save-catalogue` is opt-in and refuses to replace the last known snapshot if any feed
fails or zero fixtures survive selection.

```bash
npm run discover:fixtures -- --save-private
npm run discover:fixtures -- --save-private --save-catalogue
```

Fixture Download itself says schedules are kept as current as possible but can change
mid-season. The checked-in snapshot is therefore evidence dated by `checkedAt`, not an
evergreen guarantee. La Liga remains withheld after an official schedule mismatch; Ligue
1 is also withheld after later feed placeholders conflicted with dates already fixed by
LFP. The opening Ligue 1 pairings matched, but that is not enough to trust later kickoffs.

Current source links:

- <https://fixturedownload.com/>
- <https://fixturedownload.com/feed/json/epl-2026>
- <https://www.premierleague.com/en/news/4675097/all-380-fixtures-for-202627-premier-league-season/>

## Proven official Eliteserien calendar

Eliteserien's own schedule page exposes a keyless calendar subscription at the same host.
On 2026-07-10 it returned HTTP 200, `text/calendar`, no redirect, and 151 VEVENT blocks.
The bounded catalogue window selected 79 scheduled fixtures from 11 July through 20
September. The first visible events matched the official schedule page.

Each accepted event must contain exactly one UUID, neutral `home - away` summary, and
`DTSTART;TZID=Europe/Oslo`. Summer and winter offsets are resolved with IANA time-zone
data; impossible or fallback-ambiguous local times reject the feed. Description,
location, URL, end time, organizer, and every other calendar field are discarded.

The official page warns that fixtures without the broadcast icon are not yet fixed and
can move. The subscription currently omits later unberammet rounds from the selected
horizon, which prevents SafeReplay from inventing placeholder kickoffs. Refresh and
`checkedAt` remain part of the evidence model.

Rendered proof at 390 × 844 showed Fredrikstad–Lillestrøm at 20:00 Manila and 14:00
Norway. The Eliteserien competition tab and six-format no-source view contained no score,
raw URL, or provider metadata.

Sources:

- <https://www.eliteserien.no/terminliste>
- <https://www.eliteserien.no/terminliste/subscribe>
- <https://www.fotball.no/tema/nff-nyheter/2025/hovedterminlister-2026/>
- <https://www.fotball.no/turneringer/eliteserien/2026/berammede-kamper-i-eliteserien-obos-ligaen-og-toppserien/>

## Withheld competition feeds

- La Liga: LALIGA lists Barcelona–Athletic Club on Sunday 16 August and subsequent
  Barcelona matchdays on Sundays; the candidate feed puts the same sequence one day
  earlier at a repeated placeholder time.
- Ligue 1: the opening pairings agree with LFP, but later PSG marquee fixtures in the
  candidate feed occur one or two days before LFP's already fixed Sunday dates.

Evidence:

- <https://www.laliga.com/en-ES/clubs/fc-barcelona/next-matches>
- <https://www.lfp.fr/article/ligue-1-mc-donald-s-le-calendrier-de-la-saison-2026-2027>

Alternatives rejected in this pass:

- OpenFootball is attractive CC0, keyless JSON for several target leagues, but its
  `football.json` repository had no `2026-27` directory on the check date.
- TheSportsDB advertises a free JSON API, but its own free-API page places video
  highlights in the $9 premium/V2 feature set. It therefore does not deliver the hoped
  for free fixtures-plus-highlights Pareto path.

Evidence: <https://github.com/openfootball/football.json>,
<https://www.thesportsdb.com/api.php>.

The next fixture increment should either:

1. safely refresh the same official schedule into the snapshot; or
2. enable another competition feed only after stability, score-field isolation, and
   official schedule cross-checks are evidenced.
