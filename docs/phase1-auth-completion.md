# Phase 1 Auth Completion Report

Date: 2026-07-18

## 1. Phát hiện

### Đã có

- Register, login, refresh, logout and `/auth/me`.
- JWT HttpOnly access/refresh cookie flow.
- Refresh-token rotation backed by Redis `jti` pointer and `UserDeviceSession`.
- Device session creation on login/social login.
- Device revoke endpoints under Settings.
- 2FA setup/confirm/disable with encrypted secret and recovery codes.
- Global validation pipe with whitelist and forbid non-whitelisted.
- Frontend shared Axios client with `withCredentials: true` and refresh retry.

### Bị lỗi

- Local email/password login did not enforce 2FA before issuing cookies.
- JWT strategy accepted Authorization Bearer as a fallback.
- Login response returned `accessToken`.
- Homepage header logout used hard-coded `http://localhost:3002`.
- Frontend build failed because `ChatMessage` type was not exported.
- Backend build initially failed because Prisma Client had not been regenerated after ChatSession/UserPet schema updates and `@nestjs/throttler` was missing from installed dependencies.

### Nguyên nhân gốc

- 2FA service existed but was only connected to Settings, not the login flow.
- Some legacy token-oriented behavior remained in backend response/strategy.
- A route-specific frontend header bypassed the shared API client.
- Schema and installed dependencies were out of sync with source.

## 2. File đã thay đổi

| File | Thay đổi | Lý do |
| --- | --- | --- |
| `backend/src/modules/auth/dto/login.dto.ts` | Added email validation, optional `rememberMe`, `otp`, `recoveryCode` fields | Allow 2FA login fields while blocking unknown payload keys. |
| `backend/src/modules/auth/auth.service.ts` | Enforced 2FA before cookie issuance, removed access token from login response, centralized cookie options, consumed recovery code once, removed debug log | Production cookie-only auth and correct 2FA flow. |
| `backend/src/modules/auth/auth.controller.ts` | Added `JwtAuthGuard` to `check-username` | Endpoint reads current user and must be authenticated. |
| `backend/src/modules/auth/strategies/jwt.strategy.ts` | Removed Bearer token extraction | Backend auth must use JWT HttpOnly cookie only. |
| `backend/src/modules/auth/two-factor.controller.ts` | Replaced `src/...` imports with relative imports | Keep Auth code compatible with build and Jest resolution. |
| `backend/src/modules/auth/auth.service.spec.ts` | Added minimal mocked dependencies | Existing test can compile with AuthService dependencies. |
| `backend/src/modules/auth/auth.controller.spec.ts` | Added minimal mocked dependencies | Existing test can compile with AuthController dependencies. |
| `backend/src/modules/vocabulary-job/vocabulary-job.service.ts` | Replaced `src/...` Prisma import with relative import | AuthController imports this service for admin vocabulary job endpoint; Jest needed resolvable imports. |
| `backend/src/main.ts` | Removed `Authorization` from CORS allowed headers | Frontend must not send Authorization token headers. |
| `english-web-build/src/lib/axios.ts` | Use `NEXT_PUBLIC_API_URL` with localhost fallback | Avoid hard-coded production API URL while keeping dev usable. |
| `english-web-build/src/Components/Auth/Auth.tsx` | Added 2FA login step and backend error display | Users with 2FA can complete login without client-side tokens. |
| `english-web-build/src/Components/HomePage/Header.tsx` | Replaced hard-coded fetch logout with shared API client | Cookie auth and production API URL consistency. |
| `english-web-build/src/types/chat.ts` | Exported and corrected `ChatMessage` type | Fix frontend production build. |
| `english-web-build/src/hooks/useMiuChat.ts` | Formatted after type fix | Build hygiene only. |
| `english-web-build/src/lib/chat.api.ts` | Formatted after type fix | Build hygiene only. |
| `docs/phase1-current-state.md` | Added Stage 0 source map | Required Stage 0 artifact. |
| `docs/phase1-execution-plan.md` | Added source-based execution plan | Required Stage 0 artifact. |
| `docs/phase1-auth-completion.md` | Added Auth completion report | Required Stage 1 artifact. |

## 3. Database

- Schema changed: No.
- Migration added: No.
- Data impact: Yes, only runtime behavior:
  - One-time recovery code used for login is removed after successful use.
  - New login sessions continue to create/update `UserDeviceSession`.
- Rollback:
  - Revert changed source files.
  - No database rollback required.

## 4. API Contract

### Endpoint thêm mới

- None.

### Endpoint sửa

- `POST /auth/login`
  - Request now accepts optional `otp` or `recoveryCode`.
  - If 2FA is enabled and no second factor is supplied, response is:
    - `success: false`
    - `twoFactorRequired: true`
    - `message`
  - Successful login no longer returns `accessToken`.

- `GET /auth/check-username`
  - Now requires authenticated cookie.

### Endpoint giữ nguyên

- `POST /auth/register`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/2fa/setup`
- `POST /auth/2fa/confirm`
- `POST /auth/2fa/disable`
- Google/Facebook OAuth routes
- Settings device endpoints

### Endpoint bị loại bỏ

- None.

### Frontend đang sử dụng

- Auth form uses `POST /auth/login`.
- Shared API retry uses `POST /auth/refresh`.
- Headers use `POST /auth/logout`.
- Settings page uses `/auth/2fa/*`.

## 5. Kiểm thử

| Command | Kết quả |
| --- | --- |
| `npx prisma validate` in `backend` | Passed. |
| `npx prisma generate` in `backend` | Passed. |
| `npm install` in `backend` | Completed; installed missing dependency from package manifest. |
| `npm test -- --runTestsByPath src/modules/auth/auth.service.spec.ts src/modules/auth/auth.controller.spec.ts --runInBand` in `backend` | Passed. |
| `npm run build` in `backend` | Passed. |
| `npm run build` in `english-web-build` | Passed. |

Not run in this pass:

- Backend lint.
- Frontend lint.
- Manual browser login/2FA flow.

## 6. Việc còn lại

### Blocker còn tồn tại

- OAuth login does not run a separate 2FA challenge. If OAuth is enabled for production accounts with 2FA, this needs a defined product decision.
- No global exception filter was implemented in this pass; belongs Stage 2.

### Rủi ro

- Redis is required for refresh-token rotation. If Redis is unavailable, refresh fails.
- The `logged_in` cookie is intentionally readable for UI convenience and is not an auth credential.
- Existing sessions issued before this fix remain valid until expiry/revocation.

### Chặng tiếp theo

- Stage 2: Shared API, loading and error handling.
