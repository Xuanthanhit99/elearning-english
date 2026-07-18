# Stage 7A.1 - Notification Schema, Migration & Deduplication Report

Review date: 2026-07-18

Final Decision: READY_FOR_STAGE_7A2

## Audit

Scope respected:

- No NotificationGateway.
- No realtime.
- No frontend feature work.
- No Achievement work.
- No Event Publisher/Listener/Pipeline implementation.

Files reviewed:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*/migration.sql`
- `backend/src/modules/notifications/*`
- `docs/stage7-architecture-decisions.md`
- `docs/stage7-implementation-plan.md`
- `docs/stage7a-codex-independent-review.md`

Existing model before Stage 7A.1:

- `id`
- `userId`
- `title`
- `message`
- `isRead`
- `createdAt`

Existing indexes before Stage 7A.1:

- `Notification_pkey`

Existing unique constraints before Stage 7A.1:

- primary key on `id`

Existing Notification-related migrations:

- `20260625154539_init` creates legacy `Notification`.
- `20260714180542_add_user_settings` creates notification preference fields in `UserSettings`.
- `20260719123000_stage7a1_notification_schema_deduplication` adds Stage 7A.1 schema foundation.

## Schema Changes

Added enum:

- `NotificationPriority`: `LOW`, `NORMAL`, `HIGH`

Added fields:

- `recipientUserId String?`
- `eventType String?`
- `eventVersion Int @default(1)`
- `deduplicationKey String?`
- `entityType String?`
- `entityId String?`
- `priority NotificationPriority @default(NORMAL)`
- `expiresAt DateTime?`

Kept legacy fields:

- `userId`
- `title`
- `message`
- `isRead`
- `createdAt`

Reason: legacy APIs and direct write paths still exist until Stage 7A.2 replaces creation with the event pipeline.

## Migration

Migration created:

- `backend/prisma/migrations/20260719123000_stage7a1_notification_schema_deduplication/migration.sql`

Migration applied with:

- `npx prisma migrate dev --skip-generate`

No reset and no `db push` were used.

`npx prisma migrate status`: PASS

## SQL Review

SQL operations:

- Create `NotificationPriority` enum.
- Add Stage 7A.1 columns.
- Backfill `recipientUserId = userId` for legacy rows.
- Create unique index on `recipientUserId + deduplicationKey`.
- Create unread/pagination index on `recipientUserId + isRead + createdAt`.

PostgreSQL safety:

- No delete.
- No destructive data rewrite.
- Existing notification rows are preserved.
- `deduplicationKey` remains nullable so legacy historical rows do not block migration.
- PostgreSQL unique index permits multiple `NULL` deduplication keys, which is intentional for legacy compatibility.

## Existing Data

Database audit before migration:

- Total notifications: 4
- Legacy duplicate same-day groups: 0
- Invalid user references: 0
- Null legacy required fields: 0

Result: PASS

## Backfill

Backfill performed:

```sql
UPDATE "Notification"
SET "recipientUserId" = "userId"
WHERE "recipientUserId" IS NULL;
```

Database verification after migration:

- Total notifications: 4
- `recipientUserId` backfilled: 4
- `eventVersion` non-null: 4
- `deduplicationKey` non-null: 0

The legacy rows intentionally keep `deduplicationKey = NULL` because deterministic historical domain event keys cannot be reconstructed safely.

## Constraint

Unique index exists:

- `Notification_recipientUserId_deduplicationKey_key`

Runtime verification:

- Duplicate insert with same `recipientUserId + deduplicationKey` inside rollback transaction failed with PostgreSQL code `23505`.

Result: PASS

## Index

Indexes after migration:

- `Notification_pkey`
- `Notification_recipientUserId_deduplicationKey_key`
- `Notification_recipientUserId_isRead_createdAt_idx`

Unread list query:

- `WHERE recipientUserId = ? AND isRead = false ORDER BY createdAt DESC LIMIT ?`
- Uses `Notification_recipientUserId_isRead_createdAt_idx`.

Unread count:

- `WHERE recipientUserId = ? AND isRead = false`
- Covered by `Notification_recipientUserId_isRead_createdAt_idx`.

Dedup lookup:

- `WHERE recipientUserId = ? AND deduplicationKey = ?`
- Protected by `Notification_recipientUserId_deduplicationKey_key`.

Archive:

- Not implemented in Stage 7A.1.

Cleanup:

- Supported by `expiresAt` field at schema level.
- Cleanup job is intentionally deferred to later Stage 7A work.

Scheduler:

- Existing scheduler remains unchanged except service compatibility with `recipientUserId`.

## Code Compatibility

Minimal backend compatibility update:

- `NotificationsService.create()` now writes `recipientUserId`.
- read/count/update/delete methods use `recipientUserId` with legacy fallback to `userId` when `recipientUserId` is null.
- `createOncePerDay()` also scopes by `recipientUserId` with legacy fallback.

No event pipeline was added.

## Build

Commands:

- `npx prisma format`: PASS
- `npx prisma validate`: PASS
- `npx prisma generate`: PASS after stopping backend Node processes holding Prisma DLL
- `npx prisma migrate status`: PASS
- `npm run build` in `backend`: PASS
- `npm run build` in `english-web-build`: PASS

Note:

- `prisma generate` initially failed because running backend Node processes locked `query_engine-windows.dll.node`. After stopping the workspace backend Node processes, generation passed.

## Test

Commands:

- `npx jest src/modules/notifications --runInBand`: PASS

Database verification:

- Actual PostgreSQL columns verified: PASS
- Actual PostgreSQL indexes verified: PASS
- Actual PostgreSQL unique behavior verified: PASS

## Remaining Work

Required in Stage 7A.2:

- Add Notification event contract DTOs.
- Add Event Publisher.
- Add Event Listeners.
- Add BullMQ event pipeline.
- Add Template Mapper.
- Generate deterministic non-null `deduplicationKey` for every new event-created notification.
- Replace direct Prisma notification writes.
- Enforce all Notification preferences centrally.
- Add cleanup processor/job for `expiresAt`.

Limitations after Stage 7A.1:

- `deduplicationKey` is nullable for legacy compatibility.
- Direct legacy writes outside `NotificationsService` can still create rows without `recipientUserId` and `deduplicationKey`.
- Full idempotency for all new domain events requires Stage 7A.2 pipeline implementation.

Final Decision: READY_FOR_STAGE_7A2
