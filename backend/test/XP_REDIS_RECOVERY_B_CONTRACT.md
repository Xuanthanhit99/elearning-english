# XP Redis Recovery B — QA contract (proposed, NOT LOCKED)

Scope: branch `test/learning-path-xp-local-atomicity` only. No production registration, worker scheduling, merge, deployment, or GitHub Actions. Recovery A 2/2 PASS is independent of this gate.

## Existing baseline and hazards

- PostgreSQL `XpRedisOutbox` and `XpRedisProjectionRevision` exist. No rebuild epoch or scope state exists.
- `XpRedisCoordinatedWriteService.apply` holds PostgreSQL outbox/revision row locks while writing Redis, with a 15-second transaction timeout.
- `xp-redis-version-fence.ts` uses only a per-member revision hash. If the ZSET and hash disappear together, an older revision can be accepted.
- Legacy direct Redis writers remain and bypass fencing. Recovery worker MUST NOT be enabled while any remain.

## Proposed scope and state

One durable PostgreSQL scope row per exact Redis projection key (`redisKey`), uniquely identified and serialized under `SELECT ... FOR UPDATE`:

- `epoch BIGINT NOT NULL`, monotonic and never reset for a scope.
- `state`: `READY` or `REBUILDING`; unknown/missing scope is denied.
- `updatedAt`, optional `rebuildId` for idempotent resume and audit.

The scope's Redis metadata key is `${redisKey}:epoch`. It is NOT independently authoritative. All Redis writes must carry the PostgreSQL-fenced epoch and require the Redis metadata to equal it. Missing metadata is an error, never implicit epoch 0/1.

## Lock ordering and ownership

All participating writers acquire PostgreSQL scope row lock FIRST, then outbox row lock, then member revision row lock. Recovery coordinator acquires the same scope lock to transition `READY -> REBUILDING` and increment epoch. This ensures no writer holding the previous epoch can issue a Redis write after the coordinator commits the transition.

**Migration warning:** current writer locks outbox before revision and does not lock scope. Existing writer must be refactored before enabling any rebuild. All XP award/revision updates and outbox claim paths must be audited for lock-order cycles. Do not hold an unbounded Redis request while holding PG locks; bound connect/command duration and retry on failure.

## Rebuild protocol (design, not implemented)

1. Coordinator acquires scope lock, transitions to `REBUILDING`, increments epoch, commits. Normal writer must fail closed while `REBUILDING`.
2. Rebuilder obtains an exclusive, fenced lease for this scope. Only the active generation may publish or finalize. Stale rebuilders are rejected by PostgreSQL checks.
3. Under that exclusion, clear only the fixture-specific ZSET, version hash and epoch metadata; never use `FLUSHALL`, `FLUSHDB`, or wildcard deletion.
4. Compute all member scores and revisions from an authoritative, consistent PostgreSQL snapshot. Scope rebuild must cover ALL members, not merely the pending outbox rows. No XP ledger insert or incremental replay.
5. Publish ZSET, member revision hash, and epoch metadata atomically as one validated generation, or keep scope `REBUILDING` until completion. For large sets, use isolated staging keys plus an atomic cutover. The protocol must prevent stale Redis writes and stale rebuilds across the cutover.
6. Verify complete membership, scores, revisions, epoch, and absence of extra members. Before transitioning to `READY`, prove no relevant PostgreSQL mutations were omitted (e.g. revalidate a scope-wide change sequence or retain a write barrier).
7. Commit `READY` only under the same scope fence. On failure remain `REBUILDING`, retry/resume safely.

**Important:** A Redis-only epoch check cannot prevent a stale writer from restoring old metadata after total key loss. PostgreSQL scope locking and exclusive rebuild ownership are mandatory. A Redis fail-closed check also cannot protect against unfenced legacy `ZADD`/`ZINCRBY` writers. Those paths must be removed/redirected before activation.

## Required real E2E evidence

- Total fixture-only ZSET + version hash loss: normal writer denied before rebuild; rebuilt absolute PG score/revision correct.
- Redis epoch metadata missing or mismatched: normal writer denied.
- Writer started before epoch transition: cannot write after transition; old generation rejected.
- Two concurrent rebuilders: only one generation can publish/finalize.
- PostgreSQL score decrease and concurrent XP mutation during rebuild: final Redis projection matches committed PG state.
- Redis command failure and PG timeout: no false `DONE`; retry is safe.
- No duplicate XP transactions; no other Redis keys touched.
- Legacy writer cutover audit and worker inactive until all tests PASS.

## Status

Recovery A: PASS (connection unavailable + retry only; not server restart).
Recovery B: DESIGN ONLY / NOT LOCKED. No schema migration, service, Lua epoch fence, or Recovery B E2E has been executed.
