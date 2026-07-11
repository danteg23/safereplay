# Codex Goal — ship the approved SafeReplay experience

Recommended effort: High.

Mission: Work inside `/Users/user/Documents/Youtube - don't spoil results` and keep
completing the highest-yield same-lane improvements until the approved SafeReplay
experience is faithfully implemented, tested, and running locally on mobile and desktop.

The visual authority is `docs/design/accepted-desktop-matches.png` for the desktop
shell/match list and `docs/design/accepted-mobile-detail.png` for the match-detail
hierarchy and play controls. Translate the same system responsively rather than putting
a phone-sized layout on desktop. Preserve the white premium minimal style, original
SafeReplay mark, typography, spacing, light borders, and outline play controls.

Product decisions that override pixels in the references: remove Watched navigation and
history entirely; never show source-ready/checking/unavailable dots or status copy; never
show play buttons in the match list; make unavailable fixtures visibly washed out and
non-clickable; keep available fixtures simple and clickable; set time zone only in
Settings with Manila and Oslo pinned above the searchable full list; keep Alternatives as
quiet text links without play buttons; Full match has no general play control, only First
half and Second half controls. Desktop uses the same Matches → detail journey as mobile.
Small team flags/emblems may appear only in the detail header when real mapped assets are
available and they materially improve the result; otherwise omit them.
On mobile, Matches and Settings are quiet top-level header actions—never a sticky or
floating lower-right Settings control. Settings has no back button. Desktop keeps the
persistent left navigation.
For live rows, place the live play control directly left of the standard detail chevron
and keep every chevron on one shared right edge. Do not repeat the active time zone in the
desktop sidebar.

Live viewing is the sole match-list play-button exception. From kickoff until the end of
a conservative three-hour live window, show one outline play button when a configured
live destination exists. Use TotalSportek as the primary international directory and
Camel Live as the primary Eliteserien directory, with Livsports as a quiet fallback.
Prefer an allowlisted, verified match-specific destination when one is known; otherwise
fall back to the appropriate directory rather than guessing a match URL. The detail view
may expose the remaining configured providers as quiet Alternative 1/2 links. Before
kickoff and after the live window, remove every live control from both Matches and detail.
Keep every destination in the server-owned allowlist so discovery can replace directory
fallbacks with exact match URLs without changing the public UI contract.

Loop: inspect current state, choose the highest-yield next step, write a short strategy
with expected operator value, approach, risks, and smallest proof, actively falsify the
strategy until no known actionable loophole remains, implement by improving existing
code, validate with the smallest meaningful automated and rendered proof, actively
falsify the implementation for visual drift, broken interactions, spoiler leaks,
misleading states, mobile/desktop failures, and missing tests, then audit the next
highest-leverage step and repeat.

Mission lane: the SafeReplay web app UI, responsive behavior, local state, spoiler-safe
handoffs/player cover, focused tests, design documentation, and local launch. Preserve
the existing sanitized catalogue and allowlisted redirect contracts.

Forbidden without explicit approval: new credentials or paid services; production
deployment; external sends/uploads; provider mutation; proxying/restreaming; DRM or
access-control circumvention; destructive operations; unrelated source-research scope.

Stop only when remaining work is blocked, unsafe, outside the lane, approval-dependent,
genuinely unclear, or low ROI. If two consecutive loops produce only minor polish, stop
for diminishing returns. Final report: changes, proof, deliberate non-changes,
limitations, blockers/questions, and recommended next step.
