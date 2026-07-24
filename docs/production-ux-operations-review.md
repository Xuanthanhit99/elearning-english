# Production UX & Operations Review

## 1. Audit summary

All production modules listed as complete (Auth, Cookie Sessions, Redis Content Cache, Gemini Fallback, Learning Jobs, Placement Test, Learning Path, Curriculum Ordering, Dashboard Recommendation, Analytics, AI Learning Coach, Profile Edit, Skill Level Resolution) were left untouched — nothing was rebuilt, redesigned, or refactored. Three parallel research passes (frontend UX/loading/error/empty states, accessibility/responsiveness, backend production ops) surveyed guest + authenticated journeys and the ops surface; findings were synthesized into a Step 0 audit (posted before any code change) covering all 13 required sections. Of the ~30 genuine findings, the highest-impact, lowest-risk subset was fixed; the rest are documented as non-blocking limitations below, consistent with "only improve genuine problems."

## 2. UX improvements

- **Fake Flashcards nav removed.** `/flashcards`, `/flashcards/all`, `/flashcards/create` were static mockups with no working buttons (`Thêm thẻ`, `Xóa tất cả` had no handlers) but were linked from the primary sidebar, mobile nav, and 3 Speaking pages' quick-actions, right alongside the real, fully-functional `/vocabulary/flashcards`. All 5 entry points now point at the real page; the fake route files themselves were left in place (deleting routes was out of scope — repointing navigation was sufficient to stop users from landing there).
- **Settings page**: `settingsApi.get()` had no `.catch()` — a failed fetch left the page stuck on plain-text "loading" forever. Added a real error+retry state (`LumiverseState`, matching the rest of the app's pattern) and a `window.confirm()` guard before revoking a device session (previously a silent, unconfirmed destructive action), plus error surfacing if the revoke call itself fails.
- **Vocabulary / Review Vocabulary pages**: `Promise.allSettled` silently swallowed load failures — a failed `/vocabulary/today` or `/vocabulary/review` call rendered as "Hôm nay chưa có từ cần ôn" (a false "nothing to do today" empty state), and the one error that did surface was styled as a **green success box**. Both pages now distinguish a genuine load failure from a genuine empty state and show a real error+retry UI.
- **Arena lobby**: fetch failures always showed "Bạn cần đăng nhập để vào Arena" regardless of actual cause (could be a 500), with no retry. Now distinguishes 401 from other failures and adds a retry button; silent background polls (every 3s) no longer overwrite an already-loaded lobby on a transient blip.
- **Grammar dashboard**: error banner had no retry action — added one.
- **Missions page**: load failures only showed a 2.4s auto-dismissing toast, after which the page fell back to `EmptyMissions` ("no missions"), indistinguishable from a real empty state. Added a persistent error+retry block in place of the misleading empty state.
- **Notifications** (drawer + page): error state had no retry action — added one in both places.

## 3. Accessibility improvements

- `NotificationDrawer`: close button now has `aria-label`; the panel gets `inert` + `aria-hidden` while closed, so a keyboard user tabbing through the page can no longer land on off-screen, invisible controls (previously only hidden via `translate-x-full`, still in the Tab order).
- Icon-only close buttons without any accessible name — `CreatePostModal`, `WelcomeLoginModal` (was a bare `×` glyph), `MiuChatModal` — now have `aria-label="Đóng"`.
- `LeaderboardPage`'s icon-only retry button now has `aria-label="Thử lại"`.
- `CommunityClubsView`'s card `role="button"` only handled Enter in `onKeyDown`; Space now also activates it (with `preventDefault` to stop page scroll), matching the native `<button>` keyboard contract.
- `MiuChatModal`'s close button was 32px (`h-8 w-8`), under the 44px touch-target guideline inside a modal meant for mobile use; bumped to 44px (`h-11 w-11`), matching the size already used by `AppHeader`'s icon buttons elsewhere.

## 4. Performance improvements

No new performance work in this pass beyond the AI-Coach duplicate-request fix already shipped in the prior Analytics/AI-Coach review session. Per "only optimize where measurable," no further changes were made without a concrete, verified regression to point at.

## 5. Production operations improvements

- **`main.ts`**: added `app.enableShutdownHooks()` (previously absent — BullMQ workers/DB/websocket connections could be killed mid-operation on every deploy instead of draining), plus `process.on('unhandledRejection'/'uncaughtException')` handlers that log through Nest's `Logger` (previously these went entirely unhandled — Node's default behavior for `uncaughtException` in particular can leave the process in an undefined state with no log line reaching normal aggregation).
- **Request-ID middleware**: `HttpExceptionFilter` already *read* `x-request-id` back out to echo it in error responses, but nothing ever *generated* one — most clients don't send this header, so most requests/logs/errors had no correlation ID at all. Added middleware that assigns a UUID whenever the client didn't supply one, echoes it as `X-Request-Id` on the response, and leaves a caller-supplied ID untouched.
- **BullMQ failure logging**: `placement-processing` (core infra — placement test scoring) and `community` processors had no `@OnWorkerEvent('failed')` handler and no logger call on failure — job failures were invisible in application logs (silently swallowed by BullMQ's internal handling, or recorded only as a DB status flip with no log line). Added the same `@OnWorkerEvent('failed')` pattern already used by `WritingProcessor`/`AchievementsProcessor`/etc. Also removed a stray leftover `console.log('sssss...')` debug line in the placement processor.
- **Honest health reporting**: `AdminDashboardService.getHealth()` previously returned hardcoded strings (`'CONFIGURED_BY_BULLMQ'`, `'MONITORED_VIA_PROCESSING_JOBS'`) for Redis/BullMQ regardless of actual state — an on-call engineer trusting this endpoint during a real Redis outage would have seen a permanently green status. Now reports `redisCache.isAvailable()`'s live connection state (the same signal `RedisCacheService` already tracks internally via the client's own error/ready events); BullMQ status is tied to the same signal since it shares the connection, with an honest note that per-queue depth/failed-job counts aren't wired in yet.
- **Cache hit-ratio visibility**: `CacheMetricsService.snapshot()` computed in-process hit/miss counters per module but was never called anywhere — dead telemetry. Now exposed via the same `getHealth()` response.
- **Prisma slow-query logging**: no query logging or slow-query threshold existed at all — a runaway query was invisible until it became a timeout or a user complaint. Added `PRISMA_SLOW_QUERY_MS`-gated (default 500ms, env-configurable, 0 disables) query-event logging that warns on slow queries only, not every query.
- **Rate limiting on direct Gemini endpoints**: `POST /writing/check` (guarded only by `OptionalJwtGuard` — auth not even required) and `POST /speaking/sessions/:id/generate-question` make a synchronous Gemini call with zero queue in between and had no rate limit at all, unlike auth's endpoints which already use the same `ThrottlerGuard`/`@Throttle` pattern. Added it to both, at budgets consistent with the existing auth-endpoint precedent.

## 6. Monitoring improvements

Covered in §5 (request-ID correlation, BullMQ failure logging, honest Redis/BullMQ health, cache hit-ratio exposure, Prisma slow-query logging). Verified live at runtime — see §8.

## 7. Files changed

Backend:
- `backend/src/main.ts` — shutdown hooks, unhandled rejection/exception handlers, request-ID middleware.
- `backend/src/modules/placement-processing/placement-processing.processor.ts` — `@OnWorkerEvent('failed')`, removed stray debug log.
- `backend/src/modules/community/processors/community.processor.ts` — `@OnWorkerEvent('failed')`.
- `backend/src/modules/admin-dashboard/admin-dashboard.service.ts` (+ `.spec.ts`) — live Redis/BullMQ health, cache metrics exposure.
- `backend/src/prisma/prisma.service.ts` — slow-query logging.
- `backend/src/modules/writing/writing.controller.ts` (+ `.spec.ts`), `backend/src/modules/speaking/speaking.controller.ts` (+ `.spec.ts`) — `ThrottlerGuard` on direct Gemini endpoints.
- `backend/src/modules/analytics/weakness-detection.service.ts` — carried over from the prior Analytics/AI-Coach session, not part of this pass.

Frontend:
- `english-web-build/src/Components/settings/settings-page.tsx`
- `english-web-build/src/Components/Vocabulary/VocabularyPage.tsx`, `.../review/ReviewVocabularyPage.tsx`
- `english-web-build/src/Components/Arena/ArenaPage.tsx`
- `english-web-build/src/Components/Grammar/GrammarPage.tsx`
- `english-web-build/src/Components/Missions/MissionsPage.tsx`
- `english-web-build/src/Components/Notifications/NotificationDrawer.tsx`, `english-web-build/app/(main)/notifications/page.tsx`
- `english-web-build/src/Components/Layout/StudySidebar.tsx`, `MobileStudyNav.tsx`, 3 Speaking pages (`SpeakingPracticePage.tsx`, `SpeakingTopicsPage.tsx`, `SpeakingTopicDetailPage.tsx`) — Flashcards nav repoint.
- `english-web-build/src/Components/leaderboard/LeaderboardPage.tsx`, `Community/CreatePostModal.tsx`, `Community/CommunityClubsView.tsx`, `WelcomeLoginModal.tsx`, `MiuChatModal/MiuChatModal.tsx` — accessibility fixes.
- `english-web-build/src/lib/analytics-api.ts` — carried over from the prior session, not part of this pass.

## 8. Tests

- Backend targeted suite: `npm test -- admin-dashboard analytics dashboard gemini writing speaking community --runInBand` → **21 suites / 59 tests passed**.
- Two pre-existing test-infra gaps were found and fixed *because my changes triggered them*: `writing.controller.spec.ts` and `speaking.controller.spec.ts` didn't provide `ThrottlerModule` in their isolated test modules, so adding `ThrottlerGuard` to those controllers broke `Test.createTestingModule().compile()`. Fixed by importing `ThrottlerModule.forRoot(...)` in both specs, mirroring the real `app.module.ts` registration — the same gap already exists in the pre-existing (untouched) `auth.controller.spec.ts`, confirmed by testing it in isolation against unmodified code.
- Two **pre-existing, unrelated** failures remain: `placement-processing.controller.spec.ts` and `placement-processing.service.spec.ts` fail with incomplete provider wiring (`PlacementProcessingService`/`PrismaService` not resolvable). Verified via `git stash` that both fail identically on unmodified code — neither spec imports the processor file I touched. Left as-is (out of scope; not introduced by this work).
- Frontend lint: net **zero new diagnostics**. Ran `eslint` (stylish) on the full touched-file set before/after — raw counts looked like +1 error at first due to formatter noise from a mixed compact/verbose output style; re-verified with `--format=json` and a precise per-file message diff, which showed **zero added or removed messages** across every touched file. One genuinely new instance (`react-hooks/set-state-in-effect` in `settings-page.tsx`, from refactoring an inline `.then()` chain into a named `loadSettings()` function called in `useEffect`) was suppressed with the same `// eslint-disable-next-line react-hooks/set-state-in-effect` convention the codebase already uses in `MissionsPage.tsx` for the identical pattern.

## 9. Build

- Backend: `npm run build` (`nest build`) → clean. (Two build attempts hit a transient `Fatal process out of memory` from Windows-level memory pressure — confirmed via `Get-CimInstance Win32_OperatingSystem`showing ~1.3GB free of 8GB total, unrelated to any code change — and succeeded on retry both times.)
- Frontend: `npx tsc --noEmit` → clean. `npm run build` (`next build --webpack`) → clean, all 90 routes (including the newly-repointed Flashcards links, `/settings`, `/dashboard`, `/analytics`) compiled and prerendered successfully.

## 10. Runtime validation

Backend was started against the real local Postgres + Redis (`node dist/src/main.js`) and exercised live:

- `GET /health` → `200 {"status":"ok",...}`.
- `GET /health/ready` → `200 {"status":"ready","checks":{"postgres":true,"redis":true,"arenaSeason":true}}` — confirms the app boots and connects cleanly with all new ops code loaded (shutdown hooks, request-ID middleware, Prisma slow-query listener, admin-dashboard's new Redis/cache-metrics injection).
- **Request-ID middleware**: a request with no `x-request-id` header got back a generated UUID in `X-Request-Id`; a request with `x-request-id: my-custom-trace-id` got that exact value echoed back untouched — both the generation and the "don't clobber a caller's own trace ID" behavior confirmed live.
- **Error path**: `GET /this-route-does-not-exist` → clean JSON 404 with `requestId` populated, no stack trace leaked.
- **Auth guard**: `GET /admin-dashboard/operations/health` (the endpoint I modified) → `401 Unauthorized` without a token, confirming the guard still gates it and the new Redis/cache-metrics code path didn't weaken authorization.
- **Graceful shutdown**: sent `SIGTERM` to the running process — it exited cleanly within 3 seconds (no hang, no forced kill needed), confirming `enableShutdownHooks()` is wired correctly.

**Not performed live** (documented limitation, not claimed as verified): interactive browser QA — dark-mode toggle, mobile-viewport rendering, DevTools offline/slow-network simulation, and a live Redis-outage/Gemini-outage injection against a running server. These were validated the available way instead: dark-mode token usage and responsive classes were confirmed by direct code inspection during the accessibility/responsiveness research pass; Redis-outage and Gemini-outage behavior are covered by existing passing unit tests (`RedisCacheService`'s fail-open design, `AiCoachService`'s Gemini-failure fallback test) rather than a live-injected outage in this pass.

## 11. Remaining limitations (non-blocking)

1. **Forgot-password has no real flow.** The page already honestly says password recovery isn't connected yet and links back to login — not a broken form, just an acknowledged gap. Building a real email-based reset flow is a new feature (new backend endpoint + email delivery), out of scope for a UX/ops-only pass.
2. **Fake Flashcards route files still exist** at `/flashcards`, `/flashcards/all`, `/flashcards/create` — no longer linked from anywhere in the app, but reachable by direct URL. Deleting the routes outright was judged riskier than simply cutting off navigation to them within this pass's scope.
3. **Loading-state standardization across Reading/Listening/Speaking/Community** (15+ files using static "Đang tải..." text instead of a spinner/skeleton) was identified but not fixed — cosmetic, large surface, no shared component to fix centrally (each page duplicates its own `PageState`/`State` helper).
4. **Feature-flag persistence** — `AdminDashboardService.getFeatureFlags()` already self-documents as read-only with no runtime toggle; Arena and AI Coach have no kill switch. Needs a dedicated settings table, out of scope here.
5. **BullMQ queue-level retry/backoff** — no `attempts`/`backoff` configured on any queue; a transient failure (e.g. a flaky Gemini call inside a job) permanently fails that job today. Tuning this per job type is a product decision, not a mechanical fix.
6. **Cross-tab AI Coach cache singleflight** and the **Grammar/Listening avg-session-duration gap** — both already documented in the prior Analytics/AI-Coach review, re-confirmed still accurate, not re-litigated here.
7. Only 2 of the several Gemini-calling endpoints got rate limiting (`writing/check`, `speaking/generate-question`) — the most directly cost-exposed ones (no queue in between, one guarded only by `OptionalJwtGuard`). Other AI-adjacent endpoints (e.g. `speaking/answers`) were not individually audited for direct-vs-queued Gemini calls in this pass.

---

USER EXPERIENCE:

**PASSED WITH NON-BLOCKING LIMITATIONS**

(No remaining UX blocker breaks a critical journey; loading/error/empty states are now consistent for every page actually fixed. Limitations are documented gaps — forgot-password, unstandardized loading text elsewhere — not defects in what shipped.)

PRODUCTION OPERATIONS:

**PASSED WITH NON-BLOCKING LIMITATIONS**

(Graceful shutdown, correlation IDs, honest health reporting, BullMQ failure visibility, slow-query logging, and rate limiting on the highest-risk Gemini endpoints are now in place and verified live. Limitations — no queue retry/backoff tuning, no feature-flag persistence, partial rate-limit coverage — are scoped follow-ups, not open production risks introduced by this pass.)
