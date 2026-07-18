# Phase 1 Current State

Audit date: 2026-07-18

Scope completed in this pass:

- Stage 0 source map.
- Stage 1 Auth production audit and fixes.
- No Dashboard, Learning Path, Mission, Vocabulary, AI learning-module implementation in this pass.

## Source Map

| Hạng mục | Backend hiện có | Frontend hiện có | Database hiện có | Trạng thái | Lỗi hoặc thiếu |
| --- | --- | --- | --- | --- | --- |
| Backend structure | NestJS modules under `backend/src/modules`, Prisma module, BullMQ root config, Schedule, EventEmitter | N/A | Prisma schema + migrations present | PARTIAL | Build initially failed because ChatSession Prisma client was stale and `@nestjs/throttler` was not installed in `node_modules`. |
| Frontend structure | N/A | Next app under `english-web-build`, shared `src/lib/axios.ts`, route pages for auth/dashboard/learning/community/core learning | N/A | PARTIAL | Build initially failed due `ChatMessage` type not exported. |
| Prisma schema | `schema.prisma` includes User, UserSettings, UserDeviceSession, ChatSession, ChatMessage, UserPet and learning modules | N/A | Many migrations through 20260717 | DONE | Prisma Client needed regeneration after schema changes. |
| Migrations | Migration folder present with auth/settings/chat/community/learning changes | N/A | Migration lock present | DONE | No old migration edited. |
| Auth module | Register, login, refresh, logout, `/auth/me`, Google/Facebook OAuth, profile/avatar, 2FA controller/service, device session service | Login/register screen, auth initializer, logout buttons | User has 2FA fields; UserSettings has `twoFactorEnabled`; UserDeviceSession stores refresh `jti` | PARTIAL | Login did not enforce 2FA before this pass; JWT strategy accepted Bearer token before this pass; login returned `accessToken` before this pass. |
| Settings module | Settings query/command/service, device revoke endpoints, 2FA setting UI connected to Auth/2FA | Settings page with 2FA setup/confirm/disable | UserSettings + UserDeviceSession | DONE | Settings only displays/requests 2FA actions; verification is in Auth/2FA. |
| OTP/2FA | Setup, confirm, disable, recovery codes, encrypted secret | Settings modal for QR/OTP/recovery disable | User 2FA fields and settings flag | PARTIAL | OAuth login does not run an extra 2FA challenge. Local email/password login is now enforced. |
| Device session | Create on login/social login, rotate on refresh, revoke on logout/settings | Device settings page uses endpoints | UserDeviceSession | DONE | Current session id is not exposed to client, so “revoke others except current” remains backend-best-effort. |
| Refresh-token storage | Refresh JWT has `jti`; Redis maps `jti` to session pointer; DB stores `refreshTokenId` | Frontend does not store refresh token | Redis + UserDeviceSession | DONE | Redis must be available for refresh to work. |
| Redis/BullMQ | BullMQ root config; auth/settings use ioredis providers; queue modules exist | N/A | N/A | PARTIAL | Multiple Redis providers exist; connection reuse can be improved in later stage. |
| Shared API client | N/A | `src/lib/axios.ts` with `withCredentials: true` and refresh retry | N/A | DONE | Base URL now uses `NEXT_PUBLIC_API_URL` with localhost fallback. |
| Guards | JWT guard, roles guard, optional JWT guard | N/A | N/A | DONE | JWT strategy is now cookie-only. |
| Interceptors/filters | Global validation pipe exists | N/A | N/A | PARTIAL | No global exception filter normalized in this pass; belongs Stage 2. |
| Validation pipe | Whitelist and forbid non-whitelisted enabled globally | N/A | N/A | DONE | Login DTO now explicitly allows only email/password/rememberMe/otp/recoveryCode. |
| Dashboard | DashboardModule exists | Dashboard route/API lib exists | Uses user/progress-related models | PARTIAL | Not implemented in this pass by request. |
| Learning Path | Modules exist: learning-path, access, placement integration | Pages/API libs exist | Learning path/profile/progress models exist | PARTIAL | Not implemented in this pass by request. |
| Placement | Placement modules, processing/result/dashboard modules exist | Placement routes exist | Placement models and processing jobs exist | PARTIAL | Not implemented in this pass by request. |
| Progress | Progress module and many per-skill progress models exist | Multiple progress screens exist | LessonProgress and skill progress models | PARTIAL | Not implemented in this pass by request. |
| Mission V2 | Mission V2 module exists | Mission route exists | UserMissionV2 models exist | PARTIAL | Not implemented in this pass by request. |
| XP | Learning XP and leaderboard modules exist | XP shown in shell/dashboard | UserXpProfile/XpTransaction models | PARTIAL | Idempotency not audited in this pass. |
| Pet | Pets and chat pet modules exist | Pet page, chat hook/API | PetProfile/UserPet models | PARTIAL | Chat-session build issue fixed minimally. |
| Leaderboard | Leaderboard module exists | Leaderboard pages/API/socket libs | Leaderboard models exist | PARTIAL | Not audited in this pass. |
| Notifications | Notifications module/controller exists | Notification page/API lib exists | Notification model exists | PARTIAL | Not implemented in this pass by request. |
| Vocabulary | Vocabulary + job modules exist | Vocabulary routes/components exist | Vocabulary plan/progress/notebook/test models | PARTIAL | Not implemented in this pass by request. |
| Grammar | Grammar module exists | Category/topic/lesson routes exist | Grammar models/progress exist | PARTIAL | Not implemented in this pass by request. |
| Writing | Writing controller covers home/topics/session/status/result/history | Writing pages/API libs exist | Writing session/job/result models exist | PARTIAL | Not implemented in this pass by request. |
| Speaking | Speaking + speaking-practice + processing modules exist | Speaking pages/API libs exist | Speaking session/job/result models exist | PARTIAL | Not implemented in this pass by request. |
| Listening | Listening + listening-job modules exist | Listening pages/API libs exist | Listening session/question/progress models | PARTIAL | Not implemented in this pass by request. |

## Auth Findings

- Local JWT storage: no JWT `localStorage`/`sessionStorage` usage found in `english-web-build/src`.
- Token headers: no frontend `Authorization`, `Bearer`, `accessToken`, `refreshToken` usage found after audit.
- Cookie auth: backend reads `access_token` cookie and frontend API client uses credentials.
- 2FA gap fixed: login now requires OTP or recovery code before issuing cookies if `twoFactorSecret` exists.
- Token leakage fixed: `/auth/login` no longer returns `accessToken`.
- Bearer fallback fixed: JWT strategy no longer reads Authorization Bearer header.
- Production API URL fixed: homepage logout now uses shared API client instead of hard-coded localhost.

