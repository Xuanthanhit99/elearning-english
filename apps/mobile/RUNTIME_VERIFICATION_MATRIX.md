# Phase 16 Runtime Verification Matrix

Verified against local PostgreSQL/Redis via Docker Compose and local BeaconVie backend on `http://localhost:3002`.
Mobile bearer transport was exercised with `X-BeaconVie-Auth-Transport: bearer`.

## Environment

| Area | Status | Evidence |
| --- | --- | --- |
| Backend | PASS | Local compiled Nest backend responded on port 3002; `/auth/me` returned 401 before login. |
| PostgreSQL | PASS | Docker Postgres started and `prisma migrate deploy` applied all migrations successfully. |
| Redis | PASS | Docker Redis started and backed refresh/session/socket auth checks. |
| Mobile API connection | PASS | API checks used the same mobile bearer endpoints and headers used by Expo. |
| Test account | PASS | Disposable runtime accounts were created through `/auth/register`; no credentials committed. |
| Device/emulator | BLOCKED | No Android `adb`/emulator tooling was available on PATH, so no actual device UI session was executed. |

## Auth

| Flow | Status | Evidence |
| --- | --- | --- |
| Register | PASS | `/auth/register` created a disposable runtime user. |
| Login | PASS | `/auth/login` returned access and refresh tokens for mobile bearer transport. |
| Session restore | PASS | `/auth/me` returned the authenticated runtime user. |
| Access token refresh | PASS | `/auth/refresh` returned a rotated access/refresh pair. |
| Concurrent refresh | PASS | Initially failed with 2 successes; fixed in `AuthSessionService.rotate`; rerun produced 1 success / 1 reject. |
| Refresh rotation | PASS | Reusing the old refresh token after rotation returned 401. |
| Logout | PASS | `/auth/logout` revoked the refresh token; reuse returned 401. |
| Remote revoke | PASS | Revoking a non-current device session blocked that session's refresh token. |

## Learning

| Flow | Status | Evidence |
| --- | --- | --- |
| Dashboard | PASS | `/dashboard` returned successfully. |
| Vocabulary | PASS | `/vocabulary/today` and `/vocabulary/me/stats` returned successfully. |
| Grammar | PASS | `/grammar/dashboard` returned successfully. |
| Reading | PASS | `/reading/articles` returned successfully. |
| Listening | PASS | `/listening/home` returned successfully. |
| Writing | PASS | `/writing/home` returned successfully. |
| Placement | PASS | `/placement/introduction` and `/placement/retake/status` returned successfully. |
| Learning Path | PASS | `/learning-path` returned successfully. |

## Social / Realtime

| Flow | Status | Evidence |
| --- | --- | --- |
| Community | BLOCKED | Not executed in device UI; community API was not part of the successful runtime probe. |
| Community realtime | BLOCKED | Not executed in device UI. |
| Notifications | PASS | `/notifications` and `/notifications/unread-count` returned successfully. |
| Notification realtime | PASS | Socket.IO `/notifications` authenticated and emitted `notification:connected`. |
| Socket token refresh | BLOCKED | Socket reconnection with newly rotated token was not executed in a live app session. |

## Companion

| Flow | Status | Evidence |
| --- | --- | --- |
| Message send | BLOCKED | Not executed to avoid relying on external AI generation during local verification. |
| Generation | BLOCKED | External AI generation was not exercised. |
| History | PASS | Created a companion session and fetched `/chat-session/sessions/:id/messages`. |
| Rate limit | BLOCKED | Not executed. |
| Backend tests | PASS | Focused auth/session Jest tests passed after the refresh fix. |

## Competitive

| Flow | Status | Evidence |
| --- | --- | --- |
| Leaderboard | PASS | `/leaderboards/me` and `/leaderboards/weekly` returned successfully. |
| Arena lobby | PASS | `/arena/lobby` and `/arena/season/current` returned successfully. |
| Arena matchmaking | BLOCKED | Not executed; requires coordinated multi-client runtime. |
| Arena match | BLOCKED | Not executed; requires coordinated multi-client runtime. |
| Arena reconnect | BLOCKED | Not executed; requires coordinated multi-client runtime. |
| Arena result | BLOCKED | Not executed; requires completed match runtime. |

## Account

| Flow | Status | Evidence |
| --- | --- | --- |
| Profile | PASS | `/auth/me` returned profile fields for the runtime account. |
| Settings | PASS | `/settings`, `/settings/learning`, `/settings/privacy`, and `/settings/notifications` returned successfully. |
| Change password | PASS | Wrong current password was rejected with 400. |
| Sessions | PASS | `/settings/devices` listed active device sessions. |

## Release Checks

| Check | Status | Evidence |
| --- | --- | --- |
| Backend build | PASS | `npm run build` completed in `backend`. |
| Relevant backend tests | PASS | `npm test -- auth-session.service.spec.ts auth.service.spec.ts --runInBand` passed. |
| Mobile TypeScript | PASS | `npm run typecheck` passed in `apps/mobile`. |
| Expo Doctor | PASS | `npx expo-doctor` passed 20/20 checks. |
| Android export | PASS | `npx expo export --platform android --output-dir .expo-export-phase16-runtime` completed. |
| Metro listener | PASS | Metro started and listened on port 8091, but no device attached. |
| Device runtime | BLOCKED | No actual emulator/device was available for UI navigation verification. |
| npm audit | FAIL | Backend and mobile both report high-severity advisories. |
| Temporary Expo export cleanup | BLOCKED | Generated export directories were identified, but recursive deletion was blocked by local policy. |

## Bugs Found

| Bug | Status | Notes |
| --- | --- | --- |
| Concurrent refresh accepted the same refresh token twice | FIXED | Redis pointer rotation now atomically claims the old pointer before issuing the new pointer. |
