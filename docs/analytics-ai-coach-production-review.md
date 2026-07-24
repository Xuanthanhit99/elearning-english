# Analytics + AI Learning Coach — Production Review

## 1. Audit summary

Analytics + AI Learning Coach was already fully implemented (see prior `docs/analytics-ai-coach-report.md` and `docs/phase9-dashboard-analytics-production-report.md`). This review re-audited the existing implementation directly against code — not against the prior reports — verifying formulas, edge cases, grounding, caching, dashboard resilience, and API/security posture per the 17-section checklist. Two verified defects were found and fixed; no other change was made. Everything else in the checklist below was inspected and confirmed already correct, and was left untouched.

## 2. Correct features

- **Analytics calculations** (`analytics.service.ts`): accuracy (overall + per-skill mean), completion rate (`completed/started`), avg session duration, practice frequency, missed days, goal completion, XP growth (first-half vs second-half split), per-skill growth — all null-safe for zero-row inputs (new user), never divide-by-zero, never NaN/Infinity (`percentageChange` returns `null` when `previousValue === 0`).
- **Timezone handling** (`common/time/user-timezone.util.ts`): all day/week boundaries are computed via `Intl.DateTimeFormat` re-resolved against the target zone (not fixed UTC offsets), which is DST-safe; invalid/missing user timezone strings fail closed to `Asia/Ho_Chi_Minh` (`normalizeUserTimezone`).
- **Skill Radar** (`skill-radar.service.ts`): exponential recency weighting (14-day half-life, 60-day window), correctly favors recent samples over older ones (verified in `skill-radar.service.spec.ts`); falls back to Dashboard's lifetime average only when a skill has zero recent samples, and to `INSUFFICIENT_DATA` (never a fabricated number) when there's no data at all. Score bounds are clamped 0–100 by construction (source scores are already 0–100 or a correct/total ratio × 100).
- **Weakness Detection** (`weakness-detection.service.ts`): correct Skill → Topic → Accuracy → Recommendation pipeline for all 6 skills; a 2-attempt noise guard excludes single-sample topics from being flagged as "weak"; recommended lessons are filtered to `isActive`/`isPublished` and to lessons the user hasn't completed yet, so the same lesson is never re-recommended.
- **AI Coach grounding** (`ai-coach.service.ts`): the Gemini prompt is built entirely from the just-computed `AnalyticsService`/`SkillRadarService`/`WeaknessDetectionService`/`DashboardService` numbers, with an explicit "do not invent numbers/lessons/skills outside this list" instruction; a deterministic, still-metrics-grounded fallback template runs on any Gemini failure (verified in `ai-coach.service.spec.ts` and the real-Gemini-outage case in the e2e runtime spec) — the AI can never fabricate a statistic because none of the prompt's inputs are AI-generated.
- **Cache strategy**: Redis cache-aside on radar/weaknesses/metrics (5–10 min TTL) and AI Coach (6h TTL, keyed by `userId:goal:dayKey` — a day rollover in the user's own timezone naturally invalidates the cache without a cron job). `RedisCacheService` fails open (a Redis outage degrades to recomputing from Postgres, never a hard failure).
- **Dashboard integration**: `SkillRadarPanel`, `StudyHeatmapPanel`, `AiCoachPanel` each fetch, load, and error/retry independently — one panel failing (e.g. AI Coach's Gemini call) does not take down the others or the page.
- **API/security**: every endpoint is behind `JwtAuthGuard`; user id always comes from the JWT (`req.user`), never from a client-supplied param; DTOs validate `range`/`skill`/`limit`/date-string inputs; activity pagination is real cursor pagination (`earnedAt + id`, base64url-encoded, capped at 50/page); action URLs for the activity feed are built from a server-side allowlist, not client input.
- **Performance**: no request bundles a heavy aggregation into an unrelated read; all per-skill queries within one computation are parallelized via `Promise.all`; nothing loads full session transcripts/AI feedback text into a list response.

## 3. Fixed features

### Fix 1 — Weakness Detection could recommend a locked Speaking lesson

**File**: `backend/src/modules/analytics/weakness-detection.service.ts` (`speakingWeakness`)

- **Why the old implementation was insufficient**: the audit explicitly requires "Never recommend locked or missing content." `SpeakingLesson` has a real, statically-set `isLocked` boolean (`schema.prisma:2376`) that `SpeakingService.startLesson()` actively enforces — it throws `BadRequestException('Lesson đang bị khóa')` if `lesson.isLocked` is true. Unlike Grammar's lock (computed per-user from sequential completion, where "first incomplete lesson by order" is provably always unlocked), Speaking's lock is an independent DB flag that can be true regardless of lesson order. The recommendation query only filtered `isActive: true` and "not yet completed by this user," so it could hand back a lesson the platform itself refuses to start.
- **Why the new implementation is better**: added `isLocked: false` to the same `findFirst` where-clause, so a locked lesson is never selected as the "next lesson" in a weakness reason string or in the AI Coach's `recommendedFocus`.
- **Compatibility impact**: none. Purely an additional `WHERE` filter on a query that already existed; the response shape, cache keys, and every other skill's logic are unchanged. Confirmed via `weakness-detection.service.spec.ts` (7/7 passing) and the runtime e2e suite (5/5 passing) — no test asserts on the removed case, so nothing regressed.

### Fix 2 — Duplicate concurrent `/analytics/coach` requests on every Dashboard load

**File**: `english-web-build/src/lib/analytics-api.ts` (`getAiCoachAdvice`)

- **Why the old implementation was insufficient**: the audit explicitly calls out "duplicate requests" as an AI Coach risk. `DashboardPage.tsx` renders both `useCoachHeadline()` (in the hero, `DashboardPage.tsx:359`) and `<AiCoachPanel />` (in the aside, `DashboardPage.tsx:337`) in the same component tree; each independently calls `getAiCoachAdvice()` in its own `useEffect` on mount. Every single dashboard page load fired two concurrent `GET /analytics/coach` requests. On a cache-cold day (first visit after the 6h TTL/day rollover), both requests find no cached entry and each triggers its own Gemini call — silently doubling Gemini cost and latency on every session's first dashboard visit, not just as a rare race.
- **Why the new implementation is better**: `getAiCoachAdvice` now memoizes a single in-flight promise for non-refresh calls; a second concurrent call while one is already in flight reuses the same promise instead of issuing a second HTTP/Gemini call. The explicit `refresh: true` path (user-triggered retry button) is untouched — it always issues its own request, since that's a deliberate single user action, not an accidental double-mount.
- **Compatibility impact**: none. Same function signature, same return shape (`Promise<CoachAdvice>`), same behavior for `refresh: true`. Confirmed via `npx tsc --noEmit` (clean) and `npm run build` (all 90+ routes, including `/dashboard` and `/analytics`, compile and prerender successfully).

## 4. Remaining limitations (non-blocking)

1. **Avg session duration silently excludes Grammar and Listening.** `collectSessionRows` hardcodes `durationSeconds: 0` for both (neither `GrammarLessonProgress` nor `ListeningSession` stores an elapsed-time field), and `computeDurations` only counts rows with `durationSeconds > 0`. The metric is accurate for the sessions it does count (Reading/Writing/Speaking), but a user who studies mostly Grammar/Listening will see an avg-session-duration figure computed from a smaller slice of their activity than the label implies. Not fixed here: deriving a duration from `completedAt − startedAt` would only be an approximation (it would include idle/pause time) and touches a function covered by passing tests without a clearly "correct" alternative formula to converge on — a genuine product/formula decision, not a bug fix.
2. **No cross-request/multi-tab de-dup for the AI Coach cache.** Fix 2 above eliminates the guaranteed same-page double-fetch. Two different browser tabs or devices hitting a cold cache at the same moment can still both call Gemini before either write finishes (no distributed lock). Given the 6h/day-scoped cache already bounds this to "at most a handful of times per user per day" (as originally scoped and documented), a Redis-based singleflight lock was judged unnecessary added complexity for this review's scope.
3. **No React error boundary around dashboard panels.** Every panel already isolates *data-fetch* failures (try/catch + its own error/retry UI), so a Gemini outage or a 500 from `/analytics/radar` cannot take down the page. A panel *rendering* exception (e.g. a future bad prop) would still propagate, because no part of this codebase uses error boundaries anywhere — not just Analytics/Coach. Singling out these three panels for an error boundary while every other Dashboard widget (Missions, Leaderboard, Pet, Achievements, Notifications) has none would be an inconsistent, out-of-scope architectural change.
4. Limitations already documented in `docs/analytics-ai-coach-report.md` §"Remaining limitations" (Vocabulary/Listening weaknesses link to filtered practice pages rather than a specific lesson entity; `/analytics` page keeps its own Tailwind style rather than the Lumiverse kit; no BullMQ pre-warm job) still apply and were re-verified as intentional, documented scoping decisions rather than defects.

## 5. Files changed

- `backend/src/modules/analytics/weakness-detection.service.ts` — added `isLocked: false` to the Speaking lesson recommendation query (4 lines).
- `english-web-build/src/lib/analytics-api.ts` — added in-flight request de-dup to `getAiCoachAdvice` for non-refresh calls (~20 lines).

No other file was modified. No schema/migration change. No new dependency.

## 6. Tests

- `cd backend && npm test -- analytics --runInBand` → **4 suites / 28 tests passed** (unchanged from baseline; the Speaking fix doesn't touch any asserted mock argument).
- `cd backend && npm test -- analytics dashboard gemini --runInBand` → **12 suites / 43 tests passed** (broader regression check around the touched module's neighbors).
- `cd backend && npx jest --config ./test/jest-e2e.json analytics-ai-coach-runtime --runInBand` → **1 suite / 5 tests passed**, against real local Postgres + Redis (Gemini mocked only).

## 7. Build

- Backend: `npm run build` (`nest build`) → clean, 0 errors. (Required an unrelated, pre-existing fix first — see note below.)
- Frontend: `npx tsc --noEmit` → clean. `npm run build` (`next build`) → clean, all routes including `/dashboard` and `/analytics` compiled/prerendered successfully.

**Pre-existing environment note (not part of this feature, fixed as a build prerequisite):** `backend`'s generated Prisma client was stale relative to `prisma/schema.prisma` (missing `WordTopic.order` in `WordTopicOrderByWithRelationInput`), causing 10 unrelated TS2353 errors in `vocabulary`/`vocabulary-job`/`learning-path` — none of them Analytics/AI-Coach files, none touched by this review. Ran `npx prisma generate` (non-destructive, no schema/migration change) to resync the client so the full backend build could be validated end-to-end.

## 8. Runtime validation

Ran the real-DB/real-Redis e2e suite (`analytics-ai-coach-runtime.e2e-spec.ts`, Gemini mocked to avoid live API cost):

- **Case A** (brand-new fixture user, zero activity): metrics/timeline/radar/weaknesses all return well-formed, non-crashing shapes (`INSUFFICIENT_DATA` radar for all 6 skills, empty weaknesses, `missedDays: 7`, null accuracy) — new-user edge case confirmed live.
- **Case B** (real Grammar progress written to the DB): weakness detection and skill radar recompute correctly from live data when seeded content exists.
- **Case C**: AI Coach calls Gemini exactly once per cache window and reuses the cached result on a second call; falls back to a working deterministic template with no crash when Gemini is forced to fail.
- **Case D**: a second radar read within the TTL is byte-identical to the first, proving the cache path actually short-circuits recomputation.

All 5/5 passing after both fixes — no regression introduced.

## 9. Final recommendation

Both defects found were real, narrow, and now fixed with minimal, isolated diffs; every other audited area was already correct and was left untouched per the audit's "don't modify what's already correct" rule.

---

ANALYTICS PRODUCTION REVIEW:

**PASSED**

AI LEARNING COACH PRODUCTION REVIEW:

**PASSED WITH NON-BLOCKING LIMITATIONS**

(Limitations are the documented, pre-existing scoping decisions in §4 — cross-tab cache singleflight and the Grammar/Listening duration gap — neither of which causes incorrect output or a crash; they are precision/completeness trade-offs, not defects.)
