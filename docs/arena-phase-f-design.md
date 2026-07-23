# Arena Phase F — Progression System Design

**Status:** Design only. No code, migrations, or schema changes in this document or its authoring.
**Baseline:** Phase A, B, C, C.1, D-Recovery, E — all COMPLETE, 131/131 Arena tests passing, backend/frontend builds clean.
**Author scope:** This document is the single source of truth Phase F (F1–F4) should be implemented from without re-deriving architecture decisions.

---

## Executive summary

The codebase already has three mature, generic systems that Arena Progression must plug into rather than duplicate:

| System | Owner module | Reuse for |
|---|---|---|
| XP ledger | `leaderboard/xp.service.ts` (`XpService`, `UserXpProfile`, `XpTransaction`) | Arena XP (match/accuracy/combo/daily/first-win/streak bonuses) |
| Achievement engine | `achievements/**` (`Achievement`, `UserAchievement`, `AchievementProcessedEvent`) | Badges, titles, border unlock *conditions* |
| Notification pipeline | `notifications/**` (`NotificationEventPublisher` → queue → `Notification` → `NotificationGateway`) | Promotion/demotion/season-end/reward alerts |

One system is **not** a fit as-is and gets a parallel-but-consistent implementation:

| System | Why it doesn't fit | What Phase F does instead |
|---|---|---|
| `LeaderboardSeason` / `LeaderboardGroup` / `LeaderboardEntry` / `resolveZone()` | `LeaderboardEntry` is hard-FK'd to `UserXpProfile.periodXp` and ranks by **XP earned in a period**; promotion/demotion (`resolveZone`) is **rank-position-within-a-fixed-size-group** (Duolingo-style leagues), not **absolute-rating-threshold** (ELO-style). Retrofitting `periodXp` to mean "MMR" would corrupt the existing weekly-XP-league feature for every other module. | New `ArenaSeason` / `ArenaRatingHistory` / `ArenaSeasonReward` / `UserArenaSeasonReward` models, but their **lifecycle mechanics are a deliberate copy** of `LeaderboardWeeklyCloseScheduler` → `LeaderboardWeeklyCloseService` (Cron-driven BullMQ producer, DB-row-expiry-decides-what-closes, dedup via `jobId`) and `LeaderboardRewardService.claim()` (grant-on-close, claim-on-demand). Same pattern, separate tables, zero risk to the existing weekly-league feature. |

Everything else (gold currency, win-streak tracking, anti-abuse friend lookups, realtime push, room/match state machine) reuses existing Arena or cross-cutting infrastructure directly, with no new generic services required.

---

## PART 1 — Current architecture review

### Arena (`backend/src/modules/arena/**`)
- **Services**: `ArenaService` (room/match lifecycle, ELO, rewards, answer scoring), `ArenaBattleEngineService` (pure combo/speed math), `ArenaBattleStateService`, `ArenaBattleEventService`, `ArenaPowerUpService`, `ArenaQuestionPipelineService` + `ArenaAiQuestionSource` + `ArenaQuestionFallbackSource` + `ArenaQuestionHistoryService`.
- **Realtime**: `ArenaGateway`, `ArenaEventPublisher`, `ArenaRealtimeListener`, `ArenaPresenceService`, `ArenaRedisService`, shared `RedisIoAdapter` (cross-instance via `@socket.io/redis-adapter`).
- **Reusable entities**: `ArenaProfile` (mmr, arenaPoint, level, winCount/loseCount, winStreak/bestWinStreak, arenaFood, gold, trophy, lastMatchAt) — this is the natural anchor for new season/rating-history foreign keys.
- **Reusable events**: `ARENA_ROOM_UPDATED`, `ARENA_MATCH_STARTED`, `ARENA_MATCH_FINISHED`, `ARENA_ANSWER_SUBMITTED` (all in `realtime/arena-domain-event.ts`, published via `ArenaEventPublisher.publish()`, consumed by `ArenaRealtimeListener` for per-user snapshot push). Phase F needs new events on the **same publisher**, not a second event bus: `ARENA_RATING_CHANGED`, `ARENA_SEASON_ENDED` (see Part 6).
- **Reusable Redis**: `ArenaRedisService` (presence keys, cooldown keys) — Phase F does not need new Redis key families; season leaderboard reads can go through Postgres directly (low write volume, no live-ranking requirement like the XP weekly league has).
- **Reusable DTOs/conventions**: idempotency-key pattern (`ArenaPowerUpUsage.clientRequestId`, CAS via conditional `updateMany`), the `resolveArenaMode`/capability-registry pattern (`arena-mode.registry.ts`) — Phase F's rating/tier logic should follow the same "registry, not scattered conditionals" convention.

### Leaderboard (`backend/src/modules/leaderboard/**`)
- `XpService.awardXp()` / `awardXpWithSideEffects()` — the XP ledger Arena will call into (Part 2).
- `LeaderboardWeeklyCloseScheduler` (`@Cron('0 */5 * * * *')`) → `LeaderboardWeeklyCloseService.closeExpiredWeeklySeason()` — the season-close **pattern** Arena's season closer will mirror (not reuse the same queue/table).
- `LeaderboardRewardService.claim()` — the reward-claim **pattern** Arena's season-reward claim endpoint will mirror.
- Redis sorted sets (`leaderboard:weekly:<seasonId>:<groupId>`) via `LEADERBOARD_REDIS` token — precedent for a Redis token if Arena ever needs live ranking; not required for F1–F4 (season standings are read from Postgres, refreshed on match finish, acceptable latency).

### XP (`leaderboard/xp.service.ts`, folded into the Leaderboard module)
- `XpSourceType.ARENA` **already exists in the enum**, unused until now — confirms this integration point was anticipated.
- `AwardXpDto { userId, sourceType, sourceId?, skill?, baseXp, bonusXp?, idempotencyKey, reason?, metadata? }`.
- Idempotency: `XpTransaction.idempotencyKey` unique column, pre-checked then P2002-caught.
- Side effect: if an active `LeaderboardSeason` exists, `awardXp` also updates `LeaderboardEntry.periodXp` + the weekly Redis zset. **This is correct and desired** — Arena XP should count toward the existing weekly XP league too (a player's Arena grinding should move their weekly rank like any other activity), while Arena's own MMR/tier is tracked completely separately in the new Arena season tables.

### Reward / Currency
- No generic wallet service exists. `ArenaProfile.gold` is written directly by `ArenaService`, same convention as `PetProfile.coins` written directly by `MissionV2RewardService` and `AchievementsService`. Phase F **keeps this convention** — no new currency abstraction.

### Notification (`backend/src/modules/notifications/**`)
- Modern path: `NotificationEventPublisher.publish({ eventType, eventVersion, recipientUserIds, actorUserId, entityType, entityId, deduplicationKey, priority, context })` → `NotificationEventListener` (`@OnEvent(NOTIFICATION_DOMAIN_EVENT)`) → BullMQ `NOTIFICATIONS_QUEUE` → `NotificationsProcessor.createFromEvent()` → `Notification` row (unique on `[recipientUserId, deduplicationKey]`) → `NotificationGateway.emitCreated()` (automatic realtime push, no manual gateway call needed).
- Arena Phase F adds new `NotificationEventType` values (Part 5) and calls `publish()` — no new table, no new gateway.

### Achievement (`backend/src/modules/achievements/**`)
- Event-driven via BullMQ: a listener (mirroring `AchievementsListener.handleLearningActivity`) subscribes to a new Arena domain event, queues a job with `jobId: event.eventId` (dedup), `AchievementsProcessor` calls `AchievementsService.processActivityEvent()`, which matches `Achievement.eventType` (free-text string, not enum) and evaluates `AchievementRuleType` (`TOTAL_COUNT` / `MAX_VALUE` / `ONE_TIME_EVENT` — all three are generic enough for every Arena badge/title condition identified in Part 4; **no new rule type needed**).
- Idempotency: `AchievementProcessedEvent` unique on `[userId, achievementId, eventId]`.
- `AchievementCategory.ARENA` **already exists in the enum**, unused until now.
- **No badge/title/border "equipped" system exists anywhere** (`User` has no such columns). Achievements only track *unlocked*, not *equipped/displayed*. Phase F needs one small new table for this (Part 7).

### Profile / User
- `User` has no cosmetic-slot fields (title, border, badge). `ArenaProfile` is the correct FK anchor for all new Arena-only progression tables (not `User` directly) — keeps blast radius contained to the Arena domain and matches the existing `ArenaProfile` pattern of "one row per user, Arena-specific stats."

### Community
- `CommunityFriendship` (symmetric, `userAId`/`userBId`, unique pair) — the exact table the friend-farming anti-abuse check (Part 3) queries. No directed "friend list" exists; queries must check both column orders.

### Mission (`missions-v2`)
- No streak fields live here — confirms streak/daily-bonus logic belongs on `ArenaProfile` (already has `winStreak`/`bestWinStreak`) plus a new `lastArenaBonusDate`-style field for the daily bonus, not a mission-system dependency.

### Analytics
- Pure read/reporting over existing tables, no event-ingestion pipeline. Phase F does **not** wire into `analytics/**` — any Arena-progression analytics needs its own append-only event table if ever required (out of scope for F1–F4; flagged as a possible F5+ if the product asks for it later).

---

## PART 2 — Progression design

### 2.1 XP

All Arena XP flows through the **existing** `XpService.awardXpWithSideEffects()`, `sourceType: XpSourceType.ARENA`, mirroring exactly how `AchievementsService.claim()` integrates today. One call per match, not one call per bonus component — bonuses are pre-summed into `baseXp`/`bonusXp` so there is exactly one `XpTransaction` row (and one idempotency key) per match per user, not five.

| XP component | Computed by | Notes |
|---|---|---|
| Match XP | new `ArenaProgressionService.computeMatchXp()` | Flat base (e.g. 20 win / 8 loss) — mirrors the existing gold formula (`won ? 20 : 6`) for consistency, tunable via a constants file (same convention as `arena-battle.constants.ts`). |
| Accuracy bonus | same | `correctCount / questionCount`, tiered (e.g. ≥90% → +30%, ≥70% → +15%). Reuses `ArenaParticipant.correct`/`wrong`, already computed at answer-submit time — no new tracking needed. |
| Combo bonus | same | Reads `ArenaParticipantBattleState.combo`/max-combo-this-match already persisted by Gate E's battle engine — zero new schema. |
| Daily bonus | same | First Arena match XP-award of the calendar day gets a flat bonus. Tracked via new `ArenaProfile.lastDailyBonusAt DateTime?` (Part 7) — same "compare-date, not compare-timestamp" helper already used in `pets.service.ts` (`isSameDay`). |
| First win bonus | same | First **win** of the calendar day. Tracked via new `ArenaProfile.lastFirstWinBonusAt DateTime?`. |
| Win streak bonus | same | Reuses `ArenaProfile.winStreak` (already maintained by `finalizeMatch`) — same multiplier bands as `getStreakFoodMultiplier` for product consistency (≥10 → 1.5x, ≥5 → 1.3x, ≥3 → 1.1x), applied to the XP subtotal, not re-invented. |

**Idempotency key**: `arena:xp:${matchId}:${userId}` — same `resource:action:id` convention as the existing `clientRequestId` scheme in Gate E's power-up system. One award per match per user, replay-safe (a duplicate `finalizeMatch` retry, already CAS-guarded, cannot double-award even if it somehow re-entered).

> **Corrected in Phase F0.5 (was wrong in the original draft — see Part 11):** `XpService.awardXpWithSideEffects()` opens **its own** `this.prisma.$transaction(...)` at `Serializable` isolation and hands the caller a `tx` via the `sideEffects(tx)` callback — it does not accept an externally-started transaction. It is therefore **not possible** to call it "from inside" `finalizeMatch()`'s existing transaction (nesting a second `$transaction()` call inside another callback on the same `PrismaService` does not compose into one atomic unit).
>
> **Corrected design**: `finalizeMatch()`'s existing CAS-guarded transaction (winner computation, `FINISHED` flip) is unchanged. *After* it commits, loop over participants and call `XpService.awardXpWithSideEffects()` **once per participant** — that participant's `ArenaProfile` (mmr/gold/trophy) write happens inside *its* `sideEffects(tx)` callback, using the `tx` XpService provides. This makes XP + Arena-currency atomic **per participant**, not atomic across the whole match — which is actually consistent with the codebase's existing granularity (`ArenaRewardLog` is already deduped per `[matchId, userId]`, not per match as a whole, per `arena.service.ts`'s Phase A hardening comment). Consequence: a crash between participant 1 and participant 2 of a 4–6 player match can leave rewards partially applied — see Part 11 finding F0.5-6 for the required reconciliation job this implies.
>
> This requires `ArenaModule` to import `LeaderboardModule`'s `XpService` (new dependency edge Arena → Leaderboard; verified the reverse edge does not exist — `leaderboard/**` has zero references to `ArenaModule` — so no import cycle).
>
> **Resolved by Phase F0.6** (was flagged as an open gap in F0.5): `awardXpWithSideEffects`'s `Serializable` isolation means Prisma can throw a `P2034` serialization-failure error under contention. As of Phase F0.6's foundation-hardening pass, `XpService` retries P2034 **internally** with exponential backoff (`xp-transaction-retry.util.ts`, configurable via `XP_SERIALIZABLE_RETRY_MAX_ATTEMPTS`/`XP_SERIALIZABLE_RETRY_BASE_DELAY_MS`), for both `awardXp` and `awardXpWithSideEffects`, transparently to every caller. **Arena's per-participant loop does not need its own P2034 handling** — see `docs/arena-progression-sequence.md` §5 for the authoritative retry-flow description.

### 2.2 Currency

- **Gold**: unchanged. Continue writing `ArenaProfile.gold` directly in `finalizeMatch`, exactly as today. Phase F does not touch the gold formula except to make win-streak apply to it consistently with XP (it already does, via `getStreakFoodMultiplier`-style logic — Phase F generalizes that one multiplier function to also drive the XP streak bonus, see 2.1).
- **Arena Points**: `ArenaProfile.arenaPoint` already exists and is already ELO-coupled today (`arenaDelta = affectsElo ? (won ? Math.max(6, mmrDelta) : mmrDelta) : 0`). Phase F keeps `arenaPoint` as the **season-scoped ranking currency** — see 2.3, it becomes the value seasons rank by and soft-reset.

### 2.3 Rating

- **Engine**: keep the existing logistic-ELO implementation (`ArenaService.eloDelta()`/`expectedScore()`, K=40) unchanged — it is correct, tested (52+ Gate E/Phase A tests exercise it indirectly), and already gated by `capability.affectsElo` per `ArenaMode` (RANKED yes, FRIEND_CHALLENGE no). Phase F adds **tiers on top of the existing number**, not a new rating algorithm.
- **New registry field required (Phase F0.5 finding, see Part 11 F0.5-5)**: `ARENA_MODE_CAPABILITIES`'s `ArenaModeCapability` shape needs a new `grantsXp: boolean` field, **independent of** `affectsElo`. The two are not the same decision — casual/custom play (`FRIEND_CHALLENGE`, `affectsElo: false`) plausibly should still grant XP (matches this design's own stated philosophy in 2.4 that non-ranked play should "still feel rewarding," which the existing gold/trophy code already honors). Without an explicit field, F1's implementation would have to guess or silently hardcode this — decide and encode it in the registry now, not as an implicit assumption buried in `finalizeMatch`.
- **Placement matches**: new `ArenaProfile.placementMatchesRemaining Int @default(5)` (or a season-scoped counter, see Part 7). While `> 0`, `eloDelta` uses a **higher K-factor** (e.g. K=80, still the same formula/function, just a different constant threaded through) so rating converges faster to true skill, and the player has no visible tier ("Placement" badge shown instead) until it hits 0. This only changes a K-factor input to the *existing* function — no new rating math.
- **K-factor**: promote the current hardcoded `const k = 40` in `eloDelta()` to a small `getArenaKFactor(profile)` helper (placement → 80, provisional first 20 games post-placement → 60, established → 40) — same "extract a registry/helper instead of hardcoding" convention Phase B already established for capability gating.
- **Tiers**: new `ArenaTier` enum (`BRONZE, SILVER, GOLD, PLATINUM, DIAMOND, MASTER, LEGEND` — deliberately mirrors `LeagueTier`'s existing 7-value naming for product-familiarity, but is its **own enum** because it's threshold-based, not rank-based — see Executive Summary). Threshold table lives in a new `arena-rating.registry.ts` (same `Record<Enum, Bounds>` convention as `arena-mode.registry.ts`/`arena-power-up.registry.ts`), e.g. `BRONZE: 0-1199, SILVER: 1200-1399, ... LEGEND: 2400+`.
- **Promotion/Demotion**: computed as a pure function `resolveArenaTier(mmr): ArenaTier`, called every time `mmr` changes in `finalizeMatch`. If `resolveArenaTier(nextMmr) !== resolveArenaTier(previousMmr)`, write an `ArenaRatingHistory` row (Part 7) and publish `ARENA_RATING_CHANGED` (Part 6) — this is what drives promotion/demotion notifications (Part 5) and achievement unlocks ("reach Diamond" badge, Part 4).
- **Decay**: new scheduled job (same `@Cron` + BullMQ-producer pattern as `LeaderboardWeeklyCloseScheduler`, but its own queue: `arena-rating-decay`) runs daily, applies a small MMR reduction only to profiles above a floor tier (e.g. Diamond+) that haven't played in N days (`lastMatchAt` already exists, zero new tracking) — mirrors real rating-decay systems (Overwatch/CS) without inventing new state.
- **Rollback/reversal limitation (new in Phase F0.5 — see Part 11 F0.5-9)**: `XpService.reverseTransaction()` already exists for reversing an XP grant, but there is **no equivalent for MMR/tier** if a match is later invalidated (e.g., confirmed win-trading, Part 3). An admin reversal of a flagged match can restore that match's direct `mmrDelta` (the `ArenaRatingHistory` row stores `previousMmr`/`nextMmr`, so the inverse is computable), but **does not cascade-recompute** every subsequent match's ELO as if the flagged one never happened — full retroactive recalculation is a materially harder problem (every later match's opponent-average, delta, and possibly tier would need replaying in order) and is explicitly **out of scope for F1–F4**. This is a conscious, documented limitation (the same tradeoff most production ELO systems accept), not an oversight — call it out to the product/ops team before F4 ships the abuse-review admin action, so nobody is surprised that a reversal doesn't "fully undo" downstream drift.

### 2.4 Season

- **Lifecycle**: new `ArenaSeason { id, name, startsAt, endsAt, status: ArenaSeasonStatus (UPCOMING|ACTIVE|CALCULATING|COMPLETED|CANCELLED), isActive }` — field-for-field the same shape as `LeaderboardSeason`, deliberately, for on-call/ops familiarity, but a separate table (see Executive Summary for why).
- **Closer**: `ArenaSeasonCloseScheduler` (`@Cron('0 */5 * * * *')`, same 5-minute poll-and-let-the-DB-decide idiom as the weekly leaderboard closer) → enqueues onto a new `arena-season-close` BullMQ queue, `jobId` derived the same bucketed-timestamp way for natural dedup → `ArenaSeasonCloseService.closeExpiredSeason()`: flips `ACTIVE→CALCULATING`, computes final rank/tier per player from `ArenaProfile.arenaPoint`, writes `ArenaSeasonStanding` snapshot rows (Part 7), grants `UserArenaSeasonReward` rows (Part 7, matched by final tier against an `ArenaSeasonReward` catalog — same grant-on-close/claim-on-demand split as `LeaderboardReward`/`UserLeaderboardReward`), **soft-resets** `arenaPoint` (not `mmr` — see below), flips `COMPLETED`, opens the next season.
- **Soft reset semantics**: `mmr` (the true skill signal used for matchmaking, `ArenaMode.RANKED`'s pairing) is **compressed toward the mean**, not zeroed — `nextMmr = 1500 + (mmr - 1500) * 0.75` (standard soft-reset formula, tunable constant) — so skilled players don't replay a full climb from scratch every season, matching player expectations from LoL/Valorant-style seasons. `arenaPoint` (the season-scoped leaderboard/reward currency) resets to a placement value derived from the post-compression tier (e.g. tier floor + 50), since it's explicitly a per-season number by design (2.2). `winStreak`/`bestWinStreak`/`winCount`/`loseCount` carry over as **lifetime** stats (Part 4) but a new `ArenaProfile.seasonWinCount`/`seasonLoseCount` pair resets to 0 (needed for Part 4's "season statistics" split).
- **Rewards**: `ArenaSeasonReward { seasonId?, tier: ArenaTier, rewardType, rewardValue: Json, title, description, isActive }` (field-for-field mirrors `LeaderboardReward`, `minRank/maxRank` replaced with `tier` since Arena rewards by threshold-tier, not rank-position) → `UserArenaSeasonReward { userId, seasonId, rewardId, status: AVAILABLE|CLAIMED|EXPIRED, grantedAt, claimedAt?, expiresAt }` — claim flow is a direct copy of `LeaderboardRewardService.claim()`'s transaction shape (grant XP/gold/cosmetic into `ArenaProfile`/new equip table, mark claimed).
- **Leaderboards (season standings)**: `ArenaSeasonStanding { seasonId, userId, finalMmr, finalTier, finalArenaPoint, finalRank, wins, losses }` — one row per player per closed season, written at season-close (not live-ranked; F1–F4 has no requirement for a live in-season leaderboard beyond "GET current standings sorted by arenaPoint," a plain indexed Postgres query against `ArenaProfile`, no Redis needed).
- **Historical seasons**: `ArenaSeasonStanding` rows are never deleted — this table *is* the historical-seasons record, queryable by `seasonId` for a "Season 3 final standings" screen (Part 9).

---

## PART 3 — Anti-abuse

| Threat | Detection | Mitigation | Reuses |
|---|---|---|---|
| **Friend farming** | On `enterQueue`/matchmaking pairing (RANKED only — FRIEND_CHALLENGE is explicitly a private, non-ranked mode already, so this doesn't apply there), check `CommunityFriendship` (both column orders) between the two candidate players. | If friends, allow the match (social matchmaking isn't inherently bad) but **cap the ELO/XP delta** for repeated friend pairings within a rolling window (see "repeated opponent" below — same mechanism, friendship is just one more input into the repeat-pairing cooldown weight). | `CommunityFriendship` table directly — no new relation. |
| **Repeated opponent farming** | New `ArenaRatingHistory` (Part 7) already logs `matchId, opponentId` per rating change. A pre-match check counts matches-vs-this-opponent in the last N hours. | Beyond a threshold (e.g. 3rd match vs. same opponent in 2 hours), apply a diminishing-returns multiplier to `mmrDelta`/XP for that match (still playable, just not profitably farmable) — same "cap, don't block" philosophy as friend farming, since blocking legitimate rematches (best-of-N social play) is worse UX than dulling the reward. | `ArenaRatingHistory`, no new table. |
| **Win trading** | Statistical: a background job (own BullMQ queue, `arena-abuse-scan`, runs off-peak) flags pairs of accounts with an anomalous win-rate skew against each other only (near-100% one direction, replicated across many matches) vs. balanced results against the general population. | Flag for manual review (new lightweight `ArenaAbuseFlag` row, Part 7) — **not auto-punished**, since automated false positives on genuinely mismatched-skill friend groups are a real risk; human-in-the-loop via existing admin tooling conventions (`leaderboard-admin.controller.ts`/`admin-dashboard` module already establish an admin-review pattern to extend). | New table, admin-review pattern from `leaderboard-admin`. |
| **Disconnect abuse** | Already partially mitigated: Gate D-Recovery's `ArenaPresenceService` + disconnect-grace window already exist. Phase F adds: if a player disconnects and does not reconnect within the grace window **while losing**, `forfeitParticipant` (already implemented in Gate D-Recovery) fires — Phase F's addition is only that a forfeit-loss still applies the **full** `mmrDelta`/XP-loss (no discount), removing any incentive to disconnect to avoid a clean loss. | No new mechanism — reuses `ArenaService.forfeitParticipant` (already exists from Gate D-Recovery), Phase F only changes the reward-computation call site to not special-case forfeits favorably. |
| **Queue-dodge abuse** | New: repeated `enterQueue` → `leaveQueue` cycles within a short window (both endpoints already exist) tracked via a short-TTL Redis counter (`ArenaRedisService`, same service, new key family `arena:queue-dodge:<userId>`, no new Redis token). | Beyond a threshold, apply a short matchmaking-cooldown (reuse the existing cooldown-key convention already in `ArenaRedisService` for power-up cooldowns — same TTL-key pattern, new key namespace). | `ArenaRedisService`. |
| **AFK** | Already structurally discouraged: `submitAnswer`'s existing per-question deadline (`questionDeadlineAt`, Gate E) scores 0 for a non-response; match-level `expiresAt` already force-finishes stalled matches. Phase F adds: an AFK player (zero answers submitted in a completed match) gets **zero XP bonuses** (no accuracy/combo/streak bonus — those are naturally already 0) and **no daily/first-win bonus consumption** (so a real attempt later that day still gets the bonus) — a pure XP-computation-time check against `ArenaParticipant.correct+wrong === 0`, no new tracking. | `ArenaParticipant.correct/wrong`, already exists. |
| **Intentional surrender abuse** (deliberately losing to farm something, e.g. a "played N matches" mission/achievement without win requirement) | The achievement/mission catalog is data (Achievement rows), not code — this is a **content design constraint**, not an engineering one: any Arena achievement with `ruleType: TOTAL_COUNT` on a "matches played" event must be paired with a minimum-effort gate (e.g. only counted if `correct+wrong > 0`, enforced at the event-payload level — Phase F's Arena domain event for achievements only fires `sourceId`/counts for non-AFK participants). | Enforced at the event-emission boundary (Part 6), not a new table. |
| **Reward replay / duplicate reward** | Fully solved by reusing existing idempotency infrastructure: `XpTransaction.idempotencyKey` (unique), `AchievementProcessedEvent` (unique on `[userId, achievementId, eventId]`), and a new `ArenaRewardTransaction`-style unique constraint (`@@unique([matchId, userId])`, same shape as `ArenaRewardLog`'s existing `@@unique([matchId, userId])` from Phase A) for the season-reward and match-reward paths. | No new mechanism — same idempotency conventions already proven across the codebase, applied consistently. |
| **Crash recovery** | Already solved architecturally by Gate D-Recovery + Phase BC-Reconciliation's state machine (CAS claims, stale-PREPARING reclaim, `RoomStateChangedError` guards). Phase F's only addition: `finalizeMatch`'s existing CAS (`updateMany({where:{finishedAt:null}})`) already guarantees XP/rating/reward application happens exactly once even under a mid-request crash-and-retry — Phase F's XP/rating writes go **inside that same already-CAS-guarded transaction**, inheriting the guarantee for free. | `finalizeMatch`'s existing CAS, no new mechanism. |

---

## PART 4 — Arena profile

| Element | Storage | Design |
|---|---|---|
| **Arena Level** | `ArenaProfile.level` (exists) | Currently `floor(mmr/250)`, a side effect of rating, not a distinct progression track. Phase F **keeps it as a rating-derived display value** — it's cosmetic feedback on `mmr`, not a separate XP-driven "account level" (that already exists globally as `User.xp`/`level` via the shared XP system, avoiding a confusing second "level" meaning). |
| **Arena Rank** | Derived: `resolveArenaTier(mmr)` (2.3) + current season standing (`ArenaSeasonStanding` once closed, or live `arenaPoint` rank query while active) | Not stored redundantly — computed on read, matching the existing "derive, don't duplicate" convention (`resolveArenaMode()` already does this for mode/team-format). |
| **Arena Border** | New: equip-state table, `UserArenaCosmetic { userId, slot: ArenaCosmeticSlot (BORDER\|BADGE\|TITLE\|BANNER), cosmeticId, equippedAt }`, unique on `[userId, slot]` | *Unlock* condition is an `Achievement` row (category `ARENA`); *equip* state is this new table, since (Part 1) nothing in the codebase tracks "equipped" cosmetics today. |
| **Arena Badge** | Same `UserArenaCosmetic` table, `slot: BADGE` | Unlocked via `UserAchievement` (existing table already tracks unlock+claim), equipped state here. |
| **Season Banner** | Same table, `slot: BANNER` | Auto-unlocked at season close for qualifying tiers (via `UserArenaSeasonReward` grant, Part 2.4), equip state here. |
| **Titles** | Same table, `slot: TITLE`, `cosmeticId` referencing a small new static `ArenaTitleCatalog` (or just a code string resolved client-side from a shared constants file — **recommend the latter** for F1–F4 to avoid a table for what's initially static content; revisit if titles become admin-editable later) | |
| **Lifetime statistics** | `ArenaProfile.winCount/loseCount/winStreak/bestWinStreak` (exist, never reset) + new `ArenaProfile.lifetimeMatchesPlayed`, `lifetimeXpEarned` (aggregable from `XpTransaction` but denormalized onto `ArenaProfile` for cheap profile-page reads, refreshed in the same `finalizeMatch` transaction — same denormalization precedent as `ArenaProfile.gold` itself, which is already a running total rather than summed from a log each read) | |
| **Season statistics** | New `ArenaProfile.seasonWinCount/seasonLoseCount` (reset at season close, 2.4) + live `arenaPoint`/`mmr` | |

---

## PART 5 — Notifications

All via `NotificationEventPublisher.publish()` — no new delivery mechanism, only new `NotificationEventType` values + template entries (`templates/notification-template.registry.ts`, `templates/notification-template.mapper.ts`).

| Event | `NotificationEventType` | Trigger | `deduplicationKey` |
|---|---|---|---|
| Promotion | `ARENA_TIER_PROMOTED` | `resolveArenaTier` increases (2.3) | `arena:tier:${userId}:${matchId}` |
| Demotion | `ARENA_TIER_DEMOTED` | `resolveArenaTier` decreases | `arena:tier:${userId}:${matchId}` |
| Placement completed | `ARENA_PLACEMENT_COMPLETED` | `placementMatchesRemaining` hits 0 | `arena:placement:${userId}:${seasonId}` |
| Season end | `ARENA_SEASON_ENDED` | `ArenaSeasonCloseService` per-user, batched | `arena:season-end:${userId}:${seasonId}` |
| Season reward | `ARENA_SEASON_REWARD_GRANTED` | `UserArenaSeasonReward` row created | `arena:season-reward:${userId}:${rewardId}` |
| New title | `ARENA_TITLE_UNLOCKED` | New `UserAchievement` row, category `ARENA`, achievement tagged as title-granting | `arena:title:${userId}:${achievementId}` |
| New badge | `ARENA_BADGE_UNLOCKED` | Same, badge-granting achievement | `arena:badge:${userId}:${achievementId}` |

All `deduplicationKey`s are deterministic per-event, giving free replay-safety via the existing `Notification` unique constraint — consistent with Part 3's "reward replay" mitigation.

---

## PART 6 — Event flow

Single event bus (`EventEmitter2`, the same instance already used app-wide — Arena's `ArenaEventPublisher` currently only fans out to its own realtime listener, Phase F is the first thing that makes Arena emit **cross-module** domain events).

**Corrected in Phase F0.5** (see Part 11): step 1 is `finalizeMatch`'s existing transaction, **unchanged**. Steps 2+ are a **new, separate, per-participant loop that runs after that transaction commits** — not nested inside it (see the corrected note in Part 2.1 for why nesting isn't possible).

```
Match Finished (ArenaService.finalizeMatch, existing CAS-guarded $transaction — UNCHANGED)
  │
  ├─ [same tx, existing] compute winnerTeam from scores, flip ArenaMatch.finishedAt (CAS via updateMany)
  └─ commit
       │
       ├─▶ for each participant (sequential, not Promise.all — see Part 11 F0.5-1 on why atomicity is per-participant, not per-match):
       │     ├─▶ XpService.awardXpWithSideEffects({ sourceType: ARENA, idempotencyKey: arena:xp:<matchId>:<userId>, ... },
       │     │      sideEffects: (tx) => {
       │     │        [inside XpService's own Serializable tx, via the provided `tx`]
       │     │        - Gold / Food / Trophy write to ArenaProfile   (existing formula, unchanged)
       │     │        - mmr / arenaPoint via ELO   (existing formula, K-factor now via getArenaKFactor)
       │     │        - resolveArenaTier(before) vs resolveArenaTier(after) → if changed, insert ArenaRatingHistory row
       │     │        - ArenaRewardLog upsert (existing Phase A dedup guard, @@unique([matchId,userId]))
       │     │      })
       │     │     └─▶ [XpService's own internal logic, unchanged] → if active LeaderboardSeason: bump LeaderboardEntry.periodXp + weekly Redis zset
       │     (P2034 retry now handled internally by XpService itself — Phase F0.6, see docs/arena-progression-sequence.md §5 — Arena's loop needs no retry logic of its own)
       │     └─▶ if this participant's tier changed:
       │           ├─▶ ArenaEventPublisher.publish(ARENA_RATING_CHANGED)   [new]
       │           │     ├─▶ NotificationEventPublisher.publish(ARENA_TIER_PROMOTED | ARENA_TIER_DEMOTED)
       │           │     │     └─▶ NotificationsProcessor → Notification row → NotificationGateway (realtime)
       │           │     └─▶ ArenaAchievementListener (@OnEvent, MUST try/catch internally — Part 11 F0.5-3) → BullMQ ACHIEVEMENT_QUEUE
       │           │           └─▶ AchievementsService.processActivityEvent → Achievement/UserAchievement/AchievementRewardTransaction
       │           │                 └─▶ (if title/badge-granting achievement) NotificationEventPublisher.publish(ARENA_TITLE_UNLOCKED | ARENA_BADGE_UNLOCKED)
       │
       ├─▶ ArenaEventPublisher.publish(ARENA_MATCH_FINISHED)   [existing, unchanged — still fired once per match, not per participant]
       │     └─▶ ArenaRealtimeListener → per-user snapshot push over socket   [existing, unchanged]
       │
       └─▶ (per participant, always fired regardless of tier change) new `arena.match.completed` domain event (dot-case EventEmitter2 name — distinct from the SCREAMING_SNAKE_CASE `eventType` string used inside its payload for Achievement-catalog matching, e.g. `ARENA_MATCH_COMPLETED`; see Part 11 F0.5-7)
             └─▶ ArenaAchievementListener (@OnEvent, try/catch) → BullMQ ACHIEVEMENT_QUEUE, jobId: `<matchId>:<userId>` (dedup)
                   └─▶ matches vs. AchievementRuleType TOTAL_COUNT/MAX_VALUE/ONE_TIME_EVENT catalog rows (win count, accuracy streaks, etc.)

Season Closed (ArenaSeasonCloseScheduler → BullMQ arena-season-close → ArenaSeasonCloseService, own $transaction)
  │
  ├─ [same tx] ArenaSeasonStanding finalize (per active participant)
  ├─ [same tx] UserArenaSeasonReward grant (match ArenaSeasonReward catalog by final tier)
  ├─ [same tx] soft-reset ArenaProfile.mmr / arenaPoint / seasonWinCount / seasonLoseCount
  ├─ [same tx] flip season COMPLETED, open next season UPCOMING→ACTIVE
  └─ commit
       └─▶ (batched, per user) NotificationEventPublisher.publish(ARENA_SEASON_ENDED)
             └─▶ (if rewards granted) NotificationEventPublisher.publish(ARENA_SEASON_REWARD_GRANTED)
```

**Transaction boundaries** (corrected in Phase F0.5 — was wrongly stated as "exactly two" in the original draft): **1 + N + 1**, not two — (1) `finalizeMatch`'s existing per-match transaction (winner computation + `FINISHED` flip, unchanged, untouched by Phase F), (2) **N separate transactions**, one per participant, each owned by `XpService.awardXpWithSideEffects()` at `Serializable` isolation (see Part 2.1's corrected note — this cannot be collapsed into transaction 1), and (3) `ArenaSeasonCloseService`'s per-season-close transaction (mirrors `LeaderboardWeeklyCloseService`'s shape, own transaction, batched internally per Part 10 F2's risk note). Everything downstream of a `publish()` call (notifications, achievements) is intentionally **outside** all of them — same "publish after commit" discipline the existing `ArenaEventPublisher` already follows, so a slow/failed notification/achievement side effect can never roll back a match result. The N-separate-transactions shape for (2) is why Part 11 F0.5-6 requires a reconciliation job — nothing else in this design makes all N participants' rewards succeed-or-fail together, by design (matches the codebase's existing per-participant reward granularity).

**Idempotency keys** (consolidated from Parts 2/3/5): `arena:xp:<matchId>:<userId>`, `arena:tier:<userId>:<matchId>`, `arena:season-end:<userId>:<seasonId>`, `arena:season-reward:<userId>:<rewardId>`, achievement `eventId` = `<matchId>:<userId>` (or `<seasonId>:<userId>` for season-level achievements) — every one derived deterministically from IDs already flowing through the system, no new UUID-generation-and-store step required anywhere.

---

## PART 7 — Database review

No migrations in this phase. Every row below states current state and rationale.

| Table/field | State | Why |
|---|---|---|
| `ArenaProfile.mmr/arenaPoint/level/winCount/loseCount/winStreak/bestWinStreak/gold/trophy/lastMatchAt` | **Already exists** | Core stats, unchanged. |
| `ArenaProfile.lastDailyBonusAt DateTime?` | **Needs extension** | Daily-bonus dedup (2.1); one nullable column, same pattern as existing `lastMatchAt`. |
| `ArenaProfile.lastFirstWinBonusAt DateTime?` | **Needs extension** | First-win-of-day dedup. |
| `ArenaProfile.placementMatchesRemaining Int @default(5)` | **Needs extension** | Placement K-factor gate (2.3). |
| `ArenaProfile.seasonWinCount/seasonLoseCount Int @default(0)` | **Needs extension** | Season-scoped stats reset at close (2.4/Part 4), lifetime counters stay untouched. |
| `ArenaProfile.lifetimeMatchesPlayed/lifetimeXpEarned Int @default(0)` | **Needs extension** | Cheap profile-page reads (Part 4), denormalized running totals like `gold` already is. |
| `ArenaRatingHistory` (id, userId, matchId, previousMmr, nextMmr, previousTier, nextTier, opponentId, createdAt) | **Needs new model** | Drives tier-change detection (2.3), repeated-opponent anti-abuse (Part 3), and the "rating over time" chart (Part 9). Nothing existing captures per-match rating deltas over time — `ArenaProfile.mmr` is only the current value. |
| `ArenaSeason` (id, name, startsAt, endsAt, status: `ArenaSeasonStatus`, isActive, metadata Json?) | **Needs new model** | Field-for-field mirrors `LeaderboardSeason` deliberately (Executive Summary) — cannot reuse `LeaderboardSeason` because `LeaderboardPeriodType`/`LeaderboardGroup`/`LeaderboardEntry` are hard-wired to XP-period ranking semantics that don't fit rating-threshold tiers. |
| `ArenaSeasonStanding` (id, seasonId, userId, finalMmr, finalTier, finalArenaPoint, finalRank, wins, losses, createdAt) | **Needs new model** | Historical-seasons record (2.4) + live "current standings" query target while a season is active (rank computed on read via `ROW_NUMBER()`-style query, not stored live — only finalized at close). |
| `ArenaSeasonReward` (id, seasonId?, tier: `ArenaTier`, rewardType, rewardValue Json, title, description, isActive) | **Needs new model** | Mirrors `LeaderboardReward` shape, `minRank/maxRank` → `tier` (threshold-based, not rank-based — Executive Summary). |
| `UserArenaSeasonReward` (id, userId, seasonId, rewardId, status: `ArenaSeasonRewardStatus` (AVAILABLE\|CLAIMED\|EXPIRED), grantedAt, claimedAt?, expiresAt) | **Needs new model** | Mirrors `UserLeaderboardReward` — grant-on-close, claim-on-demand split (2.4). `@@unique([userId, seasonId, rewardId])` for reward-replay protection (Part 3). |
| `UserArenaCosmetic` (id, userId, slot: `ArenaCosmeticSlot` (BORDER\|BADGE\|TITLE\|BANNER), cosmeticId, equippedAt) | **Needs new model** | Equipped-cosmetic state (Part 4) — confirmed nothing in the codebase tracks this today (Part 1). `@@unique([userId, slot])`. |
| `ArenaAbuseFlag` (id, userId, opponentId?, kind, evidence Json, status: OPEN\|REVIEWED\|DISMISSED, createdAt) | **Needs new model** | Win-trading manual-review queue (Part 3). Minimal — mirrors the shape of existing admin-review flag tables elsewhere in the codebase, no new pattern invented. |
| `Achievement` rows with `category: ARENA` | **Already exists (enum value unused)** | No schema change — just new catalog *rows* (data, not migration) once F3 ships. |
| `AchievementCategory.ARENA` | **Already exists** | Confirmed unused elsewhere — free to claim. |
| `XpSourceType.ARENA` | **Already exists** | Same — confirmed unused elsewhere. |
| `NotificationEventType` new values (`ARENA_TIER_PROMOTED`, etc., Part 5) | **Needs extension** | Enum addition only, additive, no data migration. |
| `ArenaTier` enum (BRONZE..LEGEND) | **Needs new enum** | Cannot reuse `LeagueTier` — same enum *values* by convention, different *semantics* (threshold vs. rank-bucket), and coupling Arena's tier logic to a leaderboard-owned enum would create a cross-domain change-coupling risk (a leaderboard-league rebalance would force an unrelated Arena tier rebalance). |
| `ArenaSeasonStatus` enum | **Needs new enum** | Same shape as `LeaderboardSeasonStatus` intentionally, own enum for the same reason as `ArenaTier`. |
| `ArenaRoom.contextType String?`, `ArenaRoom.contextId String?` | **Needs extension (new in Phase F0.5, see Part 11 F0.5-8)** | Forward-compat hook only — both nullable, unused until a future phase (Tournament brackets, Guild Wars) needs to tag "this room belongs to a larger construct." Verified neither `ArenaRoom` nor `ArenaMatch` has any such field or a general-purpose `metadata Json?` today (`ArenaMatch.result Json?` is narrowly typed for server-computed win/loss reasoning, not general extensibility). Cheap and risk-free to add in F1's migration; expensive to retrofit later once rows without it exist at scale. |
| `ArenaRewardApplicationCheckpoint` (or equivalent — id, matchId, userId, appliedAt) — **or**, simpler: rely on `ArenaRewardLog`/`XpTransaction` existence as the checkpoint | **Needs a decision, not necessarily a new table (new in Phase F0.5, see Part 11 F0.5-6)** | Supports the reconciliation job required by the corrected per-participant reward-application design (Part 2.1/Part 6): a scheduled job must find `FINISHED` matches with an incomplete participant set in `ArenaRewardLog`/`XpTransaction` and reprocess just the missing ones. Recommend **no new table** — `ArenaRewardLog` (`@@unique([matchId,userId])`, already exists) is sufficient as the checkpoint: `SELECT participant FROM ArenaParticipant WHERE roomId=? AND userId NOT IN (SELECT userId FROM ArenaRewardLog WHERE matchId=?)` finds the gap directly. |

No existing Arena, XP, Achievement, or Notification table needs a breaking change. All extensions are additive nullable columns or new tables — consistent with every prior phase's migration-safety rule (audit before migrate, no `db push`, no edits to applied migrations).

---

## PART 8 — API review

### New endpoints (`ArenaController`, `arena/` prefix — consistent with existing routes)
| Method | Path | Purpose |
|---|---|---|
| GET | `/arena/rating/history` | Own `ArenaRatingHistory`, paginated — powers Part 9's rating chart. |
| GET | `/arena/season/current` | Current `ArenaSeason` + own live standing (tier, mmr, arenaPoint, rank). |
| GET | `/arena/season/:seasonId/standings` | Closed-season leaderboard (`ArenaSeasonStanding`), paginated. |
| GET | `/arena/season/history` | Own past `ArenaSeasonStanding` rows — "Season history" screen (Part 9). |
| GET | `/arena/rewards` | Own `UserArenaSeasonReward` rows, filterable by status. |
| POST | `/arena/rewards/:id/claim` | Claim a season reward — mirrors `LeaderboardRewardService.claim()` transactionally. |
| GET | `/arena/cosmetics` | Own unlocked cosmetics (from `UserAchievement` + `UserArenaSeasonReward`) + current `UserArenaCosmetic` equip state. |
| POST | `/arena/cosmetics/equip` | `{ slot, cosmeticId }` → upsert `UserArenaCosmetic`. |
| GET | `/arena/profile/:userId` (or extend existing `GET /arena/me`) | Public profile view: lifetime + season stats, equipped cosmetics, current tier — powers Part 9's Arena Profile screen for viewing *other* players, not just self. |

### Existing endpoints to extend
| Endpoint | Change |
|---|---|
| `GET /arena/me` | Response gains `tier`, `season` (current standing summary), `placementMatchesRemaining` — additive fields only, no breaking change to existing consumers. |
| `POST /arena/rooms/:roomId/finish` → `ArenaService.finishMatch` | No signature/route change — internal `finalizeMatch` gains the Part 6 side effects. Response body gains an optional `rating: { previousMmr, nextMmr, previousTier, nextTier, promoted, demoted }` block when applicable — additive. |

### Socket events (`ArenaGateway`, existing `/arena` namespace — no new namespace)
| Event | Payload | When |
|---|---|---|
| `arena:rating:changed` | `{ previousTier, nextTier, mmr }` | Pushed to the affected user's socket room alongside the existing match-finished snapshot, for an in-app promotion/demotion animation (Part 9) without waiting on the notification pipeline's realtime push (which is also fine but is fire-and-forget/queued; the socket push is the low-latency "you just got promoted, show the animation now" path). |
| `arena:season:ended` | `{ seasonId, finalTier, finalRank }` | Pushed once, best-effort, at season close if the user has an active connection — the `Notification` row remains the source of truth for anyone offline. |

### DTO changes
- New: `ClaimArenaRewardDto` (empty body, id from path — mirrors `FinishArenaMatchDto`'s "no trusted client input" convention).
- New: `EquipArenaCosmeticDto { slot: ArenaCosmeticSlot; cosmeticId: string }`.
- No changes to any Gate D/E/Phase-BC-Reconciliation DTO (`CreateArenaRoomDto`, `QueueArenaDto`, `SubmitArenaAnswerDto`, etc.) — Phase F is additive at the API surface, matching "integrate, don't replace."

---

## PART 9 — Frontend review (screens only, no implementation)

All screens live under `english-web-build/src/Components/Arena/` alongside the existing `ArenaRoomPage.tsx`, following its established patterns (REST + `useArenaRealtime` hook for live pushes, no new socket client).

| Screen | Purpose | Key states |
|---|---|---|
| **Arena Result** | Post-match summary — replaces/extends the current finish flow. | Score breakdown, XP breakdown (base/accuracy/combo/streak/daily/first-win, matching Part 2.1's components 1:1 so players can see exactly why they got what they got), gold/trophy delta. |
| **Rank animation** | Triggered by `arena:rating:changed` socket event or `rating` block in the finish response. | Old tier badge → (if changed) animated transition to new tier badge; no-op render if tier unchanged (most matches). |
| **ELO animation** | Numeric mmr counter animating from previous → next value, combined with the rank animation above (same trigger, same data). | |
| **Reward popup** | Triggered by a new `UserArenaSeasonReward` becoming `AVAILABLE` (poll on season screen open, or `arena:season:ended` push) or an achievement unlock (existing achievement-unlock UI pattern, reused). | Claim button → `POST /arena/rewards/:id/claim`. |
| **Season progress** | Current season's `arenaPoint`, tier, days remaining (`endsAt`), own live rank. | Uses `GET /arena/season/current`. |
| **Placement progress** | `placementMatchesRemaining` countdown (5 → 0), no visible tier until placement completes ("Placement" badge shown instead, per 2.3). | Uses the extended `GET /arena/me`. |
| **Arena Profile** | Own or another player's: current tier, lifetime stats, season stats, equipped cosmetics, cosmetic-equip UI (self only). | Uses `GET /arena/profile/:userId` + `GET /arena/cosmetics` (self) + `POST /arena/cosmetics/equip` (self). |
| **History** | Match history (already partially exists via `ArenaRoom.matches`) extended with a rating-over-time chart. | Uses `GET /arena/rating/history`. |
| **Statistics** | Win rate, accuracy trends, best win streak, favorite skill/topic — aggregated client-side from existing per-match data plus the new `lifetimeMatchesPlayed`/`lifetimeXpEarned` fields. | |

`AppSidebar.tsx` (currently open in the IDE) is the natural place for a Phase F nav entry to the Arena Profile/Season screens, following whatever pattern the existing Arena lobby link already uses there — no redesign of the sidebar itself implied by this document.

---

## PART 10 — Implementation plan

### F1 — Rating tiers, placement, and XP integration (foundation, no seasons yet)
- **Objectives**: Arena XP flows through `XpService`; tiers exist and are computed from `mmr`; placement K-factor works; rating history is recorded.
- **Files**: `arena/progression/arena-rating.registry.ts` (new), `arena/progression/arena-progression.service.ts` (new — houses `computeMatchXp`, `resolveArenaTier`, `getArenaKFactor`, and the corrected **per-participant** reward-application loop, see Part 2.1/Part 11 F0.5-1), `arena/progression/arena-reward-reconciliation.scheduler.ts` (new — Part 11 F0.5-6's reconciliation job), `arena.service.ts` (extend `finalizeMatch` to invoke the loop *after* its existing transaction commits, not inside it), `arena.module.ts` (import `LeaderboardModule`/`XpService`), `arena-mode.types.ts`/`arena-mode.registry.ts` (add `grantsXp: boolean`, Part 11 F0.5-5), schema additions from Part 7 (profile columns, `ArenaRatingHistory`, `ArenaRoom.contextType/contextId`).
- **Database**: `ArenaProfile.lastDailyBonusAt/lastFirstWinBonusAt/placementMatchesRemaining/seasonWinCount/seasonLoseCount/lifetimeMatchesPlayed/lifetimeXpEarned`, `ArenaRoom.contextType/contextId`, new `ArenaRatingHistory` table, new `ArenaTier` enum. One migration, additive only.
- **Backend**: `ArenaProgressionService`, `finalizeMatch` gains a post-commit per-participant loop calling `XpService.awardXpWithSideEffects()` (each participant's own transaction — **not** a shared transaction with `finalizeMatch` or with each other, corrected per Part 11 F0.5-1); P2034 retry is handled by `XpService` itself as of Phase F0.6 (no Arena-side retry code needed); a reconciliation scheduler (`@Cron`, same poll idiom as `LeaderboardWeeklyCloseScheduler`) that finds `FINISHED` matches missing an `ArenaRewardLog` row for any participant and reprocesses just those; no new endpoints yet except `GET /arena/rating/history`; extend `GET /arena/me` response.
- **Frontend**: Arena Result XP breakdown, tier/rating-delta display, progression status indicator (see Part 12 — F1.1 acceptance-gate reconciliation: implemented minimally, without animation). ~~Rank/ELO animation, Placement progress screen~~ — corrected in Part 12 (F1.1): animation is deferred as UI polish (no target phase), and the placement screen moves to **F2** alongside the placement K-factor mechanic itself (already deferred there during implementation, see `arena-rating-engine.ts`).
- **Tests**: unit tests for `resolveArenaTier`/`getArenaKFactor`/`computeMatchXp` (pure functions, FakePrisma-free — same style as `arena-question-hash.util.spec.ts`); real-Postgres integration test proving `finalizeMatch` + the reward loop write exactly one `XpTransaction` and one `ArenaRewardLog` row **per participant** per match (idempotency key check), that a duplicate trigger CAS-loses/dedups without double-writing either, and — new, per Part 11 F0.5-6 — a test that kills the reward loop mid-way through a multi-participant match (simulate by throwing after participant 1) and asserts the reconciliation job completes participant 2's reward exactly once on its next run.
- **Verification**: `prisma validate`, `migrate status`, `jest arena`, `jest leaderboard` (regression — confirm `XpService`'s existing weekly-league side effect still fires correctly for `sourceType: ARENA`), backend + frontend build.
- **Risk**: Arena → Leaderboard module import is a new dependency edge; verified no circular import today (`leaderboard/**` has zero references to `ArenaModule`). The per-participant transaction shape (Part 11 F0.5-1) is a bigger risk than originally scoped — budget real design/review time for the reconciliation job, it is not optional cleanup.
- **Rollback**: Feature-flag the `XpService.awardXpWithSideEffects` call behind an env var (`ARENA_XP_ENABLED`) for the first release so it can be disabled without a redeploy if the weekly-league side effect misbehaves in production; the schema additions are backward-compatible (nullable/defaulted) and safe to leave even if rolled back.

### F2 — Seasons, standings, and rewards
- **Objectives**: Seasons open/close automatically; soft reset works; season rewards grant and claim correctly.
- **Files**: `arena/season/arena-season.module.ts`, `.service.ts`, `.scheduler.ts`, `.controller.ts` (or extend `ArenaController`) — directory structure mirrors `leaderboard/background-job/**`.
- **Database**: `ArenaSeason`, `ArenaSeasonStanding`, `ArenaSeasonReward`, `UserArenaSeasonReward`, `ArenaSeasonStatus` enum, `ArenaSeasonRewardStatus` enum. One migration.
- **Backend**: `ArenaSeasonCloseScheduler` (`@Cron`), `ArenaSeasonCloseService.closeExpiredSeason()`, `POST /arena/rewards/:id/claim`, `GET /arena/season/current`, `GET /arena/season/:seasonId/standings`, `GET /arena/season/history`, `GET /arena/rewards`.
- **Frontend**: Season progress screen, Reward popup, History screen's "Season history" tab.
- **Tests**: real-Postgres test of the full close cycle (mirrors `LeaderboardWeeklyCloseService` test conventions if any exist, otherwise this session's Phase C.1 style) — season expiry triggers close exactly once under concurrent scheduler ticks (CAS/`jobId` dedup proof), soft-reset formula applied correctly, rewards granted matching tier, `UserArenaSeasonReward` claim is idempotent (double-claim rejected).
- **Verification**: same suite as F1 plus a dedicated `jest arena/season` run.
- **Risk**: season-close is the highest-blast-radius job in this plan (touches every `ArenaProfile` row) — must run in batched transactions (chunked by user, not one giant transaction) to avoid long-lock issues at scale, following whatever batching convention `LeaderboardWeeklyCloseService` already uses for its own per-user loop (confirm and reuse before F2 starts, do not invent a new batching strategy from scratch).
- **Rollback**: `ArenaSeasonCloseScheduler`'s `@Cron` can be disabled via the same env-var-gate pattern as F1; a season stuck in `CALCULATING` from a failed close is recoverable via the same `recoverStuckCalculatingSeasons`-style admin action `LeaderboardBootstrapService` already demonstrates — build the Arena equivalent in F2, not as a later patch.

### F3 — Badges, titles, achievements, notifications
- **Objectives**: Arena achievements unlock via real gameplay events; notifications fire for promotion/demotion/season/reward/unlock; cosmetics are equippable.
- **Files**: `arena/progression/arena-achievement-listener.service.ts` (new, mirrors `AchievementsListener`), `arena/progression/arena-domain-event.ts` (new event names for the achievement/notification bus — separate from the existing realtime `arena-domain-event.ts` used by `ArenaEventPublisher`, to keep the realtime-snapshot event family and the cross-module-progression event family independently evolvable), `UserArenaCosmetic` model + `arena/progression/arena-cosmetic.service.ts`, `notifications/templates/notification-template.registry.ts` (extend), `notifications/contracts/notification-event-type.ts` (extend enum).
- **Database**: `UserArenaCosmetic`, `ArenaCosmeticSlot` enum. New `Achievement` catalog rows (data seed, not schema).
- **Backend**: new domain event emission at match-finish and tier-change (Part 6), `GET/POST /arena/cosmetics*`.
- **Frontend**: Arena Profile screen (equip UI), badge/title/border unlock toast (reuse existing achievement-unlock UI component).
- **Tests**: real-Postgres test proving a scripted match sequence unlocks the intended achievement exactly once (`AchievementProcessedEvent` dedup proof under a duplicate event emission), notification dedup proof (`Notification` unique constraint), cosmetic equip is last-write-wins per slot (concurrent equip requests to different slots don't clobber each other — real-Postgres concurrency test, same style as Gate E's power-up race tests).
- **Verification**: same suite plus `jest achievements`, `jest notifications` regression runs.
- **Risk**: lowest of the four phases — every mechanism reused here (BullMQ achievement queue, notification publisher) is already production-proven for other domains; the only genuinely new code is the listener glue and the cosmetic-equip table.
- **Rollback**: achievement/notification calls are already fire-and-forget outside the match transaction (Part 6) — disabling the new `ArenaAchievementListener`'s `@OnEvent` subscription (comment out the decorator or gate via env var) stops all F3 side effects with zero risk to match results, since nothing in F1/F2's core match/season flow depends on F3 completing.

### F4 — Anti-abuse
- **Objectives**: Friend/repeated-opponent dampening, queue-dodge cooldown, win-trade flagging, AFK bonus suppression — all from Part 3.
- **Files**: `arena/progression/arena-abuse.service.ts` (new), `arena-abuse-scan.processor.ts` (new BullMQ processor, off-peak scheduled scan), `ArenaAbuseFlag` model, admin review endpoint(s) mirroring `leaderboard-admin.controller.ts`'s existing review-action shape.
- **Database**: `ArenaAbuseFlag` table.
- **Backend**: pre-match dampening check (called from the same matchmaking/room-creation path, read-only until `finalizeMatch`'s reward computation, where the dampening multiplier is actually applied), queue-dodge Redis counter, off-peak win-trade scan job, admin review endpoints.
- **Frontend**: none required for F4 itself (admin review can use the existing admin-dashboard shell) — flagged as a possible thin admin-panel screen if product wants one, not required for F4 to ship.
- **Tests**: unit tests for the dampening-multiplier calculation (pure function), real-Postgres test that a scripted repeated-pairing sequence produces a decreasing reward curve, real-Redis test that queue-dodge cooldown actually blocks re-entry after threshold, and an AFK match producing zero bonus XP while still recording the (unrewarded) achievement-relevant event correctly per Part 3's "surrender abuse" gate.
- **Verification**: same suite plus targeted `jest arena/progression` (or wherever F1–F4 tests land) full run, confirming F1–F3 are unaffected (regression).
- **Risk**: false-positive risk on win-trade flagging is the main product risk (Part 3 already designs this as flag-not-punish for exactly this reason) — no auto-punishment ships in F4, only visibility for human review.
- **Rollback**: every F4 mechanism is a multiplier/dampener applied at reward-computation time or a pre-match soft-block — each individually feature-flaggable (`ARENA_ANTIABUSE_DAMPENING_ENABLED`, `ARENA_QUEUE_DODGE_COOLDOWN_ENABLED`) without touching F1–F3.

---

## PART 11 — Phase F0.5 design validation (stress test)

Performed before any F1 implementation, against the design above, by re-reading the actual source of the systems being integrated with (not re-deriving from memory). Nine findings; four required a correction to this document (already applied inline above, cross-referenced as "F0.5-N" at each affected passage); one confirms a mandatory-not-optional decision; four are confirmed-safe with no change needed.

| # | Area | Severity | Finding | Resolution |
|---|---|---|---|---|
| F0.5-1 | XP integration | **Critical** | `XpService.awardXpWithSideEffects()` opens its own `Serializable` transaction and hands the caller a `tx` — it cannot be called "from inside" `finalizeMatch()`'s existing transaction as the original draft stated (verified by reading `xp.service.ts:162-249`). | Corrected: reward/XP application moved to a post-commit, per-participant loop (Parts 2.1, 6, 10-F1). |
| F0.5-2 | XP integration | High | Neither `awardXp` nor `awardXpWithSideEffects` retries Prisma's `P2034` (serialization failure) under `Serializable` isolation — verified zero `P2034`/retry handling anywhere in `leaderboard/**`. Pre-existing gap, but Arena's per-match call volume exercises it far more than existing callers (achievements, missions) do. | **Superseded by Phase F0.6** (`backend/src/modules/leaderboard/xp-transaction-retry.util.ts`): the retry now lives *inside* `XpService` itself (`withSerializableRetry`, configurable via `XP_SERIALIZABLE_RETRY_MAX_ATTEMPTS`/`XP_SERIALIZABLE_RETRY_BASE_DELAY_MS`), applied to both `awardXp` and `awardXpWithSideEffects`. Arena's per-participant loop (Parts 2.1, 6, 10-F1) **no longer needs its own P2034 handling** — it simply calls `XpService.awardXpWithSideEffects()` as originally designed, and gets retry for free, identically to every other existing XP caller. See `docs/arena-progression-sequence.md` (§5 Retry Flow) for the authoritative description. |
| F0.5-3 | Event architecture | Medium | `ArenaEventPublisher.publish()` uses plain synchronous `eventEmitter.emit()` — fire-and-forget, no await, no catch. Safe today (only listener is a best-effort realtime push) but Phase F's new listeners (achievement/notification triggers) are not best-effort; an uncaught rejection in an `{async:true}` listener becomes an unhandled promise rejection with zero product visibility. Verified the fix already exists as an established pattern: `AchievementsListener.handleLearningActivity()` wraps its queue-add in try/catch + `Logger.error()`. | Made explicit and mandatory for every new Arena progression listener (closing guardrails section, Part 6 diagram annotations). |
| F0.5-4 | Leaderboard design | High | Verified `XpService.awardXp`/`awardXpWithSideEffects` internally query `tx.leaderboardSeason.findFirst({ where: { isActive:true, status:ACTIVE, startsAt:{lte:now}, endsAt:{gt:now} } })` **without filtering by `periodType`** (`xp.service.ts:106`, `251`). If Arena seasons were rows in the same `LeaderboardSeason` table, this query could non-deterministically pick up an Arena season instead of the intended weekly-XP season, corrupting the periodXp/Redis-zset side effect for **every** XP award app-wide, not just Arena's. This is not a style preference — it's a correctness bug waiting to happen the first time an Arena season and a weekly XP season are simultaneously active (i.e., always, since XP seasons never stop rotating). | No document change needed — this **confirms and strengthens** the original recommendation (separate `ArenaSeason` table) from "preferred" to "mandatory." See the full comparison below. |
| F0.5-5 | Rating system / future expansion | Medium | `ARENA_MODE_CAPABILITIES`'s capability shape only has `affectsElo`, not an independent `grantsXp`. Custom/casual modes (`FRIEND_CHALLENGE`) plausibly should grant XP without affecting ELO — the two are genuinely separate product decisions, and leaving this implicit means F1 would have to guess. | Corrected: added `grantsXp: boolean` as a required new registry field (Part 2.3, Part 10-F1 files). |
| F0.5-6 | Reward engine | Medium | Direct consequence of F0.5-1's correction: reward application is no longer atomic across all of a match's participants (only per-participant). A crash between participants in a 4–6 player match leaves rewards partially applied, with nothing to re-trigger the missing ones. | Corrected: added a reconciliation scheduler requirement, and a lightweight "no new table, use `ArenaRewardLog` as the checkpoint" resolution (Parts 7, 10-F1). |
| F0.5-7 | Event architecture | Low | The original draft's event-flow diagram used `arena.match.completed` (dot-case) in a way that could be read as also being the `Achievement.eventType` catalog-matching string. These are two different naming conventions for two different purposes in the existing codebase (EventEmitter2 names are dot-case, e.g. `learning.activity.completed`; `Achievement.eventType`/`AchievementActivityEvent.eventType` values are `SCREAMING_SNAKE_CASE`, e.g. `VOCABULARY_COMPLETED`). Verified no existing `ARENA_*` eventType string exists today (no collision risk), but the distinction needed to be explicit to prevent an implementer from conflating them. | Corrected: Part 6 diagram now annotates both conventions explicitly at the point of use. |
| F0.5-8 | Future expansion (Guild Wars, Tournament) | Low | Verified neither `ArenaRoom` nor `ArenaMatch` has any nullable "belongs to a larger construct" field (`ArenaMatch.result Json?` is narrowly typed for win/loss reasoning, not general extensibility). Guild Wars/Tournament-bracket features would need this eventually and it is far cheaper to add two nullable, unused columns now than retrofit them onto a large existing table later. | Corrected: added `ArenaRoom.contextType String?`/`contextId String?` to Part 7's table and F1's migration, unused until a future phase needs them. |
| F0.5-9 | Rating system rollback safety | Low | `XpService.reverseTransaction()` exists for XP but nothing analogous exists for MMR/tier if a match is later invalidated (Part 3 win-trading review). Full retroactive rating recalculation (replaying every subsequent match) is a materially harder problem than reversing one transaction and was silently unaddressed in the original draft. | Corrected: documented as an explicit, conscious scope limitation (Part 2.3) rather than an unstated gap — direct-delta reversal only, no downstream recompute, matching how most production ELO systems handle this same tradeoff. |

### Parallel `ArenaSeason` vs. extending `LeaderboardSeason` — the explicit comparison requested in Review Area 4

| | Extend `LeaderboardSeason` (share the table) | Parallel `ArenaSeason` (this design) |
|---|---|---|
| Ranking basis | `LeaderboardEntry.periodXp`, hard-FK'd to `UserXpProfile` — XP earned in a period | `ArenaProfile.mmr`/`arenaPoint` — absolute skill rating |
| Promotion/demotion basis | `resolveZone()` — rank-position within a fixed-size group (Duolingo-style: "top N of 30 promote") | `resolveArenaTier(mmr)` — absolute threshold (ELO-style: "2400+ MMR is Legend, always") |
| Correctness risk if shared | **Confirmed present** (F0.5-4): `XpService`'s own internal "find the active season" queries don't filter by `periodType`, so a shared table risks corrupting the weekly-XP-league side effect for the whole app, not just Arena | None — Arena's season lookups only ever query Arena's own table |
| Coupling | A leaderboard-league rebalance (e.g. changing `LEAGUE_RULES` promotion counts) or a `LeaderboardScopeType`/`LeaderboardPeriodType` change made for XP-league reasons could unintentionally affect Arena, and vice versa | Zero — the two systems can evolve independently; Arena's season length, reward catalog, and tier thresholds are tunable without any risk to the XP weekly league |
| Engineering cost | Lower schema footprint, but requires bolting rating-threshold semantics onto a table/enum family designed for rank-bucket semantics (retrofitting `minRank/maxRank` to mean rating bounds, teaching `resolveZone` two different promotion algorithms via a mode flag, etc.) | Slightly more schema (4 new tables/enums), but every one of them is a straightforward, low-risk copy of an already-proven shape (`LeaderboardSeason`→`ArenaSeason`, `LeaderboardReward`→`ArenaSeasonReward`, etc.) |
| Long-term (multi-year) risk | High — two conceptually different ranking systems sharing one table is exactly the kind of decision that looks fine at launch and becomes unmaintainable as both systems grow features independently (this codebase already shows the pattern: `LeaderboardScopeType`'s FRIENDS/CLUB/SKILL values are "virtual" read-path-only tags precisely because trying to give every scope real `LeaderboardGroup` rows didn't fit non-XP scopes cleanly — Arena would hit the same wall) | Low — each system owns its own lifecycle, its own migration history, its own on-call blast radius |

**Recommendation (unchanged, now with direct evidence, not just architectural preference): parallel `ArenaSeason`/`ArenaRatingHistory`/`ArenaSeasonReward`/`UserArenaSeasonReward`, mirroring `LeaderboardSeason`'s *lifecycle mechanics* (Cron+BullMQ closer, DB-row-expiry-decides, grant-on-close/claim-on-demand rewards) without sharing its *table*.** This was the original design's position; F0.5-4 turns it from "the better long-term design" into "the only design that doesn't risk corrupting an unrelated, already-shipped feature."

---

## Summary of what Phase F must NOT do (guardrails carried forward from this session's established constraints)

- Do not modify `LeaderboardSeason`/`LeaderboardGroup`/`LeaderboardEntry`/`resolveZone()` — Arena gets parallel tables with matching *lifecycle mechanics*, not a shared schema.
- Do not introduce a second XP ledger — all Arena XP is `XpTransaction` rows with `sourceType: ARENA`, via the existing `XpService`.
- Do not introduce a second achievement engine — all badges/titles/borders are `Achievement` catalog rows, category `ARENA`.
- Do not introduce a second notification delivery mechanism — all alerts go through `NotificationEventPublisher.publish()`.
- Do not weaken or touch Gate D-Recovery/Gate E/Phase BC-Reconciliation's existing state machine, CAS logic, or capability registries — `finalizeMatch`'s existing transaction (winner computation, `FINISHED` flip) is **not modified**; Phase F's reward/XP/rating logic runs in a new step *after* it commits (corrected in Phase F0.5 — see Part 11 F0.5-1).
- Every new write path gets an idempotency key derived from IDs already in scope — no bare `create()` without a uniqueness guard, matching every prior phase's proven pattern.
- Do not call `XpService.awardXpWithSideEffects()` (or `awardXp()`) from inside another `$transaction()` callback — it manages its own `Serializable` transaction and cannot be nested (Part 11 F0.5-1). P2034 retry is handled internally by `XpService` as of Phase F0.6 — do not add Arena-side retry logic for it.
- Every new listener subscribing to an Arena progression event must wrap its body in `runCriticalEventHandler()` (`backend/src/common/events/critical-event-handler.util.ts`, added in Phase F0.6) rather than a hand-rolled try/catch — `ArenaEventPublisher.publish()` is fire-and-forget and will not surface a listener's thrown/rejected error anywhere else (Part 11 F0.5-3). See `docs/arena-progression-sequence.md` for the full domain-event standard.

---

## PART 12 — Phase F1.1 acceptance gate: frontend scope reconciliation

Performed after F1's backend was implemented and integration-tested, in response to F1.1's acceptance criteria requiring the Part 9 frontend-screen scope to be explicitly reconciled against what F1 actually needs, rather than left ambiguous between "F1" and "later."

**Finding**: Part 10's F1 line ("Frontend: Arena Result XP breakdown, Rank/ELO animation (tier data now available), Placement progress screen") was written *before* F0.6/implementation discovered that placement (variable K-factor for a player's first N ranked matches) does not have a minimal, low-risk implementation path within F1's own scope — `arena-rating-engine.ts`'s `getArenaKFactor()` ships F1 with a flat K-factor only, and its own docblock says so explicitly ("placement matches (variable K-factor) are explicitly deferred to F2, not partially implemented here"). There is therefore no `ArenaProfile.placementMatchesRemaining` field, no placement state anywhere in the F1 schema, and nothing for a "Placement progress" screen to render. The original Part 10 F1 line is corrected here rather than silently ignored.

| Feature | Original phase (Part 9/10) | Current implementation | Required for F1 acceptance | Deferred phase | Reason |
|---|---|---|---|---|---|
| Result XP breakdown (base/win-loss/accuracy/combo/streak/daily/first-win, per Part 2.1) | F1 | **Implemented** — `ArenaProgressionOutcome.rewardBreakdown` returned from both `POST /rooms/:roomId/finish` and (new, F1.1) `GET /rooms/:roomId`'s `progression` field; rendered as a minimal (non-animated) summary in `ArenaRoomPage.tsx`'s existing result modal. | Yes | — | Server-derived, already computed by `ArenaProgressionDispatcherService`/`calculateArenaMatchReward` — no new backend logic needed, only wiring an existing read into an existing read endpoint and an existing modal. |
| Tier/rank display (current tier, promoted/demoted) | F1 (implied by "tier data now available") | **Implemented** — `progression.previousTier/nextTier/promoted/demoted` rendered minimally in the same modal; `ArenaProfile.tier` already returned unconditionally by `GET /arena/me` (additive field, Part 8). | Yes | — | Same reasoning — purely a read of already-computed, already-persisted data. |
| Rating-delta display (mmr before/after/delta) | F1 | **Implemented** — `progression.previousMmr/nextMmr/mmrDelta` rendered minimally in the same modal. | Yes | — | Same reasoning. |
| Progression pending/reconciling status indicator | Not explicitly named in Part 9, but implied by Part 8's `ArenaProgressionOutcome.status` shape existing at all | **Implemented** — minimal "still processing" message shown when `progression.status` is `PENDING`/`PROCESSING`/`FAILED` (rare in practice since `finishMatch` awaits `processMatch` synchronously; this path is only observably reachable via the reconciliation-gap window proven in F1.1's integration tests). | Yes (minimal only) | — | `ArenaProgressionOutcome.status` is part of F1's own already-approved API shape (Part 8) — a client that silently shows nothing for a non-`COMPLETED` status would be misleading, not merely incomplete. |
| Rank/ELO **animation** (numeric counter, tier-badge transition) | F1 (Part 9: "Rank animation" / "ELO animation" rows) | **Not implemented** — the modal shows the same before/after/delta numbers as static text, no animation/transition. | No | F1.1-deferred, no target phase set — pure UI polish | Part 9 itself describes animation as a presentation layer on top of the same data this document's F1 acceptance already requires to exist and be displayed; the underlying numbers are the part that is "required," the animation is not — building it is unrelated to proving F1's progression system correct and would be new frontend-only scope creep under F1.1's "do not add unrelated features" rule. |
| Placement progress screen (`placementMatchesRemaining` countdown) | F1 (Part 10's F1 line, F0.5-era draft) | **Not implemented, and not implementable** — no backing field exists; F0.6/implementation deferred placement itself to F2 (see `arena-rating-engine.ts`). | No | **F2** (moved from F1, corrected here) | The original Part 10 F1 line was written before the placement K-factor mechanic was itself deferred to F2 during implementation. UI cannot render a feature whose data model doesn't exist — building placement UI now would require inventing placement state outside of F2's design, which F1.1 explicitly forbids ("do not implement F2"). |
| Season progress screen (current season/arenaPoint/rank/days remaining) | F2 (Part 10 F2 line: `GET /arena/season/current` etc.) | Not implemented | No | F2 (unchanged) | Never claimed for F1 — `ArenaSeason` exists in F1 only as the season-scoping foundation `ArenaRatingHistory`/`ArenaProgressionRecord` attach to; season *standings/rewards/UI* are explicitly F2 (Part 10). |
| Reward popup, cosmetics equip UI | F3 (Part 10 F3 line) | Not implemented | No | F3 (unchanged) | Never claimed for F1. |

**Conclusion**: every piece of *data display* Part 9 named for F1 (XP breakdown, tier, rating delta, progression status) is implemented, minimally, reusing 100% existing backend computation. The two items that are **not** implemented are (a) animation, which is presentation polish separable from the data it animates and was never load-bearing for F1's actual acceptance criteria, and (b) the placement screen, whose own backing feature was already, correctly, deferred to F2 before this reconciliation pass — Part 10's F1 line is hereby corrected to remove "Placement progress screen" from F1 and move it to F2 alongside the placement K-factor mechanic it depends on.
