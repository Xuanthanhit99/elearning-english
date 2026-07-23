# Arena Production Runbook

## Startup

1. Apply database migrations with `npx prisma migrate deploy` as a controlled release step.
2. Start PostgreSQL and Redis before the backend.
3. Start the backend. Arena startup runs a bounded season lifecycle scan and logs failures without blocking the whole app.
4. Verify `/health`, `/health/ready`, and authenticated `/arena/season/current`.

## Production Compose Release

1. Build the backend, migration, and frontend images with `docker compose -f docker-compose.prod.yml build backend migrate frontend`.
2. Start PostgreSQL, Redis, migration, backend, and frontend with `docker compose -f docker-compose.prod.yml up -d postgres redis migrate backend frontend`.
3. Confirm the `migrate` container exits successfully before accepting backend traffic.
4. Confirm `/health/ready` returns ready before routing users to the backend.
5. Confirm the frontend route `/arena/` serves or redirects correctly through the production frontend container.

## Migrations

- Never use `prisma migrate reset` or `prisma db push` in production.
- Back up PostgreSQL before F3 migrations.
- Roll back application code first if needed; F3 and F3A migrations are additive and can remain in place.
- F3A adds per-component season reward status columns to `ArenaSeasonResult` and backfills them from aggregate `rewardStatus`.

## Season Activation

- Existing enum mapping: `UPCOMING` = scheduled, `ACTIVE` = active, `CALCULATING` = closing, `COMPLETED` = closed.
- Scheduler queue: `arena-season-lifecycle`.
- Manual admin trigger: `POST /arena/admin/season-lifecycle/run`.

## Season Closing

- Expired active seasons transition to `CALCULATING`.
- Ranked queues are removed during closing so users can requeue when the next season opens.
- In-flight matches retain `ArenaMatch.seasonId` and complete into their original season.

## Reward Failure Repair

- Inspect `GET /arena/admin/operations` for failed season rewards.
- Retry lifecycle with `POST /arena/admin/season-lifecycle/run`.
- Rewards use `arena:season:{seasonId}:reward:{userId}:xp` idempotency keys.
- Season rewards track XP, gold, arena point, and notification status independently.
- If one component fails, retry the lifecycle scan after fixing the underlying service; already-granted components are skipped instead of duplicated.
- Verify no duplicate `XpTransaction`, `ArenaRewardLog`, or `ArenaRatingHistory` rows after retry.

## Progression Repair

- Inspect failed/pending records with `GET /arena/admin/operations`.
- Trigger reconciliation with `POST /arena/admin/reconciliation/run`.

## Redis Outage

- Arena HTTP profile/history reads continue except endpoints protected by the distributed Arena limiter.
- Queue, presence, Socket.IO scale-out, BullMQ jobs, and Arena rate limiting require Redis.
- Restore Redis, then trigger reconciliation and season lifecycle scans.
- `/health/ready` should fail while Redis is unavailable.

## PostgreSQL Outage

- Arena gameplay, queueing, progression, and season lifecycle are unavailable.
- Restore PostgreSQL, run `prisma migrate status`, then trigger reconciliation.

## Worker Restart

- BullMQ jobs use deterministic IDs and retries.
- Restarting the backend is safe; workers resume queued lifecycle/reconciliation/decay jobs.

## Queue Cleanup

- Users can call `POST /arena/queue/leave`.
- Season closing deletes waiting ranked queue rows.
- Redis presence keys use TTL and are verified with `arena:*` scans.

## Stale Match Cleanup

- Reconciliation scans finished matches with missing progression.
- Disconnect grace finalizes abandoned SOLO_1V1 matches through the existing server-authoritative forfeit path.

## Health Checks

- `/health` returns process uptime.
- `/health/ready` verifies PostgreSQL, Redis, and the active Arena season requirement.
- `GET /arena/admin/operations` gives Arena-specific operational state.

## Rate Limiting

- Arena HTTP and realtime mutation paths use Redis-backed fixed-window limits.
- Review `ARENA_RATE_LIMIT_ENABLED`, `ARENA_RATE_LIMIT_KEY_PREFIX`, and per-action limit/window variables before release.
- Internal reconciliation, lifecycle, and retry worker paths do not consume user-facing rate-limit quota.
- Production cleanup checks should scan for unexpected `arena:rate-limit:*` residue after tests.

## Logs and Metrics

- Watch lifecycle, reconciliation, decay, progression failure, and notification worker logs.
- Watch Arena rate-limit Redis connection errors and 429 spikes.
- Prometheus/OpenTelemetry integration is deferred; current integration point is structured Nest logs plus admin operations.

## Safe Disables

- `ARENA_ENABLED=false`: disables Arena user API paths without deleting data.
- `ARENA_RANKED_ENABLED=false`: blocks ranked play while preserving reads.
- `ARENA_MATCHMAKING_ENABLED=false`: blocks queueing only.
- `ARENA_DECAY_ENABLED=false`: disables rating decay.
- `ARENA_REWARDS_ENABLED=false`: prevents new season reward grants while snapshots still exist.
- `ARENA_RATE_LIMIT_ENABLED=false`: disables the Arena-specific distributed limiter for emergency recovery only.

## Emergency Season Freeze

1. Set `ARENA_RANKED_ENABLED=false`.
2. Set `ARENA_MATCHMAKING_ENABLED=false`.
3. Keep profile/history reads available.
4. Investigate via `GET /arena/admin/operations`.
5. Re-enable after lifecycle/reconciliation are clean.

## Final Validation Commands

- `npx prisma validate`
- `npx prisma generate`
- `npx prisma migrate status`
- backend build
- frontend build
- frontend typecheck
- focused Arena, leaderboard, achievement, notification, reconciliation, placement, duplicate dispatch, disconnect, zero-effort, rate-limit, and lifecycle tests
- bounded Arena load smoke
- Docker production build/start/readiness/frontend smoke
