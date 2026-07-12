import { readFileSync } from "node:fs";
import {
  buildSurfaceProjection,
  mergeProviderDestinations,
  mergeSurfaceRecords,
} from "./catalogue-projection.mjs";
import { sanitizeFixtureSnapshot } from "./fixture-sanitizer.mjs";
import { mergeFixtureSnapshots } from "./fixture-snapshot-set.mjs";
import { validateLiveDestinationSnapshot } from "./live-source-discovery.mjs";
import { validatePublicCatalogue } from "./public-contract.mjs";
import {
  buildReplaySourceProjection,
  validateReplaySourceSnapshot,
} from "./replay-source-discovery.mjs";

const officialSnapshot = JSON.parse(
  readFileSync(new URL("../config/fixture-snapshot.json", import.meta.url), "utf8"),
);
const feedSnapshot = JSON.parse(
  readFileSync(new URL("../config/fixture-feed-snapshot.json", import.meta.url), "utf8"),
);
const snapshot = mergeFixtureSnapshots([officialSnapshot, feedSnapshot]);
const sourceRegistry = JSON.parse(
  readFileSync(new URL("../config/sources.json", import.meta.url), "utf8"),
);
const itemRegistry = JSON.parse(
  readFileSync(new URL("../config/item-candidates.json", import.meta.url), "utf8"),
);
const liveDestinationSnapshot = JSON.parse(
  readFileSync(new URL("../config/live-destinations.json", import.meta.url), "utf8"),
);
const replaySourceSnapshot = JSON.parse(
  readFileSync(new URL("../config/replay-destinations.json", import.meta.url), "utf8"),
);
validateLiveDestinationSnapshot(liveDestinationSnapshot, {
  fixtureIds: snapshot.fixtures.map(({ id }) => id),
});
validateReplaySourceSnapshot(replaySourceSnapshot, {
  fixtureIds: snapshot.fixtures.map(({ id }) => id),
});

function worldCupReplaySources({
  prefix,
  shortDuration,
  shortProvider = "Aleph Arena on YouTube",
  youtubeFull = false,
}) {
  return [
    {
      id: `${prefix}-youtube-short`,
      durationLabel: shortDuration,
      format: "short",
      evidenceStatus: "player_candidate",
      providerName: shortProvider,
      accessLabel: "Free",
      provenance: "community_unverified",
      riskLabel: "Covered player · metadata hidden",
      riskTone: "caution",
      redirectPath: `/go/${prefix}-youtube-short`,
    },
    {
      id: `${prefix}-footreplays-highlight`,
      format: "short",
      evidenceStatus: "directory_candidate",
      providerName: "FootReplays · highlight",
      accessLabel: "Free status unverified",
      provenance: "community_unverified",
      riskLabel: "Direct player found · poster unreviewed",
      riskTone: "caution",
      redirectPath: `/go/${prefix}-footreplays-highlight`,
    },
    {
      id: `${prefix}-footreplays-extended`,
      format: "extended",
      evidenceStatus: "directory_candidate",
      providerName: "FootReplays",
      accessLabel: "Free status unverified",
      provenance: "community_unverified",
      riskLabel: "Match page · thumbnail and popup risk",
      riskTone: "caution",
      redirectPath: `/go/${prefix}-footreplays-page`,
    },
    {
      id: `${prefix}-footreplays-first-half`,
      format: "halves",
      evidenceStatus: "directory_candidate",
      providerName: "FootReplays · first half",
      accessLabel: "Free status unverified",
      provenance: "community_unverified",
      riskLabel: "Direct player found · poster unreviewed",
      riskTone: "caution",
      redirectPath: `/go/${prefix}-footreplays-first-half`,
    },
    {
      id: `${prefix}-footreplays-second-half`,
      format: "halves",
      evidenceStatus: "directory_candidate",
      providerName: "FootReplays · second half",
      accessLabel: "Free status unverified",
      provenance: "community_unverified",
      riskLabel: "Direct player found · poster unreviewed",
      riskTone: "caution",
      redirectPath: `/go/${prefix}-footreplays-second-half`,
    },
    {
      id: `${prefix}-footreplays-full`,
      format: "full",
      evidenceStatus: "directory_candidate",
      providerName: "FootReplays · direct player",
      accessLabel: "Free status unverified",
      provenance: "community_unverified",
      riskLabel: "Direct player found · poster unreviewed",
      riskTone: "caution",
      redirectPath: `/go/${prefix}-footreplays-full`,
    },
    ...(youtubeFull ? [{
      id: `${prefix}-youtube-full`,
      format: "full",
      evidenceStatus: "player_candidate",
      providerName: "Aleph Arena on YouTube",
      accessLabel: "Free",
      provenance: "verified_official",
      riskLabel: "Covered player · metadata hidden",
      riskTone: "caution",
      redirectPath: `/go/${prefix}-youtube-full`,
    }] : []),
    {
      id: `${prefix}-reddit`,
      format: "full",
      evidenceStatus: "thread_candidate",
      providerName: "r/footballhighlights",
      accessLabel: "Free links vary",
      provenance: "community_unverified",
      riskLabel: "Search titles and comments can spoil",
      riskTone: "unknown",
      redirectPath: `/go/${prefix}-reddit`,
    },
  ];
}

const staticSourcesByFixture = {
  "iraq-norway-2026-06-16": worldCupReplaySources({
    prefix: "iraq-norway",
    shortDuration: "5:06",
  }),
  "norway-senegal-2026-06-23": worldCupReplaySources({
    prefix: "norway-senegal",
    shortDuration: "2:10",
    shortProvider: "FIFA on YouTube",
    youtubeFull: true,
  }),
  "norway-france-2026-06-26": worldCupReplaySources({
    prefix: "norway-france",
    shortDuration: "5:01",
  }),
  "ivory-coast-norway-2026-06-30": worldCupReplaySources({
    prefix: "ivory-coast-norway",
    shortDuration: "5:11",
  }),
  "brazil-norway-2026-07-05": worldCupReplaySources({
    prefix: "brazil-norway",
    shortDuration: "5:15",
  }),
  "argentina-egypt-2026-07-07": worldCupReplaySources({
    prefix: "argentina-egypt",
    shortDuration: "5:11",
    youtubeFull: true,
  }),
  "fifa-world-cup-2026-match-97": [
    {
      id: "france-morocco-footreplays-full",
      format: "full",
      evidenceStatus: "item_observed",
      providerName: "FootReplays",
      accessLabel: "Free",
      provenance: "community_unverified",
      riskLabel: "Spoiler thumbnail · ad popup",
      riskTone: "caution",
      redirectPath: "/go/france-morocco-footreplays",
    },
    {
      id: "france-morocco-footreplays-halves",
      format: "halves",
      evidenceStatus: "item_observed",
      providerName: "FootReplays",
      accessLabel: "Free",
      provenance: "community_unverified",
      riskLabel: "Spoiler thumbnail · ad popup",
      riskTone: "caution",
      redirectPath: "/go/france-morocco-footreplays",
    },
    {
      id: "france-morocco-footreplays-highlights",
      format: "short",
      evidenceStatus: "item_observed",
      providerName: "FootReplays",
      accessLabel: "Free",
      provenance: "community_unverified",
      riskLabel: "Spoiler thumbnail · ad popup",
      riskTone: "caution",
      redirectPath: "/go/france-morocco-footreplays",
    },
    {
      id: "france-morocco-reddit",
      format: "full",
      evidenceStatus: "thread_candidate",
      providerName: "r/footballhighlights",
      accessLabel: "Free links vary",
      provenance: "community_unverified",
      riskLabel: "Comments can spoil",
      riskTone: "unknown",
      redirectPath: "/go/france-morocco-reddit",
    },
  ],
  "fifa-world-cup-2026-match-98": [
    {
      id: "spain-belgium-youtube-short",
      durationLabel: "3:38",
      format: "short",
      evidenceStatus: "player_candidate",
      providerName: "Podcast Speak English on YouTube",
      accessLabel: "Free",
      provenance: "verified_official",
      riskLabel: "Covered player · metadata hidden",
      riskTone: "caution",
      redirectPath: "/go/spain-belgium-youtube-short",
    },
    {
      id: "spain-belgium-footreplays-direct-full",
      format: "full",
      evidenceStatus: "item_observed",
      providerName: "FootReplays · direct player",
      accessLabel: "Free status unverified",
      provenance: "community_unverified",
      riskLabel: "Media loaded · player poster unreviewed",
      riskTone: "caution",
      redirectPath: "/go/spain-belgium-footreplays-full",
    },
    {
      id: "spain-belgium-footreplays-first-half",
      format: "halves",
      evidenceStatus: "item_observed",
      providerName: "FootReplays · first half",
      accessLabel: "Free status unverified",
      provenance: "community_unverified",
      riskLabel: "Video found · player poster unreviewed",
      riskTone: "caution",
      redirectPath: "/go/spain-belgium-footreplays-first-half",
    },
    {
      id: "spain-belgium-footreplays-second-half",
      format: "halves",
      evidenceStatus: "item_observed",
      providerName: "FootReplays · second half",
      accessLabel: "Free status unverified",
      provenance: "community_unverified",
      riskLabel: "Video found · player poster unreviewed",
      riskTone: "caution",
      redirectPath: "/go/spain-belgium-footreplays-second-half",
    },
    {
      id: "spain-belgium-footreplays-extended",
      format: "extended",
      evidenceStatus: "directory_candidate",
      providerName: "FootReplays",
      accessLabel: "Free status unverified",
      provenance: "community_unverified",
      riskLabel: "Player found · duration unverified",
      riskTone: "caution",
      redirectPath: "/go/spain-belgium-footreplays-extended",
    },
    {
      id: "spain-belgium-footreplays-page",
      format: "full",
      evidenceStatus: "directory_candidate",
      providerName: "FootReplays · match page",
      accessLabel: "Free status unverified",
      provenance: "community_unverified",
      riskLabel: "Listing thumbnail · ad popup risk",
      riskTone: "caution",
      redirectPath: "/go/spain-belgium-footreplays",
    },
    {
      id: "spain-belgium-reddit-full",
      format: "full",
      evidenceStatus: "thread_candidate",
      providerName: "r/footballhighlights",
      accessLabel: "Free links vary",
      provenance: "community_unverified",
      riskLabel: "Search titles and comments can spoil",
      riskTone: "unknown",
      redirectPath: "/go/spain-belgium-reddit",
    },
    {
      id: "spain-belgium-reddit-short",
      format: "short",
      evidenceStatus: "thread_candidate",
      providerName: "r/footballhighlights",
      accessLabel: "Free links vary",
      provenance: "community_unverified",
      riskLabel: "Search titles and comments can spoil",
      riskTone: "unknown",
      redirectPath: "/go/spain-belgium-reddit",
    },
    {
      id: "spain-belgium-reddit-extended",
      format: "extended",
      evidenceStatus: "thread_candidate",
      providerName: "r/footballhighlights",
      accessLabel: "Free links vary",
      provenance: "community_unverified",
      riskLabel: "Comments can spoil",
      riskTone: "unknown",
      redirectPath: "/go/spain-belgium-reddit-extended",
    },
  ],
  "fifa-world-cup-2026-match-99": [
    {
      id: "norway-england-youtube-short",
      format: "short",
      evidenceStatus: "player_candidate",
      providerName: "Aleph Arena on YouTube",
      accessLabel: "Free in Philippines",
      provenance: "verified_official",
      riskLabel: "Covered player · metadata hidden",
      riskTone: "caution",
      redirectPath: "/go/norway-england-youtube-short",
    },
  ],
  "fifa-world-cup-2026-match-100": [],
};

const staticDestinations = {
  "live-totalsportek": "https://totalsportek.cat/",
  "live-totalsportek-spain-belgium": "https://totalsportek.cat/game/spain-vs-belgium-2144565976",
  "live-totalsportek-norway-england": "https://totalsportek.cat/game/norway-vs-england-7445162393",
  "live-camel-football": "https://www.camel1.tv/",
  "live-camel-eliteserien": "https://www.camel1.tv/r/league/Norwegian%20Eliteserien",
  "live-camel-aalesund-molde": "https://www.camel1.tv/football/aalesund-fk-vs-molde/live/6ypq3nhv7w0xmd7",
  "live-livsports-schedule": "https://livsports.dpdns.org/schedule",
  "aleph-arena-youtube": "https://www.youtube.com/@AlephArena",
  "france-morocco-reddit": "https://www.reddit.com/r/footballhighlights/comments/1us2ust/france_vs_morocco_world_cup_09jul2026/",
  "france-morocco-footreplays": "https://www.footreplays.com/international/world-cup-2026/france-vs-morocco-09-07-2026/",
  "spain-belgium-youtube-short": "/watch/youtube/spain-belgium-youtube-short",
  "norway-england-youtube-short": "/watch/youtube/norway-england-youtube-short",
  "spain-belgium-footreplays-full": "https://hgcloud.to/9b4o12yhq4ud",
  "spain-belgium-footreplays-first-half": "https://hgcloud.to/vxmnzbifbraz",
  "spain-belgium-footreplays-second-half": "https://hgcloud.to/jxxrdxanlc6d",
  "spain-belgium-footreplays-extended": "https://hgcloud.to/m9npdlzc0q48",
  "spain-belgium-footreplays": "https://www.footreplays.com/international/world-cup-2026/spain-vs-belgium-10-07-2026/",
  "spain-belgium-reddit": "https://www.reddit.com/r/footballhighlights/search/?q=Spain%20Belgium&restrict_sr=1&sort=new",
  "spain-belgium-reddit-extended": "https://www.reddit.com/r/footballhighlights/comments/1ut1711/fox_sports_spain_v_belgium_extended_highlights/",
  "iraq-norway-youtube-short": "/watch/youtube/iraq-norway-youtube-short",
  "iraq-norway-footreplays-first-half": "https://hgcloud.to/eyiojyw3k8ay",
  "iraq-norway-footreplays-second-half": "https://hgcloud.to/rffwszl2qwbu",
  "iraq-norway-footreplays-full": "https://hgcloud.to/n3j0hqewhg8x",
  "iraq-norway-footreplays-highlight": "https://hgcloud.to/dcaw9h42d445",
  "iraq-norway-footreplays-page": "https://www.footreplays.com/international/world-cup-2026/iraq-vs-norway-16-06-2026/",
  "iraq-norway-reddit": "https://www.reddit.com/r/footballhighlights/search/?q=Iraq%20Norway&restrict_sr=1&sort=new",
  "norway-senegal-youtube-short": "/watch/youtube/norway-senegal-youtube-short",
  "norway-senegal-youtube-full": "/watch/youtube/norway-senegal-youtube-full",
  "norway-senegal-footreplays-first-half": "https://hgcloud.to/0awc0szgonw1",
  "norway-senegal-footreplays-second-half": "https://hgcloud.to/krgzq5cusyov",
  "norway-senegal-footreplays-full": "https://hgcloud.to/h5asd0wyd54z",
  "norway-senegal-footreplays-highlight": "https://hgcloud.to/fz9ttfm3agg3",
  "norway-senegal-footreplays-page": "https://www.footreplays.com/international/world-cup-2026/norway-vs-senegal-23-06-2026/",
  "norway-senegal-reddit": "https://www.reddit.com/r/footballhighlights/search/?q=Norway%20Senegal&restrict_sr=1&sort=new",
  "norway-france-youtube-short": "/watch/youtube/norway-france-youtube-short",
  "norway-france-footreplays-first-half": "https://hgcloud.to/7k6izhpgtv3v",
  "norway-france-footreplays-second-half": "https://hgcloud.to/8nvkalxdgqnt",
  "norway-france-footreplays-full": "https://hgcloud.to/uws3jg4ldh68",
  "norway-france-footreplays-highlight": "https://hgcloud.to/3isgqaghruk8",
  "norway-france-footreplays-page": "https://www.footreplays.com/international/world-cup-2026/norway-vs-france-26-06-2026/",
  "norway-france-reddit": "https://www.reddit.com/r/footballhighlights/search/?q=Norway%20France&restrict_sr=1&sort=new",
  "ivory-coast-norway-youtube-short": "/watch/youtube/ivory-coast-norway-youtube-short",
  "ivory-coast-norway-footreplays-first-half": "https://hgcloud.to/a7d89ph0j3k4",
  "ivory-coast-norway-footreplays-second-half": "https://hgcloud.to/zo13fbfd1ppt",
  "ivory-coast-norway-footreplays-full": "https://hgcloud.to/40wlks1mneey",
  "ivory-coast-norway-footreplays-highlight": "https://hgcloud.to/7jm2a7zhi4jb",
  "ivory-coast-norway-footreplays-page": "https://www.footreplays.com/international/world-cup-2026/ivory-coast-vs-norway-30-06-2026/",
  "ivory-coast-norway-reddit": "https://www.reddit.com/r/footballhighlights/search/?q=Ivory%20Coast%20Norway&restrict_sr=1&sort=new",
  "brazil-norway-youtube-short": "/watch/youtube/brazil-norway-youtube-short",
  "brazil-norway-footreplays-first-half": "https://hgcloud.to/h49b78a2s2xi",
  "brazil-norway-footreplays-second-half": "https://hgcloud.to/ihwnny9ppced",
  "brazil-norway-footreplays-full": "https://hgcloud.to/3gwm8d8ck4jl",
  "brazil-norway-footreplays-highlight": "https://hgcloud.to/bavcnafd60by",
  "brazil-norway-footreplays-page": "https://www.footreplays.com/international/world-cup-2026/brazil-vs-norway-05-07-2026/",
  "brazil-norway-reddit": "https://www.reddit.com/r/footballhighlights/search/?q=Brazil%20Norway&restrict_sr=1&sort=new",
  "argentina-egypt-youtube-short": "/watch/youtube/argentina-egypt-youtube-short",
  "argentina-egypt-youtube-full": "/watch/youtube/argentina-egypt-youtube-full",
  "argentina-egypt-footreplays-first-half": "https://hgcloud.to/5so7flass4p5",
  "argentina-egypt-footreplays-second-half": "https://hgcloud.to/b8lalyc9kjj5",
  "argentina-egypt-footreplays-full": "https://hgcloud.to/ev61u27x8w71",
  "argentina-egypt-footreplays-highlight": "https://hgcloud.to/23gp0w6aaj8w",
  "argentina-egypt-footreplays-page": "https://www.footreplays.com/international/world-cup-2026/argentina-vs-egypt-07-07-2026/",
  "argentina-egypt-reddit": "https://www.reddit.com/r/footballhighlights/comments/1uq3b2j/argentina_vs_egypt_world_cup_07jul2026/",
  footreplays: "https://www.footreplays.com/",
  "sports-is-cinema": "https://sportsiscinema.com/football",
  "true-highlights": "https://truehighlights.com/",
  "reddit-footballhighlights": "https://www.reddit.com/r/footballhighlights/",
};

const fixtureIds = snapshot.fixtures.map((fixture) => fixture.id);
const surfaceProjection = buildSurfaceProjection(itemRegistry, sourceRegistry, { fixtureIds });
const replayProjection = buildReplaySourceProjection(replaySourceSnapshot);
const replayAwareStaticSources = Object.fromEntries(fixtureIds.map((fixtureId) => [
  fixtureId,
  [
    ...(staticSourcesByFixture[fixtureId] ?? []),
    ...(replayProjection.sourcesByFixture[fixtureId] ?? []),
  ],
]));
const sourcesByFixture = mergeSurfaceRecords(fixtureIds, replayAwareStaticSources, surfaceProjection);

function dynamicLiveDestinations(fixtures) {
  const destinations = {};
  for (const fixture of fixtures) {
    const exact = liveDestinationSnapshot.sourcesByFixture?.[fixture.id] ?? {};
    destinations[`live-totalsportek-${fixture.id}`] = exact.totalsportek ?? staticDestinations["live-totalsportek"];
    destinations[`live-camel-${fixture.id}`] = exact.camel
      ?? staticDestinations[fixture.competition === "Eliteserien" ? "live-camel-eliteserien" : "live-camel-football"];
  }
  return destinations;
}

const fixtures = sanitizeFixtureSnapshot(snapshot, {
  favoriteTeams: ["Manchester City", "Arsenal", "Barcelona", "Norway"],
  availabilityByFixture: Object.fromEntries(Object.entries(sourcesByFixture)
    .filter(([, sources]) => sources.length > 0)
    .map(([fixtureId]) => [fixtureId, "ready"])),
});

const publicCatalogue = {
  region: "Philippines",
  checkedAt: snapshot.checkedAt,
  fixtures,
  sourcesByFixture,
};

validatePublicCatalogue(publicCatalogue);

export function getPublicCatalogue() {
  return structuredClone(publicCatalogue);
}

export const providerDestinations = Object.freeze({
  ...dynamicLiveDestinations(snapshot.fixtures),
  ...mergeProviderDestinations({
    ...staticDestinations,
    ...replayProjection.destinations,
  }, surfaceProjection.destinations),
});
