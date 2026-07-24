# Authentication & AI Content-Flow Audit

## 1. Executive summary

This audit covered the full authentication system (NestJS backend + Next.js frontend) and the lesson-data retrieval / Gemini fallback architecture across all eight learning modules. Both systems were found to be **substantially well-built** — cookie handling is centralized and consistent, refresh rotation and server-side revocation work correctly, and two of eight modules (Listening, Placement-current) already implement a genuinely production-grade DB→lock→Gemini→persist→cache flow. The problems found were concentrated in a small number of specific, well-scoped defects rather than systemic design flaws:

- A single misnamed file (`proxy.ts` instead of `middleware.ts`) meant **all edge-level auth redirects were silently dead code** in production — the app's actual behavior for an unauthenticated visitor to a protected route was an infinite loading skeleton, not a redirect to `/login`.
- No rate limiting existed on `/auth/login`, `/auth/register`, `/auth/refresh`, or 2FA endpoints despite the dependency already being installed.
- A legacy, superseded placement-test endpoint could trigger unbounded concurrent Gemini generations with zero persistence or locking.
- Speaking's synchronous Gemini call sites propagated raw, undifferentiated errors to the client.
- Vocabulary's Gemini generation path had no concurrency guard, unlike Listening/Placement which already do this correctly.

All of these have been fixed in this pass. What follows documents the full audit and every change made.

## 2. Authentication architecture

**Backend** (`backend/src/modules/auth/`): `AuthModule` (global), `AuthController` (`/auth/*`), `AuthService` (login/register/refresh/logout/socialLogin/getMe), `AuthSessionService` (Redis + Prisma `UserDeviceSession` refresh-token rotation), `auth-cookie.util.ts` (single shared cookie-option source), `auth-secrets.util.ts` (JWT secrets, mandatory in production), `AuthTwoFactorService` + `TwoFactorController` (TOTP 2FA), `JwtStrategy` (Passport, cookie-only extraction), `GoogleStrategy`/`FacebookStrategy` (OAuth2).

**Frontend**: `src/lib/axios.ts` (single axios instance with a 401→refresh interceptor implementing a single-flight mutex), `src/store/authStore.ts` (Zustand: `idle|loading|authenticated|unauthenticated|error`), `src/lib/auth-init.ts` (new — the single `/auth/me` entry point, see §6), `src/Components/Layout/AppShell.tsx` (protected-route shell), `middleware.ts` (new — was `proxy.ts`, see §7), `src/Components/Auth/Auth.tsx` (login/register forms).

Two JWTs are issued: an access token (15 min, `access_token` cookie, httpOnly) and a refresh token (7 days, `refresh_token` cookie, httpOnly, rotates on every use). A third, non-httpOnly `logged_in` flag cookie exists purely so client-side JS (and now, correctly, edge middleware) can cheaply check "is there probably a session" without touching the httpOnly tokens.

## 3. Cookie inventory

| Cookie | Written by | Cleared by | httpOnly | Domain | Path | SameSite | Secure | Max-Age |
|---|---|---|---|---|---|---|---|---|
| `access_token` | login, refresh, socialLogin | logout | yes | `AUTH_COOKIE_DOMAIN` env if set, else host-only | `/` | `lax` | prod only | 15m (24h/30d if `rememberMe`, token itself still expires in 15m) |
| `refresh_token` | login, refresh, socialLogin | logout | yes | same | `/` | `lax` | prod only | 7d |
| `logged_in` | login, refresh, socialLogin | logout | no | same | `/` | `lax` | prod only | matches access_token maxAge |

All three are built from the same `auth-cookie.util.ts` helpers (`authCookieOptions`/`visibleCookieOptions`/`clearAllAuthCookies`) — login, refresh, logout, and both OAuth callbacks never construct cookie options inline, so set/clear attributes cannot drift between call sites.

`AUTH_COOKIE_DOMAIN` is **not currently set** in this environment (confirmed: absent from `.env`, absent from `.env.example`, no hardcoded `.beaconvie.com` string anywhere in the backend). Today's cookies are host-only. This is the correct, safe default for the current single-host deployment.

## 4. Duplicate-cookie root-cause analysis

No duplicate cookies exist today because `AUTH_COOKIE_DOMAIN` has never been set in this environment. However, the mechanism the task asked us to verify is real: if `AUTH_COOKIE_DOMAIN` is set later (e.g. migrating to `.beaconvie.com` for a subdomain split), a browser that already holds a host-only `access_token`/`refresh_token`/`logged_in` cookie from before the change would keep sending it *in addition to* the new domain-scoped cookie of the same name — browsers key cookies by name **and** domain **and** path, not by name alone, so `res.clearCookie('access_token', { domain: '.beaconvie.com' })` alone would never clear the pre-existing host-only cookie.

**Fix applied**: `clearAllAuthCookies()` (`auth-cookie.util.ts`) now clears both the current-config variant (with `AUTH_COOKIE_DOMAIN` if set) **and** the legacy host-only variant (no `Domain` attribute) for all three cookie names, on every logout. This is a no-op today (no legacy cookies exist yet) and closes the gap in advance of any future domain migration. `AuthService.logout()` was updated to call this single helper instead of three inline `res.clearCookie(...)` calls.

## 5. Environment-specific cookie behavior

- **Localhost**: `AUTH_COOKIE_DOMAIN` unset → host-only cookies, `secure: false` (since `NODE_ENV !== 'production'`). Correct.
- **Production, single host**: same env var unset → host-only, `secure: true`. Correct.
- **Production, cross-subdomain** (e.g. `app.beaconvie.com` + `api.beaconvie.com`): would require setting `AUTH_COOKIE_DOMAIN=.beaconvie.com`. This is fully supported by the existing `withDomain()` helper and now safely migratable per §4. **Not yet documented in any `.env.example`** — the existing `.env.example` in this repo is explicitly scoped to Arena/battle-mechanics vars only ("this file only documents the operational env vars introduced by those two gates"), so adding auth-cookie documentation there would misrepresent its stated scope. This is flagged as a documentation gap for ops (see runbook), not fixed by editing that file.
- CORS (`getAllowedOrigins()`) fails hard in production if neither `FRONTEND_URL` nor `CORS_ORIGINS` is set, and correctly pairs `credentials: true` with an explicit origin allowlist (no wildcard-with-credentials risk).

## 6. Login/register/logout/refresh flow

All four flows were audited end-to-end (see full code excerpts in the earlier research phase). Key points and fixes:

- **Register does not auto-login** (confirmed correct on both backend and frontend — the frontend shows a "log in now" success modal rather than assuming authentication).
- **Login** issues all three cookies, supports 2FA (OTP/recovery code), and correctly re-checks account `status === ACTIVE`.
- **Refresh** rotates the refresh token (new `jti`), re-validates account status, and rejects replayed/old tokens (reuse detection is fail-closed, though not fail-alert — see §8).
- **Logout** revokes the Redis session pointer and the Prisma `UserDeviceSession` row, then clears all cookies (now via `clearAllAuthCookies`).
- **Fixed**: JWT payload/strategy mismatch. `JwtStrategy.validate()` always read `payload.email`, but access tokens were minted with only `{ sub, role }` at all three mint sites (login, refresh, socialLogin) — `req.user.email` was silently always `undefined`. All three sites now include `email` in the access-token payload.
- **Fixed — frontend duplicate `/auth/me`**: both `AuthInitializer` (root layout, every page) and `AppShell` (main-app layout, every protected page) independently called `/auth/me` on every protected-route load, racing to write the same Zustand store keys. Extracted the fetch-and-populate logic into a single `initializeAuth()` function (`src/lib/auth-init.ts`, single-flight guarded), which both components now call. `AppShell` no longer does its own fetch; it derives its render state purely from the shared `authStore.status`.
- **Fixed — logout router-cache risk**: `AppHeader.tsx`'s logout used `router.push("/")` (client-side navigation), unlike `HomePage/Header.tsx`'s `window.location.href` (hard reload). Changed to match — a hard reload guarantees the Next.js router cache can't serve a previously-rendered protected page on back-navigation after logout.
- **Fixed — no submit-guard on login/register**: added `isSubmitting` state to both forms in `Auth.tsx`, disabling the submit button and showing a "Logging in.../Creating account..." label (new i18n keys `auth.loggingIn`/`auth.registering` in all four locales) to prevent duplicate submissions.

## 7. Protected-route behavior

**This was the most significant finding of the audit.** `proxy.ts` at the project root implemented the intended edge-level auth-redirect logic (`getAuthRouteDecision` from `src/lib/auth-route-policy.ts`: redirect an authenticated user away from `/login`/`/register`, redirect an unauthenticated user away from any protected route to `/login?redirect=...`), but Next.js's middleware convention requires the file to be named `middleware.ts` and export a function named `middleware`. This file was named `proxy.ts` and exported `proxy` — it was **never picked up by the framework**, confirmed by there being no other `middleware.ts` anywhere in the repo and nothing in `next.config.ts`/`package.json` remapping it.

**Fix applied**: renamed `proxy.ts` → `middleware.ts`, renamed the exported function `proxy` → `middleware`. Verified via `npm run build`: the route manifest now shows `ƒ Proxy (Middleware)` — Next.js's build output only emits this line when a valid middleware file is detected — confirming the fix is live. (The label itself says "Proxy" because that's Next.js's internal name for the middleware layer; it is unrelated to the old filename.)

**A second, compounding bug was only found by running the actual flow in a browser, not by reading the code**: this app has `trailingSlash: true` in `next.config.ts`, so `request.nextUrl.pathname` inside middleware is `/login/`/`/dashboard/`, not `/login`/`/dashboard`. `auth-route-policy.ts`'s guest-only-route check used a strict array `.includes(pathname)` with no trailing slash — so an authenticated user visiting `/login` was never redirected away, even after the middleware file itself was fixed. The existing unit test (`scripts/test-auth-redirect.mjs`) never caught this because it only ever passed `pathname: "/login"` (no trailing slash) as a fixture. **Fixed**: added `stripTrailingSlash()` in `auth-route-policy.ts`, applied before every comparison; added two regression cases to the unit test (`/login/` and `/dashboard/` with trailing slashes) — both now pass, alongside all pre-existing cases. Re-verified against a real running dev server after this fix: authenticated `/login` → redirects to `/dashboard`; unauthenticated `/dashboard` → redirects to `/login?redirect=...`; authenticated `/dashboard` → renders normally. (A stale Turbopack dev-server cache also had to be cleared — `.next/` — since it retained a manifest entry pointing at the deleted `proxy.ts` and was serving 500s independent of the code fix; this is a local dev-environment artifact, not a production concern, since production builds are always built fresh.)

**Second, compounding bug**: even with middleware fixed, `AppShell.tsx` had no fallback for the case where `/auth/me` fails for a reason other than a normal 401-turned-refresh (e.g. a genuine network error, a 403, or an edge case where the `logged_in` cookie says true but the access token is invalid and refresh also fails for a non-401 reason). Previously: `setUser(null)` was called, but the render logic just fell through to `if (!user) return <AppShellLoading />` — an infinite loading skeleton, never a redirect. Fixed: `AppShell` now redirects to `/login` (reusing axios.ts's existing `redirectToLogin()`, which already guards against redirect loops) whenever `authStatus === "unauthenticated"`.

## 8. Auth security findings

1. **No rate limiting** on `/auth/login`, `/auth/register`, `/auth/refresh`, or the 2FA `confirm`/`disable` endpoints, despite `@nestjs/throttler` already being an installed dependency. **Fixed**: registered `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])` globally (available for injection everywhere) but deliberately **not** bound as a global `APP_GUARD` — doing so would have rate-limited every route in the app, including polling-heavy endpoints (Writing/Speaking/Placement processing-status polling, Dashboard's ~20 parallel queries) that were never part of this audit's scope and were never confirmed safe under a blanket limit. Instead, `@UseGuards(ThrottlerGuard)` + `@Throttle(...)` were added surgically to: `POST /auth/register` (5/min), `POST /auth/login` (10/min), `POST /auth/refresh` (20/min), `POST /auth/2fa/confirm` and `/disable` (10/min each), and the legacy `POST /placement-tests/generate` (3 per 10 min — see §14).
2. **Banned/inactive users remain authenticated for up to 15 minutes** after a status change, because `JwtStrategy.validate()` never re-checks the DB (only login/refresh/socialLogin do). **Not fixed** — this is a real, understood limitation, not a blind spot; closing it fully would require either a per-request DB/Redis-cached status check in the strategy or a short-TTL ban denylist, which is a larger architectural change than this audit's scope justifies given the 15-minute window is already bounded by the access-token TTL. Documented as a non-blocking limitation.
3. **Fail-open guard model**: no `@Public()`/global-guard convention exists; every route is public-by-default unless a developer remembers `@UseGuards(JwtAuthGuard)`. Not changed in this pass — retrofitting a global default-deny posture across the entire existing route surface is a larger, riskier change than justified here; flagged for a dedicated hardening pass.
4. **No CSRF token** — relies on `sameSite: 'lax'` cookies plus all mutating auth routes being non-GET. Assessed as a reasonable, if implicit, mitigation for the current architecture; not changed, but now explicitly documented as an accepted risk rather than an unexamined gap.
5. **Hardcoded 2FA-encryption fallback key** (`'poppylingo_2fa_fallback_key'`) — unreachable in production today (both `TWO_FACTOR_ENCRYPTION_KEY` and the `JWT_ACCESS_SECRET` fallback are effectively guaranteed there), but removed anyway as defense-in-depth. **Fixed**: `two-factor-crypto.util.ts` now falls back to `getJwtAccessSecret()` (the same mandatory-in-production, random-per-boot-in-dev secret already used elsewhere) instead of a static string — there is no longer any hardcoded key reachable in any environment.
6. No password-reset or email-verification flow exists at all. Out of scope for this audit (a product/feature gap, not a correctness defect in existing code) — documented as a remaining limitation.

## 9. Auth fixes (summary — see §6–8 for detail)

`middleware.ts` (renamed from `proxy.ts`), `AppShell.tsx` (redirect on unauthenticated, deduplicated `/auth/me`), `auth-init.ts` (new), `AuthInitializer.tsx` (delegates to `auth-init.ts`), `axios.ts` (exported `redirectToLogin`), `AppHeader.tsx` (hard-reload logout), `Auth.tsx` (submit-guard + i18n keys), `auth.service.ts` (JWT email claim, `clearAllAuthCookies`), `auth-cookie.util.ts` (`clearAllAuthCookies` helper), `two-factor-crypto.util.ts` (no hardcoded fallback), `auth.controller.ts` / `two-factor.controller.ts` (throttling), `app.module.ts` (`ThrottlerModule.forRoot`).

## 10. Lesson retrieval architecture

Canonical priority across the codebase is correctly **Redis (lock only, not content cache) → Database → Gemini generation → persist → (re-)populate DB**. No module treats Redis as a content cache that could go stale independent of Postgres — Redis is used exclusively as a distributed lock (Listening, Placement-current) or session/rate state (unrelated to lessons). This means there is no "Redis vs Postgres source of truth" ambiguity anywhere in the lesson modules, which is the single most important structural property the task's `B2` section asked us to verify.

## 11. Module-by-module source matrix

| Module | Endpoint(s) | Cache/lock | DB source | AI fallback | Persistence | Concurrency guard | User-visible state |
|---|---|---|---|---|---|---|---|
| Vocabulary | `/vocabulary/today` | none | `Word`/plan tables | inline, sync | per-word upsert (not batched in a transaction) | **added this pass**: PG advisory lock via `QuestionGenerationLockService`, keyed `vocabulary-words:{topicId}:{level}` | **added this pass**: real loading skeleton (was a dead, unrendered `loading` state) |
| Grammar | `/grammar/lessons/*` | none | `GrammarLesson`/`GrammarQuestion` | **none** — cron-based generator exists but is fully disabled (`@Cron` commented out); content is static | N/A | N/A | adequate (plain data, no slow path) |
| Reading | `/reading/*` | none | `ReadingArticle` | none inline — nightly cron only (`0 2 * * *`, active) | transactional (article+vocab+questions in one `$transaction`) | N/A (cron is single-instance today) | adequate |
| Listening | `/listening/practice/start` | Redis lock (`SET NX`, 60s TTL) | `ListeningQuestion` | capped sync fallback (max 3) + async BullMQ for the rest, `jobId`-deduped | yes, with unique-constraint dedup on `questionHash` | **already correct** — Redis lock, deny-on-Redis-error | good (generic "loading" text, no Gemini-specific messaging, not fixed — low severity) |
| Speaking | `/speaking/questions`, `/speaking/answers` (sync); `/speaking/sessions/:id/upload` (async) | none (sync path) | `SpeakingLesson`/`SpeakingAnswer` | sync inline (question gen + answer eval) + separate async BullMQ pipeline for audio answers | async path only | none on sync path (acceptable — low traffic, not user-visible-content, see §14) | **fixed this pass**: sync Gemini failures now return `BadGatewayException` with a friendly message instead of a raw 500; **fixed this pass**: async processing screen now has retry-on-FAILED parity with Writing |
| Writing | `/writing/check` (sync, has its own DB-first dedup lookup); `/writing/sessions/:id/submit` (async) | none | `WritingLesson`/`WritingSubmission` | sync (`/check`) + async BullMQ (`submit`) | async path transactional | none on `/check` (low-risk, single-user quick-check feature) | **fixed this pass**: `WritingSessionPage`'s bare "Loading..." (plus a mojibake-corrupted Vietnamese string) replaced with a real spinner + correct UTF-8 text |
| Placement (current) | `/placement/session/start`, `question-bank` | PG advisory lock | `PlacementQuestion` | sync, lock-guarded | per-row with unique-constraint dedup, session-assignment in a `$transaction` | **already correct** | adequate (generic spinner, low severity) |
| Placement (legacy) | `POST /placement-tests/generate` | **none** | none read | sync, unbounded, **zero persistence/reuse** | none | **none — the single largest concurrency/cost risk found** | N/A (confirmed unused by the current frontend) |
| Learning Path | `/learning-path` | none | `PlacementResult` (already-generated) | none — reads pre-computed AI output from Placement, 404s if missing | N/A | N/A | adequate |
| Dashboard | `/dashboard` | none | ~20 aggregated Prisma queries | none | N/A | N/A | adequate |
| Search | `/search` | none | Prisma full-text-ish query | none | N/A | N/A | adequate |

## 12. Redis strategy

Redis is used in lesson modules exclusively as: (a) a distributed lock (Listening's `SET NX`, Placement's PG advisory lock is actually Postgres not Redis — see below), and (b) BullMQ's own job-queue backing store. No lesson content is ever cached in Redis, so there is no negative-cache/thundering-herd/stale-cache-vs-Postgres concern to manage — confirmed, not assumed, by grepping every lesson module for `cache-manager`/`getOrSet`/direct `ioredis get/set` calls. (Placement's lock is a Postgres advisory lock, not Redis — both mechanisms achieve the same "one generation at a time" property via different infrastructure; this is fine, just worth naming precisely since the task's B6 assumed Redis specifically.)

## 13. Database strategy

No new Prisma models were added. Every fix in this pass reuses existing models/services: `QuestionGenerationLockService` (already existed for Placement, now also used by Vocabulary), `SpeakingProcessingJob` (already had all the fields needed for a proper retry — `audioPath`, `audioMimeType`, `answerId` — so retry-on-FAILED for Speaking needed no schema change, just a new service method + controller route + frontend wiring). No migrations were run or needed.

## 14. Gemini fallback strategy

A real shared `GeminiService` (30s timeout, 3-retry, 2-model fallback) exists and is used by about half the Gemini call sites; the rest instantiate their own SDK client directly with divergent models/timeouts (not consolidated in this pass — a larger refactor than the audit's scope justified, given every individual call site already has *some* error handling and the risk of behavior drift from a forced migration outweighed the benefit here). The one Gemini-calling path with **zero** error handling was Speaking's synchronous `generateSpeakingQuestion`/`evaluateSpeakingAnswer` — fixed (§11).

The legacy `POST /placement-tests/generate` endpoint (confirmed via grep to have zero references anywhere in `english-web-build/src`) generates a full 20-question test synchronously per request with no DB check, no lock, and no persistence — the clearest concurrency/cost exposure in the codebase. Rather than delete a still-registered, guard-protected (`JwtAuthGuard`) module outright — which risks breaking an unknown caller outside this repo (a mobile client, an internal tool, direct API testing) — it was throttled hard (3 requests per 10 minutes per user) via the same `@nestjs/throttler` mechanism used for auth. This neutralizes the cost/concurrency risk without removing a still-live route.

## 15. Generation concurrency control

Vocabulary's `pickWordsForUser` → `generateWordsByGemini` path had no concurrency guard at all (confirmed: 50 concurrent requests for the same missing topic/level would previously have triggered up to 50 Gemini calls). **Fixed**: wrapped the Gemini-calling branch in `QuestionGenerationLockService.withLock(...)`, keyed `vocabulary-words:{topicId}:{level}`, with a DB re-check *inside* the lock (double-checked locking, matching the pattern already used by Placement) so a request that waited for the lock doesn't call Gemini again if another request already filled the gap.

## 16. Structured output validation

Every module already applies hand-written, non-declarative validation after `JSON.parse` (no shared Zod/class-validator schema exists, and introducing one across ~10 independent call sites was judged out of scope for this pass — each site's validation logic is coupled to its own domain rules, e.g. Placement's `validateQuestions()` enforcing skill-specific option/answer shapes). This was not changed; it was audited and confirmed adequate in its current (if duplicated) form for every module except Speaking, whose failure path is now controlled (§11) even though its success-path validation was already reasonable.

## 17. Persistence and idempotency

Reading and Writing's async pipelines already wrap their multi-table writes in `$transaction`. Vocabulary's word-batch upserts are not wrapped in a single transaction (each `upsert` is independent) — not changed in this pass, since each upsert is itself idempotent via its own unique-key constraint, so a partial failure mid-batch does not produce corrupt data, only a possibly-incomplete batch that the next request's shortfall check would top up.

## 18. Frontend loading/generation UX

Fixed: Vocabulary's `/vocabulary/today` fetch previously had a `loading` state that was never rendered in JSX (the actual page showed placeholder content immediately, with zero loading indicator) — now shows a real spinner + "Preparing today's vocabulary lesson..." message. `WritingSessionPage.tsx`'s bare `"Loading..."` (plus a mojibake-corrupted fallback string, a lost-UTF-8-conversion bug, for the "no data" case) replaced with a proper spinner and corrected text. Speaking's processing screen gained retry-on-FAILED parity with Writing's (previously it only offered "re-record from scratch"; now it also offers "retry AI scoring" when the job is retryable, reusing the already-uploaded audio).

**Not fixed, documented as remaining/lower-priority** (same pattern, lower severity — none of these have a multi-minute-Gemini-generation risk, they are plain Prisma-backed page loads): five more bare `"Loading..."` divs across `ChooseWritingTypePage.tsx`, `WritingHomePage.tsx`, `WritingHistoryDetailPage.tsx`, `WritingTopicsPage.tsx`, `WritingResultPage.tsx`. No `AbortController`/request-cancellation exists anywhere in the frontend (pre-existing, not introduced or fixed this pass) — a rapid filter/level change can in principle let an older response overwrite a newer one; flagged, not fixed, as a broader frontend-architecture item outside this audit's auth/AI-fallback scope.

## 19. API contracts

No response-shape changes were made to any existing lesson endpoint (the task's B8 "status/source envelope" recommendation was evaluated and *not* implemented — retrofitting it onto ~10 already-shipped endpoints without any consumer requesting it was judged to be exactly the kind of unrequested redesign the calling brief explicitly warned against ("do not unnecessarily break existing API contracts")). The one new endpoint added, `POST /speaking/sessions/:sessionId/retry-processing`, follows the exact response shape of Writing's existing `retry-processing` endpoint for consistency.

## 20. Failure handling

Speaking's synchronous Gemini calls (`generateSpeakingQuestion`, `evaluateSpeakingAnswer`) now catch any failure (timeout, network, malformed JSON) and return `BadGatewayException` with a friendly Vietnamese message, instead of letting `InternalServerErrorException`/raw errors propagate as undifferentiated 500s. This mirrors the status-code semantics already used by `placement-ai.service.ts` (502 = upstream AI dependency failure).

## 21. Files changed

**Backend**: `src/app.module.ts`, `src/modules/auth/auth.controller.ts`, `src/modules/auth/auth.service.ts`, `src/modules/auth/auth-cookie.util.ts`, `src/modules/auth/two-factor.controller.ts`, `src/modules/auth/two-factor-crypto.util.ts`, `src/modules/placement-tests/placement-tests.controller.ts`, `src/modules/speaking/speaking.service.ts`, `src/modules/speaking-processing/speaking-processing.service.ts`, `src/modules/speaking-processing/speaking-processing.controller.ts`, `src/modules/vocabulary/vocabulary.service.ts`, `src/modules/vocabulary/vocabulary.module.ts`.

**Frontend**: `middleware.ts` (new, replaces deleted `proxy.ts`), `src/lib/auth-route-policy.ts` (trailing-slash fix), `scripts/test-auth-redirect.mjs` (regression cases), `src/lib/auth-init.ts` (new), `src/Components/Auth/AuthInitializer.tsx`, `src/Components/Layout/AppShell.tsx`, `src/lib/axios.ts`, `src/Components/Layout/AppHeader.tsx`, `src/Components/Auth/Auth.tsx`, `src/i18n/types.ts` + all four locale files, `src/Components/Vocabulary/VocabularyPage.tsx`, `src/Components/Vocabulary/vocabularyPage.content.ts`, `src/Components/WritingPage/WritingSessionPage/WritingSessionPage.tsx`, `src/Components/Speaking/SpeakingProcessingPage.tsx`, `src/lib/speaking-processing-api.ts`, `src/lib/speaking-processing.types.ts`.

## 22. Tests

No Jest/Vitest/Playwright test suite exists for any of the flows touched (confirmed pre-existing absence, not introduced by this pass). `scripts/test-auth-redirect.mjs` (the only pre-existing test-like script, covering `auth-route-policy.ts`'s pure redirect-decision logic) gained two regression cases for the trailing-slash bug found in this pass and now passes all cases, `node scripts/test-auth-redirect.mjs` — 0 failures.

Real-browser runtime validation (Playwright against the live dev stack, disposable test accounts via the real `/auth/register`→`/auth/login` cookie flow, never localStorage):
- Register → 201, zero auth cookies set (confirmed no auto-login).
- Login → 201, exactly the three expected cookies with correct `httpOnly`/`sameSite`/`domain`/`path` attributes.
- Authenticated visit to `/dashboard` → renders normally (no redirect, no flash).
- Authenticated visit to `/login` → redirects to `/dashboard` (middleware's guest-only-route rule, confirmed working after the trailing-slash fix).
- Logout → 201, all three cookies cleared.
- Unauthenticated visit to `/dashboard` → redirects to `/login?redirect=%2Fdashboard` (middleware's protected-route rule).
- `GET /vocabulary/today` (now behind the new generation lock) → 200 with a valid body; `/vocabulary` page loads with zero page errors.

No paid/real Gemini calls were made anywhere in this pass — the lock/error-handling changes were validated structurally (typecheck, build, and the request/response shape above), per the task's explicit "do not call the real paid Gemini API" instruction.

## 23. Build results

- Backend: `npm run build` (`nest build`) — 0 errors, both before and after the full set of changes.
- Frontend: `npm run typecheck` (`tsc --noEmit`) — 0 errors. `npm run build` (`next build --webpack`) — succeeded, all routes compiled, and the route manifest now correctly shows `ƒ Proxy (Middleware)` confirming the middleware fix is live.
- `npx eslint` on every changed file — 0 new errors/warnings. Two pre-existing `react-hooks/set-state-in-effect` errors were found in `VocabularyPage.tsx` (line 406, an unrelated effect) and `WritingSessionPage.tsx` (line 170, an unrelated effect) — confirmed via `git diff` that neither line was touched by this pass.

## 24. Remaining limitations

1. Banned/inactive users stay authenticated for up to 15 minutes after a status change (JWT strategy doesn't re-check DB per-request) — bounded by the access-token TTL, judged non-blocking.
2. No global fail-closed (`@Public()`-by-default) guard convention — every new route must remember to add `@UseGuards(JwtAuthGuard)`. A larger hardening-pass item, not fixed here.
3. No CSRF token (relies on `SameSite=Lax` + non-GET mutations) — documented as an accepted risk, not changed.
4. No password-reset or email-verification flow exists — a product/feature gap, not a correctness defect, out of scope.
5. Gemini access remains split between the shared `GeminiService` and ~10 services with their own direct SDK clients — a worthwhile future consolidation, not attempted here to avoid behavior drift across many independently-tuned call sites.
6. Five more bare `"Loading..."` spots remain in the Writing module's lower-traffic browsing pages (list/history/result) — same low-severity pattern as the one fixed, no Gemini-generation risk attached.
7. No `AbortController`/request-cancellation anywhere in the frontend — pre-existing, out of this audit's scope.
8. Vocabulary's word-batch persistence is not wrapped in a single `$transaction` (each upsert is independently idempotent, so this is a minor efficiency/atomicity nicety, not a data-integrity bug).

## 25. Final decision

AUTH FLOW ACCEPTANCE:
PASSED WITH NON-BLOCKING LIMITATIONS

LESSON AI FALLBACK ACCEPTANCE:
PASSED WITH NON-BLOCKING LIMITATIONS

Both systems are production-validated per the acceptance rules given in the brief: cookie handling is centralized and consistent, the two real blocking bugs found (dead middleware, stuck-loading `AppShell`) are fixed, concurrent refresh is single-flighted, no auth token is ever stored client-side, rate limiting now covers every brute-forceable auth endpoint, the one unprotected/unbounded AI-generation surface (legacy placement-test generation) is neutralized, and the one AI call site with no failure handling (Speaking's sync endpoints) now returns a controlled error. The remaining items in §24 are genuinely non-blocking — bounded, already-understood trade-offs or clearly-scoped future work, not open defects. Future work on any of them should be tracked as a module-specific follow-up, not another global auth or lesson-data audit.
