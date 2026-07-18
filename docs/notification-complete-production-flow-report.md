# Notification Complete Production Flow Report

Stage: 7A.4 + 7A.5 + 7B
Date: 2026-07-19
Scope: Notification only. Achievement was not implemented in this stage.

## Final Decision

READY FOR PHASE 1 NOTIFICATION USE, with one external limitation:

- Frontend `next build --webpack` passes.
- Frontend `npx tsc --noEmit` passes.
- Frontend `npm run lint` still fails because the repository already contains many lint errors outside the notification flow, mainly Arena/Reading/Writing hook rules and `any` usage. Notification-specific TypeScript/build checks pass.

## Implemented

- Added `readAt` and `archivedAt` to `Notification`.
- Added production indexes for archived/read pagination and unread queries.
- Added migration `20260719133000_stage7a4_notification_read_archive`.
- Applied migration locally with `prisma migrate deploy`.
- Added soft archive via `PATCH /notifications/:id/archive`.
- Kept `DELETE /notifications/:id` as compatibility path, now soft-archives.
- Added idempotent read-one and read-all with cutoff timestamp.
- Excluded archived and expired notifications from list and unread count.
- Added cleanup BullMQ job and scheduler.
- Added dedicated Notification Socket.IO gateway on `/notifications`.
- Socket auth uses JWT HttpOnly cookie `access_token`.
- Socket auth uses `JWT_ACCESS_SECRET`.
- Socket does not trust client-provided `userId`.
- Realtime rooms use `user:{verifiedUserId}`.
- Realtime emits created, updated, archived, and unread-count events.
- Legacy notification call sites no longer insert notifications directly.
- Legacy `createFromPayload/createOncePerDay` now route through `NotificationEventPublisher`.
- Removed direct `prisma.notification.create` from non-notification modules.
- Hardened template URLs so frontend navigation only accepts internal paths.
- Added notification store, realtime client, REST reconciliation, drawer, center page, and settings save.
- Fixed leaderboard socket auth to use `JWT_ACCESS_SECRET`.

## API Coverage

| API | Status |
| --- | --- |
| `GET /notifications` | Done |
| `GET /notifications/unread-count` | Done |
| `PATCH /notifications/:id/read` | Done |
| `PATCH /notifications/read-all` | Done |
| `PATCH /notifications/:id/archive` | Done |
| `DELETE /notifications/:id` | Compatibility soft archive |
| `GET /settings/notifications` | Done |
| `PATCH /settings/notifications` | Done |

## Legacy Call Site Status

| Module | Old path | Current path | Status |
| --- | --- | --- | --- |
| Courses | `prisma.notification.create` | `NotificationsService.createFromPayload -> publisher -> BullMQ` | Migrated |
| Community social | `createFromPayload` | Event adapter pipeline | Migrated |
| Community club | `createFromPayload` | Event adapter pipeline | Migrated |
| Community processor | `createFromPayload` | Event adapter pipeline | Migrated |
| Mission V2 reward | `createFromPayload` | Event adapter pipeline | Migrated |
| Mission V2 progress | `createOncePerDay` | Event adapter pipeline | Migrated |
| Leaderboard reward | `createFromPayload` | Event adapter pipeline | Migrated |
| Leaderboard weekly close | `createFromPayload` | Event adapter pipeline | Migrated |
| Notification scheduler | `createOncePerDay` | Event adapter pipeline | Migrated |

## Security

- REST endpoints use current authenticated user.
- Notification reads/updates are scoped by `recipientUserId` or legacy fallback ownership.
- Frontend notification flow does not send `Authorization`, `Bearer`, `accessToken`, or `refreshToken`.
- Frontend socket uses `withCredentials: true`.
- Notification socket rejects missing or invalid cookie.
- External notification URLs are not trusted.

## Verification

| Check | Result |
| --- | --- |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx prisma migrate deploy` | PASS |
| `npx prisma migrate status` | PASS, database up to date |
| Backend tests: `npm test -- notification settings courses leaderboard --runInBand` | PASS, 12 suites / 29 tests |
| Backend build: `npm run build` | PASS with `NODE_OPTIONS=--max-old-space-size=4096` |
| Frontend typecheck: `npx tsc --noEmit` | PASS |
| Frontend build: `npx next build --webpack` | PASS |
| Frontend default Turbopack build | ENV LIMITATION, worker OOM before TypeScript |
| `git diff --check` | PASS, only line-ending warnings |
| Frontend lint | FAIL outside notification scope, 520 existing issues |

## Remaining Risks

- Frontend lint must be cleaned in a separate regression pass because the failures are spread across Arena, Reading, Writing, hooks, and shared API files.
- Some domain modules still call the compatibility methods `createFromPayload/createOncePerDay`; these methods now publish typed notification events and do not insert directly. A later cleanup can inject `NotificationEventPublisher` into those modules directly.
- Transactional outbox is still not implemented, consistent with Stage 7 scope.
- Achievement gate remains closed because Achievement is out of scope for this stage.

## Production Checklist

- [x] Notification schema migration created.
- [x] Migration applied locally.
- [x] REST read/read-all/archive completed.
- [x] Soft archive completed.
- [x] Cleanup job completed.
- [x] Gateway completed.
- [x] Cookie auth completed.
- [x] Realtime unread count completed.
- [x] Frontend store completed.
- [x] Notification drawer completed.
- [x] Notification center page completed.
- [x] Settings notification save completed.
- [x] Backend tests pass.
- [x] Backend build passes.
- [x] Frontend typecheck passes.
- [x] Frontend production build passes with Webpack.
- [ ] Clean unrelated frontend lint backlog.
- [ ] Optional direct publisher injection cleanup for legacy adapter call sites.
