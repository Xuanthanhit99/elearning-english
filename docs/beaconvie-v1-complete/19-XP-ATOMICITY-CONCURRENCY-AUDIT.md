# XP / Learning Path Atomicity and Concurrency Audit

Pinned source main@13d40d7a649196e88ddbd9f5aeed5c817af14e4d. Static review only; no tests executed or production verification.

## Verified code-level protections
- backend/prisma/schema.prisma: XpTransaction.idempotencyKey String @unique (line 3784); LessonProgress @@unique([userId,lessonId]) (line 474).
- learning-path.controller.ts: class @UseGuards(JwtAuthGuard,LearningPathAccessGuard) (line 24), POST lessons/:lessonId/complete (line 74), authenticated user forwarded to service.
- learning-path.service.ts: completeLesson (449) resolves user-specific path (450), denies LOCKED (452–455), returns alreadyCompleted (458–465). Idempotency key based on lesson ID (467), awardXpWithSideEffects (470), lessonProgress upsert and mission/pet side effects in transaction callback (488–527). resolvePathLesson (1001–1014) rejects lesson absent from user's current path.
- leaderboard/xp.service.ts: pre-check idempotencyKey, transaction Serializable (304), XP ledger create (250–264), sideEffects(tx) (266), leaderboardEntry update in same tx (268–304), P2034 serializable retry, P2002 unique violation lookup recovery (336–355).
- XP unit tests mock P2034 retries and P2002 recovery (xp.service.spec.ts); learning-path-runtime-cases.e2e-spec.ts concurrent advisory lock tests relate to content generation, not concurrent lesson completion.

## Remaining risks / qualifications
1. **No real PostgreSQL parallel completeLesson proof:** need Promise.allSettled two distinct HTTP clients/users where appropriate and same user+lesson concurrently, inspect DB XP transaction count, LessonProgress, mission, pet, leaderboard entry, and response duplicated flags.
2. **Redis post-commit side effects:** xp.service.ts lines 309–329 writes Redis leaderboard scores and emits gateway event **after** DB transaction. Redis outage could throw after committed XP, leaving a successful DB settlement with API error / stale cache. Test recovery, rebuild/reconciliation and ensure retries do not duplicate DB rewards.
3. **Non-transactional side effects:** inspect applyLessonMissionProgress/applyPetLessonReward for external calls; transaction retry may invoke callback multiple times. No external non-idempotent operations allowed inside callback.
4. **Access:** LearningPathAccessGuard checks allowed user; resolvePathLesson checks membership of user's current path and locked state. Need explicit test for course enrollment/paid access and cross-account lessonId; inspect getLearningPath filtering.
5. **Rollback injection:** fail after tx.xpTransaction.create, after tx.lessonProgress.upsert, after mission/pet update and after leaderboardEntry.update; assert all DB writes roll back together. Redis/gateway failures are post-commit and need separate recovery expectations.
6. **Schema deployment:** @unique declaration is evidence of intended schema; deployed database migration/constraint must be checked separately.

## Acceptance checklist (not executed)
- Same-user same-lesson 2 concurrent complete requests: exactly one XpTransaction per idempotencyKey, one LessonProgress, one set of mission/pet rewards, leaderboard periodXp increments once; one response may report alreadyCompleted.
- Inject P2034: retry within configured cap, no double rewards. Inject P2002: recover original XP transaction.
- Inject DB failure inside transaction: zero partial DB state changes.
- Inject Redis/gateway failure after commit: DB remains correct, request/retry semantics and cache repair documented.
- Locked lesson and lesson outside user's path: denied, zero writes.
- Run local PostgreSQL integration/e2e with exact branch HEAD and capture DB assertions; no GitHub Actions until required release gate.

**Assessment:** source design supports DB atomicity and idempotency; **runtime/concurrency gate remains UNVERIFIED**. PR #18 Draft, Technical Blueprint NOT LOCKED. No app/schema/UI changes.
