# XP Redis Recovery B — Lock-order audit (QA, NOT LOCKED)

Branch: `test/learning-path-xp-local-atomicity`. Based on current source audit; no production behavior changed.

## Verified call sites

| Component | Existing acquisition/operation | Finding |
| --- | --- | --- |
| `XpService` | Award transaction updates leaderboard entry and then calls `bumpProjectionRevision` (`xpRedisProjectionRevision.upsert`) and creates outbox; two post-commit branches call Redis `zadd`, `zincrby` | Scope lock inserted only in revision helper would be **too late** if entry locks already held. Two legacy direct writer paths bypass fencing. |
| `XpRedisOutboxClaimService.claim` | `SELECT ... FROM XpRedisOutbox FOR UPDATE SKIP LOCKED`, then `updateMany` | Claim locks outbox first; adding scope locks afterward conflicts with a scope-first writer/rebuilder protocol. Claim must exclude REBUILDING scopes without lock-order inversion. |
| `XpRedisOutboxClaimService.complete/retry` | Direct conditional outbox updates by id/generation | Verify compatibility with scope transitions; completion must not certify a stale generation. |
| `XpRedisCoordinatedWriteService.apply` | Read projection snapshot; PG transaction locks outbox then revision, calls Redis under PG locks, then marks DONE | Must acquire scope lock before outbox/revision, validate READY + epoch, bound Redis request. Current PG transaction timeout is 15s. |
| `LeaderboardService` | Redis cache refill with direct `zadd` | Read-side cache refill is a legacy writer and can violate rebuild epoch. |
| `xp-redis-version-fence.ts` | Per-member revision hash only | Losing both ZSET and hash loses fence; missing epoch metadata must deny writes. |

## Required canonical order (proposal)

1. Determine Redis projection scope key(s) without holding PG row locks.
2. Acquire scope row locks in deterministic lexicographic order for transactions touching multiple scopes.
3. Check `READY` and capture authoritative epoch under the scope lock.
4. Acquire business/entry, outbox, and member revision locks in one documented global order, respecting actual Prisma transaction call sequence.
5. Perform fenced Redis command with bounded deadline only in QA worker paths; mark outbox DONE only after success.

The XP award path may touch WEEKLY and SKILL scopes. Lock all required scope rows *before* touching leaderboard entry or revision. Deriving WEEKLY groupId may require reads, but never hold a conflicting row lock while subsequently acquiring scope. Verify concurrent season/group changes and absence of circular dependencies.

The claim path must not lock outbox then wait for scope. Prefer a scope-aware eligibility query/claim design that preserves SKIP LOCKED semantics and avoids a scope/outbox cycle. Lease generation alone does not fence rebuild epoch.

The rebuild coordinator must acquire scope lock, transition to REBUILDING and increment epoch only after prior scope-lock holders finish. Rebuild ownership and Redis publication require additional fencing; PostgreSQL scope state alone is insufficient if legacy writers remain.

## Mandatory before migration / worker activation

- Trace all PG transaction lock acquisition in both `XpService` award paths, including helper functions and implicit locks/FKs.
- Audit all direct Redis writers, including `LeaderboardService` refill, and remove/redirect them at cutover.
- Design claim and retry transitions to be scope-aware without acquiring locks in reverse order.
- Add contention tests: XP award vs writer; claim vs rebuild; two writers; two rebuilders; score decrease during rebuild.
- Keep worker inactive. Recovery A 2/2 PASS does not prove Recovery B.

Status: AUDIT CHECKPOINT ONLY. Lock order not proven safe; no migration, epoch Lua, coordinator or Recovery B E2E PASS.
