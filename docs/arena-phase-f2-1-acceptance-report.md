# Arena Phase F2.1.1 Acceptance Report

Date: 2026-07-23

## 1. Acceptance audit

Current working tree was inspected before edits. F2.1-related files are the existing Arena schema/migration, Arena progression/rating/realtime/service files, notification registry/template files, Arena frontend files, the F2 design doc, and the F2.1 implementation report. Unrelated `studyarena/**` deletions remain untouched.

Classification:

- **Implemented and correct**: additive placement column, single migration, placement K-factor band, post-placement established K fallback, derived/clamped API placement status, persisted-data meaningful-attempt rule, real Postgres integration tests, notification deduplication, frontend placement display, and Redis shutdown fix.
- **Implemented but needed fresh acceptance proof**: repeated placement integration with `--detectOpenHandles`, grouped regression, validation commands, and cleanup evidence. All were re-run in this gate.
- **Incorrect/risky and fixed in this gate**: `.env.production.example` did not document the new Arena placement/rating env vars. Added `ARENA_PLACEMENT_MATCHES=5`, `ARENA_K_PLACEMENT=80`, and `ARENA_RATING_K_FACTOR=40` with a schema-default coordination note.
- **Explicitly deferred/out of scope**: provisional K=60, `peakMmr`, `peakTier`, demotion buffer, decay, season close/reset, full rating/tier/season screens, F4 anti-abuse, new Arena modes, new queues/services, and placement-specific disconnect subsystem.

## 2. Migration verification

Migration folder: `backend/prisma/migrations/20260722143310_add_arena_placement_engine/`.

Migration SQL:

```sql
-- AlterTable
ALTER TABLE "ArenaProfile" ADD COLUMN     "placementMatchesRemaining" INTEGER NOT NULL DEFAULT 5;
```

Verified additive-only: no table recreation, no drop/rename, no unrelated enum alteration, no unrelated English Placement Test model changes, and no destructive data operation.

`npx prisma migrate status`: database schema is up to date, 88 migrations found.

## 3. Backfill verification

Database evidence:

- `information_schema.columns`: `ArenaProfile.placementMatchesRemaining`, `integer`, `NOT NULL`, default `5`.
- `_prisma_migrations`: `20260722143310_add_arena_placement_engine` has `finished_at=2026-07-22T14:33:43.534Z`, `rolled_back_at=null`.
- `ArenaProfile`: 4 total rows, all 4 have a value, min remaining `5`, max remaining `5`.

Implemented strategy: **Option A, all existing profiles receive 5 placement matches**. This matches the implementation report and product decision.

## 4. Configuration verification

Runtime config:

- `ARENA_PLACEMENT_MATCHES`: default `5`; malformed, non-positive, and unset values fall back to `5`; any positive value other than schema default `5` throws a clear error.
- `ARENA_K_PLACEMENT`: default `80`; positive finite values are accepted; invalid values fall back to `80`.
- `ARENA_RATING_K_FACTOR`: existing established-band variable, default `40`, unchanged.

The runtime/schema mismatch guard means a deployment cannot silently create profiles with DB default `5` while reporting a different placement total through the API.

## 5. Counter idempotency evidence

Proven by real PostgreSQL tests in `arena-placement.integration.spec.ts` and grouped Arena regression:

- Valid rated placement match decrements by exactly 1.
- Fifth valid match transitions to 0.
- Sixth rated match does not go below 0.
- Duplicate finish, duplicate direct dispatch, duplicate reconciliation, stale lease recovery, and concurrent reconciliation do not double-decrement.
- Partial participant failure repairs only the missing participant.
- Already-completed participant state stays unchanged after reconciliation.
- `FRIEND_CHALLENGE` and non-ELO behavior follow `ArenaMode` capability flags.

## 6. Zero-effort evidence

Meaningful attempt is computed from persisted `ArenaParticipant.correct + ArenaParticipant.wrong > 0`, never client/UI state.

Covered cases:

- Zero-effort forfeit loss does not consume placement.
- Participated forfeit loss consumes exactly one slot.
- Timeout/normal finish path uses the same persisted counters.
- One correct or one wrong answer both satisfy meaningful attempt through the same formula.
- Rewards/rating remain governed by existing formulas; only placement-slot consumption is exempted.

Known data-model boundary: the implementation can reliably distinguish persisted answer effort (`correct + wrong`) but does not add a separate activity/intent signal. That is intentional F2.1 scope.

## 7. Disconnect/reconnect evidence

F2.1 reuses the existing system: `ArenaPresenceService`, `ArenaGateway` disconnect grace, `getArenaDisconnectGraceMs`, `arena:resume`, and `ArenaService.forfeitParticipant`.

Real socket test evidence:

- Browser refresh/reconnect inside grace does not forfeit and does not consume placement.
- Reconnect cancels/neutralizes pending disconnect action through presence re-registration.
- Disconnect before effort beyond grace maps to forfeit but zero-effort placement exemption applies.
- Disconnect after persisted effort consumes exactly one placement match.
- Repeated forfeit/disconnect callbacks do not duplicate finalization/progression.
- No second placement timer/gateway/subsystem exists.

## 8. Completion transition evidence

Completion is determined in the authoritative progression write path by `previousRemaining > 0` and `nextRemaining === 0`, not inferred later from current profile state.

Real test evidence:

- Matches 1-4: `placementCompleted=false`.
- Match 5: `placementCompleted=true`.
- Match 6: `placementCompleted=false`.
- Duplicate finish/dispatch: no repeated completion.
- Replay/recovery paths report current remaining but do not fabricate a fresh completion moment.

Limitation: `recoverFromExistingRewardLog` cannot perfectly reconstruct whether the already-committed crash-window match was the exact 1-to-0 transition. The code documents this and uses a conservative `placementCompleted=false` replay result plus lifetime notification deduplication.

## 9. Event/notification dedup evidence

Inspected flow:

- Domain event: `arena.placement.completed`.
- Listener: `ArenaNotificationListener.handlePlacementCompleted`, wrapped in `runCriticalEventHandler`.
- Publisher: existing `NotificationEventPublisher`.
- Queue/worker: existing BullMQ notification path.
- Template: `arena-placement-completed.v1`.
- Dedup key: `arena:placement:{recipientId}:completed`.

Real integration proof: completing placement creates exactly one notification row, and duplicate dispatch does not create another. Arena does not write notification rows directly.

Durability boundary: event emission occurs after authoritative progression has committed, but there is no durable outbox. A process crash after progression commit and before async listener/queue completion could miss a banner/notification without corrupting rewards, rating, or counters.

## 10. Reward/history invariants

Proven:

- XP idempotency key remains `arena:xp:<matchId>:<userId>`.
- XP/gold/Arena Points are written exactly once per participant/match.
- `ArenaRewardLog` remains exactly one per participant/match.
- `ArenaRatingHistory` remains exactly one per rated participant/match.
- Achievements/event flows are not duplicated.
- `LeaderboardSeason` rows stay unchanged; expected weekly `LeaderboardEntry` XP side effect remains documented as Leaderboard behavior, not ArenaSeason mutation.
- No placement-specific reward calculator exists.

## 11. Matchmaking policy status

Soft preference is implemented inside the existing `enterQueue` transaction:

- It first tries a same-placement-status candidate among already-valid candidates.
- It immediately falls back to the normal candidate query.
- It does not add a waiting phase, new queue, new service, new mode, or unbounded process-local sorting.
- Existing MMR widening remains authoritative.

Integration tests prove preference and fallback.

## 12. Frontend acceptance

Verified frontend implementation:

- Placement intro appears only for `profile.isInPlacement` and `placementMatchesCompleted === 0`; it is dismissible and non-blocking.
- Copy uses backend-provided totals when present and does not promise placement-only opponents.
- Profile card shows provisional placement progress instead of finalized tier while in placement.
- Completion banner appears only when `progression.placementCompleted` is true, reveals tier/MMR, and uses existing result/progression data.
- No fake animation/state machine, App Shell redesign, or full history screen was introduced.

Type definitions align with backend additive fields.

## 13. Redis shutdown fix review

`backend/src/modules/leaderboard/leaderboard.module.ts` now provides `LEADERBOARD_REDIS` through `LeaderboardRedisClient extends Redis implements OnModuleDestroy`, calling `quit()` on module shutdown.

Review result:

- Closes the Redis provider during Nest shutdown.
- Does not alter runtime Redis options or behavior while app is alive.
- Does not close unrelated live module clients prematurely; each module owns its own provider instance.
- Placement integration no longer hangs after assertions.
- Leaderboard regression passes.

## 14. Regression totals

Critical placement integration, twice consecutively with open-handle detection:

- Run 1: `14/14` passed, `137.93s`, no open-handle warning.
- Run 2: `14/14` passed, `144.174s`, no open-handle warning.

Grouped relevant regression:

- Command: `npm test -- --runInBand modules/arena modules/leaderboard modules/achievements modules/notifications common/events`
- Result: `29` suites passed, `270` tests passed, `247.855s`.

Full backend suite:

- Command: `npm test -- --runInBand`
- Result: `65` suites passed, `62` suites failed, `339` tests passed, `62` tests failed, `369.726s`.
- Failures are unrelated pre-existing Nest scaffold/provider tests outside F2.1, e.g. controllers/services instantiated without required providers (`ChatSessionService`, `PlacementService`, `PlacementTestService`, `PrismaService`, etc.).

## 15. Validation results

Backend:

- `npx prisma format --check`: PASS.
- `npx prisma validate`: PASS.
- `npx prisma generate`: PASS.
- `npx prisma migrate status`: PASS, database up to date.
- `npx tsc --noEmit -p tsconfig.build.json`: PASS.
- `npm run build`: PASS.

Frontend:

- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS, 74/74 pages generated.
- Non-blocking warning: Next `metadataBase` not set, unrelated to Arena F2.1.

## 16. Database/Redis/process cleanup

Post-test database evidence:

- `arena-test-` users: `0`.
- `ArenaMatch`: `0`.
- `ArenaProgressionRecord`: `0`.
- `ArenaRewardLog`: `0`.
- `ArenaRatingHistory`: `0`.
- Baseline preserved: `User=5`, `ArenaProfile=4`, `ArenaRoom=1`, `Notification=10`.

Redis evidence:

- `arena:*` keys: `0`.
- Generic `*placement*` keys: unrelated `bull:placement-processing:*` queue keys from the English placement-processing subsystem, not Arena placement.

Process evidence:

- Final `node.exe` process scan: no Node/Jest/worker process remains.

## 17. Remaining limitations

- Full backend Jest suite contains unrelated pre-existing broken scaffold/provider specs; the F2.1-relevant grouped suite is green.
- `recoverFromExistingRewardLog` cannot reconstruct a placement-completion moment after the narrow crash window; reward/rating/counter safety is unaffected.
- Arena notification preferences are always-enabled until a future schema phase adds a dedicated user setting.
- Next `metadataBase` warning remains unrelated frontend configuration noise.

## 18. Acceptance decision

All F2.1 acceptance-critical requirements are satisfied. The only remaining issues are explicitly non-blocking and outside Phase F2.1 behavior.

**PHASE F2.1 ACCEPTANCE: PASSED WITH NON-BLOCKING LIMITATIONS**
