# Arena Production Release Checklist

## Environment

- [ ] `FRONTEND_URL` or `CORS_ORIGINS` set in production.
- [ ] `DATABASE_URL` points to production PostgreSQL.
- [ ] Redis host/URL configured.
- [ ] JWT secrets configured.
- [ ] OAuth client IDs and secrets configured with real production values.
- [ ] Review Arena flags: `ARENA_ENABLED`, `ARENA_RANKED_ENABLED`, `ARENA_MATCHMAKING_ENABLED`, `ARENA_SEASON_ENABLED`, `ARENA_REWARDS_ENABLED`, `ARENA_DECAY_ENABLED`.
- [ ] Review rating variables: `ARENA_PLACEMENT_MATCHES`, `ARENA_K_PLACEMENT`, `ARENA_K_PROVISIONAL`, `ARENA_RATING_K_FACTOR`, `ARENA_DEMOTION_BUFFER`.
- [ ] Review season variables: `ARENA_SEASON_DURATION_DAYS`, `ARENA_SEASON_TRANSITION_GRACE_MINUTES`, `ARENA_SEASON_AUTO_CREATE`, `ARENA_SEASON_BASE_MMR`, `ARENA_SEASON_RESET_FACTOR`, `ARENA_SEASON_MIN_MATCHES_FOR_REWARD`.
- [ ] Review matchmaking/abuse variables: `ARENA_REPEAT_OPPONENT_WINDOW_HOURS`, `ARENA_REPEAT_OPPONENT_REWARDED_MATCH_LIMIT`, `ARENA_REPEAT_OPPONENT_RATING_LIMIT`, `ARENA_DISCONNECT_GRACE_MS`.
- [ ] Review Arena rate-limit variables: `ARENA_RATE_LIMIT_ENABLED`, `ARENA_RATE_LIMIT_KEY_PREFIX`, and each per-action limit/window setting.
- [ ] Review frontend build variables: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_SITE_URL`.

## Database

- [ ] Take PostgreSQL backup.
- [ ] Run `npx prisma migrate status`.
- [ ] Run `npx prisma migrate deploy`.
- [ ] Verify no drift/pending migrations.
- [ ] Verify one active Arena season or deliberate controlled unavailable state.
- [ ] Verify F3A reward component status migration is applied once.
- [ ] Verify no duplicate placement, reward, rating history, or progression rows.

## Services

- [ ] PostgreSQL healthy.
- [ ] Redis healthy.
- [ ] Backend healthy.
- [ ] `/health/ready` returns ready with PostgreSQL, Redis, and Arena season checks.
- [ ] Frontend can reach backend via production API URL.
- [ ] BullMQ workers running in backend process or documented worker process.
- [ ] Docker production backend, migration, and frontend images build successfully.
- [ ] Docker production stack starts with migration completed before backend accepts traffic.

## Smoke Test

- [ ] Authenticated user opens Arena.
- [ ] Queue join and cancel work.
- [ ] Two users match exactly once.
- [ ] Questions render without answer leakage.
- [ ] Finish/retry does not duplicate rewards/rating/history.
- [ ] Reconnect path returns authoritative room snapshot.
- [ ] Admin operations endpoint returns Arena health summary.
- [ ] Distributed Arena limiter throttles repeated user actions and isolates different users.
- [ ] Internal reconciliation/lifecycle retries do not consume user-facing rate-limit quota.
- [ ] Season reward partial-failure retry grants only missing components.
- [ ] Achievement duplicate event dispatch uses deterministic job IDs.
- [ ] Bounded Arena load smoke completes and cleans up test data.

## Monitoring

- [ ] Watch backend logs for season lifecycle errors.
- [ ] Watch reconciliation failure count.
- [ ] Watch notification/achievement queue failures.
- [ ] Watch Redis connection errors.
- [ ] Watch rate-limit 429 volume and Redis limiter availability errors.
- [ ] Watch `/health/ready` status during Redis and PostgreSQL maintenance windows.

## Rollback

- [ ] Keep migration in place; F3 and F3A migrations are additive.
- [ ] Roll back application image if needed.
- [ ] Disable ranked/matchmaking with env flags during investigation.
- [ ] Disable Arena-specific rate limiting only for emergency recovery and restore after Redis is healthy.
- [ ] Trigger reconciliation after restoring service.

## Post-Deploy

- [ ] `arena:*` Redis test keys are zero.
- [ ] No failed Arena BullMQ jobs beyond known retry windows.
- [ ] Active season visible in `/arena/season/current`.
- [ ] No duplicate `ArenaRewardLog` or `ArenaRatingHistory` rows.
- [ ] No leftover F3A load-smoke users, rooms, queues, progression rows, or season results.
- [ ] Production frontend serves `/arena/` through the deployed image.
