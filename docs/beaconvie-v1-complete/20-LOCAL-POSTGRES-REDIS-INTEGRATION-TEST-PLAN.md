# Local PostgreSQL + Redis Integration Test Plan — Learning Path XP

**Status: PREPARED, NOT EXECUTED.** Documentation-only PR #18; no app/schema/UI/test-source modifications, no GitHub Actions, merge or deploy.

## Source anchors
- backend/package.json: `npm run test:e2e` uses `jest --config ./test/jest-e2e.json`; `npm test` is Jest unit tier.
- backend/test/learning-path-runtime-cases.e2e-spec.ts: uses real PrismaService with configured .env, but existing concurrent test checks generation advisory lock, **not** XP completion; mocked XpService in module setup means it cannot validate XP settlement.
- backend/prisma/schema.prisma: XpTransaction.idempotencyKey @unique (line 3784), LessonProgress @@unique([userId,lessonId]) (line 474).
- backend/src/modules/learning-path/learning-path.controller.ts: JwtAuthGuard + LearningPathAccessGuard on class (line 24).
- backend/src/modules/learning-path/learning-path.service.ts: completeLesson invokes XpService.awardXpWithSideEffects with transaction callback.
- backend/src/modules/leaderboard/xp.service.ts: Prisma Serializable transaction, P2034 retry/P2002 recovery; Redis zadd/expire/zincrby and realtime gateway after commit (lines 309–329).

## Test environment safety
Use a **dedicated disposable local PostgreSQL database and Redis instance**. NEVER point DATABASE_URL/REDIS at Railway, production, shared QA or any database containing real users. Use an isolated .env.test.local (ignored by git), fixed test secrets, isolated Redis DB/key namespace. Apply existing migrations, seed minimal user/course/lesson/access/season fixtures. Verify database hostname, database name and Redis endpoint before execution; abort on nonlocal hosts. Do not copy production data. Do not alter production schema.

## Proposed test suite (separate future test file; not created in this docs-only gate)
Suggested name: `backend/test/learning-path-xp-atomicity.e2e-spec.ts`.
- **LP-XP-01 concurrent completion**: two simultaneous authenticated POST /learning-path/lessons/:lessonId/complete calls for the SAME user/lesson; assert one XpTransaction by deterministic key, one LessonProgress, one Mission/Pet reward, one leaderboard increment, response duplicated/complete semantics. Repeat with 5–10 callers and on two app instances if possible.
- **LP-XP-02 P2034 conflict**: force serializable conflict using real competing transaction or deterministic fault injection; verify retry cap and one committed XP ledger row.
- **LP-XP-03 rollback**: inject failure at XP ledger, lessonProgress, mission/pet, leaderboardEntry transaction steps; snapshot relevant DB rows before/after and assert no partial commit. Do not use Redis as proof of DB rollback.
- **LP-XP-04 Redis after-commit failure**: inject Redis zadd/zincrby/expire failure after DB commit; assert one DB XP ledger and completed lesson; verify API behavior and repair/reconciliation contract, and retry doesn't award again. Current source can throw after commit: classify as resilience gap if not recovered.
- **LP-XP-05 authorization**: unauthenticated 401; other user's inaccessible lesson, locked lesson and nonmember paid lesson 403/404; assert no XP/Progress mutations. Verify access checks in controller, access guard, resolvePathLesson and course enrollment.
- **LP-XP-06 idempotent retry**: repeat same completed lesson sequentially and after simulated network disconnect; assert one ledger, same completed progress and no double mission/pet/leaderboard increment.
- **LP-XP-07 DB/Redis consistency**: compare Postgres leaderboardEntry.periodXp with Redis sorted set; restart Redis and verify supported rebuild/reconciliation mechanism. If none exists, record missing capability rather than claiming PASS.

## Suggested execution sequence once test-code changes are explicitly authorized
1. Create isolated local services; inspect `backend/test/jest-e2e.json`, migrations, fixture helpers, and config keys. Confirm database/Redis URLs point to local disposable services.
2. Add tests on a **separate test-only branch**, not docs baseline; implement real XpService/Prisma and controlled Redis fault injection; no mocks for the DB transaction under test.
3. Run targeted Jest suite locally with `--runInBand` where suitable; concurrency must still be exercised within each test via Promise.allSettled.
4. Capture request status, fixture IDs (synthetic only), XP ledger count, lessonProgress, mission/pet, leaderboard DB state, Redis values and failure traces; redact tokens/secrets.
5. Cleanup fixtures in finally/afterAll; confirm no records remain.
6. Update acceptance matrix with exact test command, HEAD, environment, results and artifacts. PASS only after all required cases pass.

## Gate decisions
Source-level architecture: evidence present. Runtime concurrency/rollback/auth/Redis resilience: **NOT TESTED**. Documentation plan: **READY FOR TEST IMPLEMENTATION**. PR #18 remains Draft and Technical Blueprint NOT LOCKED.
