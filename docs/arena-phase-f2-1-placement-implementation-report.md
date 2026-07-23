# Arena Phase F2.1 — Placement Engine Implementation Report

**Status:** Implemented and verified. Scope: exactly F2.1 (Placement Engine) per `docs/arena-phase-f2-design.md`. No F2.2 (peakMmr/peakTier/provisional K-band), F2.3 (demotion buffer), F2.4 (decay), or F2.5 (remaining screens) work included. This report supersedes an earlier in-progress draft of the same file, updated with fully re-verified results after the session's interruptions.

---

## 1. Audit result (Step 0, pre-implementation)

Full audit performed before any file was edited. Summary:

- **Reused unmodified**: `calculateEloDelta`/`expectedScore`/`applyEloDelta`/`MIN_MMR` floor, the `ArenaMode` capability registry (`affectsElo` as the sole "is this rated" signal), `ArenaProgressionRecord`'s CAS/lease claim mechanism, `ArenaReconciliationService.reconcile()` (reuses the same `applyMatchRewards` entry point automatically), `ArenaPresenceService`/`ArenaGateway.scheduleDisconnectGrace`/`getArenaDisconnectGraceMs`/`ArenaService.forfeitParticipant` (Gate D-Recovery, zero changes needed), the `envInt()` per-file config idiom, the notification pipeline (`NotificationEventPublisher`, `runCriticalEventHandler`, `ArenaNotificationListener`), and the real-Postgres integration test harness (`buildArenaTestApp`, `cleanupArenaTestData`).
- **Required modification**: `getArenaKFactor()` (flat → placement-aware), `ArenaProgressionDispatcherService.computeAndApply`/`finalizeCompletedProgression` (counter decrement, completion detection, event firing), `ArenaService.getMyProfile()`/`finishMatch()` (additive placement fields), `enterQueue()` (matchmaking soft-preference).
- **Missing and required**: the schema column, the two new env-var getters, the pure transition/status functions, the new domain event + notification type/template, the new test file.
- **Explicitly deferred**: provisional K=60 band, `peakMmr`/`peakTier`, demotion buffer, decay, season close, full rating/tier-history UI, F4 anti-abuse, any new `ArenaMode`/queue/service — confirmed none touched.
- **Risk flagged and confirmed real**: no `.env.example` file exists anywhere in this repo (every Arena env var is self-documented via its `envInt()` fallback only) — the two new vars follow that convention. Real DB evidence gathered for the backfill decision (§5) before any schema work began.

## 2. Final scope

Implemented: DB column + migration; `ARENA_PLACEMENT_MATCHES`/`ARENA_K_PLACEMENT` config (keeping `ARENA_RATING_K_FACTOR` unchanged); `isInPlacement`/`placementMatchesTotal`/`placementMatchesCompleted` on `GET /arena/me`; placement K-factor selection; per-participant counter decrement inside the existing progression write path; zero-effort-loss exemption; disconnect/AFK verification (zero new production code, extensive new tests); placement-completion transition detection + `placementCompleted`/`placementMatchesRemaining` on the progression output; `arena.placement.completed` event + `ARENA_PLACEMENT_COMPLETED` notification; matchmaking soft preference (implemented, not just documented — §11); minimal frontend UX. Not implemented: everything the original prompt named as out-of-scope for F2.1.

## 3. Files changed

**Modified**: `backend/prisma/schema.prisma`, `backend/src/modules/arena/arena-fake-prisma.ts`, `arena.controller.ts`, `arena.service.ts`, `progression/arena-notification.listener.ts`, `progression/arena-progression-dispatcher.service.ts`, `progression/arena-rating-engine.ts`, `realtime/arena-domain-event.ts`, `realtime/arena-realtime-test-utils.ts`, `notifications/contracts/notification-event-type.ts`, `notifications/preferences/notification-preference.registry.ts`, `notifications/templates/notification-template.registry.ts`, `english-web-build/.../ArenaPage.tsx`, `ArenaRoomPage.tsx`, `docs/arena-phase-f-design.md`.

**Also modified, as part of this same F2.1 continuation** (confirmed by content and purpose, though made in an earlier turn of this task than the one authoring this final report): `backend/src/modules/leaderboard/leaderboard.module.ts` — the `LEADERBOARD_REDIS` provider changed from a bare `useFactory: () => new Redis({...})` to a `LeaderboardRedisClient` class implementing `OnModuleDestroy`/`.quit()`. This fixes a real open-Redis-handle leak that was causing Arena integration tests (which transitively import `LeaderboardModule`) to hang after their assertions passed. Verified: the full regression suite (§17) passes cleanly with this change in place, and no test relies on the old bare-factory behavior.

**Added**: `backend/prisma/migrations/20260722143310_add_arena_placement_engine/`, `progression/arena-placement.integration.spec.ts` (14 tests), `progression/arena-rating-engine.spec.ts` (extended to 38 tests total), `docs/arena-phase-f1-migration-reconciliation.md` and `docs/migration-backups/2026-07-22_orphan-ledger-rows-backup.sql` (F1.1-phase carryovers, not new this phase but present in the working tree).

**Observed in the working tree but not authored or touched by any F2.1 work**: `studyarena/**` (deleted) and `english-web-build/public/cat-home.png` (added) — both pre-date or are unrelated to this phase's edits; left exactly as found, not reverted, not investigated further (out of scope).

## 4. Migration SQL

```sql
-- AlterTable
ALTER TABLE "ArenaProfile" ADD COLUMN     "placementMatchesRemaining" INTEGER NOT NULL DEFAULT 5;
```

Generated via `prisma migrate dev --create-only`, inspected before applying, applied via `prisma migrate deploy`. Confirmed additive-only (single `ADD COLUMN`, `NOT NULL DEFAULT 5` — existing rows backfilled safely by Postgres at DDL time). `prisma migrate status`: "Database schema is up to date!" (88 migrations), re-confirmed fresh after every recovery.

**Migration-ledger prerequisite** (pre-existing drift, not new F2.1 schema — needed only to unblock the standard `prisma migrate dev` workflow): three orphan `_prisma_migrations` rows (`20260721150000_separate_arena_mode_team_format`, `20260721180000_arena_question_pipeline`, `20260722090000_arena_realtime_revision`) referenced migration folders never committed to git and no longer on disk. Per explicit user-approved procedure: git history verified clean across all commits/branches (zero hits for all three names); their schema effects confirmed already represented under the three properly-tracked migrations that superseded them; full row backup written to `docs/migration-backups/2026-07-22_orphan-ledger-rows-backup.sql`; then deleted inside a transaction (90→87 rows, matching 87 local folders at the time). No application table, other ledger row, or migration file was touched. Re-verified in this final leg: still exactly 0 orphan rows, 88 total (87 + this phase's 1 new migration).

## 5. Existing-profile backfill decision

Real database evidence gathered before any schema change: `ArenaProfile` had exactly 4 rows, **all** at `mmr=1500, winCount=0, loseCount=0, tier=BRONZE`; `ArenaMatch`/`ArenaRatingHistory`/`ArenaRewardLog` had **zero rows in the entire database**. No profile has ever played a match.

**Decision: Option A** (all existing profiles receive 5 placement matches) — realized automatically by the schema default, no separate backfill script. Chosen because the evidence makes Options A/B/C behaviorally identical for this dataset, and Option A is the simplest rule that doesn't require guessing at a product-unspecified "already calibrated" threshold. Verified post-migration and re-verified in this final leg: all 4 existing profiles show `placementMatchesRemaining: 5`.

## 6. Configuration variables

| Variable | Default | Purpose |
|---|---|---|
| `ARENA_K_PLACEMENT` | `80` | Placement-band K-factor (new). |
| `ARENA_PLACEMENT_MATCHES` | `5` | Total placement matches; validated to equal the `ArenaProfile` schema default — throws a clear error if misconfigured to disagree, rather than silently drifting. |
| `ARENA_RATING_K_FACTOR` | `40` | Established-band K-factor — unchanged name/default, not renamed, per the locked F2.0.2 decision. |

No `.env.example` exists in this repo — both new variables are self-documented via their `envInt()` fallback and doc-comment, consistent with every other Arena env var.

## 7. Placement state formulas

```
isInPlacement = placementMatchesRemaining > 0
placementMatchesCompleted = max(0, placementMatchesTotal - placementMatchesRemaining)
```

Pure, independently unit-tested (`resolveArenaPlacementStatus`) — defensively clamps a corrupt/negative remaining value to 0 and an over-total value down to the total before ever reaching an API response.

**Source-of-truth strategy**: the DB default stays `5` for migration safety; `getArenaPlacementMatchesTotal()` reads `ARENA_PLACEMENT_MATCHES` but throws if it disagrees with the hardcoded schema-default constant (`5`), rather than silently drifting. Changing the real placement count requires a coordinated schema-default change + backfill migration in a future phase.

## 8. K-factor implementation

```ts
resolveArenaKFactor({ placementMatchesRemaining, placementK, establishedK }) =>
  placementMatchesRemaining > 0 ? (placementK ?? getArenaPlacementKFactor()) : (establishedK ?? getArenaKFactor())
```

Pure function; same ELO formula/floor reused unchanged; no Glicko rating deviation; no hidden second MMR; no match-mode string checks — eligibility comes entirely from `capability.affectsElo`. The provisional K=60 band was **not** implemented — F2.1's objective was extensibility (satisfied by the parameterized shape), not the band itself.

Unit tests (in `arena-rating-engine.spec.ts`): placement remaining >0, remaining=1, remaining=0, invalid/negative/NaN handling, configured placement value flows through, established behavior unchanged from F1.

## 9. Meaningful-attempt rule

`meaningfulAttempt = participant.correct + participant.wrong > 0`, read from persisted `ArenaParticipant` fields only. Applied uniformly to win or loss (a zero-effort walkover win is exempted the same way a zero-effort loss is) — the narrowest rule the currently-persisted data reliably supports; no new tracking invented. Rating/XP/gold continue to apply per the existing, unmodified formulas regardless of this exemption — only the placement slot is affected. Extracted as a pure function (`resolveArenaPlacementTransition`), independently unit-tested (decrement, exact 1→0 completion, floor at 0, `affectsElo:false` exemption, zero-effort exemption, requires-both-conditions, negative-input handling).

## 10. Disconnect/reconnect behavior

Zero new production code — reuses `ArenaPresenceService`, `ArenaGateway.scheduleDisconnectGrace`, `getArenaDisconnectGraceMs` (30s default), and `ArenaService.forfeitParticipant` unmodified. Verified with real sockets + real Postgres:

- Browser refresh/reconnect within grace: timer cancelled, match resumes, no forfeit, placement untouched.
- Disconnect beyond grace, zero-effort: forfeit applies, slot **not** consumed.
- Disconnect beyond grace, meaningful attempt recorded: forfeit applies, slot consumed exactly once.
- Repeated/concurrent forfeit calls (3 concurrent + 1 subsequent) for the same participant: decrements exactly once, no duplicate `ArenaRewardLog`.

## 11. Matchmaking policy decision

**Implemented**, not just documented — a bounded "try preferred, then fallback" pattern, expressible in Prisma via the existing `User.arenaProfile` relation with no denormalized column:

```ts
const preferredOpponent = await tx.arenaQueue.findFirst({
  where: { ...opponentBaseWhere, user: { arenaProfile: { placementMatchesRemaining: ownIsInPlacement ? { gt: 0 } : { equals: 0 } } } },
  orderBy: { createdAt: 'asc' },
});
const opponent = preferredOpponent ?? (await tx.arenaQueue.findFirst({ where: opponentBaseWhere, orderBy: { createdAt: 'asc' } }));
```

Never excludes a candidate; never waits longer than the existing mmr-range widening already allows (both queries run in the same transaction, same tick); no new `ArenaMode`/queue/service. Verified: prefers a same-placement-status candidate among multiple valid ones; still matches immediately when only a differently-statused candidate is available.

## 12. Event and notification flow

- New EventEmitter2 event `arena.placement.completed`, emitted from `finalizeCompletedProgression` after the `ArenaProgressionRecord` COMPLETED update commits — same discipline as `ARENA_RATING_CHANGED`. Fired at most once per account (lifetime placement).
- New listener branch `ArenaNotificationListener.handlePlacementCompleted` (`runCriticalEventHandler`), mirroring the existing promotion branch.
- New `NotificationEventType.ARENA_PLACEMENT_COMPLETED` + template (`arena-placement-completed.v1`). Reuses `NotificationEventPublisher`/the existing BullMQ `notifications` queue — no direct DB write from Arena.
- Dedup key: `arena:placement:{recipientId}:completed` (lifetime-scoped) — backstops any imprecision in the dispatcher's own completion-flag computation on the narrow crash-recovery path.
- **Real defect found and fixed**: `getNotificationPreferencePolicy()` throws for any event type absent from both the preference-rule table and the always-enabled map. Neither `ARENA_PROMOTED` (F1) nor `ARENA_PLACEMENT_COMPLETED` were registered — meaning **Arena promotion notifications have silently never created a real `Notification` row since F1 shipped**. A dedicated preference toggle needs a new `UserSettings` column (schema change, out of scope this phase); both event types were registered as always-enabled instead. Verified via a real end-to-end test (event → queue → worker → `Notification` row).
- **Second real defect found and fixed**: `finishMatch`'s `progression` field was read via `getProgressionSummary`, which always treats an already-COMPLETED record as a replay and never returns `promoted`/`demoted`/`placementCompleted` — the finish response for the exact match that promotes/demotes/completes placement never surfaced that fact. Fixed by having `finalizeMatch`/`processMatch` return freshly-tagged per-participant outcomes and having `finishMatch` prefer the calling user's fresh result, falling back to the replay read only for the genuine already-finished case. `getRoom` is unchanged (a pure poll correctly never fabricates a "just completed" moment).

## 13. API changes

Additive only: `GET /arena/me` gains `placementMatchesRemaining`/`placementMatchesTotal`/`placementMatchesCompleted`/`isInPlacement`; `POST /rooms/:roomId/finish`'s `progression` gains `placementCompleted`/`placementMatchesRemaining` (and now also correctly surfaces `promoted`/`demoted` on the completing request, per §12). No new endpoint.

## 14. Frontend changes

`ArenaPage.tsx`: dismissible, non-blocking placement-introduction banner shown before the first placement match; `ProfileCard` shows "Xếp hạng N/5" instead of a finalized tier while `isInPlacement`. `ArenaRoomPage.tsx`: placement-complete banner inside the existing result modal (reveals resolved tier + current mmr), reusing existing continuation buttons. No animation, no tier-history/rating-chart/season-summary screens, no App Shell change.

## 15. Idempotency and reconciliation evidence

All proven with real Postgres: duplicate finish/duplicate direct dispatch does not double-decrement; a participant whose reward application fails (fault-injected at the `XpService` boundary) is recovered by `reconciliation.reconcile()`, decrementing only that participant; a stale `PROCESSING` lease is reclaimed and decremented exactly once, a repeat pass changes nothing; two concurrent `reconcile()` calls racing on the same missing participant produce exactly one decrement (DB-level CAS, no process-local mutex); `ArenaRatingHistory`/`ArenaRewardLog`/`XpTransaction` remain exactly one row per rated participant/match; `LeaderboardSeason` rows remain byte-identical before/after.

## 16. Tests added

- `arena-rating-engine.spec.ts`: 38 unit tests total (K-factor selection, placement-total config validation, transition/counter math, status clamping).
- `arena-placement.integration.spec.ts`: 14 real-Postgres integration tests (5-matches-to-completion, duplicate dispatch, partial-failure reconciliation, missing-participant-only reconciliation, stale-lease recovery, concurrent reconciliation, FRIEND_CHALLENGE exemption, zero-effort forfeit exemption, participated-forfeit consumption, real-socket reconnect-within-grace, repeated-forfeit race safety, notification deduplication, rating-history/reward/XP exactly-one invariants, LeaderboardSeason isolation) plus 2 matchmaking-preference tests.

## 17. Test totals (freshly re-verified this leg, superseding any earlier partial count)

Full regression run — `arena`, `leaderboard`, `achievements`, `common/events`, `notifications` — **29 test suites, 270 tests, all passing** (269.1s). Placement suite alone, isolated run: **14/14 passing** (38.9s). Unit suite alone: **38/38 passing**.

## 18. Build/typecheck results (freshly re-verified this leg)

Backend: `prisma format`/`validate`/`generate` clean; `prisma migrate status` — up to date, 88 migrations; `tsc --noEmit -p tsconfig.build.json` clean; `npm run build` clean. Frontend: `tsc --noEmit` clean; `npm run build` clean (74/74 pages generated, one pre-existing unrelated `metadataBase` warning).

## 19. Database/Redis cleanup evidence

Post-suite row counts identical to the pre-session baseline: `User=5, ArenaRoom=1, ArenaMatch=0`, zero `arena-test-%` pattern users remaining. One interrupted run left 76 orphaned test users / 23 rooms behind (a genuine test-cleanup gap this phase's own `Notification` FK exposed, since prior sessions never actually created real `Notification` rows before the §12 fix) — found and fully cleaned via a script mirroring `cleanupArenaTestData`'s exact deletion order, scoped to the `arena-test-%` email pattern; baseline restored and re-verified before the final clean run. `cleanupArenaTestData` itself was fixed to delete `Notification` rows before `User` rows, closing this gap for all future runs. No Arena Redis keys or `node.exe` worker processes left running after this leg's final checks.

## 20. Deferred items

Provisional K=60 band, `peakMmr`/`peakTier`, demotion buffer (`ARENA_DEMOTION_BUFFER`), rating decay, season close/standings, tier-history/rating-chart/season-summary screens, rank/ELO animation, F4 anti-abuse architecture, mission/battle-pass/Arena-events integration — all per the locked F2.0/F2.0.1/F2.0.2 design, none touched.

## 21. Remaining risks

1. A dedicated `arenaNotification` user preference toggle does not exist — Arena notifications are currently always-enabled; a future phase should add one `UserSettings` boolean column if product wants users to mute these specifically.
2. `recoverFromExistingRewardLog`/`loadCompletedOutcome` still cannot precisely re-derive `placementCompleted` for the narrow crash-recovery/pure-replay cases (documented in code, consistent with the pre-existing `promoted`/`demoted` precedent) — mitigated by the lifetime-scoped notification dedup key, not by perfect flag precision.
3. This session hit repeated harness-level quirks (background shells not exiting promptly after their process finished, one prior `next build` lock collision) — none were code defects; each was diagnosed (process/lock genuinely still running vs. already finished) before any corrective action, per the safety protocol.

## 22. F2.1.1 acceptance gate

Independent acceptance review completed in `docs/arena-phase-f2-1-acceptance-report.md`.

Decision: **PHASE F2.1 ACCEPTANCE: PASSED WITH NON-BLOCKING LIMITATIONS**.

---

## Design document status update

`docs/arena-phase-f2-design.md` is updated to record: F2.1 implementation status = COMPLETE, verified 2026-07-22; provisional K-band/peak fields/demotion buffer/decay remain correctly un-implemented per the original F2.1 scope boundary; no retroactive rewrite of the approved design — only a status marker and a pointer to this report.
