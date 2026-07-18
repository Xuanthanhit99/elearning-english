# Phase 1 Execution Plan

This plan is based on source audited on 2026-07-18, not copied from the original audit prompt.

## Completed In This Pass

### Stage 0 - Baseline/source map

- Read backend module structure.
- Read frontend shared API structure.
- Read Prisma schema and migration list.
- Read Auth, Settings, 2FA, device session, JWT strategy, global validation and shared API client.
- Created `docs/phase1-current-state.md`.

### Stage 1 - Auth production

- Enforce local-login 2FA before issuing cookies.
- Keep refresh/access tokens in HttpOnly cookies only.
- Remove access token from login response.
- Restrict JWT strategy to cookie extraction only.
- Add login DTO whitelist for 2FA fields.
- Guard `check-username` because it reads authenticated user.
- Use shared API client for logout and environment-based API URL.
- Fix build blockers discovered during Stage 1 verification.

## Remaining Phase 1 Stages

### Stage 2 - Shared API, loading, error handling

- Add/verify global exception filter.
- Normalize frontend API errors.
- Add error boundary and retry states to P0 screens.
- Prioritize Dashboard, Learning Path, Vocabulary, Grammar, Writing, Speaking, Listening, Notifications, History and Result.

### Stage 3 - Dashboard and Learning Path

- Verify existing dashboard endpoint before adding anything.
- Remove mock data from dashboard widgets.
- Ensure Learning Path start/resume/complete/lock/unlock is user-owned and idempotent.
- Check query count and indexes for dashboard aggregation.

### Stage 4 - Mission, Progress, XP, Coins, Streak, Pet, Leaderboard events

- Build event matrix from actual code.
- Verify reward idempotency with source/event keys.
- Ensure queue retry and browser refresh cannot double-reward.
- Validate timezone handling for streak.

### Stage 5 - Vocabulary production flow

- Verify weekly plan bootstrap/fill.
- Prevent duplicate words within the same daily/extra session.
- Verify daily completion vs extra learning separation.
- Verify SRS review and Gemini fallback.

### Stage 6 - Writing, Speaking, Listening

- Process one module at a time: Writing, then Speaking, then Listening.
- Verify start/save/submit/queue/status/result/history/retry/failed state.
- Ensure AI/queue retry emits learning event once.

### Stage 7 - Notifications minimal

- Verify list/read/read-all/delete/unread count.
- Add pagination and ownership checks if missing.
- Ensure mission/achievement notifications are not duplicated on retry.

### Stage 8 - Production build and deploy readiness

- Backend build, Prisma generate, migrate deploy readiness.
- Frontend production build and public/private env review.
- Docker/deploy/health/rollback checklist.

## Do Not Do In Phase 1 Unless Blocking

- Payment production hardening.
- Arena advanced realtime.
- AI Lesson Builder full production flow.
- Offline cache/PWA.
- Advanced AI reports.

