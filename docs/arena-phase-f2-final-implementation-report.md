# Arena Phase F2 Final Implementation Report

Status: implemented and validated on 2026-07-23.

Follow-up: Phase F3 production readiness work is documented in `docs/arena-phase-f3-production-readiness-report.md`.

## Recovery summary

- Phase F2.1 placement engine was already complete and kept intact.
- Existing migration `20260722143310_add_arena_placement_engine` was reused; no duplicate placement fields were added.
- Prisma status before continuation: database up to date with 88 migrations and only `placementMatchesRemaining` present from F2.1.
- Existing modified/untracked F2.1 files were preserved. Unrelated `studyarena/**` deletions were left untouched.

## Existing completed work

- Placement counter and placement-complete event/notification.
- Real placement, reconciliation, reward, runtime-smoke, and rating-engine tests.
- Redis provider shutdown cleanup from F2.1.
- Frontend placement progress display in Arena lobby/room result UI.

## Newly completed work

- F2.2 variable rating lifecycle:
  - Placement K remains `ARENA_K_PLACEMENT` default 80.
  - Provisional K added as `ARENA_K_PROVISIONAL` default 60.
  - Established K remains `ARENA_RATING_K_FACTOR` default 40.
  - Rated match count uses `ArenaRatingHistory.count`, not `winCount + loseCount`, because casual friend matches increment win/loss but do not affect ELO.
  - `peakMmr` and `peakTier` are updated only on rated matches and never reduced.
- F2.3 promotion/demotion:
  - Demotion buffer added as `ARENA_DEMOTION_BUFFER` default 25.
  - Promotions are immediate; demotions are delayed while the rating remains at or above `previous tier floor - buffer`.
  - `ARENA_TIER_DEMOTED` notification uses the existing Arena rating-changed event path.
- F2.4 rating decay:
  - New `arena-rating-decay` BullMQ queue, scheduler, processor, and service.
  - Default disabled via `ARENA_DECAY_ENABLED=false`.
  - Defaults: `ARENA_DECAY_INACTIVITY_DAYS=14`, `ARENA_DECAY_AMOUNT=15`, `ARENA_DECAY_MIN_TIER=DIAMOND`.
  - Decay is CAS-guarded, placement-protected, high-tier-only, and idempotent per inactivity window.
  - Decay does not create `ArenaRatingHistory`, `ArenaRewardLog`, XP, gold, or reward rows.
  - `arena.decay.applied` event and `ARENA_RATING_DECAYED` notification added.
- F2.5 frontend/API:
  - `GET /arena/season/current` added.
  - `GET /arena/rating/history` supports additive `seasonId` and `tierChangesOnly` query options.
  - Profile/lobby responses expose peak rating, lifecycle stage, rated match count, and decay status.
  - Arena lobby displays peak/rated/lifecycle/season peak metadata.

## Files changed

- Prisma: `backend/prisma/schema.prisma`
- Migration: `backend/prisma/migrations/20260722171512_add_arena_f2_rating_lifecycle/migration.sql`
- Arena backend: controller, service, module, dispatcher, rating engine, notification listener, domain events.
- New decay backend files: constants, service, scheduler, processor, integration spec.
- Tests: rating engine spec and Arena fake Prisma harness updated.
- Notifications: event enum, template registry, preference registry.
- Frontend: `english-web-build/src/Components/Arena/ArenaPage.tsx`.

## Migration

- Added `ArenaProfile.peakMmr Int @default(1500)`.
- Added `ArenaProfile.peakTier ArenaTier @default(BRONZE)`.
- Added `ArenaProfile.lastRatingDecayAt DateTime?`.
- Backfilled lifetime peak from current profile MMR and existing `ArenaRatingHistory.nextMmr`.
- Applied with `npx prisma migrate deploy`.
- Final `npx prisma migrate status`: database schema is up to date with 89 migrations.

## Tests

- `npx jest src/modules/arena/progression/arena-rating-engine.spec.ts --runInBand`: 47 passed.
- `npx jest src/modules/arena/progression/arena-rating-decay.integration.spec.ts --runInBand --detectOpenHandles`: 3 passed.
- `npx jest src/modules/arena/progression/arena-placement.integration.spec.ts --runInBand --detectOpenHandles`: 14 passed.
- Grouped Arena progression regression: 6 suites, 101 tests passed.
- `npx jest src/modules/leaderboard/xp.service.spec.ts --runInBand`: 9 passed.
- `npx jest src/modules/notifications/notifications.processor.spec.ts --runInBand`: 6 passed.
- `npx jest src/modules/arena --runInBand --detectOpenHandles`: 17 suites, 232 tests passed.
- No achievement-specific Jest spec exists in the repository; Arena rating-change behavior remains covered by Arena progression/event tests.

## Validation and builds

- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `npx prisma migrate status`: passed, database up to date.
- Backend build `npm run build`: passed.
- Frontend build `npm run build`: passed.
- Backend package has no `typecheck` script; Nest build and Next build both ran TypeScript successfully.
- Redis cleanup verified through Node/ioredis scan: `arena:*` key count = 0.
- Post-test DB audit: `ArenaRatingHistory`, `ArenaRewardLog`, and `ArenaProgressionRecord` counts = 0.

## Remaining deferred items

- Full backend monorepo test suite still has pre-existing unrelated scaffold/provider failures documented in F2.1.
- Rating decay is intentionally disabled by default pending rollout configuration.
- Arena notification preferences remain always-enabled for Arena-specific event types until a dedicated user setting column is approved.
- Season close/reward/reset lifecycle remains outside this F2 implementation.
