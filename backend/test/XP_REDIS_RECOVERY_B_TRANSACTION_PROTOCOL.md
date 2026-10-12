# Recovery B — Transaction and Lock Protocol V1 (QA proposal; NOT LOCKED)

This document is a design checkpoint, NOT a migration, running recovery implementation, or evidence of passing E2E.

## Invariants

1. XP ledger, projection revision, and outbox commit atomically in PostgreSQL; Redis outage/rebuild never blocks XP award solely due to Redis.
2. Each Redis projection scope is identified by the exact `redisKey`; epoch is per scope, not per outbox.
3. Normal Redis publication requires PostgreSQL scope READY, scope row lock, current epoch, valid outbox lease and authoritative member revision; Redis Lua requires matching installed epoch. Missing epoch fails closed.
4. Transition to REBUILDING obtains scope lock and increments epoch only after prior scope-lock writers drain. Redis metadata must not be silently initialized by normal writer.
5. Full rebuild is absolute, includes all members, and does not create XP ledger entries. No READY transition without proof of snapshot consistency.
6. Legacy direct ZADD/ZINCRBY/refill paths must be redirected/disabled before worker activation.

## Award protocol

Existing awardXp and awardXpWithSideEffects acquire profile/user/entry locks before discovering WEEKLY groupId, and the latter runs an arbitrary transactional callback. Do NOT insert scope FOR UPDATE after these locks or impose a scope-first lock order on this business transaction.

Preferred QA design: award continues to update ledger, entry, projection revisions and durable outbox in one serializable transaction. Introduce a PostgreSQL projection change barrier maintained atomically with those changes, independent of Redis availability. The barrier must serialize with rebuild finalization: a transaction starting before rebuild and committing after its snapshot must be detectable. A bare sequence allocated before commit or a timestamp/max(outbox id) is NOT a safe commit watermark. A scope-row update acquired after other business locks may itself deadlock against a rebuild transaction that holds scope then waits on business locks; coordinator finalization must never acquire those business locks while holding the barrier. Audit callback sideEffects and group creation separately.

Candidate mechanism for later proof: transactional per-scope mutation counter row updated by award in its transaction, with finalization acquiring the same counter row lock, checking snapshot token, and changing scope to READY without acquiring business locks. Rebuild reads consistent PG state without holding scope/barrier locks over the full scan. If counter changed, rebuild restarts or applies a consistent delta and revalidates. Lock order for award: business rows -> counter row, with deterministic order for WEEKLY/SKILL counters; finalizer: counter rows only -> scope state, with no reverse dependency on business rows. Because Redis publication uses scope lock, do not let any path hold scope then wait for counter. This is a design candidate requiring deadlock testing, not a proven lock graph.

## Claim protocol

Claim must not lock outbox then block on scope. A plain JOIN filtering scope READY is only a snapshot check and not a lock guarantee.

Suggested safe simplification: claim outbox rows with SKIP LOCKED without taking scope locks, and treat claim as **lease assignment only**; it does not authorize Redis publication. The writer later takes scope lock FIRST, then outbox/revision locks, rechecks READY/epoch/lease and fails closed. During REBUILDING claims may occur, but they must not publish; worker can defer them. If product policy requires no claims during rebuild, use a nonblocking scope-aware candidate selection that does not introduce a scope/outbox lock cycle, and verify under contention. Never interpret claim as authorization.

Do not let complete(id,generation) mark DONE independently of a successful epoch-fenced Redis write. Existing standalone complete method requires restriction/audit.

## Writer protocol

1. Obtain immutable outbox scope identifier without locks.
2. Begin PG transaction; lock scope row first; missing scope/REBUILDING -> refuse/defer.
3. Lock outbox row; revalidate scope identity, status PROCESSING, attempt generation and lease.
4. Lock member revision; compare to authoritative snapshot; if superseded, resolve outbox without writing.
5. Issue bounded Redis Lua with expected epoch and revision; missing/mismatched Redis epoch -> error; no DONE.
6. Mark DONE only after successful Redis acknowledgement. PG commit failure permits retry; Lua is idempotent for same revision.

## Coordinator protocol

1. Under PG scope row lock, switch READY->REBUILDING, increment epoch, commit. Existing writer with prior scope lock finishes before this transition.
2. Fence and claim exclusive rebuild ownership (generation/token); stale coordinator cannot publish/finalize.
3. Read all member scores and revisions from consistent PG snapshot. Compute scope change token at snapshot boundary; use a transactionally serialized barrier, not a nontransactional sequence.
4. Publish to fixture-specific staging Redis keys; verify member set, score and revision. Use atomic, epoch-validated cutover of ZSET+revision metadata+epoch, guarded against stale rebuilders. Redis-only token is insufficient after total key loss; coordinator ownership must be validated against PG before cutover under a scope lock, without waiting on counter/business locks.
5. Finalization obtains appropriate barrier lock, verifies no relevant committed or in-flight changes omitted, then validates rebuild ownership and moves scope READY. **Open issue:** prove ordering between barrier lock, scope lock and Redis cutover without deadlock or publication window; may require a single PG transaction holding barrier then scope through Redis cutover, and ensure writer only locks scope (not barrier). The transaction must be short/bounded.
6. On any error, leave scope REBUILDING; retry rebuild safely. Never infer missing Redis epoch as epoch zero.

## Critical proof obligations

- Counter and projection data must be committed atomically. A PG snapshot must be paired with its barrier token in a way that detects transactions spanning the snapshot.
- No lock cycle: award business->counter; writer scope->outbox->revision; coordinator barrier->scope (never scope->counter); claim outbox only, never outbox->scope.
- Redis cutover atomic across ZSET, versions, epoch; stale rebuild coordinator cannot overwrite a newer epoch after loss.
- No direct Redis writer can bypass Lua at activation.
- Missing scope/epoch fails closed. Redis downtime cannot make XP ledger rollback.
- E2E: award vs rebuild snapshot/finalize; award with sideEffects; claim vs writer; writer vs epoch transition; two rebuilders; lost ZSET+versions+epoch; Redis restart; no duplicate XP ledger; no other keys touched.

## Gate

No schema/migration, code changes, worker registration, E2E execution, GitHub Actions, merge or deploy in this checkpoint. Recovery A 2/2 PASS; Recovery B DESIGN; PR #18 Draft; Technical Blueprint NOT LOCKED.
