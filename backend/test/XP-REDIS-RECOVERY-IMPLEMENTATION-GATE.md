# BeaconVie XP Redis Recovery — implementation contract (QA branch only)

Status: DESIGN / NOT IMPLEMENTED / NOT PASS. PR #18 remains Draft.

## Verified baseline
- Real PostgreSQL + Redis QA: 3/3 PASS. A failed post-commit ZADD leaves the ledger and weekly entry committed, while Redis remains stale; a duplicate XP request does not resync.
- Redis failure contract: 5/5 PASS. Skill ZINCRBY is not replay-safe.
- Current XpService writes weekly ZADD, EXPIRE and skill ZINCRBY after commit. No durable recovery is proven.

## Required durable mechanism
1. Add a PostgreSQL outbox table via Prisma migration, keyed by a stable aggregate (weekly season/group/user or skill/period/user) and revision/transaction. Store kind, aggregate key, status, attempts, nextAttemptAt, lockedUntil, lastError, createdAt/updatedAt. Index due work. Unique idempotency constraint must prevent duplicate events for the same XP transaction and target.
2. In the same Serializable transaction that creates XpTransaction and increments LeaderboardEntry, enqueue outbox work. Never write Redis within the DB transaction. For skill, store the XP transaction ID and skill; use its earnedAt (not wall-clock retry time) to derive the period.
3. After commit, a worker claims due work using a lease and row locking / SKIP LOCKED or equivalent atomic claim; recover expired leases. Apply bounded backoff and keep failures visible. Never mark work done before Redis acknowledgement.
4. Weekly projection: recompute the latest LeaderboardEntry.periodXp for season/group/user from PostgreSQL; set Redis member using absolute score, not increment.
5. Skill projection: sum authoritative XpTransaction.finalXp by user/skill and the EXACT same week-boundary function used by writers/readers; then set absolute score. Define reversal semantics explicitly. Do not replay ZINCRBY.
6. Prevent older workers from overwriting newer values: per-member serialized claims or atomic revision compare-and-set Lua script, with a durable monotonically increasing revision. A plain late ZADD is NOT sufficient.
7. Cache expiry: restore TTL only after successful write; ensure no worker extends retention outside intended season/period policy. Rebuild after Redis flush must be possible by periodic full reconciliation, not just event retries.
8. XP duplicate requests must not create a second ledger/outbox award. Failures after DB commit must not be interpreted as an award rollback. Websocket notifications are best-effort and must not control persistence.

## Acceptance tests (must run locally, no Actions)
- Concurrent same-key awards: one XP ledger, one weekly DB increment, one outbox intent; Redis eventually matches.
- Redis offline after DB commit: persisted intent survives process restart; after Redis resumes, worker converges.
- Retry same idempotency key: no double XP and no double skill score.
- Two events for one member processed out of order: final Redis score equals latest PostgreSQL aggregate.
- Skill period boundary and reversals: Redis score equals authoritative ledger aggregation.
- Worker crashes after Redis write but before marking intent complete: replay is safe.
- Redis data loss after all outbox rows completed: full reconciliation restores the projection.
- QA fixture cleanup and bounded retries, with metrics for pending/dead-letter/stale items.

## Safety and rollout
- Only disposable localhost DB/Redis on 127.0.0.1 ports 15432/16379; explicit opt-in.
- Schema migration, worker and XpService changes require separate reviewed implementation commits on QA branch; no main/production deploy.
- Existing PASS suites should not be run concurrently with tests that create an active season.
- No claim of Recovery PASS until implementation, restart and outage tests run against real local PostgreSQL + Redis.
