# Stage 7A Codex Independent Review - Notification Backend Core

Review date: 2026-07-18

Scope: Notification Backend Core only. No NotificationGateway/realtime, no frontend UI build-out, no Achievement implementation, no CommunityGateway fix.

Production Decision: HIDE
Migration Decision: NOT_APPLIED
Stage 7B Gate: CLOSED

## 1. Executive Summary

Status: PARTIAL

The current codebase still contains a legacy Notification module, not the full Stage 7A backend core described in the Stage 7 architecture documents. Existing REST APIs and simple notification persistence work, but Stage 7A contracts, domain-event publishing/listening, template mapping, dedup strategy, full preference enforcement, migration/indexing, and cleanup jobs are missing or incomplete.

Small fixes applied in this review:

- Fixed Notification unit-test dependency injection so Notification specs run successfully.
- Improved Notification type inference for Vietnamese text by normalizing accents before matching.

## 2. Documents Reviewed

Status: PARTIAL

- PASS: `docs/stage7-notification-achievement-architecture-audit.md`
- PASS: `docs/stage7-prerequisites-resolution.md`
- PASS: `docs/stage7-architecture-decisions.md`
- PASS: `docs/stage7-implementation-plan.md`
- FAIL: `docs/stage7a-notification-backend-core-report.md` was not found.

## 3. Git State Before Review

Status: PASS

Commands reviewed:

- `git status`
- `git diff --stat`
- `git diff --name-only`
- `git diff --check`

Working tree was already dirty before this review. Most existing changes are Listening/config/docs related and were not modified by this review.

Files changed by this review:

- `backend/src/modules/notifications/notifications.controller.spec.ts`
- `backend/src/modules/notifications/notifications.service.spec.ts`
- `backend/src/modules/notifications/notifications.service.ts`
- `docs/stage7a-codex-independent-review.md`

## 4. Stage 7A Preconditions

Status: PARTIAL

1. Settings UI shows Notification preferences: PASS. `english-web-build/src/Components/settings/settings-page.tsx` displays `missionReminder`, `clubNotification`, `leaderboardNotification`, `aiFeedbackNotification`, `pushNotification`, and `emailNotification`.
2. No Realtime/Gateway work in 7A: PASS. Notification module has no gateway.
3. No Achievement work in 7A: PASS. No Achievement module changes were made in this review.
4. Do not modify `CommunityGateway`: PASS. No CommunityGateway file was modified.
5. Migration process: PARTIAL. No Stage 7A migration exists/applied. Existing migration status is up to date, but required Notification schema changes are absent.

## 5. Source Inventory

Status: PASS

Notification backend files found:

- `backend/src/modules/notifications/notifications.constants.ts`
- `backend/src/modules/notifications/notifications.controller.ts`
- `backend/src/modules/notifications/notifications.module.ts`
- `backend/src/modules/notifications/notifications.processor.ts`
- `backend/src/modules/notifications/notifications.scheduler.ts`
- `backend/src/modules/notifications/notifications.service.ts`
- `backend/src/modules/notifications/notifications.types.ts`
- `backend/src/modules/notifications/settings-updated.listener.ts`

## 6. Notification Contract

Status: FAIL

Current contract is `CreateNotificationInput` with only `userId`, `title`, `message`, optional `type`, optional `href`.

Missing Stage 7A fields/capabilities:

- event key/source
- template key
- dedup key
- priority
- metadata
- channels
- actor/context
- preference category mapping

## 7. Event Publisher

Status: FAIL

No dedicated Notification event publisher was found. Other modules call `NotificationsService.createFromPayload()` directly, and some modules write directly to Prisma Notification.

Direct creation locations include:

- `backend/src/modules/community/`
- `backend/src/modules/community-social/`
- `backend/src/modules/community-club/`
- `backend/src/modules/leaderboard/`
- `backend/src/modules/missions-v2/`
- `backend/src/modules/courses/courses.service.ts`
- `backend/src/modules/payments/payments.service.ts`

## 8. Event Listeners

Status: PARTIAL

Only `settings.updated` listener exists for reminder scheduling. No Stage 7A domain listeners exist for Mission, Achievement, Learning Path, Community, XP, Streak, or lessons.

## 9. BullMQ Queue

Status: PARTIAL

Queue exists: `NOTIFICATIONS_QUEUE = 'notifications'`.

Existing job names:

- `notification:create`
- `notification:daily-reminders`
- `notification:weekly-goals`
- `notification:user-daily-reminder`

Missing:

- standardized create-many job
- digest job
- cleanup job
- retry/backoff policy standard
- job payload validation

## 10. Processor

Status: PARTIAL

Processor handles basic create and scheduled reminder jobs. It does not apply the full Stage 7A contract, template mapping, preference category checks, structured metadata, idempotent dedup, or channel routing.

## 11. Persistence

Status: FAIL

Current Prisma model:

- `id`
- `userId`
- `title`
- `message`
- `isRead`
- `createdAt`

Missing Stage 7A persistence fields:

- `type`
- `href`
- `readAt`
- `metadata`
- `templateKey`
- `dedupKey`
- `source`
- `priority`
- indexes for `userId/isRead/createdAt`

## 12. Template Mapping

Status: FAIL

No template mapping layer exists. Current implementation stores plain title/message and later infers type/href from formatted text.

Applied fix: `NotificationsService.inferType()` now normalizes Vietnamese accents before matching, reducing wrong type inference for valid Vietnamese strings.

## 13. Deduplication

Status: PARTIAL

`createOncePerDay()` dedups by `userId + formatted title + createdAt >= startOfDay`. This is too weak for Stage 7A because different event sources with the same title can collapse into one notification, and retries are not idempotent by event/dedup key.

## 14. Preferences

Status: PARTIAL

`UserSettings` has 8 notification preference fields, but runtime enforcement is incomplete.

Enforced:

- `dailyReminderEnabled`
- `pushNotification`
- `missionReminder`

Not enforced by Notification core:

- `friendActivity`
- `clubNotification`
- `leaderboardNotification`
- `aiFeedbackNotification`
- `emailNotification`

Direct Notification writes can bypass preferences entirely.

## 15. Scheduler

Status: PARTIAL

Scheduler creates daily and weekly repeatable jobs and syncs per-user daily reminders from settings. However:

- daily/weekly reminder jobs process only `take: 500`
- no pagination/batching for all active users
- no cleanup scheduler
- user-facing Vietnamese reminder strings are mojibake in source

## 16. Cleanup

Status: FAIL

No cleanup/retention job was found for old notifications.

## 17. REST API

Status: PARTIAL

Existing endpoints:

- `GET /notifications`
- `GET /notifications/unread-count`
- `POST /notifications/read`
- `POST /notifications/read-all`
- `DELETE /notifications/:id`
- legacy `PATCH /notifications/:id/read`
- legacy `PATCH /notifications/read-all`

The REST surface is frontend-compatible, but response fields are inferred from title/message instead of persisted structured fields.

## 18. Pagination

Status: PARTIAL

Pagination exists with max limit 50. Ordering is only `createdAt desc`; add deterministic tie-breaker such as `{ createdAt: 'desc' }, { id: 'desc' }` when Stage 7A schema is finalized.

## 19. Security

Status: PARTIAL

Notification REST APIs use `JwtAuthGuard` and derive user from `req.user.id`. Frontend notification API uses cookie-based axios and does not pass tokens.

Out-of-scope security issue noted: `LeaderboardCookieAuthService` reads `access_token` cookie but verifies with `JWT_SECRET`, while HTTP JWT uses `JWT_ACCESS_SECRET`. This belongs to socket auth hardening, not Stage 7A backend core.

## 20. Prisma Schema

Status: PARTIAL

`npx prisma validate`: PASS

`model Notification` is valid but not Stage 7A-ready. It has no Notification-specific indexes and no structured fields required by the Stage 7 architecture decisions.

## 21. Migrations

Status: PARTIAL

`npx prisma migrate status`: PASS, database is up to date.

No Stage 7A Notification migration was found. Existing init migration creates the legacy Notification table only.

## 22. Backend Tests

Status: PARTIAL

Initial Notification test run failed due dependency injection setup in specs.

Fix applied:

- mocked `PrismaService` in `notifications.service.spec.ts`
- mocked `NotificationsService` in `notifications.controller.spec.ts`

After fix:

- `npx jest src/modules/notifications --runInBand`: PASS

Coverage remains shallow and does not validate Stage 7A behavior.

## 23. Frontend Compatibility

Status: PASS

Notification frontend API maps current backend routes:

- `GET /notifications`
- `GET /notifications/unread-count`
- `POST /notifications/read`
- `POST /notifications/read-all`
- `DELETE /notifications/:id`

Frontend build:

- `npm run build` in `english-web-build`: PASS

## 24. Dashboard Compatibility

Status: PARTIAL

Dashboard reads recent notifications from Prisma and maps legacy fields. It will continue to work with current shape, but it is not ready for Stage 7A structured notification fields until backend contract/schema are finalized.

## 25. Module Dependency Injection

Status: PASS

`NotificationsModule` imports `PrismaModule` and registers the BullMQ queue. Backend build passed after test fixes.

## 26. Performance

Status: PARTIAL

Risks:

- no Notification indexes for common reads
- scheduled jobs process only first 500 users
- direct notification creation paths can create duplicate load
- no deterministic pagination tie-breaker

## 27. Fixed Issues

Status: PASS

Fixed:

- Notification controller spec dependency injection.
- Notification service spec dependency injection.
- Vietnamese Notification type inference for normalized text.

Not fixed because it requires Stage 7A implementation/migration:

- full contract
- schema migration
- event publisher/listeners
- preference engine
- structured templates
- dedup key/index
- cleanup job

## 28. Remaining Critical Issues

Status: FAIL

Critical:

1. Stage 7A backend core is not implemented as specified.
2. Notification schema cannot support required structured Notification features.
3. Preferences are not centrally enforced and direct writes bypass them.
4. No Stage 7A implementation report exists.

Medium:

1. Reminder text in source contains mojibake.
2. Scheduler is capped at 500 users.
3. Pagination lacks tie-breaker.
4. Tests are only smoke-level.

## 29. Verification Commands

Status: PARTIAL

- `git status`: PASS
- `git diff --stat`: PASS
- `git diff --name-only`: PASS
- `git diff --check`: PASS, only LF-to-CRLF warnings
- `npx jest --listTests`: PASS
- `npx jest src/modules/notifications --runInBand`: PASS
- `npx prisma format`: PASS
- `npx prisma validate`: PASS
- `npx prisma generate`: PASS after retry
- `npx prisma migrate status`: PASS
- `npm run build` in `backend`: PASS
- `npm run build` in `english-web-build`: PASS

## 30. Required Next Actions

Status: FAIL

Before opening Stage 7B:

- Implement Stage 7A Notification contract and DTO validation.
- Add event publisher and domain listeners.
- Add or migrate structured Notification fields with safe Prisma migration.
- Add indexes for Notification reads/dedup.
- Replace direct Prisma Notification writes with the Notification core path.
- Enforce all Notification preferences centrally.
- Add template mapping and stable href/type persistence.
- Add cleanup scheduler.
- Fix mojibake reminder strings in source and any existing seeded data if needed.
- Expand tests for queue, processor, preferences, dedup, REST ownership, pagination, and cleanup.

Final decisions:

- Production Decision: HIDE
- Migration Decision: NOT_APPLIED
- Stage 7B Gate: CLOSED
