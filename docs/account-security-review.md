# Account Security Review — Account Recovery, Security Hardening, Abuse Protection

## 1. Audit summary

Already-complete modules (Authentication, Cookie Sessions, Redis Cache, Gemini Fallback, Learning Jobs, Placement, Learning Path, Curriculum Ordering, Dashboard Recommendation, Analytics, AI Coach, and the prior UX/Ops review) were left untouched — nothing rebuilt or refactored. Four parallel research passes (account recovery/email, session/token security, abuse/rate-limiting/brute-force, headers/audit-logging/tests) found that **password reset, email verification, and change-password did not exist at all** (0% backend coverage — confirmed by full-codebase grep, not a stub) alongside several real hardening gaps in the otherwise-solid existing session/auth system. This review built the missing account-recovery flows from scratch (reusing existing session-revocation and email-sending primitives rather than inventing new ones) and fixed the highest-value hardening/abuse gaps found. Full findings are in the Step 0 report already posted in this conversation; this document covers what was actually shipped and verified.

## 2. Security improvements

- **Password reset tokens are never stored raw.** `PasswordResetToken`/`EmailVerificationToken` store only a SHA-256 hash (`hashToken`); the raw token exists only in the emailed URL. Verified at runtime: a real reset token's stored `tokenHash` is a 64-char hex string, not the token itself.
- **Single-use, expiring tokens.** Both token types are marked `usedAt` on consumption and rejected once used or past `expiresAt`. Verified at runtime: replaying an already-used reset token returns a clean 400, not a silent success.
- **No email enumeration.** `POST /auth/forgot-password` always returns the identical generic message regardless of whether the email exists — verified against both a real and a nonexistent address.
- **Password reset/change always revokes every session.** `resetPassword`/`changePassword` both call a new `revokeAllSessions` helper (Redis pointer deletion + `UserDeviceSession.revokedAt`), so a compromised password can't keep a session alive after the legitimate owner recovers the account. `changePassword` revokes the *caller's own* session too — the access-token payload carries no session/jti identifier, so there's no safe way to distinguish "this device" from any other live session; forcing a full re-login was judged safer than guessing. Verified at runtime: old password stops working, new password works, and (session-fix test below) confirms the revoke/current-tracking machinery is now correct.
- **Fixed a real pre-existing bug: stale `current: true` session flags.** `AuthSessionService.createSession` never demoted a prior session's `current` flag, so a user logged in from 2+ devices ended up with multiple rows simultaneously flagged `current: true` — which silently broke both per-device revoke (refuses to touch a `current: true` row) and "revoke all other devices" (filters on `current: false`). Fixed by demoting any existing `current: true` row before creating the new one. Verified at runtime: two logins now produce exactly one `current: true` row, not two.
- **Refresh-token reuse now leaves a forensic trail.** A replayed/already-rotated refresh token was already correctly rejected (rotation is real, not cosmetic) but produced zero audit signal. Added `AUTH_REFRESH_REUSE_REJECTED` logging so a theft/replay attempt is now visible instead of vanishing as a silent 401.
- **Temporary (not permanent) account-level brute-force lockout.** 5 failed logins locks the account for 15 minutes (`User.failedLoginAttempts`/`lockedUntil`), independent of the existing generic per-IP Throttler (which alone lets a distributed attacker rotating IPs guess one account's password with no effective limit). The lock check happens before the password comparison and does not extend on repeated attempts during the lockout window (so an attacker can't griefing-extend a legitimate user's lockout indefinitely). Verified at runtime end-to-end: 5 bad logins → 6th attempt rejected even with the *correct* password, `lockedUntil` set ~15 minutes out, and a successful login later clears the counters.
- **Audit logging extended to failure/attack-relevant events**, previously logged only on success: `AUTH_LOGIN_FAILURE`, `AUTH_LOGIN_LOCKED`, `AUTH_LOGIN_BLOCKED_LOCKOUT`, `AUTH_LOGIN_2FA_FAILED`, `AUTH_REFRESH_REUSE_REJECTED`, `AUTH_PASSWORD_RESET`, `AUTH_PASSWORD_CHANGED`, `AUTH_EMAIL_VERIFIED`, `AUTH_DEVICE_REVOKED`, `AUTH_DEVICES_REVOKED_ALL_OTHER`. Verified at runtime: a full lockout sequence produced the exact expected event order in the audit log.

## 3. Abuse protection improvements

- **Closed a dead-code rate limit.** `POST /chat-session/message` (Gemini-backed) had `@Throttle(...)` but no `@UseGuards(ThrottlerGuard)` applied — per this app's Throttler setup (not bound globally), that decorator alone does nothing. It looked protected and wasn't. Fixed.
- **`POST /words/check`** — public (`OptionalJwtGuard`, no login required) and calls Gemini directly on a cache miss; had zero rate limit, so anonymous, unlimited-rate Gemini cost was possible. Added throttling.
- **`GET /analytics/coach`** — Gemini-backed, and its `?refresh=true` param bypasses its own 6h cache entirely; had zero rate limit. Added throttling.
- **New account-recovery endpoints were built with rate limiting from day one**, not retrofitted: `forgot-password` (3/min — the tightest, since it triggers an outbound email), `reset-password`/`verify-email` (10/min — defense-in-depth against token guessing, though tokens are 256-bit and guessing is computationally infeasible), `change-password`/`resend-verification` (10/min and 3/min respectively, both authenticated).
- Verified at runtime: 4 rapid `forgot-password` calls produced `201, 201, 429, 429` — the guard is live, not just declared.

## 4. Session lifecycle

Reset and change both funnel through the same `revokeAllSessions` primitive (Redis-pointer-then-DB, matching the ordering already used by `SettingsService.revokeOtherDevices`), so "never leave old sessions active after a password event" is enforced by one shared code path, not duplicated per-flow logic. Existing session primitives (`AuthSessionService.invalidateAllOtherSessions`, refresh rotation, device revoke) were reused as-is — the only session-layer change was the `current`-flag fix, which was a correctness bug independent of the new recovery flows but directly relevant to "Device Sessions" / "Session Revocation" review requirements.

## 5. Email flow

- `MailService` (new, `backend/src/modules/mail/`) factors the same Gmail-SMTP nodemailer pattern already proven working in `AuthService.sendReportToEmail` into a reusable service — that existing method itself was left untouched (additive sibling, not a migration).
- Registration now sends a verification email (`isEmailVerified: false` on create) — **best-effort and non-blocking**: a mail-send failure is caught and logged, never fails registration itself, and verification does not gate login/access. This was a deliberate scope decision: gating login on verification is a bigger product/UX decision (locks out users if the mail provider has a bad day) that wasn't part of this review's mandate.
- Verified at runtime: a freshly registered user has `isEmailVerified: false`; `POST /auth/verify-email` with a garbage token returns a clean 400, not a crash.

## 6. Files changed

**New:**
- `backend/src/modules/mail/mail.service.ts`, `mail.module.ts`
- `backend/src/modules/auth/auth-token.util.ts`
- `backend/src/modules/auth/dto/{forgot-password,reset-password,change-password,verify-email}.dto.ts`
- `backend/prisma/migrations/20260724200000_add_account_recovery_security/`
- `english-web-build/app/(auth)/reset-password/page.tsx`, `verify-email/page.tsx`

**Modified (backend):**
- `backend/prisma/schema.prisma` — `PasswordResetToken`, `EmailVerificationToken` models; `User.isEmailVerified`/`failedLoginAttempts`/`lockedUntil`.
- `backend/src/modules/auth/auth.service.ts` — forgot/reset/change-password, verify/resend-email, brute-force lockout, refresh-reuse + failed-login/2FA audit logging.
- `backend/src/modules/auth/auth.controller.ts`, `auth.module.ts`, `auth-session.service.ts` (current-flag fix).
- `backend/src/modules/settings/settings.service.ts` — device-revoke audit logging.
- `backend/src/modules/chat-session/chat-session.controller.ts`, `words/words.controller.ts`, `analytics/analytics.controller.ts` — closed rate-limit gaps.
- `backend/src/main.ts`, `admin-dashboard/*`, `community/processors/*`, `placement-processing/*`, `prisma.service.ts`, `analytics/weakness-detection.service.ts`, `speaking/*`, `writing/*` — carried over from the prior two review sessions, not part of this pass.

**Modified (frontend):**
- `english-web-build/app/(auth)/forgot-password/page.tsx` — real form, replacing the static stub.
- `english-web-build/src/Components/settings/settings-page.tsx`, `src/lib/settings-api.ts` — change-password UI.
- All other listed frontend files carried over from the prior two review sessions.

## 7. Tests

- `npx jest auth settings admin-dashboard chat-session words analytics dashboard gemini writing speaking community --runInBand` → **26 suites / 67 tests passed.**
- Fixed 4 test-infra gaps my own changes directly caused (added `ThrottlerModule.forRoot(...)` to `auth.controller.spec.ts`, `chat-session.controller.spec.ts`, `words.controller.spec.ts` test modules — the same pre-existing pattern already used for `writing`/`speaking` specs in the prior session; added `MailService` mock to `auth.service.spec.ts`; added `RedisCacheService`/`CacheMetricsService`-style mocks were already present from before, and added `AuditLogService`/`RedisCacheService` mocks were not needed here since `SettingsService` reused an already-mocked-elsewhere dependency shape).
- **4 remaining failures, all confirmed pre-existing and unrelated** (verified via `git stash` against unmodified code): `chat-session.controller.spec.ts`, `words.controller.spec.ts`, `chat-session.service.spec.ts`, `words.service.spec.ts` — all four are placeholder specs that never provided their controller/service's own constructor dependencies (e.g. `ChatSessionService`, `WordsService` were never mocked at all), failing on that missing-provider error regardless of any Throttler change. Not touched further — fixing them requires mocking unrelated service surfaces outside this review's scope.
- Backend build: `npm run build` (`nest build`) → clean. (Required several retries this session due to severe, unrelated host memory pressure — see §9.)
- Frontend: `npx tsc --noEmit` → clean. `npm run build` (`next build --webpack`) → clean, 76 routes including the new `/reset-password` and `/verify-email`. Lint: **0 errors, 0 warnings** across every new/touched file (verified via `eslint --format=json`, not the stylish formatter, after a false-positive scare last session taught that lesson).

## 8. Runtime validation

Backend started against the real local Postgres + Redis and exercised live end-to-end (fixture users created and deleted afterward):

- **Registration**: `isEmailVerified: false` confirmed on the created row.
- **Forgot-password**: identical generic response for a real and a fake email; a real `PasswordResetToken` row created with a 64-char hex SHA-256 hash, never the raw token.
- **Reset-password**: succeeds with a valid token; **replaying the same token afterward returns a clean 400** (single-use enforced); old password stops working; new password works.
- **Brute-force lockout**: 5 wrong-password attempts, then a 6th attempt **with the correct password** was still rejected (`401`, "Tài khoản tạm thời bị khóa..."), with `lockedUntil` set ~15 minutes out.
- **Audit trail**: the above sequence produced exactly `AUTH_LOGIN_FAILURE ×4, AUTH_LOGIN_LOCKED, AUTH_LOGIN_BLOCKED_LOCKOUT` plus the reset's `AUTH_PASSWORD_RESET` and a later `AUTH_LOGIN_SUCCESS` — matching the intended event sequence exactly.
- **Session current-flag fix**: two logins for the same fresh user produced exactly one `current: true` row (previously would have been two) — confirming the fix, not just the code path.
- **Rate limiting**: 4 rapid `forgot-password` calls returned `201, 201, 429, 429` (the exact split reflects this session's own prior test calls sharing the same IP bucket — the 429 firing at all is the thing being verified).
- **Error handling**: garbage tokens on `reset-password`/`verify-email` and an unauthenticated `change-password` call all returned clean, structured JSON errors with a `requestId` — no stack traces leaked.
- **Graceful shutdown**: confirmed again this session (SIGTERM → clean exit), unaffected by the new code.

## 9. Remaining limitations (non-blocking)

1. **Email verification is informational-only** — it does not gate login/access. A future decision to enforce verification (e.g. blocking certain actions until verified) is a product call outside this review's scope, not a technical gap.
2. **`TWO_FACTOR_ENCRYPTION_KEY` still falls back to reusing `JWT_ACCESS_SECRET`** if unset (`two-factor-crypto.util.ts`) — found but deliberately **not changed**: the existing encrypted TOTP secrets were encrypted with whatever key was derived at write-time, so changing the derivation without a data migration would make existing 2FA setups undecryptable. Needs an operational secret-rotation plan, not a code fix.
3. **No `app.set('trust proxy', ...)`** — `req.ip` (used in audit logs and rate limiting) is inaccurate behind an unknown reverse-proxy topology. Not touched — blindly trusting proxy headers without confirming the actual deployment shape would itself be a spoofing risk.
4. **Remaining lower-risk Gemini endpoints still unthrottled**: `writing/sessions/:id/rewrite`, `lesson-builder` outline/generate-content, `pronunciation/generate` — flagged in the Step 0 report, deferred to keep this pass's diff bounded to the highest-exposure endpoints (anonymous-reachable and/or cache-bypassable ones).
5. **No account-level lockout notification email** — a locked-out user sees the in-app message but isn't emailed about it. Could be added on top of the existing lockout mechanism; not built here to avoid expanding the email surface beyond what was strictly needed.
6. **`chat-session.controller.spec.ts`/`words.controller.spec.ts`/`.service.spec.ts` remain pre-existing broken placeholders** (§7) — real coverage for those modules is a separate, unrelated backlog item.
7. **Backend build was flaky this session due to host-level memory pressure** (many concurrent Chrome/VS Code/Docker/WSL processes on an 8GB machine), requiring ~10 retries before succeeding; confirmed via repeated OOM crash traces at inconsistent, low (700MB–900MB) heap usage — not a code-induced blowup. Documented for transparency, not a code defect.

---

ACCOUNT RECOVERY:

**PASSED**

(Forgot-password, reset-password, and change-password are now fully built, token-secure, single-use, enumeration-safe, and verified end-to-end against a real database — this was the core gap and is now production-ready.)

SECURITY HARDENING:

**PASSED WITH NON-BLOCKING LIMITATIONS**

(Session revocation, brute-force lockout, refresh-reuse logging, and the current-flag bug are fixed and verified live. Limitations — 2FA key reuse requiring a migration plan, unconfirmed proxy topology — are real but require operational decisions outside this review's scope, not further code changes.)

ABUSE PROTECTION:

**PASSED WITH NON-BLOCKING LIMITATIONS**

(The highest-exposure gaps — a dead-code throttle, an anonymous unthrottled Gemini endpoint, and the new recovery endpoints — are closed and verified live via real 429 responses. A handful of lower-risk, already-authenticated Gemini endpoints remain unthrottled and are documented as deferred, not overlooked.)
