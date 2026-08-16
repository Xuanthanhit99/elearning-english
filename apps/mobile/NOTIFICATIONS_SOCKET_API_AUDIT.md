# BeaconVie Notifications + Socket.IO API Audit

## Notifications

1. List endpoint: `GET /notifications` in `backend/src/modules/notifications/notifications.controller.ts`, implemented by `NotificationsService.findMyNotifications`.
2. Pagination: page/limit query params, max limit 50, response `{ items, meta: { page, limit, total, unreadCount, hasMore } }`.
3. Unread count: `GET /notifications/unread-count`, response `{ unreadCount }`.
4. Mark one read: `PATCH /notifications/:id/read` and legacy `POST /notifications/read`; idempotent for already-read rows.
5. Mark all read: `PATCH /notifications/read-all` and legacy `POST /notifications/read-all`; bulk `updateMany`, idempotent.
6. Preferences: `GET /settings/notifications`, `PATCH /settings/notifications`; fields include daily reminders, mission/friend/club/leaderboard/AI feedback/email/push preferences.
7. Delete/archive: `PATCH /notifications/:id/archive` and `DELETE /notifications/:id`; both soft archive and mark read.
8. Notification types: DTO `type` is inferred legacy union `MISSION | ACHIEVEMENT | LEARNING_REMINDER | DAILY_GOAL | WEEKLY_GOAL | LEARNING_PATH | COMMUNITY | SYSTEM`; stored `eventType` uses `NotificationEventType`.
9. Payload shape: DTO includes `id`, `title`, `message`, `type`, `href`, `eventType`, `priority`, `isRead`, `read`, `readAt`, `archivedAt`, `expiresAt`, `createdAt`.
10. Route/action metadata: `href` is inferred by `NotificationsService.inferHref` from embedded `href=` or type fallback; web sanitizes via `english-web-build/src/lib/notification-navigation.ts`.
11. Realtime notification event: `/notifications` namespace emits `notification:created`, `notification:updated`, `notification:archived`, `notification:unread-count`, `notification:connected`, `notification:unauthorized`.
12. Persistence before socket emission: `NotificationsService.create` persists before `emitChanged`; domain-event based creation persists in the processor/service path before `emitNotificationCreated`.

## Socket.IO

13. Existing namespaces: `/notifications`, `/community`, `/documents`, `/arena`, `/study-room`, `/leaderboard`; community club/social services forward through `/community`.
14. Existing authentication code: `NotificationCookieAuthService`, `CommunityGateway.authenticate`, `ArenaCookieAuthService`, `StudyRoomCookieAuthService`, `LeaderboardCookieAuthService` verified JWT access tokens from cookies.
15. Cookie extraction: cookie header is parsed for `access_token`.
16. JWT validation: socket auth uses `JwtService.verify` with `getJwtAccessSecret()`, not decode-only.
17. Session/revocation validation: current realtime revocation semantics are ban/suspension checks via `AuthSessionService.isBanned(user.id)` in notification/community/document gateways; HTTP refresh-session revocation remains refresh-token based.
18. User room behavior: notifications and community join `user:${userId}`; documents join document rooms on subscribe.
19. Connection/disconnection flow: invalid auth emits namespace-specific unauthorized event then `disconnect(true)`; notifications emit connected on success.
20. Web connection behavior: web uses `withCredentials: true` in `english-web-build/src/lib/notification-socket.ts` and `english-web-build/src/lib/community-socket.ts`, relying on HttpOnly cookie auth.
21. Bearer handshake auth before changes: no reusable mobile `handshake.auth.token` support existed for `/notifications` or `/community`.
22. Gateways that could reuse a shared extractor: notification, community, documents, arena, study-room, leaderboard.
23. Community event architecture: `/community` emits `community:post-created`, `post-updated`, `post-deleted`, `comment-created`, `comment-updated`, `comment-deleted`, `reaction-updated`, plus user/conversation/club events.
24. Notifications event architecture: notifications are persisted HTTP/domain records and gateway events mirror created/updated/archive/unread count changes.
25. Companion/Arena future compatibility: the raw `handshake.auth.token` plus cookie extractor can be reused by future authenticated namespaces without query-string JWT transport.
