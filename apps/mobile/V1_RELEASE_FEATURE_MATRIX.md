# BeaconVie Mobile V1 Release Feature Matrix

Scope: Android v1 for Google Play Internal Testing. Local physical-device QA is intentionally skipped because no physical Android device is available. Device-specific behavior must be verified through Internal Testing before public production.

| Feature | V1 classification | Notes |
| --- | --- | --- |
| Authentication | INTERNAL TEST REQUIRED | Static checks pass and emulator reached login previously. Full login, SecureStore, session restore, token refresh, and logout require real-device verification. |
| Dashboard | INTERNAL TEST REQUIRED | Backend-integrated screen is implemented. Needs real-device data, refresh, and layout validation. |
| Vocabulary | INTERNAL TEST REQUIRED | Backend-integrated flow exists. Needs real-device mutation/double-tap/progress validation. |
| Grammar | INTERNAL TEST REQUIRED | Backend-integrated flow exists. Needs real-device answer/explanation validation. |
| Reading | INTERNAL TEST REQUIRED | Backend-integrated flow exists. Needs real-device list/article/session/result validation. |
| Listening | INTERNAL TEST REQUIRED | Hard gate for public production. Audible playback, controls, transcript gating, and audio release must pass on a real Android device. |
| Writing | INTERNAL TEST REQUIRED | Draft preservation, keyboard behavior, submit, processing, polling, and result need real-device validation. |
| Placement | INTERNAL TEST REQUIRED | Entry/result/session states and keyboard inputs need real-device validation. |
| Learning Path | INTERNAL TEST REQUIRED | Path loading and route handoff to modules need real-device validation. |
| Community | INTERNAL TEST REQUIRED | HTTP feed/mutations and Socket.IO realtime need real-device validation. |
| Notifications | INTERNAL TEST REQUIRED | In-app notification HTTP and foreground Socket.IO realtime are required before push work. |
| Companion | INTERNAL TEST REQUIRED | Mobile sends no provider secrets. Real generation depends on production backend `GEMINI_API_KEY` availability. |
| Leaderboard | INTERNAL TEST REQUIRED | Weekly/monthly/current-user states need real-device validation. Friends may be a valid empty state. |
| Arena | INTERNAL TEST REQUIRED | Visible from Dashboard. Treat as experimental/internal-only until Android queue/match/reconnect is verified. Hide for public v1 if this remains unverified. |
| Profile | INTERNAL TEST REQUIRED | Profile display/edit paths need real-device validation. |
| Settings | INTERNAL TEST REQUIRED | Security, sessions, learning, notification, and privacy settings need real-device validation. |
| Avatar upload | DEFERRED | Display/fallback is sufficient for v1. Upload picker/flow is not part of this phase. |
| Push notifications | DEFERRED | Push Notifications: DEFERRED TO V1.1. Foreground in-app notifications and Socket.IO remain in scope. |

## Environment Strategy

- Development: local `.env` values, usually `http://10.0.2.2:3002` for Android emulator or a LAN URL for physical development devices.
- Preview/Internal Testing: EAS `preview` profile points to `https://api.beaconvie.com`.
- Production: EAS `production` profile points to `https://api.beaconvie.com`.

`EXPO_PUBLIC_*` values are public client configuration, not secrets. Do not put credentials, tokens, signing data, database URLs, or provider keys in mobile env files.
