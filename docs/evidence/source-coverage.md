# Source coverage evidence

Last updated: 2026-07-10

## Purpose and interpretation

This is a broad discovery inventory for Full, halves, Mini/condensed, Extended,
and Short football video. A row records observed facts and source claims; it does not
decide the legal status of third-party material.

`Official` means ownership or rightsholder/media-partner status was verified from a
first-party or strong primary source. `Community/unverified` means SafeReplay has not
verified ownership. It is not a legal label.

Current interactive checks used a 390 × 844 in-app browser session while the user is in
the Philippines. That is useful mobile evidence but not a real iPhone/Safari test, and
the session's exact network geolocation was not independently measured. No current
match scores are reproduced in this document.

## What should determine “best source”

Do not rank by `official` alone. For each match and requested format, evaluate:

1. format fit: Full, halves, Mini, Extended, or Short;
2. currently plays in the selected region;
3. observed spoiler exposure in listing, pre-play, in-player, pause/end, surrounding
   page, and destination-app handoff;
4. free, free-account, paid, or unknown access;
5. provenance class and publisher evidence;
6. redirect count, popup/ad behavior, downloads, and other device-security friction;
7. freshness, language, quality, and stability;
8. whether SafeReplay can link to it without hosting, proxying, downloading, or bypassing
   access controls.

Exploration includes low-confidence sources because they can reveal a useful provider
ecosystem. Production surfacing requires an honest classification and a safe enough
handoff; it does not require an `official` label.

## High-value verified and first-party sources

| Source | Provenance | Formats | Access | Current evidence | Main issue / next test |
|---|---|---|---|---|---|
| Aleph Arena on YouTube | Verified FIFA World Cup 2026 media distributor for Philippines; stable channel ID recorded | Selected Full matches; first 10 minutes of other matches; clips/highlights | Free for selected items | Format-aware remote search found France–Morocco Short/Full and Spain–Belgium Short plus a long-video candidate. Local OCR found no spoiler-text reason in any thumbnail. France–Morocco embeds remain blocked; both Spain–Belgium videos played in PH Browser/IAB behind the cover | Highest-priority PH connector. The long video's runtime does not prove it is a full match. Real iPhone access, sound, fullscreen, and return remain unverified |
| FIFA+ / FIFA archive | FIFA-owned | Full archive, Extended, Short/highlights | Free-account path observed | Catalogue search exposed thousands of Full and highlight items; direct visit redirected to sign-in | Verify PH and NO access after free sign-in and whether match URLs/titles can be handled without spoiler exposure |
| FIFA official YouTube | FIFA-owned; stable channel ID recorded | Historical/current Full where offered, highlights, clips | Free | YouTube and FIFA document the official partnership; feed-ready for the checked World Cup fixtures | Per-item metadata scan, thumbnail review, PH/NO playback, and YouTube destination risk apply |
| Premier League YouTube | League-owned; stable channel ID recorded | Short/Extended and archive-oriented clips | Free | Premier League's current social directory identifies its YouTube channel; feed-ready | Current match packages depend on rights and region; require exact item, thumbnail, and playback proof |
| LALIGA YouTube | League-owned; stable channel ID recorded | Short/Extended highlights and clips | Free | LALIGA identifies the channel as its official goals/highlights destination; feed-ready | Scan outcome-heavy titles/thumbnails and test PH/NO playback per item |
| Ligue 1 YouTube | LFP-owned; stable channel ID recorded | Short/Extended and archive-oriented clips | Free | LFP documents the existing Ligue 1 channel and its digital video ecosystem; feed-ready | Current item coverage and PH/NO playback remain untested |
| UEFA YouTube | UEFA-owned; stable channel ID recorded | Short/Extended competition and archive clips | Free | UEFA documents its official YouTube channel; feed-ready for Euro/UEFA fixture matching | Do not assume every competition or territory has match highlights; item and region gates still apply |
| UEFA.tv | UEFA-owned | Short/standard highlights for all UEFA competitions; selected additional VOD | Free account | UEFA says highlights are generally available after local midnight; flagship live matches and full reruns are generally unavailable | Good Champions League/Euro highlight connector, not a dependable recent Full source; test destination page on iPhone |
| Premier League Archive | Premier League-owned | 3-, 8-, and 20-minute highlights; Full replays through 2024/25 | myPremierLeague account | First-party page lists all four formats for historical seasons | Verify whether account is free, region availability in PH/NO, and whether archive navigation leaks results |
| Arsenal Video | Club-owned | Short/Extended and some Full replays | Free/free-account status varies | Official pages have published highlights and full replay availability after matches | Recheck current men's-team access, stable match URLs, PH/NO availability, and result-bearing metadata |
| Barça One | Club-owned | Short/Extended, deferred/archive Full, other club video | Per-item mixture of free, registered, and subscription | Barça documents free, registered, and subscription content in the same service | Classify each item independently; never treat the provider as entirely free |
| Manchester City YouTube | Club-owned; stable channel ID recorded | Usually Short/Extended clips | Free | Official supporter charter points to `@mancity`; feed-ready in the server registry | Run real feed, then per-item title/description/thumbnail and PH/NO playback tests |
| Arsenal YouTube | Club-owned; stable channel ID recorded | Short/Extended | Free | Arsenal's own reporting documents its YouTube channel; feed-ready in the server registry | Same per-item and region gates; Arsenal's own website also exposes Short/Extended/Full packages |
| Manchester United YouTube | Club-owned; stable channel ID recorded | Short/Extended and archive-oriented video | Free items mixed with MUTV promotion | Club announcement identifies YouTube.com/ManUtd as its official channel; feed-ready | Do not confuse free YouTube highlights with paid MUTV Full content; scan each item |
| FC Barcelona YouTube | Club-owned; stable channel ID recorded | Short/Extended and occasional Full/live/archive | Free items plus optional membership content | Club site identifies YouTube.com/FCBarcelona and documents some globally free broadcasts; feed-ready | Per-item price/member, title, thumbnail, region, and player checks |
| TV 2 Sport YouTube lead | Stable channel ID and matching YouTube channel page recorded; ownership not yet verified from a primary TV 2 source | Eliteserien/football Short or Extended claimed | Free items claimed | Feed-ready for private exploration while preserving `Community / unverified` provenance | Run real feed and item gates now; upgrade only if TV 2 itself confirms the ownership link |
| CITY+ | Club-owned | Full, 20-minute, archive | Paid | Current City page lists monthly/annual subscription pricing | Keep in research evidence but hide from normal free results unless the user's preference changes |
| Eliteserien.no Video | Competition-owned | Short highlights around 2–3 minutes in current sample | Free page | Current listing is broad and fresh | Listing titles and thumbnails include final scores and exact runtimes. SafeReplay must discover server-side and never send those fields to the client |
| NFF TV | NFF-owned | Short highlights and federation video | Free | Current NFF catalogue contains match-highlight items | Listing can expose results, so use as server-side discovery and scan every item before handoff |
| NRK TV | Norwegian public broadcaster | World Cup live/on-demand candidate | Free in Norway; account/region behavior to verify | NRK is broadcasting part of FIFA 2026 in Norway | Test when user is in Norway: replay retention, neutral deep links, sign-in, and spoiler behavior |
| TV 2 / TV 2 Play | Norwegian broadcaster/rightsholder | World Cup, Eliteserien, La Liga; Full/replay/highlights may vary | Mostly paid or account-gated | Current rights evidence links TV 2 to these competitions in Norway | User has no subscription; surface only genuinely free individual items and verify each one |
| SBS On Demand | Australian broadcaster | Full, Mini, Extended, Short for all World Cup 2026 matches | Free account in Australia | Current first-party catalogue explicitly lists all four formats | Excellent format model and travel candidate, but not assumed available in PH/NO; no location circumvention |
| Official league/club/broadcaster YouTube channels | Verified per channel ID | Mostly Short/Extended; occasional Full/live replay | Usually free | Widest cross-competition source class | Build per-channel discovery but classify every video; a safe channel can publish an unsafe item |

### Item-level candidates checked on 2026-07-10

These are discovery evidence, not automatically surfaced app records.

| Fixture/item | Candidate format | Evidence obtained | Still missing |
|---|---|---|---|
| France–Morocco, FIFA World Cup 2026 quarter-final | Full via Aleph Arena | Exact current item found on the verified channel; title is neutral; thumbnail OCR found no spoiler-text reason | Description contains winner/outcome language; visual thumbnail review, replay retention, free PH playback, and iPhone destination behavior |
| Spain–Belgium, FIFA World Cup 2026 quarter-final | Short via Aleph Arena; direct Full/first-half/second-half players plus match-page fallback via FootReplays; filtered r/footballhighlights search | Exact current YouTube Short found on the verified channel; thumbnail OCR had no spoiler-text reason. FootReplays page returned 200 and exposed distinct Full, 1st Half, 2nd Half, and Highlights controls. Two direct-player image assets also had no OCR score/outcome reason. Reddit produced no exact team-named thread in its current search feed, so the app links to a narrowly filtered subreddit search rather than inventing one | Covered YouTube Short played in PH Browser/IAB. Direct Full loaded a real medium; both direct half routes exposed video elements. Listing thumbnail is bypassed, but player images remain visually unreviewed and physical-iPhone playback/fullscreen remains unverified; Reddit titles/comments can spoil |
| France–Morocco, FIFA World Cup 2026 quarter-final | Short via FIFA on YouTube | Fresh exact item found on FIFA's verified channel through the format-aware query; local OCR found no spoiler-text reason | Metadata is blocked and the uploader returns embed error 150. Keep private; a direct handoff would expose the blocked metadata |
| Brazil–Norway, 1998 FIFA World Cup | Full | Concrete FIFA+ item page with neutral teams/tournament/round metadata and `Full Match Replay` format | PH/NO playback, free-account behavior, surrounding-page and player spoiler surfaces |
| Brazil–Norway, 1998 FIFA World Cup | Highlights | Concrete FIFA+ item page with neutral teams/tournament/round metadata and `Highlights` format | Same region/account/player checks as Full |
| Brazil–Norway, 2026 FIFA World Cup | Extended via FOX Sports | Exact match item and official US broadcaster evidence; neutral indexed item metadata | Actual thumbnail, free access, PH/NO region behavior, and playback; browser policy blocked the item |
| Brazil–Norway, 2026 FIFA World Cup | Short via ITVX | Exact 9-minute item and FIFA/ITV rights evidence; neutral indexed item metadata | ITV account/region behavior, actual thumbnail, PH/NO playback; browser policy blocked the item |
| Brazil–Norway, 2026 FIFA World Cup | Short via SBS | Exact three-minute broadcaster item with neutral indexed title and description | Actual thumbnail, account behavior, PH/NO playback, and player surfaces; browser policy blocked the item |
| Brazil–Norway, 2026 FIFA World Cup | Short via RTÉ | Exact broadcaster item, but its indexed description reveals the outcome | Blocked from automatic surfacing; playback and region were not tested because browser policy blocked the item |
| Brazil–Norway, 2026 FIFA World Cup | Extended via ZEE5 | Exact broadcaster item and FIFA partner evidence | ZEE5 documents India-only paid access; retained for research but excluded from this user's normal free results |

Direct Browser verification of both YouTube and FIFA+ was rejected by the browser's
domain policy in this workspace. The policy also forbids alternate-browser workarounds,
so the missing metadata, thumbnail, playback, and region checks remain unresolved. No
candidate from this table is promoted into the app catalogue on search evidence alone.
The authenticated remote-search route that produced the earlier Aleph candidates later
returned `cross-repo YouTube execution route missing`, but on 2026-07-11 it again verified
`youtube.readonly` and completed the bounded cached search. No replacement credential was
created. The independent keyless Atom command also works; both routes currently rediscover
the same two private blocked candidates without producing a surfaceable video.

Primary evidence:

- [Aleph distribution announcement](https://www.prnewswire.com/news-releases/aleph-launches-first-of-its-kind-multichannel-distribution-model-to-redefine-the-fifa-world-cup-2026-fan-experience-in-the-philippines-302796546.html)
- [YouTube/FIFA partnership](https://blog.youtube/news-and-events/fifa-world-cup-2026-youtube-partnership/)
- [YouTube World Cup viewing guide](https://blog.youtube/news-and-events/watch-fifa-world-cup-youtube/)
- [Premier League official social-channel directory](https://www.premierleague.com/en/news/2168405)
- [LALIGA official YouTube channel evidence](https://www.laliga.com/en-ES/news/la-liga-channel-surpasses-100-million-youtube-views)
- [LFP evidence for the Ligue 1 YouTube ecosystem](https://www.lfp.fr/article/lancement-de-ligue-1-vintage)
- [UEFA official YouTube launch](https://www.uefa.com/news-media/news/0254-0d7dcc9ee9d3-f9e8e126d310-1000--uefa-com-launches-youtube-channel/)
- [NFF TV](https://www.fotball.no/nfftv/)
- [UEFA.tv FAQ](https://www.uefa.com/uefatv-faq/)
- [Premier League Archive](https://www.premierleague.com/en/welcome/the-archive/overview)
- [FIFA+ Archive](https://www.plus.fifa.com/en/catalogue/archive)
- [Eliteserien Video](https://www.eliteserien.no/video)
- [Eliteserien official schedule](https://www.eliteserien.no/terminliste)
- [SBS World Cup formats](https://www.sbs.com.au/ondemand/sports-series/fifa-world-cup-2026/fifa-world-cup-2026-full-matches)
- [Aleph's updated free quarter-final announcement](https://www.reddit.com/r/philippinefootball/comments/1urk9h3/updated_free_world_cup_matches_aleph_arena/)
- [FIFA+ Brazil–Norway 1998 Full replay](https://www.plus.fifa.com/en/content/54e0f958-88e0-4bda-9137-eddfad8f57db)
- [FIFA+ Brazil–Norway 1998 highlights](https://www.plus.fifa.com/en/content/brazil-v-norway-group-a-1998-fifa-world-cup-france-highlights/ce23a8c9-6cc1-4e72-b187-6cfc2204a2ad)
- [FIFA broadcast-partner evidence for FOX Sports](https://inside.fifa.com/tournament-organisation/commercial/fifa-tv/media-releases/world-cup-2026-broadcast-partnerships-global-benchmark-record-reach-innovation)
- [FIFA media-rights evidence for ITV](https://ipt.fifa.com/about-fifa/commercial/news/uk-media-rights-2026-2030-world-cups-bbc-itv)
- [SBS Brazil–Norway highlights item](https://www.sbs.com.au/sport/video/fifa-world-cup-2026-highlights-brazil-v-norway-round-of-16/j5p5kjs7f)
- [RTÉ Brazil–Norway highlights item](https://www.rte.ie/video/id/34728/)
- [FIFA evidence for ZEE5's India partnership](https://vod.fifa.com/tournament-organisation/commercial/fifa-tv/media-releases/z-announce-agreement-world-cup-2026-major-fifa-tournaments-india-2034)
- [ZEE5 World Cup access and plan requirements](https://helpcenter.zee5.com/portal/en/kb/articles/watch-fifa-world-cup-2026-on-zee5)
- [Manchester City official YouTube reference](https://www.mancity.com/meta/media/j1pf5kya/mcfc-supporter-charter-2025-2026.pdf)
- [Manchester United official YouTube announcement](https://www.manutd.com/ko/news/detail/manchester-united-launch-official-youtube-channel)
- [FC Barcelona official YouTube reference](https://www.fcbarcelona.com/en/news/700811/live-on-barcavideo-facebook-youtube)

## Tested spoiler-oriented and aggregator products

| Source | Provenance class | Formats observed/claimed | Mobile-sized test result | Value to SafeReplay |
|---|---|---|---|---|
| True Highlights | Aggregator; states it uses official broadcaster/league clips | Short/standard highlights | Homepage had no score pattern and listed current matches. After choosing a match, its YouTube iframe exposed original title, thumbnail control, publisher, watch link, and end-screen recommendation; the sampled item had no score pattern in accessible text | Strong existing spoiler-safe catalogue and possible discovery reference, but not a solution for Full/Mini/Extended. Its player is only as safe as each source's metadata |
| SpoilSports | Aggregator | Current World Cup highlights | Browse page loaded 97 matches without score patterns. It delays player creation behind `Watch Match` and `Prepare player`. Sampled video then reported unavailable in the current country; no title/thumbnail/end-card metadata appeared before the geo error | Best delayed-player pattern observed. Coverage and PH availability are the problem; investigate its source feed and broader competition support |
| Sports Is Cinema | Broad multi-sport YouTube aggregator | Highlights, Extended, Full claimed | Page loaded, but raw video titles were present in the DOM and included outcome/scorer clues despite `No spoilers` labels | Very broad discovery input; unsafe as a destination without server-side sanitization and per-item filtering |
| True Highlights + generic YouTube behavior | Aggregator plus YouTube | Short | Current sampled title was score-safe, but player chrome still exposed metadata and recommendations | Confirms SafeReplay must evaluate the actual item, not trust an embed or aggregator label |

## Tested community/unverified replay sources

| Source | Formats observed | Listing/match-page spoiler behavior | Playback/security observations | Current assessment |
|---|---|---|---|---|
| FootReplays | 1st half, 2nd half, Full, Highlight; language and source labels | The concrete Brazil–Norway item had neutral fixture/round/date copy and no visible outcome in accessible text, but also adjacent-match thumbnails, view counts, unrelated news navigation, and a support iframe. The France–Morocco Full host showed a large match-frame collage before play, so its thumbnail surface is spoiler-bearing | The earlier 390 × 844 item-page action was blocked by a subscription popup. On desktop in PH, the exact France–Morocco Full route reached a 2:27:41 player; first click opened a Lazada ad tab, then playback loaded and advanced past 28 seconds. Its published embed rotates final hosts. A covered iframe initially hit SafeReplay's host allowlist; after the observed host was allowed, the provider explicitly refused any sandboxed embed. Removing the sandbox would restore popup/top-navigation powers, so the experiment was removed | Real free playback evidence and strong format matching. Rank above the Reddit duplicate, but retain `Community / unverified` plus spoiler-thumbnail/ad-popup tags. Keep direct handoff only; do not promise a safe embedded player. Real iPhone behavior remains unproved |
| ReFooty | Full, half selection, highlights; direct HTML5 video observed on an earlier sample | Earlier match page visibly included final score, FT marker, events, statistics, form, and recommendations | The current indexed Brazil–Norway item returned a real 404 on 2026-07-10, despite being present in search four days earlier | High churn plus spoiler-heavy pages. Current item is removed; discovery needs aggressive stale checks |
| AllSportsZone | Full | Claims spoiler-free, but home exposed a result-bearing latest-match summary. Sample page included extensive surrounding match text and other event context | Sample had five iframes including a separate video host and Google ads; no clean direct player action was verified | Broad Full discovery source; destination needs a strong warning or protection and more security/playback testing |
| r/footballhighlights | Full, halves, Mini, Extended, Short, pre/half/post shows | The exact France–Morocco and Brazil–Norway Full thread titles are neutral, but comments can contain outcome/goal discussion. A Brazil–Norway Mini thread explicitly reports a spoiler thumbnail | The France–Morocco main-post Full/English link goes to the same exact FootReplays item whose desktop Full playback is now observed. Other comment links lead mainly to varied file hosts; playback remains unverified, one reports in-browser audio friction, and another warns of a possible spoiler thumbnail | Retain the exact France–Morocco thread as a tagged `Community / unverified` fallback below FootReplays. It still adds discovery breadth, but adds comments without improving the observed Full destination |

## Candidate inventory not yet fully tested

These remain in exploration; absence from the tested tables is not rejection.

| Candidate | Search evidence | Priority question |
|---|---|---|
| FullMatch-Replay.org | Large, current catalogue with Full and highlights across roughly 193 pages | Does a neutral match page hand off cleanly on iPhone, and what hosts/ads appear? |
| SoccerFull.net | Current Full catalogue; describes itself as a search engine over YouTube, Dailymotion, OK.ru and other portals | Can provider links be extracted/classified without exposing views, thumbnails, or titles? |
| ilovehighlights.com | Community posts describe Extended, pre-match, half-time and post-match packages | Current ad/pop-up behavior and mobile playback |
| ilovefullmatchreplays.com | Community posts describe Full replays | Current ad/pop-up behavior, languages, and mobile playback |
| FullMatchSports | Full, highlights, downloads, multi-link claims | Whether a non-download handoff exists and how many redirects occur |
| FootyFull | Full match and football-show catalogue | Freshness, destination hosts, and spoiler behavior |
| FootballOrgin | Highlights and some Full replay labels | Current source host and spoiler behavior |
| LastGoals | Highlights and Full archive claims | Freshness and breadth for target competitions |
| KickBD | Current highlights catalogue | Source provenance, spoiler leakage, and regional playback |
| MatchHighlights | Official-YouTube embed aggregator with broad Short/Extended claims | Listings visibly include score-bearing titles/thumbnails in search evidence; test whether a sanitized direct source can still help |
| Fullmatchshows and other r/footballhighlights providers | Repeated community usage for Full and shows | Stability, redirect/security behavior, and neutral source mapping |
| Dailymotion / OK.ru / Vimeo / broadcaster-native players | Common downstream platform classes | Per-platform metadata chrome, embeddability, PH/NO playback, and end-screen behavior |

## Region-specific conclusions

### Philippines now

Highest-value candidates, in practical discovery order:

1. Official YouTube channel feeds for Short and Extended, plus Full/live/archive where
   offered: FIFA, Aleph Arena, Premier League, LALIGA, Ligue 1, UEFA, City, Arsenal,
   United, Barcelona, and later verified competition/broadcaster channels. Every item
   still needs metadata, thumbnail, region, player, comment, and handoff checks.
2. Broadcaster-native free items and spoiler-oriented aggregators when they add a safer
   or region-playable item that YouTube does not provide.
3. Aleph Arena specifically for selected free World Cup Full streams/replays in PH.
4. FootReplays and r/footballhighlights for Full, halves, Mini, and Extended discovery,
   with community/unverified labeling and further playback/security tests. Keep a
   neutral Reddit match thread available with a comment warning when no better observed
   option exists.
5. FIFA+/UEFA/club platforms for archives or competition-specific highlights.

The generic YouTube player is not itself spoiler-safe. Aleph Arena is still valuable
because selected full broadcasts may use neutral live-stream metadata, but each replay
must be scanned and the iPhone handoff tested.

### Norway from September 2026

Re-run the same matrix from the Norwegian network. Prioritize NRK for its World Cup
share, free individual TV 2 items, UEFA.tv, Premier League/club channels, and the
Eliteserien source ecosystem. Fixtures now come from Eliteserien's official calendar;
the separate video listing remains unsafe to browse directly because it renders scores
and runtimes.

## Next experiments

1. Use the now-working keyless Atom path with the proven EPL fixture slice to run
   City/Arsenal YouTube and community discovery near each kickoff; do not spend quota on
   the distant fixtures now.
2. Visually review the current Aleph Full thumbnail, then test the exact handoff on a
   physical iPhone in the Philippines without exposing the description.
3. Prove separate free fixture paths for Barcelona/La Liga, Ligue 1,
   Champions League, Euros, and future World Cup stages; keep mismatched feeds withheld.
4. Test FootReplays, FullMatch-Replay.org, and SoccerFull.net handoffs on iPhone/Safari,
   recording redirects, ads/popups, direct playback, and player chrome.
5. Re-test the official/provider matrix from Norway after the move; do not infer Norway
   availability from Philippine results.
6. When domain access is available, resume item-level validation from the checked
   candidates above; do not repeat broad search before closing their missing gates.
