# Phase 16 Push Readiness Audit

Status: NOT READY

BeaconVie currently has in-app notifications and authenticated notification realtime sockets, but it is not ready for production mobile push notifications.

## Current State

| Area | Status | Notes |
| --- | --- | --- |
| Backend notification records | PRESENT | `/notifications` and unread count endpoints work. |
| Notification realtime | PRESENT | Socket.IO `/notifications` authenticates and emits `notification:connected`. |
| User preference flag | PRESENT | Settings include `pushNotification`. |
| Mobile push library | MISSING | `expo-notifications` is not installed. |
| Device token registration | MISSING | No backend endpoint/model flow was found for Expo/FCM/APNs device tokens. |
| Expo/EAS config | MISSING | No `eas.json`; app config has no push notification plugin/config. |
| FCM credentials | MISSING | No Android push credential configuration found. |
| APNs credentials | MISSING | No iOS push credential configuration found. |
| Push delivery worker/provider | MISSING | Backend notification pipeline creates in-app records; no push delivery provider integration found. |
| Deep link handling from push | MISSING | No tested push tap routing flow. |

## Required Phase 17 Work

1. Add Expo push support in the mobile app, including permission UX and token registration.
2. Add backend device-token storage, token revoke/update, and per-user/per-device targeting.
3. Add a push delivery worker/provider path for notification events.
4. Configure EAS, Android FCM, and iOS APNs credentials.
5. Respect notification preferences, including `pushNotification`.
6. Add tests for token registration, preference gating, delivery enqueueing, and stale-token cleanup.
7. Execute real Android and iOS device push verification, including foreground, background, killed app, tap deep link, logout, and remote revoke behavior.
