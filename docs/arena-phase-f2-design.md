# Arena Phase F2 — Placement & Rating Lifecycle Design

**Status:** Design only. No code, migrations, or schema changes in this document or its authoring.
**Baseline:** Phase A, B, C, C.1, D-Recovery, E, F0, F0.5, F0.6, F1, F1.1 Acceptance — all COMPLETE and verified (208/208 Arena/Leaderboard/Achievements/Events tests passing, backend/frontend builds clean, real-Postgres integration coverage for progression/reconciliation/finalize-boundary/FRIEND_CHALLENGE — see `docs/arena-phase-f1-migration-reconciliation.md` and this session's F1.1 acceptance report).
**Author scope:** Single source of truth for F2 (F2.1–F2.5). Every decision below was checked against the actual code on disk this session, not derived from memory — citations point at real files/lines.
**Explicit constraint honored throughout:** this document proposes **zero** new tables, **zero** new enums, and exactly **three** new columns on one existing table (`ArenaProfile`). No migration is created by this document.

---

## A. Architecture Review

F1 already ships the entire mechanical substrate F2 needs:

| System | State after F1.1 | What F2 does with it |
|---|---|---|
| `ArenaSeason` (`arena-season.service.ts`) | Bootstrap-only: `ensureActiveSeason()`, `getActiveSeason()`, overlap-prevention. No close/rollover. | Reused unchanged. F2 never touches season *lifecycle*; F2.4's decay job is independent of season boundaries (Part 6/F below). |
| `ArenaRatingHistory` | `previousMmr/nextMmr/mmrDelta/previousTier/nextTier/opponentId/seasonId`, unique `[matchId,userId]` | Reused unchanged — already the exact shape a "tier history" screen needs (filter where `previousTier != nextTier`). |
| `ArenaProgressionRecord` | Per-participant claim/CAS/lease state machine | Reused unchanged. |
| `ArenaProgressionDispatcherService` | Computes `promoted`/`demoted` booleans **already**, every match, whether or not anything currently reads them for demotion (`arena-progression-dispatcher.service.ts:482-485`) | F2.3 adds a **listener branch**, not new detection logic — the detection already exists and was verified by direct read this session. |
| `arena-rating-engine.ts` | Flat `getArenaKFactor()`, but its own docblock already states the exact 3-band placement/provisional/established plan F2 formalizes (`"placement matches (variable K-factor) are explicitly deferred to F2, not partially implemented here"`) | F2.1/F2.2 **execute a plan F1 already wrote down**, not new invention. |
| `ArenaMode` capability registry (`grantsXp/grantsGold/grantsArenaPoints/affectsElo/participatesInSeason`) | Complete, per-mode | Reused unchanged — placement matches are just RANKED matches; no new mode, no new capability flag. |
| `ArenaReconciliationService`/Scheduler/Processor | Cron+BullMQ, bucketed jobId dedup | **Pattern reused** by F2.4's decay job (new queue, same idiom) — not the same job, but the same shape. |
| Notification pipeline (`ArenaNotificationListener`, `NotificationEventPublisher`) | Wires `ARENA_PROMOTED` only | F2.3 adds one more branch (`ARENA_TIER_DEMOTED`) to the **same existing listener**, reusing the **same existing event** (`ARENA_RATING_CHANGED` already carries `demoted: boolean` — verified, `arena-progression-dispatcher.service.ts:484`). |
| `GET /arena/rating/history`, `progression` field on `finishMatch`/`getRoom` | Built in F1.1 | Reused for tier history (filter param) and placement-complete banner (new boolean) — no new endpoints for either. |
| Frontend `ArenaRoomPage.tsx` result modal | Already renders `promoted`/`demoted`/tier-change text (F1.1) — literally: `{room.progression.promoted ? "Thăng hạng" : "Rớt hạng"}` (`ArenaRoomPage.tsx:438`) | **The demotion UI already exists.** F2.3's frontend work is verification, not new construction. |

**Governing rule applied throughout this document** (per Phase F's own standing guardrails, `arena-phase-f-design.md`'s closing section): reuse the proven ELO formula and existing tables; add pure functions and additive columns; never introduce a second rating algorithm, a second season/enrollment system, or a parallel event bus.

**One genuine naming-collision risk found and designed around** (see Risk J-1): the codebase already has a large, **unrelated** `Placement*` model family (`PlacementTest`, `UserPlacement`, `PlacementResult`, `PlacementProcessingJob`, …) for the English-level placement *test* feature — confirmed via direct schema search this session (`prisma/schema.prisma:713,2375,2519,2609` etc.). Arena's placement-matches concept must never be named bare `Placement*` anywhere — every new identifier in this design is `Arena`-prefixed (`ArenaProfile.placementMatchesRemaining`, never a new `Placement` table).

---

## B. Placement Design (Part 1)

### B.1 How many matches
**5 placement matches.** Not 10, not dynamic/confidence-based.

- Matches the exact count F1's own design doc already named before deferring implementation (`arena-phase-f-design.md` Part 2.3: `ArenaProfile.placementMatchesRemaining Int @default(5)`) — no re-litigation, this was already decided once.
- "Dynamic" (Glicko-style confidence interval, variable match count until rating deviation drops below a threshold) is explicitly **rejected**: it requires tracking a second statistical parameter (rating deviation) alongside `mmr`, which is Glicko/Glicko-2's core mechanic, not ELO's. F1's design doc is explicit that Phase F "adds tiers on top of the existing number, not a new rating algorithm" (Part 2.3) — a confidence-interval placement system would violate that guardrail by introducing a second rating *model*, not just a modifier. A fixed count + elevated K-factor achieves the same practical goal (fast convergence under uncertainty) with zero new state beyond one integer counter.

### B.2 Placement's influence

| Aspect | Decision | Why |
|---|---|---|
| Initial rating | Starts at `mmr = 1500` (unchanged schema default) | No reason to change a value already correct and non-breaking. |
| Initial tier | Not shown as a "real" tier during placement — UI shows a "Placement N/5" state instead of a tier badge | Display-layer decision only. `ArenaProfile.tier` keeps being unconditionally recomputed every match exactly as it already is today (confirmed in F1.1 audit: `tier` resyncs on *every* match regardless of mode) — no new write-path branching needed, only a read-layer/UI convention. |
| Hidden MMR | The raw `mmr` number is **not** hidden from its own owner (matches `GET /arena/me`'s existing fully-transparent-to-self convention); the **tier badge** is what's suppressed, and only toward the display layer | Avoids inventing a second "shadow" rating column. One number, one meaning, always. |
| Season participation | Placement matches ARE tagged with the active season's `seasonId`, identically to any other RANKED match | Placement is not a distinct match *type* — it is a RANKED match with a different K-factor. Reusing the exact same `ArenaProgressionRecord`/`ArenaRatingHistory` write path means zero new season-linkage logic. |

### B.3 Reward interaction — does placement affect...

| Reward | Applies during placement? | Reasoning |
|---|---|---|
| XP | **Yes, unchanged formula** | `calculateArenaMatchReward()` reused as-is; no placement branch inside the calculator. Keeping new players' rewards identical to everyone else's avoids a confusing "why did I get less XP" moment during onboarding. |
| Gold | **Yes, unchanged** | Same reasoning. |
| Arena Points | **Yes, unchanged formula (mirrors mmrDelta 1:1)** | Since K is higher during placement, `arenaPoint` swings are proportionally larger — intentional, matches the existing "arenaPoints always tracks rating 1:1" invariant (`arena-reward-calculator.ts`'s own docblock). |
| Achievements | **Yes, unchanged** | `arena.match.completed`/`ARENA_MATCH_WON` fire normally; a placement win counts toward any "win N matches" achievement. No special-casing — achievements operate on match outcomes, not rating-confidence state. |
| Leaderboard (weekly XP league) | **Yes, unchanged (pre-existing, off-limits-to-touch behavior)** | XP still flows through `XpService.awardXpWithSideEffects`, which already, unconditionally, bumps `LeaderboardEntry.periodXp` if a weekly season is active — this is F0.5-4's guardrail; nothing here proposes touching it. |
| Season standings (Arena's own, F2.4+) | **Yes** — `seasonWinCount`/`seasonLoseCount` increment unconditionally exactly as today | Placement players appear on live standings tagged "Placement" (see B.4) rather than excluded — simpler than adding a visibility filter to the standings query, and consistent with how competitive games (League of Legends) show provisional players in general standings with a tag, not a hard exclusion. |

### B.4 What happens if placement is abandoned
No forced completion, no time limit, no auto-assigned rating from a partial sample. `placementMatchesRemaining` simply stays above zero indefinitely; the player is shown "Placement" state for as long as it takes them to finish. Rationale: a K=80 partial sample (say, 2 of 5 matches) is statistically noisy — auto-graduating a player out of placement from 2 matches would be worse than leaving them provisional forever. This mirrors how competitive titles (Overwatch, League) handle the same edge case: no penalty, no forced timer, the state is just sticky until the player plays again.

**Open product question, flagged not silently decided** (see Risk J-3): should placement be a **lifetime** flag (one-time, ever) or a **per-season** flag (re-placement every new season, like League/Valorant)? This design recommends **lifetime** as the default (simpler — one counter, no season-boundary interaction to design) but explicitly does not resolve this unilaterally; it only matters starting at F2.4 (season close), so it does not block F2.1–F2.3 and should be confirmed with product before F2.4 implementation begins.

---

## C. Rating Lifecycle (Parts 2 & 3)

### C.1 Initial rating (Part 2)
- **1500 default — kept.** Already the schema default, already the ELO-standard starting point, zero migration risk (no change proposed).
- **Provisional rating** = same `mmr` number + elevated K-factor + suppressed tier display. Not a structurally separate value.
- **Hidden provisional** — partial, see B.2/B.3-adjacent: tier hidden from all viewers during placement; raw mmr never hidden from the owner. Opponents already cannot see anyone's raw `mmr` through any existing endpoint today (`ArenaService.getRoom`'s room payload exposes username/avatar/score, never a participant's profile `mmr` — confirmed by reading the room-serialization path this session) — so "hide provisional rating from opponents" requires **zero new redaction code**, it is already structurally true.
- **Variable confidence (Glicko-style rating deviation) — rejected.** Would be a second rating algorithm coexisting with ELO, directly contradicting F1's explicit "no new rating algorithm" guardrail (Part 2.3 of `arena-phase-f-design.md`). The 3-band K-factor below is the F1-approved, lighter-weight mechanism that achieves the same real goal (fast convergence while uncertain) without a model change.
- **Duration of "provisional" treatment**: 5 placement matches (K=80) **+** the next 20 ranked matches post-placement (K=60) = 25 total elevated-K matches from account creation, then flat K=40 forever — this is not a new number invented for this document; it is `getArenaKFactor`'s own pre-existing docblock plan (`arena-rating-engine.ts`: *"placement → 80, provisional first 20 games post-placement → 60, established → 40"*), verified present in the file this session. F2 implements exactly this.

### C.2 Variable K-factor (Part 3)

**Formula** (pure function, no new counter beyond `placementMatchesRemaining` — reuses the existing `winCount`/`loseCount` fields for the match-count check):

```ts
function getArenaKFactor(profile: {
  placementMatchesRemaining: number;
  winCount: number;
  loseCount: number;
}): number {
  if (profile.placementMatchesRemaining > 0) return 80;               // placement band (matches 1-5)
  const totalMatches = profile.winCount + profile.loseCount;
  if (totalMatches <= 25) return 60;                                  // provisional band (matches 6-25)
  return 40;                                                          // established band — today's F1 flat value, unchanged
}
```

- **New players move faster** — yes, K=80 during placement (double today's flat 40).
- **Veterans stabilize** — yes; once `totalMatches > 25`, K returns to exactly today's F1 value (40) — **zero behavior change for any account that already has ≥25 lifetime matches**, which is every account that matters once F2 ships (dev DB currently has 0 Arena matches recorded at all, per the F1.1 audit, so this transition is effectively invisible in the current environment and only matters going forward).
- **Inactivity — rejected for K-factor.** A "returning player gets a temporary K boost" mechanic is explicitly out of scope for F2: it conflates with decay (Part D below), needs its own recency threshold on top of the match-count bands, and has no evidenced product need. Flagged as a possible F2.x/F3 idea, not approved here.
- **Season age — rejected.** The season soft-reset formula (already specified in F1's design doc Part 2.4: `nextMmr = 1500 + (mmr - 1500) * 0.75`) already compresses ratings toward the mean at season boundaries — a second "K is higher in week 1 of a new season" mechanic would solve the same uncertainty problem twice. Reject, no formula added.

---

## D. Promotion / Demotion (Part 4)

### D.1 Tiers — reusing the existing enum, unchanged
`ArenaTier` already has 7 values: `BRONZE, SILVER, GOLD, PLATINUM, DIAMOND, MASTER, LEGEND` (`prisma/schema.prisma:922-930`), deliberately mirroring `LeaderboardModule`'s own `LeagueTier` enum which has the **identical** 7-value set (`prisma/schema.prisma:3449-3457`, confirmed by direct comparison this session). **This document does not add an 8th tier or rename `LEGEND` to `GRANDMASTER`** — the prompt's own Part 4 example list names "Grandmaster," but that does not match the already-migrated, already-in-production enum, and renaming it would require an enum migration with no evidenced product need, breaking the deliberate `LeagueTier`-naming-parity F1's design doc already established (Part 7: *"deliberately mirrors LeagueTier's existing 7-value naming for product-familiarity"*). Flagged explicitly per Part 15's mandate to challenge assumptions against real code.

### D.2 Promotion — instant, threshold-based (unchanged mechanism)
`resolveArenaTier(mmr)` is already a pure threshold function, evaluated every match (`arena-rating-engine.ts:76-79`). **No change needed.** A "promotion series" (must win N of the next M matches at the new tier before it's confirmed, Overwatch-style) is explicitly **rejected** — it is a materially different, stateful mechanic with no existing precedent in this codebase and no evidenced need; flagged as a possible F3+ idea only if product specifically wants the "prove it" feel later.

### D.3 Demotion — stateless hysteresis buffer, not a shield-charge resource
**Design decision**: reject a stateful "demotion shield" (a consumable resource requiring its own accrual/consumption/display/abuse-analysis). Instead, add a pure-function buffer:

```ts
function resolveDisplayedTier(
  previousTier: ArenaTier,
  nextMmr: number,
  bufferMmr = 25, // env-configurable, see rollback plan in Part I
): ArenaTier {
  const naiveNextTier = resolveArenaTier(nextMmr);
  const droppedATier = tierRank(naiveNextTier) < tierRank(previousTier);
  const previousTierFloor = ARENA_TIER_THRESHOLDS.find((t) => t.tier === previousTier)!.minMmr;
  if (droppedATier && nextMmr >= previousTierFloor - bufferMmr) {
    return previousTier; // still inside the buffer — no demotion yet
  }
  return naiveNextTier;
}
```

This is a pure-function change alongside the existing `resolveArenaTier` (same file, same style as F1's own "extract a registry/helper instead of hardcoding" convention, `arena-rating.registry.ts`/`arena-mode.registry.ts` precedent). No new schema field, no new consumable resource, no new UI for "shield charges remaining." `ArenaProfile.tier` (already the authoritative denormalized display column) can temporarily read "ahead of" a pure `resolveArenaTier(mmr)` call — this is consistent with the existing pattern where `tier` is only ever written by the progression dispatcher, never re-derived elsewhere.

- **Minimum games gate — rejected.** The buffer above already provides equivalent protection (a player can't be demoted from one bad match right after promoting) without a second, redundant protection mechanic.
- **Rating floors** — the existing `MIN_MMR = 100` floor in `applyEloDelta` (`arena-rating-engine.ts:56-58`) is reused unchanged; it already prevents `mmr` (and therefore tier) from cratering. A **permanent per-tier floor** ("once Diamond, never drop below Platinum for the rest of the account's life") is explicitly **out of scope** — that is a much stronger, seasonal-badge-style guarantee with real reward-abuse implications (farm one Diamond run, coast forever) and belongs, if ever built, in a future season-reward/cosmetic phase (F3+), not as a live-mmr floor.

### D.4 What F2.3 actually has to build
Given `promoted`/`demoted` are **already computed** every match (`arena-progression-dispatcher.service.ts:482-485`) and the frontend **already branches on both** (`ArenaRoomPage.tsx:438`), F2.3's real scope is:
1. The buffer-zone function above, applied where `nextTier` is currently assigned in `computeAndApply`.
2. A new `ARENA_TIER_DEMOTED` `NotificationEventType` + template entry, and one new `if (event.demoted)` branch in the existing `ArenaNotificationListener` (mirroring its existing `if (event.promoted)` branch verbatim).

That is the entire backend delta. No new detection logic, no new frontend component.

---

## E. Season Integration (Part 5)

**Does every player auto-join the active season, or only after placement?** Neither, structurally — there is **no join action and no enrollment table**, and this design does not add one. Confirmed by re-reading `ArenaProgressionDispatcherService.computeAndApply`: it looks up `capability.participatesInSeason ? await this.seasonService.getActiveSeason() : null` and stamps `seasonId` onto `ArenaProgressionRecord`/`ArenaRatingHistory` **at match-finalization time**, for every RANKED match, automatically. "Being in a season" is a derived fact (*"did this user have a RANKED match finalized while this season's window was open"*), not a stored membership row. This exactly mirrors the existing precedent of `XpService.ensureWeeklyEntry` lazily creating a `LeaderboardEntry` on first XP award rather than requiring an explicit join step — the codebase already prefers lazy/derived participation over eager enrollment, and F2 follows that precedent rather than introducing a new pattern.

**Can placement happen outside a season?** Yes, already true today with zero new code: `ArenaSeasonService.getActiveSeason()` returns `null` gracefully when none exists, and the dispatcher already handles `season: null` end-to-end (verified — `seasonId: season?.id ?? null` throughout `arena-progression-dispatcher.service.ts`). Placement matches (RANKED matches with a different K) proceed identically whether or not a season is configured.

**How are inactive users treated?** They simply have no `ArenaRatingHistory` rows for the current season's window — excluded from any season-standings query (`WHERE seasonId = X`) by construction, with no explicit "mark inactive" step required. This is simpler than an eager-enrollment model, which would need an explicit "did not participate" state to distinguish "never played" from "opted out."

**Consequence for F2's schema**: no `UserArenaSeason`/enrollment table is proposed. Zero schema cost for this entire part.

---

## F. Rating Decay (Part 6)

Executing a plan F1's own design doc already wrote (`arena-phase-f-design.md` Part 2.3: *"applies a small MMR reduction only to profiles above a floor tier (e.g. Diamond+) that haven't played in N days... mirrors real rating-decay systems... own queue: `arena-rating-decay`"*).

| Question | Decision |
|---|---|
| Who decays | Only `DIAMOND`/`MASTER`/`LEGEND` tier profiles. Bronze–Platinum never decay — protects casual/returning players; matches how real competitive ladders only decay accounts where matchmaking integrity at the top actually matters. |
| How often | Daily `@Cron`, new BullMQ queue `arena-rating-decay`, same bucketed-jobId dedup idiom as `ArenaReconciliationScheduler` (`arena-reconciliation.scheduler.ts`, reused as a structural pattern, not the same queue). |
| Minimum tier | Diamond+ (see "who decays"). |
| Protection | Reuses the **already-existing** `ArenaProfile.lastMatchAt` field — zero new tracking. A profile is exempt if it played within the last `N` days (recommend `N = 14`, env-configurable). |
| Decay amount | Small, fixed per-run decrement (e.g. `-15 mmr` per week of inactivity beyond the grace window) — not a cliff drop. The existing `MIN_MMR = 100` floor from `applyEloDelta` (Part D.3) already bounds how far this can go. |
| Season reset interaction | Independent, sequential mechanics — decay runs on its own daily cron regardless of season boundaries; season close (a separate, later job) runs its own soft-reset compression at season end. Neither needs to coordinate with the other beyond normal row-level consistency (whichever wrote most recently is reflected on read) — decay is a periodic batch adjustment, not a duplicate-sensitive per-event operation the way match rewards are, so it does not need `ArenaRewardLog`-style idempotency keys. It does need a **concurrency guard** against racing a live match finalize for the same user (see Risk J-2). |

---

## G. API Review (Part 12)

Following F1.1's own precedent ("additive fields on existing endpoints" — `arena-phase-f-design.md` Part 8: *"additive fields only, no breaking change"*), F2 deliberately minimizes new endpoint surface:

| Need (from prompt Part 12) | Decision | Reasoning |
|---|---|---|
| Placement status | **No new endpoint** — add `placementMatchesRemaining`/`isInPlacement` to the existing `GET /arena/me` response | Already polled/available everywhere the frontend needs it; matches how `tier` was added additively in F1. |
| Placement progress | Same field, same endpoint | Progress *is* the status. |
| Placement result | **No new endpoint** — add one boolean `placementCompleted: boolean` to the existing `ArenaProgressionOutcome` (already returned by `POST /rooms/:roomId/finish` and `GET /rooms/:roodId`'s `progression` field, both F1.1) | Reuses the exact payload shape already proven correct end-to-end in F1.1's integration tests. |
| Rating history | **Already exists** — `GET /arena/rating/history` (F1.1) | No change needed for the base case. |
| Tier history | **No new endpoint** — extend `GET /arena/rating/history` with an optional `?tierChangesOnly=true` filter (server-side `WHERE previousTier != nextTier` on the same query) | Same underlying data source (`ArenaRatingHistory`); a second endpoint querying the identical table would be pure duplication. |
| Promotion / Demotion | **No dedicated endpoint** — both are already-returned fields (`promoted`/`demoted`) on the existing progression payload, plus the new `ARENA_TIER_DEMOTED` notification (Part D) | Nothing to fetch that isn't already delivered inline with the match result. |
| Season summary | **One new endpoint**, `GET /arena/season/current` (name and shape already specified in F1's own design doc Part 8) | Genuinely new data (current season + own live standing) with no existing read path. A minimal F2.1-era version can return just `ArenaSeasonService.getActiveSeason()` + the caller's own profile, before F2.4's standings query exists. |

**Net new API surface for all of F2: one endpoint.** Everything else is additive fields on already-shipped, already-tested reads.

---

## H. Database Review (Part 11)

| Item | Required | Optional | Already exists | Needs extension | Migration complexity |
|---|---|---|---|---|---|
| `ArenaProfile.placementMatchesRemaining Int @default(5)` | **Required** | | No | Yes — new column | Trivial, additive, defaulted |
| `ArenaProfile.peakMmr Int @default(1500)` | **Required** | | No | Yes — new column | Trivial |
| `ArenaProfile.peakTier ArenaTier @default(BRONZE)` | **Required** | | No | Yes — new column, **reuses existing enum** | Trivial |
| `ArenaTier` enum | Required (reused) | | **Yes, unchanged** | No | None |
| `ArenaRatingHistory` | Required | | **Yes, unchanged** | No | None |
| `ArenaProgressionRecord` | Required | | **Yes, unchanged** | No | None |
| `ArenaRewardLog` | Required | | **Yes, unchanged** | No | None |
| `ArenaSeason` | Required (for F2.4 only) | | **Yes, unchanged** — model itself needs nothing new, only a new *service* consuming it later | No | None |
| Demotion-shield state | Rejected — stateless function instead (Part D.3) | | N/A | No | None |
| Promotion-series state | Rejected (Part D.2) | | N/A | No | None |
| Season "best"/peak-this-season | Optional | **Derived at read time** from `ArenaRatingHistory` (`MAX(nextMmr) WHERE seasonId=current`), not stored | N/A | No | None |
| `ArenaAbuseFlag` | Required, but **F4** scope, not F2 | | No (already designed in F1's doc Part 7) | N/A for F2 | Deferred |
| Season-enrollment table | **Rejected** (Part E) | | N/A | N/A | None — avoided entirely |

**Total F2 schema footprint: 3 additive columns on `ArenaProfile`. Zero new tables. Zero new enums. Zero enum value changes.** This is strong, code-verified evidence that F1's schema (and its own forward-looking comments) was deliberately built so F2 would not need structural changes.

---

## I. Implementation Roadmap (Part 14)

### F2.1 — Placement Engine
- **Objectives**: `placementMatchesRemaining` counter; placement K-factor band (80); placement-completion detection/event; zero-effort-loss placement-slot exemption (Part 8/anti-abuse below).
- **Database**: `ArenaProfile.placementMatchesRemaining Int @default(5)`. One migration, additive only.
- **Backend**: `getArenaKFactor()` becomes a pure function of profile state (no new DB read — caller already has the profile loaded); `applyProfileWrites` decrements the counter (floored at 0) and skips the decrement for a detected zero-effort placement loss (`correct + wrong === 0`); new `arena.placement.completed` EventEmitter2 event (critical tier, `runCriticalEventHandler`) fired once when the counter hits 0; new `ARENA_PLACEMENT_COMPLETED` notification type + template.
- **Frontend**: Placement Introduction modal (`ArenaModal`, shown once on true first-open); Placement Progress badge (replaces the tier-badge slot while `placementMatchesRemaining > 0`); Placement Complete banner inside the existing result modal.
- **Tests**: unit tests for the K-factor pure function (FakePrisma-free, same style as `arena-rating-engine.spec.ts`); real-Postgres integration test proving 5 real matches decrement the counter to exactly 0 and fire the completion event exactly once (extends the `arena-reconciliation.integration.spec.ts` harness pattern).
- **Verification**: `jest src/modules/arena/progression`, backend+frontend build.
- **Risk**: Low — purely additive; no existing write path removed.
- **Rollback**: `ARENA_PLACEMENT_ENABLED` env flag; when off, `getArenaKFactor` falls back to today's flat 40 and the counter column sits unused/harmless.

### F2.2 — Variable Rating (provisional band + peak tracking)
- **Objectives**: provisional K=60 band (matches 6–25, reusing `winCount+loseCount`); lifetime peak mmr/tier tracking.
- **Database**: `ArenaProfile.peakMmr Int @default(1500)`, `ArenaProfile.peakTier ArenaTier @default(BRONZE)`. One migration, additive.
- **Backend**: extend `getArenaKFactor` for the provisional band; `applyProfileWrites` updates peak fields via a plain `Math.max` comparison inside the same existing transaction (no new transaction boundary).
- **Frontend**: "Peak Rating"/"Historical Peak" display slot on the (future) Arena Profile screen — data-ready even before that screen ships.
- **Tests**: unit tests for band transitions at the 5/25-match boundaries; integration test proving peak fields only ever increase.
- **Verification**: same suite.
- **Risk**: Low.
- **Rollback**: same env-flag pattern; peak columns are harmless if unused.

### F2.3 — Promotion & Demotion
- **Objectives**: stateless demotion buffer; `ARENA_TIER_DEMOTED` notification wired to the already-computed `demoted` boolean.
- **Database**: none — reuses existing columns/enum entirely.
- **Backend**: new pure buffer-zone function (Part D.3) applied where `nextTier` is assigned in `computeAndApply`; `ArenaNotificationListener` gains an `if (event.demoted)` branch mirroring its existing `if (event.promoted)` branch; `NotificationEventType`/template registry gain `ARENA_TIER_DEMOTED`.
- **Frontend**: demotion banner **already exists** (F1.1) — this phase is verification/polish only, not new construction.
- **Tests**: unit tests for buffer-zone edge cases (exactly at threshold / just inside / just outside the buffer); real-Postgres integration test proving a scripted losing streak across a tier boundary only demotes once the buffer is exceeded, and the notification fires exactly once (dedup-key proof, reusing F1.1's proven pattern).
- **Verification**: same suite + `jest src/modules/notifications` regression (must not break the already-shipped promotion path).
- **Risk**: Low–medium — first change to the tier-assignment code path since F1 shipped it; must not regress promotion.
- **Rollback**: buffer width configurable via env var; setting it to `0` reduces exactly to today's instant-threshold behavior.

### F2.4 — Decay
- **Objectives**: daily decay job for inactive Diamond+ profiles.
- **Database**: none — reuses `lastMatchAt`, `mmr`, `tier`.
- **Backend**: `ArenaRatingDecayScheduler` (`@Cron`, new `arena-rating-decay` queue) + `ArenaRatingDecayService`/`Processor`, structurally mirroring `ArenaReconciliationScheduler`; new `arena.decay.applied` event + `ARENA_RATING_DECAYED` notification type (low priority, informational).
- **Frontend**: none required for the mechanic itself; optional non-blocking "inactive, rating decays in N days" warning.
- **Tests**: unit test for the decay-eligibility/amount pure function; integration test proving an eligible Diamond+ profile decays exactly once per run and an ineligible profile (wrong tier, or recently active) never does; concurrency test proving a decay pass does not clobber a same-tick match-driven rating update for the same user.
- **Verification**: same suite.
- **Risk**: **Medium** — the first scheduled job that mutates rating without a match happening; must not race a concurrent match finalize (see Risk J-2 for the concurrency-guard design).
- **Rollback**: `ARENA_DECAY_ENABLED` env flag disables the scheduler entirely.

### F2.5 — Frontend (remaining screens)
- **Objectives**: Tier history screen; Rating history screen (list/chart); Season summary screen.
- **Database**: none.
- **Backend**: `GET /arena/season/current` (new, thin read); `?tierChangesOnly=true` on `GET /arena/rating/history` (additive query param).
- **Frontend**: new screens under `english-web-build/src/Components/Arena/`, reusing existing Lumiverse CSS custom properties already in use (`--lumiverse-primary`, `--lumiverse-ink`, `--lumiverse-card`, `--lumiverse-muted`, `--lumiverse-violet`, `--lumiverse-border` — confirmed present in `ArenaPage.tsx`/`ArenaRoomPage.tsx` this session) and the existing `ArenaModal` component pattern. No App Shell change.
- **Tests**: frontend `tsc`/build only — consistent with the fact that no dedicated frontend test harness exists in this codebase today (same boundary F1/F1.1 already operated within).
- **Verification**: `tsc --noEmit`, `next build`.
- **Risk**: Low — read-only screens.
- **Rollback**: additive routes; disabling is simply not linking them from navigation.

---

## J. Risks

1. **Naming collision with the unrelated English-placement-test system.** A large, pre-existing `Placement*` model family already exists for a completely different feature (initial English-level assessment). *Mitigation*: every new Arena identifier in this design is `Arena`-prefixed (`ArenaProfile.placementMatchesRemaining`); code review should treat a bare `Placement` identifier anywhere in Arena code as a defect.
2. **Decay (F2.4) is the first rating-mutating scheduled job with no per-event idempotency key** the way match rewards have (`ArenaRewardLog`'s unique constraint). It could race a concurrent match finalize for the same user. *Mitigation designed*: decay writes should use the same `updateMany({where:{...}})`-CAS idiom already proven in `finalizeMatch` — specifically, condition the decay `UPDATE` on `lastMatchAt` still matching the value read at batch-scan time, so a concurrent match finalize (which updates `lastMatchAt`) causes the decay write to affect 0 rows and be skipped/requeued, never overwritten blindly.
3. **Open product decision: lifetime vs. per-season placement.** Recommended default is lifetime (simpler), but this is a genuine product-preference fork, not an architecture question — flagged here rather than silently decided. Does not block F2.1–F2.3; must be resolved before F2.4 (season close) implementation starts.
4. **Demotion is new, user-facing negative feedback.** Could increase churn/complaints if the buffer is tuned too tight. *Mitigation*: buffer width ships env-configurable with a generous default (25 mmr), soft-launched with monitoring before any tightening.
5. **Peak fields are permanent, un-resettable by design** — `peakMmr`/`peakTier` are lifetime highs; "Season Best" is a *separate*, derived-not-stored concept (Part 9/H). Two different "peak" numbers exist simultaneously; F2.5's UI copy must clearly distinguish them so users don't confuse a season peak with their all-time peak.
6. **F2.4 introduces a second Arena scheduled-job family** (after reconciliation). Whatever operational monitoring exists for the reconciliation queue should be extended to cover `arena-rating-decay` — not verified as part of this design pass, flagged for F2.4's own rollout checklist.

---

## K. Approved Design (summary)

- **Placement**: 5 matches, K=80, reuses the RANKED pipeline unchanged; XP/Gold/Arena Points/Achievements/Leaderboard all apply normally during placement; only the *tier display* is suppressed (shown as "Placement N/5"), never the raw mmr from its owner. No forced completion, no expiry.
- **K-factor**: 3 bands off `placementMatchesRemaining` + existing `winCount+loseCount` — 80 / 60 / 40 — no recency or season-age modifier. Executes F1's own pre-written plan.
- **Promotion**: instant, threshold-based, unchanged from F1.
- **Demotion**: stateless 25-mmr hysteresis buffer (env-configurable), no shield-charge resource, no promotion series, no minimum-games gate. Reuses the already-computed `demoted` boolean and the already-built frontend branch.
- **Rating floor**: existing `MIN_MMR = 100`, unchanged; no new permanent per-tier floor.
- **Season entry**: implicit/derived, no enrollment table, no join/leave events.
- **Decay**: Diamond+ only, daily cron, `lastMatchAt`-based grace, independent of season close, CAS-guarded against match-finalize races.
- **Matchmaking**: no placement-only queue; existing mmr-range search suffices; opponent mmr is already invisible to opponents today.
- **Anti-abuse**: reuses F1's existing, fully-designed, F4-scoped anti-abuse system as-is; the only new item is a narrow, F2.1-scoped placement-slot exemption for zero-effort losses, plus a tighter (existing-detector-reused) repeated-opponent threshold during placement, deferred to F4 alongside everything else in that family.
- **Profile additions**: exactly 3 new columns (`placementMatchesRemaining`, `peakMmr`, `peakTier`); every other requested profile field (Promotion Progress, Win Rate, Streak, Placement Remaining) is already stored or trivially derived at read time.
- **API**: 1 new endpoint (`GET /arena/season/current`); 3 existing endpoints extended additively; 1 existing endpoint gains an optional filter param.
- **Events**: 2 new EventEmitter2 events (`arena.placement.completed`, `arena.decay.applied`); demotion reuses the existing `ARENA_RATING_CHANGED` event via a new listener branch, not a new event; `arena.season.joined`/`arena.season.left` are explicitly **rejected** (no enrollment state to transition).
- **Schema**: 3 additive columns total across all of F2.1–F2.4. Zero new tables. Zero new enums. Zero enum changes. Zero migrations created by this document.

---

## Phase F2.0.1 Design Review

Refinement pass over the F2 design above, performed before implementation begins. Every recommendation below was checked against the actual code on disk this session (not the F2.0 session's memory) — new evidence found this pass is cited by file/line where it changes a conclusion. Nothing in this section modifies code, schema, or migrations.

### Review 1 — Placement Matchmaking (vs. Part B / Original Part 1)

**1. Original proposal**: placement matches reuse RANKED matchmaking unmodified — no placement-only queue, no new `ArenaMode`, the existing mmr-range search (`getSearchRange`) is sufficient.

**2. Analysis** — Option A (current proposal, immediate match against anyone in range) vs. Option B (0–30s placement-only, 30–60s expand, 60–120s widen):

Re-reading the actual matchmaking code (`arena.service.ts:323-327,459-568`) surfaces that `getSearchRange` **already implements progressive widening** — `range = waitedSeconds >= 20 ? 200 : waitedSeconds >= 10 ? 100 : 50`. Option B is not a new *category* of mechanism this codebase lacks; it is a request to add a **placement-preference dimension** on top of a widening mechanism that already exists.

| Dimension | Option A (current) | Option B (phased placement-only) |
|---|---|---|
| Fairness | Moderate — a placement player (mmr pinned at a default) can face an accurately-calibrated same-mmr veteran | Marginally better *framing* (new players see new players), but two unknowns matched together isn't more *skill*-fair than one unknown vs. one known — the gain is psychological/onboarding, not statistical |
| Queue time | Best — largest pool, shortest wait | **Worse, materially** — at this product's current real scale (confirmed this session: 5 total users, 1 `ArenaRoom`, 0 `ArenaMatch` rows in the dev DB before F1.1's own test runs), a strict 30s placement-only phase would frequently starve and fall through to the exact same pool Option A uses instantly, after making the player wait regardless |
| Smurf resistance | No mechanism at the pairing layer either way — detection is F1's already-designed, F4-scoped statistical scan (`ArenaAbuseFlag`), not a matchmaking-segregation problem | Same — segregating the queue does not detect an anomalous win rate |
| Boosting resistance | Same as above (F4-scoped repeated-opponent/friend detection, unaffected by pairing order) | Arguably **slightly worse** — forcing placement-vs-placement makes an organic two-friends-both-in-placement boost look like the "natural" match type, no harder to arrange than under Option A |
| New-player experience | Weaker in the "who do I face" sense | Better in framing, worse if the placement pool is thin (near-certain at current scale) — "waited 30s for nothing" is a worse first impression than an instant match |
| Implementation complexity | **Zero** — already what F1 ships | Materially higher: needs a placement-status signal joined into the opponent query (either an `ArenaProfile` join or a denormalized snapshot column on `ArenaQueue`, mirroring the `mmr` column's existing denormalization precedent), a new phased-timeout state machine layered on top of the existing 3-band widening, and new tests for every phase transition |
| Long-term scalability | Fine at any scale, never fragments the pool | Correct model *at large scale* (mirrors AAA competitive titles) but is the wrong tool for the population size this product actually has today |

**3. Decision**: keep Option A as the F2.1 default. Add one **optional, non-blocking refinement**: within the *existing* mmr-range window, add a soft tie-break preference (not a hard gate, not a new timeout phase) — if multiple eligible opponents exist at the moment of matching, prefer one whose `placementMatchesRemaining > 0` matches the querying player's own status; otherwise match immediately with whoever's available. **Do not implement this tie-break as part of F2.1's initial ship** — ship Option A unmodified first; add the tie-break later only if real queue data shows a new-player-experience problem worth the added complexity.

**4. Reasoning**: Option B solves a problem (mismatched placement opponents) with a mechanism (population segregation) whose cost (queue-time regression) is worst exactly when the product's population is smallest — i.e., worst right now. The tie-break gets a meaningful slice of Option B's benefit (prefer-but-never-wait-longer) at a fraction of the complexity, and is trivially removable/inert since it never changes queue-time, only ordering among already-available candidates.

**5. Implementation impact**: F2.1 ships with zero matchmaking changes. The optional tie-break, if built later, touches only `enterQueue`'s `arenaQueue.findFirst` query (an `orderBy` addition) — no new state machine, no new `ArenaMode`.

**6. Schema changes required?** None for F2.1. The optional future tie-break would need either a join through the existing `ArenaProfile` relation (no schema change) or, for query efficiency, one optional denormalized `ArenaQueue.isInPlacement Boolean` column mirroring the existing `mmr` denormalization — explicitly **not proposed now**, only noted as the cheapest path if evidence later justifies building it.

**7. API changes required?** None.

**8. Can existing F1 implementation be reused?** Yes, entirely — `getSearchRange`'s widening bands, `enterQueue`'s transaction/advisory-lock structure, and the opponent-lookup query are all reused unmodified. No new `ArenaMode` is introduced, honoring the prompt's explicit constraint.

---

### Review 2 — Variable K-Factor (vs. Part C.2 / Original Part 2)

**1. Original proposal**: 80 (placement) / 60 (provisional, matches 6–25) / 40 (established) — reusing `arena-rating-engine.ts`'s own pre-written docblock plan.

**2. Analysis**: using the actual formula already in the codebase (`round(K × (outcome − expectedScore))`, floored/ceilinged at +6/−4 for win/loss, `arena-rating-engine.ts:41-53`), for an evenly-matched game the per-match delta is `round(K × 0.5)`:

| Band set | Placement Δ/match (even match) | Max single-match swing (worst-case mismatch) | Net movement, 5 placement matches (all even wins) | Verdict |
|---|---|---|---|---|
| 80/60/40 (current) | 40 | up to 80 | up to ~200 mmr | Fast, bounded convergence; matches how large competitive titles (Overwatch SR, etc.) intentionally swing hard during placement |
| 60/50/40 | 30 | up to 60 | up to ~150 mmr | Gentler per-match, but *prolongs* the exact mismatched-opponent problem placement exists to fix — a genuinely strong new player takes longer to reach their true tier |
| 50/45/40 | 25 | up to 50 | up to ~125 mmr | Barely distinguishable from flat 40 — placement stops doing its actual job (fast calibration); a strong new player could still be stuck near 1500–1700 after all 5 matches |
| Dynamic (Glicko-style) | N/A | N/A | N/A | Already rejected in Part C.1 as a second rating *model*, not a parameter change — nothing found this pass overturns that |

**Smurf-detection impact**: a higher K makes a secretly-skilled account converge to its true (high) tier *faster*, shortening the window during which it can misleadingly stomp lower-tier opponents — this is an argument *for* the more aggressive band, not against it (distinct from, and complementary to, F4's statistical detection).

**Stability**: all four options converge to *identical* steady-state behavior once `totalMatches > 25` (flat K=40 in every case) — the choice only affects the first 25 matches of an account's lifetime, never long-term stability.

**3. Decision**: keep 80/60/40 unchanged.

**4. Reasoning**: it is the only band set that actually accomplishes placement's stated purpose (fast, bounded convergence) while being strictly time-boxed (25 matches, ever) and converging to identical long-term behavior as every gentler alternative. No evidence surfaced this pass favors a gentler band; 50/45/40 is rejected outright as functionally defeating the point of having a placement phase.

**5. Implementation impact**: none beyond what F2.1/F2.2 already scoped — `getArenaKFactor()` gains the two new bands exactly as originally designed.

**6. Schema changes required?** None (reuses `placementMatchesRemaining`, `winCount`, `loseCount`).

**7. API changes required?** None.

**8. Can existing F1 implementation be reused?** Yes — `calculateEloDelta`, `expectedScore`, `applyEloDelta`, and the +6/−4 floor/ceiling are all reused completely unmodified; only the K-factor *selection* function changes.

---

### Review 3 — Demotion Buffer (vs. Part D.3 / Original Part 3)

**1. Original proposal**: a fixed 25 mmr hysteresis buffer, already noted as "env-configurable" in the F2.0 pure-function signature and named in the F2.3 rollback plan.

**2. Analysis**: every other numeric Arena tunable in the F1 codebase already follows the identical `envInt(name, fallback)` pattern — confirmed present, this session, in `arena-rating-engine.ts` (`ARENA_RATING_K_FACTOR`), `arena-reward-calculator.ts` (`ARENA_REWARD_*_XP`/`*_GOLD`), `arena-progression-dispatcher.service.ts` (`ARENA_PROGRESSION_LEASE_MS`), `arena-reconciliation.service.ts`/`.scheduler.ts` (`ARENA_RECONCILIATION_BATCH_SIZE`, `ARENA_RECONCILIATION_LOOKBACK_HOURS`), and `arena-season.service.ts` (`ARENA_SEASON_DURATION_DAYS`). A hardcoded demotion buffer would be the *only* Arena numeric tunable that isn't configurable — an inconsistency with no justification.

**3. Decision**: confirm `ARENA_DEMOTION_BUFFER` as an env var, default `25`, using the exact same `envInt()` helper already duplicated across every file above. Reject live/runtime (no-restart) tuning or an admin-UI control — no existing Arena tunable has that capability, and building one bespoke live-tuning path for a single parameter would itself be the inconsistency this review is supposed to prevent.

**4. Reasoning**: consistency with an already-universal codebase convention, *and* direct operational relevance — the F2.0 design's own Risk J-4 already flags demotion as new negative feedback that may need a "soft launch... tightening" rollout, which is precisely what env-var tunability (redeploy-to-adjust) supports.

**5. Implementation impact**: none beyond what F2.3 already scoped — one more `envInt()` call alongside the ten-plus that already exist.

**6. Schema changes required?** None.

**7. API changes required?** None.

**8. Can existing F1 implementation be reused?** Yes — the `envInt()` helper pattern itself (duplicated per-file today, not extracted to a shared util) is reused as-is; F2 does not introduce a new configuration mechanism.

---

### Review 4 — Peak Statistics (vs. Part H / Original Part 4)

**1. Original proposal**: `ArenaProfile.peakMmr`/`peakTier` stored (lifetime); Season Peak Rating/Tier derived at read time from `MAX(nextMmr) WHERE seasonId=current`, not stored.

**2. Analysis**: re-verified the derive-at-read-time approach against the actual write conditions in `arena-progression-dispatcher.service.ts:328` — `ArenaRatingHistory` is written `if (capability.affectsElo || previousTier !== nextTier)`. Since placement/provisional/established are all RANKED (`affectsElo: true` unconditionally), every RANKED match — placement included — reliably produces a row, so `MAX(nextMmr) WHERE seasonId=X AND userId=self` remains a sound, always-populated query for the live season. `FRIEND_CHALLENGE` never participates in seasons at all (`participatesInSeason: false`), so it correctly never pollutes this aggregate. No gap found.

Confirmed the *asymmetry* that justifies the store-vs-derive split: lifetime peak must survive indefinitely across season soft-resets and is cheap to store (one comparison per match); season peak is bounded to the current season's window and would be comparatively expensive/unbounded to keep re-deriving as a *lifetime* value, but is cheap and correct to derive for a *single, bounded* season.

**3. Decision**: confirmed, unchanged. Lifetime peak stored on `ArenaProfile`; season peak derived from `ArenaRatingHistory`, never stored.

**4. Reasoning**: minimizes schema (no third peak-tracking column, no season-close reset logic for it) while remaining correct under the actual write conditions, re-verified this pass rather than assumed.

**5. Implementation impact**: none beyond F2.2's original scope. One clarification added: once a future `ArenaSeasonStanding`-style snapshot table exists (already scoped in F1's original design doc Part 7, not part of F2), it becomes the authoritative source for a *closed* season's peak; the live derive-from-`ArenaRatingHistory` query is specifically for the still-open current season, where no snapshot exists yet.

**6. Schema changes required?** None beyond the two already-proposed `ArenaProfile` columns (`peakMmr`, `peakTier`).

**7. API changes required?** None beyond what F2.5 already scoped (season summary read includes the derived season-peak value).

**8. Can existing F1 implementation be reused?** Yes, entirely — `ArenaRatingHistory`'s existing indexes (`[userId, createdAt]`, `[seasonId]`) support the derive query as-is; a future composite `[userId, seasonId]` index is a possible efficiency improvement, not a blocker, and is not proposed now (no evidence this query is hot yet).

---

### Review 5 — Placement Rewards (vs. Part B.3 / Original Part 5)

**1. Original proposal**: placement grants XP/Gold/Arena Points/Achievements identically to any RANKED match; Season Progress (`seasonWinCount`/`seasonLoseCount`/`arenaPoint`) applies unconditionally.

**2. Analysis, checked against the actual codebase this session**:
- **Daily/Weekly Missions** (`missions-v2` module): confirmed **zero existing Arena↔Missions integration** anywhere (grep across `src/modules/missions-v2/` and `src/modules/arena/` for cross-references returns nothing). Every current caller of `MissionV2ProgressService.increase()` — Grammar, Listening, Reading, Speaking, Vocabulary, Writing — calls it as a **direct injected method**, not via an event bus (matching F1's own documented "domain event standard" audit: Missions-v2 deliberately bypasses `EventEmitter2`, `arena-progression-sequence.md` §4). Wiring Arena in would be **100% new plumbing**, not reuse of anything that exists today.
- **Battle Pass**: confirmed **does not exist anywhere in the codebase** (zero hits, any casing). Nothing to design against.
- **Arena Events** (seasonal live-events, distinct from `ArenaRoomEvent`, which is only the in-room chat/emoji/ping log): confirmed **does not exist as a system**. Nothing to design against.
- **Season Progress**: already correctly covered (Part B.3) — re-confirmed, no change.

**3. Decision**: Daily/Weekly Missions integration is **not included in F2**. Battle Pass and Arena Events are **not applicable** (neither exists). Season Progress remains **unconditional and unchanged**.

**4. Reasoning**: integrating Missions would be genuinely new cross-module plumbing with no existing hook to reuse, and no mission catalog row today references any Arena activity — deciding this unilaterally inside a rating-lifecycle design review would be scope creep beyond what F2 is chartered to do. If product wants it later, the mechanism is already clear and cheap: a direct call from `ArenaProgressionDispatcherService` to `MissionV2ProgressService.increase()`, mirroring exactly how Listening/Reading/Writing/etc. already do it — noted here as a ready-to-wire future addition, not decided now.

**5. Implementation impact**: none — this review changes nothing about F2.1's actual implementation scope.

**6. Schema changes required?** None.

**7. API changes required?** None.

**8. Can existing F1 implementation be reused?** N/A for missions/battle pass/events (nothing exists to reuse, and nothing is being built). Season Progress fully reuses existing `ArenaProfile` fields, unchanged.

---

### Review 6 — Placement Abuse (vs. Part J / Original Part 6/8)

**1. Original proposal**: new-account boosting reuses F1's repeated-opponent detector; a narrow F2.1-scoped zero-effort-loss exemption prevents a sandbagged loss from consuming a placement slot.

**2. Analysis**, item by item, checked against F1's already-designed (F4-scoped) anti-abuse table in `arena-phase-f-design.md` Part 3:

| Vector | Existing F1 mechanism | Placement-specific gap? |
|---|---|---|
| Intentional losses (sandbagging) | Zero-effort matches already get zero XP bonus (F1 doc's AFK mitigation); F4's win-trade anomaly scan for effortful-but-deliberate losses | F2.1's zero-effort-loss placement-slot exemption (already proposed) closes the one placement-specific gap: a genuine 0-effort loss shouldn't consume a slot, or it rewards exactly the sandbagging it should discourage |
| Repeated disconnects | Gate D-Recovery's `forfeitParticipant` already applies the **full** mmrDelta/XP-loss on forfeit, no discount (`arena-phase-f-design.md` Part 3) — mode-agnostic, already applies to placement matches today | None — already fully covered, zero F2 change needed |
| Queue dodging | F1's already-designed short-TTL Redis cooldown (`ArenaRedisService`, F4 scope) | None — applies equally during placement, no change needed |
| Smurf accounts | F4's statistical win-trade/anomaly scan (`ArenaAbuseFlag`) | None — elevated placement K-factor is a *complementary passive mitigant* (faster correct-tier convergence shortens the stomping window) but not a detection mechanism itself |
| Friend boosting | F1's friend-farming detection (`CommunityFriendship` check + repeated-pairing dampening, F4 scope) | One implementation note for F4 (not F2): since placement K≈2× normal K, any delta-dampening cap F4 implements should apply to the *already-K-adjusted* `mmrDelta` (which `arena-reward-calculator.ts`'s `arenaPointsForOutcome` already takes as a computed input, not a hardcoded assumption) — the existing formula naturally scales correctly if implemented this way; flagged for F4's own implementation, not a new F2 mechanism |
| Placement reset abuse | **No reset action exists anywhere in this design** — `placementMatchesRemaining` only ever decrements | No abuse surface exists because the feature that would enable it (a "reset my placement" action) was never proposed. Nothing to protect against. |
| Repeated placement abandonment (many alt accounts, each abandoned after 1–2 matches) | N/A — this is general multi-accounting, not a placement-specific vector | **Out of Arena's scope entirely** — Arena has no visibility into device/IP-level account correlation; if the platform has account-abuse tooling elsewhere, that is the correct enforcement point, not Arena-specific code |

**3. Decision**: no new abuse-detection mechanism is proposed by this review. Every named vector either reuses an F1-designed (F4-scoped) mechanism unmodified, has no exploitable surface because the enabling feature doesn't exist, or is explicitly out of Arena's scope.

**4. Reasoning**: this is the intended outcome of a reuse-first review — confirming an already-designed system covers a new feature's abuse surface, rather than finding a reason to build something new.

**5. Implementation impact**: none beyond F2.1's already-scoped zero-effort-loss exemption.

**6. Schema changes required?** None.

**7. API changes required?** None.

**8. Can existing F1 implementation be reused?** Yes, entirely — every real mitigation here is a reuse of an F1-designed (mostly F4-scoped) mechanism.

---

### Review 7 — Rating History Reason Field (vs. Original Part 7)

**1. Original proposal** (this prompt's framing, not previously decided in the F2.0 doc): should `ArenaRatingHistory` gain a `reason` field (`MATCH`/`PLACEMENT`/`DECAY`/`ADMIN`/`RESET`/`SEASON_RESET`) for analytics, and should it be an enum or a derived value?

**2. Analysis**: `XpTransaction` already establishes the exact precedent this question is asking about — it has **both** an enum (`sourceType: XpSourceType`) **and** a free-text `reason: String?` field coexisting (`prisma/schema.prisma:3653-3663`), confirming enums are the established, low-cost pattern in this codebase for "why did this transaction happen." That part of the reasoning favors adding one.

**However, re-reading `ArenaRatingHistory`'s actual schema this session surfaces a blocking structural fact**: `matchId` is declared `String` (not `String?`) with a **required** relation, `match ArenaMatch @relation(fields: [matchId], references: [id])`, `ON DELETE RESTRICT` (`prisma/schema.prisma:1379-1399`, migration `20260722100118_add_arena_progression_f1`). **A row cannot be inserted into this table at all without a real, existing `ArenaMatch` row to point to.** A decay tick, an admin adjustment, or a season soft-reset has no real match to attach to — so a `reason` column alone does not make the table usable for those cases; `matchId` would *also* need to become nullable, which is a materially larger schema change (nullability + FK semantics) than the "3 additive columns" this whole F2 design has otherwise carefully minimized.

Cross-checking against F2.4's own decay design (Part F/I above): it already specifies decay updates `ArenaProfile.mmr`/`tier` **directly** and is visible via the `arena.decay.applied` notification — it was never actually scoped to write `ArenaRatingHistory` rows. That original scoping turns out to be the *correct* call for exactly the reason this review just surfaced (the `matchId` constraint), even though the original doc didn't spell out why.

**3. Decision**: **reject** adding a `reason` field in F2.

**4. Reasoning**: the one new writer F2 actually introduces (decay) is already designed to bypass this table entirely — specifically because of the constraint just found. `ADMIN_ADJUSTMENT` and `SEASON_RESET` have no writer at all in F2's scope (admin reversal tooling is F4; season close is a separate, not-yet-designed phase). A `reason` column would read `MATCH` for literally every row that can currently be inserted, providing zero analytics value until a second real writer exists — at which point `matchId`'s nullability must change *together with* adding the reason column, not before.

**5. Implementation impact**: none for F2. Documented here for the future: *if* a second writer is ever needed, `matchId` becomes nullable, a `reason` enum (not a derived/computed value — the `XpTransaction` precedent and the fact that a decay row and an admin-adjustment row can be structurally identical otherwise both argue for an explicit column) is added at the same time, in the same migration.

**6. Schema changes required?** **None for F2.** (Documented future dependency: `matchId` nullability + `reason` enum must ship together, later, if ever.)

**7. API changes required?** None.

**8. Can existing F1 implementation be reused?** Yes — `ArenaRatingHistory` is reused completely unmodified; this review's contribution is confirming *why* decay was correctly scoped to avoid it, not changing anything.

---

### Review 8 — Notifications (vs. Part I / Original Part 8)

**1. Original proposal**: Placement Completed (F2.1), Demotion (F2.3), Decay Applied (F2.4, low priority) as new; Promotion already exists (F1).

**2. Analysis** of the two new candidates this prompt adds — Peak Rating, New Highest Tier, Season Joined, Season Finished:

- **Peak Rating** (notify every time `peakMmr` increases): **reject**. `peakMmr` increases on nearly *every* winning match for an actively-improving player — this would be a high-frequency notification precisely for the most engaged players, the opposite of "real user value" and a direct notification-fatigue risk.
- **New Highest Tier** (notify every time `peakTier` increases): **reject as a separate notification**. For a first-time promotion into a tier, this is definitionally the same moment as the already-existing Promotion notification — a distinct case only exists for re-entering a previously-reached tier after a demotion, a rare edge case whose marginal value doesn't justify a second notification type and template.
- **Season Joined**: **reject**. Confirmed (Part E above) there is no season-membership/enrollment event in this design at all — participation is derived from match records, not stated via a join action, so there is no trigger point for this notification to fire from.
- **Season Finished**: **reject for F2 specifically**. `ARENA_SEASON_ENDED` is already named in F1's *original* design doc (`arena-phase-f-design.md` Part 5) as belonging to the season-close job — which is not part of *this* F2 (placement/rating lifecycle)'s roadmap (F2.1–F2.5, this document). See the scope-naming note in Design Validation below.

**3. Decision**: F2 ships exactly four notification types total: Promotion (existing, unchanged), Placement Completed, Demotion, Decay Applied. Peak Rating, New Highest Tier, Season Joined, and Season Finished are all rejected for F2.

**4. Reasoning**: each rejected candidate either creates fatigue risk, duplicates an existing notification's coverage, or has no trigger point in this design's actual event model.

**5. Implementation impact**: none beyond what F2.1/F2.3/F2.4 already scoped.

**6. Schema changes required?** None (notifications use the existing `Notification`/`NotificationEventType` infrastructure).

**7. API changes required?** None — reuses `NotificationEventPublisher.publish()` exactly as F1 does.

**8. Can existing F1 implementation be reused?** Yes, entirely — the notification pipeline, dedup-key convention, and `ArenaNotificationListener` pattern are all reused unmodified; F2 only adds listener branches and template entries.

---

### Review 9 — Frontend Experience (vs. Part I/F2.5 / Original Part 9)

**1. Original proposal**: Placement Introduction, Placement Progress, Placement Complete (reuses the F1.1 result modal), Rating History, Season Summary screens; Promotion/Demotion animation explicitly deferred as UI polish.

**2. Analysis**: cross-checking this prompt's checklist against the original design finds two items not explicitly addressed before — "Tier reveal" and confirming animation deferral still holds.
- **Tier reveal**: on inspection, this is not a distinct screen — it *is* the "Placement Complete" banner (showing the newly-revealed tier) already designed inside the existing result modal. Calling it out separately risks building the same UI moment twice.
- **Promotion/demotion animation**: re-confirmed deferred, consistent with `arena-phase-f-design.md` Part 12's F1.1 finding — the underlying data (`promoted`/`demoted`, tier before/after, mmr before/after) is already rendered as static text in `ArenaRoomPage.tsx` (F1.1); only the animated transition remains explicitly out of scope, unchanged by this review.
- **Season Summary**: re-confirmed the F2.5 scoping remains correct and sufficient — a minimal `GET /arena/season/current` (active season + own live standing) is buildable without season-close/standings existing; full historical-season features correctly stay out of F2.

**3. Decision**: confirm the F2.5 frontend plan unchanged, with one clarification: "Tier reveal" is the same UI moment as "Placement Complete," not a separate build.

**4. Reasoning**: avoids duplicating the same visual moment under two names; keeps animation correctly separated from the (already-shipped) data display it would eventually decorate.

**5. Implementation impact**: none — F2.5's scope is unchanged, just clarified.

**6. Schema changes required?** None.

**7. API changes required?** None beyond what F2.5 already proposed.

**8. Can existing F1 implementation be reused?** Yes — the `ArenaModal` component, the existing result-modal progression section (F1.1), and the Lumiverse CSS custom properties already in use (`--lumiverse-primary/-ink/-card/-muted/-violet/-border`, confirmed present in `ArenaPage.tsx`/`ArenaRoomPage.tsx`) are all reused; no App Shell change, per the constraint.

---

### Design Validation Summary (Part 10)

Cross-cutting findings from stress-testing every recommendation above against the actual schema, services, APIs, progression flow, reconciliation, `RatingEngine`, `RewardCalculator`, and dispatcher:

1. **One recommendation was reversed by evidence, not rubber-stamped**: the plausible-sounding "add a `reason` field to `ArenaRatingHistory`" idea (Review 7) was rejected specifically because `matchId`'s `NOT NULL`/required-FK constraint (re-verified this session, `prisma/schema.prisma:1379-1399`) makes the table structurally unable to host non-match rows today — confirming F2.4's original choice to bypass this table for decay was correct, for a reason the original document didn't spell out.
2. **A second instance of the naming-collision risk (Risk J-1) was found**: `XpSourceType` — the enum whose `reason`-field pattern Review 7 examined — **already has its own unrelated `PLACEMENT` value** (`prisma/schema.prisma:3476`, for the English-level placement-test feature, nothing to do with Arena). This is independent confirmation that `Arena`-prefixed naming discipline (already mandated in the F2.0 document) is not a theoretical concern — the collision surface is real and has already been hit once by an unrelated feature reusing the word "placement."
3. **A scope-naming ambiguity was found and should be resolved in project documentation** (not resolved by this review, which has no mandate to renumber other documents): this session's "Phase F2" (placement & rating lifecycle, F2.1–F2.5, this document) is **not the same "F2"** as `arena-phase-f-design.md`'s original Part 10 roadmap, where "F2" meant season close/standings/rewards. Recommend the project explicitly relabel one of the two roadmaps (e.g., treat this document's F2 as the authoritative "F2," and shift the original doc's season-close/standings/rewards work to "F3," badges/achievements/cosmetics to "F4," anti-abuse to "F5") before F2.1 implementation begins, so "F2" is unambiguous in future planning documents and tickets.
4. **Matchmaking, K-factor, demotion buffer, peak stats, and abuse-mitigation reviews all confirm existing F1 mechanisms are sufficient** — no new service, table, queue, or event bus is introduced anywhere in this review pass; every substantive recommendation either reuses an existing pattern verbatim (env-var tunables, notification pipeline, reconciliation-scheduler shape) or explicitly declines to build something (missions integration, battle pass, season-join events, four of eight candidate notifications) because no evidenced need or existing hook justifies it.
5. **Net effect on the F2.0 design's schema footprint: unchanged.** Still exactly 3 additive `ArenaProfile` columns, zero new tables, zero new enums. The one column that might have been added (`ArenaRatingHistory.reason`) was reviewed and explicitly rejected.

---

## Phase F2.0.2 Final Design Refinement

Final refinement pass before implementation: placement matchmaking policy, K-factor configurability, reward-scope wording, and a previously-undefined disconnect policy. Every finding below was checked against the actual code on disk this session. Nothing in this section modifies code, schema, or migrations.

### Refinement 1 — Placement Matchmaking Policy

**Original Design**: F2.0.1 Review 1 concluded that placement matches reuse RANKED matchmaking unmodified for F2.1's initial ship, with an *optional*, unscheduled soft tie-break preference noted as a possible future addition — not written down as a standing policy.

**Review**: re-examining the requested 4-tier cascade (placement-vs-placement → placement-vs-ranked-in-range → expand range → normal matchmaking) against the actual `enterQueue`/`getSearchRange` implementation (`arena.service.ts:323-327,459-568`) confirms this cascade is not a new mechanism — it is a **priority ordering layered on top of the time-based widening that already exists** (`waitedSeconds >= 20 ? 200 : waitedSeconds >= 10 ? 100 : 50`). Assessed against the six requested dimensions:

| Dimension | Assessment |
|---|---|
| Scalability | The cascade *itself* scales fine at any population size, same as the existing widening bands — it doesn't add a queue-time floor the way a hard placement-only phase (rejected Option B, F2.0.1) would |
| Fairness | Marginal improvement — prefers same-status opponents when available, never at the cost of waiting longer |
| Queue time | **Unaffected** — this is the critical property that distinguishes it from the rejected Option B: a *preference* changes which of the already-available candidates is picked, it never delays picking one |
| Implementation cost | Low **if and when built** — one additional `ORDER BY`-equivalent clause in the existing `arenaQueue.findFirst` opponent lookup; no new state machine, no new timeout phases |
| Future growth | The policy scales naturally — as the player pool grows, priority 1 (placement-vs-placement) succeeds more often on its own, with zero code change required to get that benefit |
| Operational complexity | None added — no new queue, no new monitoring surface, no new failure mode distinct from the existing matchmaking path |

**Decision**: adopt this as a **documented policy** for future implementation, not as an F2.1 code change.

> **Placement Matchmaking Policy** (design guidance for whenever placement-aware matchmaking is implemented): within the existing `enterQueue` opponent lookup, apply a soft preference ordering — prefer an opponent whose `placementMatchesRemaining > 0` matches the querying player's own status, before falling back to the existing mmr-range/wait-time widening exactly as it already runs today. This is a preference (tie-break ordering among already-eligible candidates), never a gate — it must never cause a player to wait longer than the existing widening bands already allow. No new `ArenaMode`, no new queue table, no new service; this policy is realized entirely inside the existing `arenaQueue.findFirst` query at implementation time.

**Reasoning**: this captures the real, evidenced benefit of the prompt's 4-tier example (prefer like-status pairing when available) while explicitly rejecting the part of it that would regress queue time at this product's current scale (a hard placement-only phase) — consistent with F2.0.1's already-argued conclusion, now formalized as a named, citable policy rather than a passing note.

**Implementation Impact**: none for F2.1. When implemented (F2.1 or later, on evidence), touches only `enterQueue`'s opponent query.

**Schema Impact**: none required to *document* the policy. If implemented, may optionally use a denormalized `ArenaQueue.isInPlacement` snapshot column (mirroring the existing `mmr` denormalization on that same table) purely for query efficiency — not proposed now, not required (a join through the existing `ArenaProfile` relation works without any schema change).

**API Impact**: none.

**Compatibility with F1**: full — reuses `enterQueue`'s existing transaction/advisory-lock structure and `getSearchRange`'s existing widening bands verbatim; introduces no new `ArenaMode`, matchmaking queue, or service, honoring the prompt's explicit constraint.

---

### Refinement 2 — Configurable K-Factor

**Original Design**: `getArenaKFactor()` returns 80 (placement) / 60 (provisional) / 40 (established) as literal constants in the 3-band pure function (F2.0 Part C.2 / F2.0.1 Review 2).

**Review**: today's F1 code already externalizes the single flat K-factor via `envInt('ARENA_RATING_K_FACTOR', 40)` (`arena-rating-engine.ts:11`) — the *exact* pattern this part asks about already exists for the value F2 is about to split into three. Every other Arena numeric tunable follows the identical convention (re-confirmed in F2.0.1 Review 3: `ARENA_REWARD_*_XP/GOLD`, `ARENA_PROGRESSION_LEASE_MS`, `ARENA_RECONCILIATION_BATCH_SIZE`/`_LOOKBACK_HOURS`, `ARENA_SEASON_DURATION_DAYS`, `ARENA_DISCONNECT_GRACE_MS`, `ARENA_FREEZE_DURATION_MS`/`_MIN_RESPONSE_MS`). Hardcoding the two *new* band values while the *existing* one is already configurable would be an inconsistency with no justification, and would block the exact "easy balancing after release" requirement this part names.

**Decision**: make all three bands configurable, reusing the existing name for the established band rather than introducing a breaking rename:

- `ARENA_RATING_K_FACTOR` (existing name, unchanged, default `40`) — established band.
- `ARENA_K_PLACEMENT` (new, default `80`) — placement band.
- `ARENA_K_PROVISIONAL` (new, default `60`) — provisional band.

Reject a structured `ArenaConfig` object/module: no such configuration-object pattern exists anywhere in the Arena codebase today (every tunable is an individual `envInt()`-wrapped module-level constant, file-local to whichever service uses it) — introducing one now, for three values, while a dozen-plus other Arena tunables remain individual constants, would create two competing configuration idioms side by side for no functional benefit.

**Reasoning**: preserves the operator-facing env var name that may already be set in a deployed `.env` (backward compatible), applies the codebase's single, universal tunable-configuration idiom without deviation, and requires zero new abstraction.

**Implementation Impact**: none beyond what F2.1/F2.2 already scoped — `getArenaKFactor()`'s three `envInt()` calls replace its current one.

**Schema Impact**: none.

**API Impact**: none.

**Compatibility with F1**: full — `ARENA_RATING_K_FACTOR` continues to mean exactly what it means today (the flat/established-band K-factor); any deployment that already sets it keeps working unchanged after F2.1 ships.

---

### Refinement 3 — Placement Reward Scope Wording

**Original Design**: F2.0.1 Review 5 excluded Daily/Weekly Missions, Battle Pass, and Arena Events from placement reward scope, reasoning that none of the three systems exist in the codebase today.

**Review**: re-reading that reasoning, the exclusion was already substantively "deferred because the module doesn't exist" (missions: "if product wants it later, the mechanism is already clear and cheap... noted as a ready-to-wire future addition"; battle pass/arena events: "doesn't exist... nothing to design against") — the *substance* was already correct. This part asks specifically whether the *label* on that exclusion should say "Not Supported" or "Deferred until the corresponding module exists."

**Decision**: use **"Deferred until the corresponding module exists"** for Missions and Arena Events; use **"Deferred until the corresponding module exists (none currently planned)"** for Battle Pass specifically, to avoid implying a roadmap commitment that doesn't exist. Do not use "Not Supported" for any of the three.

**Reasoning**: "Not Supported" is reserved, by this document's own established usage, for cases where a mechanism was actively considered and architecturally rejected (e.g., promotion series, Glicko-style variable confidence, a demotion shield-charge resource, a season-enrollment table) — those are permanent "we looked at this and it's the wrong design" calls. Missions/Battle Pass/Arena Events are excluded for a structurally different reason (the target system doesn't exist to integrate with) — using "Not Supported" here would blur that distinction for a future reader and could wrongly suggest re-proposing Arena↔Missions integration later would be re-litigating a settled architectural rejection, when it would actually just be picking up a documented, ready-to-wire future item. This minimizes future redesign exactly as asked: whoever builds Missions-v2 integration later can find this exact paragraph and the exact mechanism already named (direct call to `MissionV2ProgressService.increase()` from `ArenaProgressionDispatcherService`, mirroring Listening/Reading/Writing's existing pattern) rather than re-deriving it.

**Implementation Impact**: none — wording only.

**Schema Impact**: none.

**API Impact**: none.

**Compatibility with F1**: full — no behavior described anywhere in this refinement changes; only how the exclusion is labeled in this document.

---

### Refinement 4 — Placement Disconnect Policy

**Original Design**: none — the F2.0/F2.0.1 documents address placement *abuse* (Part 6/Review 6) but never define runtime disconnect behavior during a placement match specifically.

**Review**: Arena already has a complete, working disconnect/reconnect architecture from Gate D-Recovery, re-verified this session by reading the actual code:

- **Presence** (`arena-presence.service.ts`): Redis-backed socket-set per `(roomId, userId)`, correct across multiple tabs and multiple backend instances (`registerSocket`/`removeSocket`/`isPresent`).
- **Disconnect grace**: `ArenaGateway.scheduleDisconnectGrace` starts an in-process timer of `getArenaDisconnectGraceMs()` (env `ARENA_DISCONNECT_GRACE_MS`, default **30000ms**, `arena-realtime.constants.ts:1-4`) when a socket disconnects; if the user has *any* socket registered again before it fires (`isPresent`), nothing happens.
- **Reconnect**: `joinRoomChannel` (`arena.gateway.ts:144-168`) — on any new socket joining the room channel, calls `presence.registerSocket`, which internally calls `clearGrace` (cancels the pending timer) and immediately re-emits a **full room snapshot** (`arena:room:snapshot`) via `ArenaService.getRoom`. This is a complete resume, not a restart — same questions, same server-computed deadlines, same scores.
- **Deadlines never pause**: `questionDeadlineAt`/`match.expiresAt` are wall-clock timestamps written once and read repeatedly (`arena.service.ts:1121-1123,1421`) — nothing in the codebase freezes or extends them on disconnect (confirmed by search: the only "freeze" concept in Arena is the unrelated `FREEZE` power-up, a gameplay mechanic). Time keeps running during an interruption, exactly as it does for a connected-but-slow player — this is intentional, server-authoritative, "never trust client" design, not an oversight.
- **Forfeit on grace expiry**: `ArenaService.forfeitParticipant` (`arena.service.ts:1575-1594`) — only applies when `resolveArenaMode(room).teamFormat === 'SOLO_1V1'` and `room.status === 'PLAYING'`; forces the *other* team to win via the exact same `finalizeMatch` path any normal finish uses (`reason: 'disconnect_forfeit'`), so it flows through the exact same post-commit progression/reward/rating pipeline. For `TEAM_2V2`/`TEAM_3V3`, `forfeitParticipant` returns `null` — the match continues short-handed until natural time-up. This is pre-existing F1 behavior, not something this design changes.
- **AFK (connected, not answering)**: already has a dedicated, existing mitigation — a completed match with `ArenaParticipant.correct + wrong === 0` gets zero XP bonuses (F1's original design doc Part 3) — the match itself is not force-ended by AFK-ness; it runs to its natural `expiresAt`/all-answered conclusion.
- **Zero-effort placement exemption**: already decided in F2.1's scope (F2.0 Part B "Placement abuse" / F2.0.1 Review 6) — a placement match lost with `correct + wrong === 0` does not consume a placement slot.

**Decision — the Placement Disconnect Policy is: placement matches are matches. No placement-specific disconnect behavior is introduced; every situation below is already fully handled by resuming or reusing an existing mechanism.**

| Situation | Resolution | Mechanism (all pre-existing) |
|---|---|---|
| Disconnects before answering anything | If not reconnected within the grace window (default 30s): forfeit-loss (SOLO_1V1) via `forfeitParticipant` → `finalizeMatch`. Since `correct+wrong===0`, this loss is **exempt** from consuming a placement slot. | `ArenaPresenceService` grace timer + `forfeitParticipant` + F2.1's existing zero-effort exemption |
| Disconnects after several questions | Same forfeit mechanism if the grace window expires — but since real answers were already recorded (`correct+wrong>0`), this loss **does** count toward the placement slot, normally, like any genuine loss | Same mechanism; the exemption's own condition (zero effort) naturally does not apply |
| Temporary network interruption (reconnects in time) | Grace timer cancelled on reconnect; full snapshot resent; match continues with deadlines unchanged (they never paused) | `clearGrace` + `getRoom` snapshot resume |
| Browser refresh | Identical to a network interruption from the server's perspective — a new socket, same auth, same room-channel join, same snapshot resume | Same reconnect path |
| Reconnect | Covered above | `registerSocket` → `clearGrace` → snapshot |
| AFK (connected, idle) | Match runs to its natural conclusion; zero XP bonuses at reward time; if the match is a placement loss with zero answers, the existing zero-effort exemption applies identically to a "connected but idle" AFK loss as to a "disconnected" one — same underlying signal (`correct+wrong===0`), same treatment | Existing AFK XP-bonus suppression + F2.1's zero-effort exemption |
| Session timeout (JWT expiry) | Orthogonal to placement — an expired token fails reconnect auth (`arena:unauthorized`) exactly as it would for any match, ranked or not; no placement-specific handling needed or proposed | Existing JWT auth path, unrelated to Arena-specific code |
| `TEAM_2V2`/`TEAM_3V3` disconnect | No auto-forfeit exists today (pre-existing F1 gap, not placement-specific) — match continues short-handed to natural time-up. **Explicitly out of scope for this design to fix**; noting it is a known, pre-existing limitation is sufficient here. | N/A — unchanged |

Should placement progress **pause**? **No** — explicitly rejected. Pausing would require freezing `questionDeadlineAt`/`match.expiresAt` clocks, which nothing in the current architecture supports (they are read-many, write-once wall-clock timestamps by design) and would be a genuinely new subsystem (a pause/resume clock-adjustment mechanism) — exactly what this part instructs not to invent. The existing 30-second grace window already absorbs the overwhelmingly common case (a brief network blip, a refresh) without needing to pause anything; a disconnect long enough to exceed a 30-second grace window is, by design, treated the same as it already is for any other Arena match — a loss.

**Reasoning**: every sub-case maps onto a mechanism that already exists and is already tested (Gate D-Recovery's disconnect-grace/forfeit machinery has existing coverage; F2.1's zero-effort exemption was already designed in this document's earlier passes). No new subsystem, timer, table, or service is introduced — the entire "policy" is a statement that placement does not change any of this, plus one already-existing interaction (the zero-effort exemption) correctly composing with it.

**Implementation Impact**: none beyond what F2.1 already scoped (the zero-effort exemption itself). This refinement adds no new code.

**Schema Impact**: none.

**API Impact**: none.

**Compatibility with F1**: full — reuses `ArenaPresenceService`, `ArenaGateway.scheduleDisconnectGrace`, `ArenaService.forfeitParticipant`, `getArenaDisconnectGraceMs`, and the existing AFK zero-bonus mechanism entirely unmodified.

---

### Design Validation (Part 5)

Cross-checked every recommendation in this refinement pass against `ArenaService`, `RatingEngine` (`arena-rating-engine.ts`), `RewardCalculator` (`arena-reward-calculator.ts`), `ArenaProgressionDispatcherService`, `ArenaReconciliationService`, `ArenaProfile`, `ArenaMatch`, and the `ArenaMode` capability registry:

- **No parallel system introduced.** The matchmaking policy (Refinement 1) is a documented ordering preference inside the existing `enterQueue` query, not a second matchmaking path. The disconnect policy (Refinement 4) introduces zero new state machine, reusing Gate D-Recovery's presence/grace/forfeit machinery exactly as-is.
- **No duplicate logic.** The K-factor configurability change (Refinement 2) touches exactly one function (`getArenaKFactor`); the established-band env var name is preserved rather than duplicated under a new name.
- **No additional queue or matchmaking service.** Confirmed explicitly for Refinement 1 — the policy is realized inside `enterQueue`'s existing `arenaQueue.findFirst` call, never a second queue or service.
- **No unnecessary schema expansion.** None of the four refinements in this pass require any schema change. The F2 design's total schema footprint remains exactly 3 additive `ArenaProfile` columns (`placementMatchesRemaining`, `peakMmr`, `peakTier`), unchanged since F2.0.
- **`ArenaMode` capability registry untouched.** Placement remains "a RANKED match with a different K-factor and a slot counter" — no new mode, no new capability flag, no change to `grantsXp`/`grantsGold`/`grantsArenaPoints`/`affectsElo`/`participatesInSeason` for any existing mode.
- **Dispatcher/reconciliation/reward-calculator untouched by this pass.** Every finding here is additive configuration (env vars), documentation wording, or a policy statement confirming existing mechanisms already suffice — none of it requires a change to `ArenaProgressionDispatcherService.computeAndApply`, `ArenaReconciliationService.reconcile`, or `calculateArenaMatchReward` beyond what F2.1–F2.3 already scoped in the F2.0 document.

---

**PHASE F2 DESIGN

READY FOR IMPLEMENTATION**

---

## Implementation Status

- **F2.1 (Placement Engine): COMPLETE**, verified 2026-07-22. Full implementation report: `docs/arena-phase-f2-1-placement-implementation-report.md`. Migration applied (`20260722143310_add_arena_placement_engine`, the single `ArenaProfile.placementMatchesRemaining` column this design specified — no schema drift from what was designed). Real-Postgres integration coverage (14 tests) plus 38 unit tests, full regression suite (270 tests across arena/leaderboard/achievements/events/notifications) all passing. Two real, pre-existing defects were found and fixed during F2.1's implementation (not scope changes — both are documented in the implementation report §12): the notification-preference registry silently dropped every Arena notification since F1 (neither `ARENA_PROMOTED` nor the new `ARENA_PLACEMENT_COMPLETED` were registered anywhere, causing `NotificationsProcessor` to throw and never create a `Notification` row), and `finishMatch`'s progression field never surfaced `promoted`/`demoted`/`placementCompleted` on the exact request that caused them (it read through a replay-only path). Matchmaking soft preference (Part B/Refinement 1) was implemented, not left as documentation-only, since the "try preferred, then fallback" pattern proved directly expressible without new schema.
- **F2.2, F2.3, F2.4, F2.5**: not started. This document's design for them stands unchanged and does not need re-approval when their implementation begins, unless real-code validation during that work surfaces a reason to revisit (per this document's own established practice).

This status section records outcome only — it does not retroactively rewrite any design decision above. Any future correction to the design itself belongs in a new F2.x.y review section, not an edit to this status block.
