# Phase 12 Admin Backoffice Production Report

## Phase 12 Inventory

### KEEP
- Existing JWT HttpOnly cookie authentication.
- Existing `JwtAuthGuard`, `RolesGuard`, `@Roles(UserRole.ADMIN)`.
- Existing `AdminDashboardModule` route namespace: `/admin-dashboard`.
- Existing `AuditLogModule` and `AuditLogService`.
- Existing production data models for users, courses, vocabulary, grammar, reading, listening, speaking, writing, placement, community, missions, notifications, achievements, leaderboard, and processing jobs.

### EXTEND
- `AdminDashboardController`
- `AdminDashboardService`
- Admin sidebar entry in the shared app sidebar.
- New production admin frontend page at `/admin`.

### MISSING BEFORE PHASE 12
- Unified admin dashboard beyond revenue.
- User management operations.
- Generic content operations.
- Community moderation operations.
- Queue and health visibility.
- Feature flag visibility.
- Audit log browser.
- Admin frontend.

### NOT REPLACED
- Auth module.
- Role guard.
- Community module.
- Notification module.
- Mission module.
- Achievement module.
- BullMQ worker implementation.

## Existing Code Reused
- `UserRole.ADMIN` for authorization.
- `JwtAuthGuard` and `RolesGuard`.
- `AuditLogService.record()` for admin mutations.
- Existing Prisma models and indexes.
- Shared frontend axios client with `withCredentials: true`.
- Shared responsive sidebar/header shell.

## Major Fixes
- Added admin overview API: `GET /admin-dashboard`.
- Added user list/profile/action APIs.
- Added generic content list/status API.
- Added community post and club moderation APIs.
- Added audit log API.
- Added operations API for queues, health, feature flags, settings, and cron visibility.
- Added frontend `/admin` backoffice page with tabs, loading, empty states, search, refresh, safe actions, and responsive tables.
- Added sidebar menu item: Admin.

## Admin Dashboard Completed
- Users: total, active, banned, registrations today, teachers, admins.
- Content: courses, lessons, vocabulary, grammar, reading, listening, speaking, writing, placement questions.
- Community: posts, comments, clubs.
- Operations: notifications, missions, achievements, leaderboard seasons, audit logs, queues, health.

## Content Management Completed
- Generic content API supports:
  - `VOCABULARY`
  - `GRAMMAR`
  - `READING`
  - `LISTENING`
  - `SPEAKING`
  - `WRITING`
  - `PLACEMENT`
  - `COURSE`
- Supports pagination, search, status filters where the underlying model supports them.
- Supports safe status updates:
  - publish / draft / archive behavior mapped to existing model fields.
  - no hard delete.
  - every status change is audit logged.

## Moderation Completed
- Community post moderation:
  - hide
  - restore
  - soft delete
- Club moderation:
  - archive
  - restore
  - transfer owner
- All moderation actions write audit logs.

## Queue Monitoring Completed
- Queue visibility added through existing processing job tables:
  - writing processing jobs
  - speaking processing jobs
  - placement processing jobs
- Shows waiting, active, completed, failed, total.
- UI does not restart workers.
- Retry/remove controls are intentionally not exposed until BullMQ queue instances are safely injectable.

## Audit Logs Completed
- `GET /admin-dashboard/audit-logs`
- Search by action, admin email, or admin name.
- Shows action, changed fields, metadata, IP, user agent, created time, admin user.
- Admin mutations avoid password/token/secret logging.

## Health Dashboard Completed
- API uptime.
- DB status and latency via `SELECT 1`.
- Redis/BullMQ visibility based on configured app bootstrap and processing job monitor.
- Scheduler status.
- Memory usage.

## Feature Flags Completed
- Runtime read visibility for:
  - placement
  - leaderboard
  - community
  - AI writing
  - AI speaking
  - notifications
  - recommendations
- Runtime writes are deferred because there is no persistent feature flag/system settings table yet.

## Backend Verification
- `npx prisma validate`: PASS.
- Backend TypeScript check via `tsconfig.build.json`: PASS.
- `npm run build` in `backend`: PASS.

## Frontend Verification
- Scoped ESLint for admin/sidebar/i18n/admin API files: PASS.
- Frontend TypeScript check: PASS.
- `npm run build` in `english-web-build`: PASS.

## Known Limitations
- Feature flags and system settings are read-only defaults until a persistent operations settings table is added.
- Queue retry/remove is not exposed because no shared BullMQ queue registry is currently wired into admin safely.
- Report/abuse workflow model was not found in the current Prisma schema, so no new report database schema was added in this phase.
- Notification broadcast/schedule/cancel UI is not added here because the requirement says reuse the notification pipeline and avoid manual DB insertion; this needs a dedicated admin-safe command surface in the notification module.
- Permission matrix beyond `UserRole.ADMIN` is not added because no existing permission model was found; existing role guard is kept.

## Production Decision
READY_WITH_LIMITATIONS

The core admin backoffice is safe to expose only to `UserRole.ADMIN`. It can support production operations for overview, users, content status, moderation, audit, health, and queue visibility. Advanced operations that require new persistence or direct BullMQ queue mutation remain intentionally limited.

## Next Stage Gate
- Add persistent feature flag/system setting storage.
- Add an admin-safe notification broadcast/scheduler command API.
- Add formal report/abuse models and workflow.
- Add BullMQ queue registry with retry/remove policies and audit log wrapping.
- Add e2e admin route authorization tests.
