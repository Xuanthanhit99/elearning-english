# Stage 7A.2 - Notification Event Contracts, Publisher & BullMQ Pipeline Report

Review date: 2026-07-18

Final Decision: READY_FOR_STAGE_7A3

## Architecture

Implemented pipeline:

```text
Domain Module
  -> NotificationEventPublisher
  -> EventEmitter2
  -> NotificationEventListener
  -> BullMQ notifications queue
  -> NotificationsProcessor
  -> Notification persistence
```

Scope respected:

- No NotificationGateway.
- No Socket.IO/realtime.
- No frontend UI work.
- No full preference implementation.
- No full template mapper.
- No Achievement implementation.
- No Community security work.
- No conversion of all legacy call sites.

Legacy compatibility is preserved. Existing `NotificationsService` APIs and `notification:create` job remain available.

## Event Contracts

Added typed contracts under:

- `backend/src/modules/notifications/contracts/notification-domain-event.ts`
- `backend/src/modules/notifications/contracts/notification-job.payload.ts`
- `backend/src/modules/notifications/contracts/notification-event-type.ts`
- `backend/src/modules/notifications/contracts/notification-context.ts`

Contract fields include:

- `eventId`
- `eventType`
- `eventVersion`
- `occurredAt`
- `recipientUserIds`
- `actorUserId`
- `entityType`
- `entityId`
- `deduplicationKey`
- `priority`
- `expiresAt`
- `context`

Contracts are JSON-serializable and do not contain Request, Response, JWT, Cookie, or Prisma entities.

## Publisher

Added:

- `backend/src/modules/notifications/notification-event-publisher.ts`

Responsibilities:

- Normalize event.
- Generate `eventId` if missing.
- Generate deterministic default `deduplicationKey` with `{recipientId}` placeholder.
- Validate required payload fields.
- Publish through EventEmitter2.

Publisher does not:

- Insert database rows.
- Render templates.
- Check preferences.
- Call BullMQ directly.

## Listener

Added:

- `backend/src/modules/notifications/notification-event.listener.ts`

Responsibilities:

- Receive `notification.domain` event.
- Validate required fields.
- Enqueue `notification:create-from-event`.

Listener does not:

- Insert database rows.
- Render templates.
- Query heavy data.
- Call `NotificationsService.create()`.

## Queue

Existing queue reused:

- `NOTIFICATIONS_QUEUE = 'notifications'`

Added job name:

- `NotificationJobName.CREATE_FROM_EVENT = 'notification:create-from-event'`

No new queue was introduced.

## Processor

Updated:

- `backend/src/modules/notifications/notifications.processor.ts`

New branch:

- `notification:create-from-event`

Responsibilities:

- Validate job payload.
- Resolve per-recipient deduplication key.
- Persist Notification with Stage 7A.1 schema fields:
  - `recipientUserId`
  - `eventType`
  - `eventVersion`
  - `deduplicationKey`
  - `entityType`
  - `entityId`
  - `priority`
  - `expiresAt`
- Recover from Prisma `P2002` duplicate and return existing notification id.

## Payload

Queue payload stays small:

- event metadata
- recipient ids
- actor id
- entity type/id
- dedup key
- priority
- expiry
- minimal JSON context

It does not pass Prisma entities, User objects, Lesson objects, Request, Response, JWT, or Cookie.

## Idempotency

Deduplication uses Stage 7A.1 database protection:

```text
recipientUserId + deduplicationKey
```

Default dedup key pattern:

```text
notification:{eventType}:{recipientId}:{entityId}:{eventVersion}
```

Implementation detail:

- Publisher creates a base key with `{recipientId}` placeholder.
- Processor resolves the placeholder for each recipient.
- If duplicate insert raises Prisma `P2002`, processor queries existing notification and returns idempotent result.
- Duplicate does not become a 500 and does not require infinite retry.

## Logging

Logs include:

- `eventType`
- `eventId`
- recipient
- `dedupKey`
- `jobId`

Logs do not include JWT, Cookie, secrets, or unnecessary PII.

## Tests

Added tests:

- `notification-event-publisher.spec.ts`
- `notification-event.listener.spec.ts`
- `notifications.processor.spec.ts`

Covered:

- Publisher normalization and EventEmitter2 publish.
- Publisher validation.
- Listener BullMQ enqueue and job options.
- Processor success persistence using Stage 7A.1 schema.
- Processor duplicate `P2002` recovery.

Existing Notification specs remain compatible.

## Build

Commands run:

- `git diff --check`: PASS, only existing LF/CRLF warnings on Windows.
- `npx prisma validate`: PASS.
- `npx prisma generate`: PASS.
- `npx jest --listTests`: PASS.
- `npm test -- notifications --runInBand`: PASS.
- `npm run build` in `backend`: PASS.
- `npm run build` in `english-web-build`: PASS.

## Remaining Work

Deferred to later stages:

- Full Notification template mapper.
- Full Notification preference enforcement.
- Cleanup job for `expiresAt`.
- Realtime `NotificationGateway`.
- Frontend notification realtime/infinite-scroll upgrades.
- Achievement pipeline.
- Conversion of all legacy Notification call sites.
- Domain modules publishing real events through `NotificationEventPublisher`.

Final Decision: READY_FOR_STAGE_7A3
