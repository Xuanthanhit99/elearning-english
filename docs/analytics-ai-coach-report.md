# Analytics + AI Learning Coach — Implementation Report

## Status

Feature expansion built on top of the completed Learning Path / Learning Job / Placement work. Authentication, cookie sessions, Redis content cache, Gemini fallback, Learning Jobs, Placement Test, Learning Path, curriculum ordering, profile edit, Dashboard recommendation, and skill-level resolution were **not** re-audited or refactored. The one exception, per the "tiny change if a dependency absolutely requires it" allowance, is documented in Architecture below.

## Step 0 audit (summary)

Before writing code, the existing implementation was audited directly (not from stale docs):

1. **Analytics** — `AnalyticsService` already had `getOverview/getSkills/getSkillDetail/getActivity/getReport`, a 7d/30d/90d range, and a daily XP/study-minutes/activity series. No accuracy, completion rate, session duration, practice frequency, missed-days, or per-skill-growth metrics existed.
2. **Dashboard statistics** — `DashboardService.buildSkillProgress` used a lifetime flat average (`this.average()`), not recency-weighted.
3. **Progress tracking** — `ProgressService.getUnifiedHistory` fans out over 7 Prisma models with a custom range capped at 91 days; solid, reused as a precedent for this feature's own custom-range cap.
4. **XP history** — `XpTransaction`/`UserXpProfile` ledger, reused as-is for the `xpGrowth` metric.
5. **Streak system** — confirmed `PetProfile.streak` (not `UserXpProfile.currentStreak`) is what Dashboard actually reads; the new Coach reads the same field via `DashboardService.getDashboard()`.
6. **Leaderboard metrics** — untouched, out of scope.
7. **Reports** — `/reports/weekly|monthly|range` existed and were left as-is.
8. **AI recommendation** — `DashboardService.getRecommendedLesson` is fully static/rule-based (first incomplete Grammar → Writing → Reading lesson), no AI, no "reason" field. Left untouched; the new Weakness Detection + AI Coach are additive, not a replacement.
9. **Gemini usage** — `GeminiService.generateJson` is the shared, retryable, model-fallback primitive from Task 1; reused directly by the new `AiCoachService`, no new Gemini client.
10. **Charts** — no charting library in this codebase by design; all charts are hand-built SVG/CSS (Placement's hexagon radar, Dashboard's weekly bar chart). The new Skill Radar and Study Heatmap follow the same pattern.
11. **APIs** — confirmed via `analytics.controller.ts`/`dashboard.controller.ts`.
12. **Frontend pages** — `DashboardPage.tsx` (had a hardcoded "Lumi Coach ... future release" stub at the old line 403), `/analytics` (hand-rolled Tailwind, not on the Lumiverse kit), `/reports` (same).

**Genuine gaps** (the actual scope of this task): accuracy/completion/duration/frequency/missed-days/goal-completion/per-skill-growth metrics; a recency-weighted Skill Radar; sub-topic-level Weakness Detection with reasons; the AI Learning Coach itself (zero prior Gemini integration in this area); goal-adaptive advice (`UserSettings.learningGoal` was stored but never branched on); a Study Heatmap; and any caching at all (Analytics/Dashboard/Progress had zero Redis usage before this).

## Architecture

New backend code lives entirely under `backend/src/modules/analytics/`:

- **`weakness-detection.service.ts`** — `WeaknessDetectionService`. For each of the 6 skills, groups the user's session/progress rows by sub-topic (Grammar/Reading/Writing/Speaking via their relational topic FK; Vocabulary via `Word.topic`; Listening via its flat `topic` string field, since it has no topic relation), computes an accuracy per topic, and picks the weakest topic with ≥2 attempts (a noise guard). Attaches a concrete "next lesson" pointer (the first not-yet-completed lesson in that topic) and a reason string in the exact format the task asked for: `"Grammar → Present Perfect → Accuracy 42% → Recommend Lesson: X"`.
- **`skill-radar.service.ts`** — `SkillRadarService`. Recomputes each skill from timestamped samples in the last 60 days with exponential recency weighting (14-day half-life), so a session from yesterday counts far more than one from 55 days ago. Falls back to `DashboardService.getDashboard()`'s lifetime percent only when a skill has zero recent samples (new/inactive skill), so the radar is never empty; otherwise marks `INSUFFICIENT_DATA`.
- **`ai-coach.service.ts`** — `AiCoachService`. Gathers `AnalyticsService.getOverview`, `SkillRadarService.getRadar`, `WeaknessDetectionService.getWeaknesses`, and `DashboardService.getDashboard` (streak, today's goal %), builds a metrics snapshot, and prompts Gemini with **only those real numbers** embedded in the prompt text — the prompt explicitly instructs Gemini not to invent numbers or lessons outside the list. Falls back to a deterministic template (still built from the same real metrics, not hallucinated) if Gemini fails, marking `source: 'FALLBACK_TEMPLATE'` vs `'GEMINI'` so callers/tests can tell which path ran.
- **`analytics.service.ts`** extended (not rewritten) with `getMetrics` and `getTimeline`; all 5 previously-existing methods are untouched.
- **`analytics-cache.constants.ts`** — cache keys/TTLs local to this module.

**The one dependency-required change to already-complete infrastructure**: `RedisCacheService` existed in `common/cache/redis-cache.module.ts` but was not in that module's `exports` array, so no other module could inject it (it was only reachable indirectly through `ContentCacheService`, which is semantically scoped to shared lesson content, not per-user analytics). Added `RedisCacheService` to the exports array — an additive, behavior-preserving change (no existing caller's behavior changes) — so the new services could reuse the existing Redis client instead of inventing a parallel cache abstraction.

**Scoping decisions**:
- Dashboard's `DashboardService`/`DashboardController` were **not modified**. The Dashboard upgrade (Part 7) is composed at the frontend layer instead: `DashboardPage.tsx` now also fetches `/analytics/radar`, `/analytics/coach`, and `/analytics/timeline` independently (their own loading/error/retry state) and renders them as additional panels alongside the existing, untouched Dashboard data. This satisfies "Dashboard upgrade" without touching the "Dashboard recommendation" module the task marked complete.
- No new BullMQ job or scheduled cron was added. Given the metrics here are cheap Redis-cached reads (5–10 min TTL) rather than expensive multi-user aggregations, a cache-aside (compute on first read, serve from Redis after) was judged sufficient and simpler than a new scheduled pre-warm job. AI Coach calls are the one genuinely expensive operation (Gemini) and are cached per user+goal+day (6h TTL) instead.

## Calculations

All new metrics live in `AnalyticsService.getMetrics` / `getTimeline`, computed from one shared `collectSessionRows()` read (Reading/Listening/Speaking/Writing/Grammar sessions in the requested range) so accuracy, completion rate, duration, and per-skill growth don't each re-query independently:

- **Accuracy** (overall + per-skill): mean of each completed session's accuracy/score field within the range.
- **Completion rate**: `completed / started` sessions in the range.
- **Avg session duration**: mean duration (seconds→minutes) of completed sessions that recorded a duration.
- **Practice frequency**: total sessions ÷ days in range.
- **Missed days**: `range.days − distinct active days`.
- **Goal completion**: days where `studyMinutes ≥ settings.dailyStudyMinutes`, as a % of the range.
- **XP growth**: first-half vs second-half XP of the range (reuses the existing `buildTrend` split-in-half pattern already used by `getOverview`).
- **Per-skill growth**: same first-half/second-half split, applied per skill's accuracy values, with an explicit `UP/DOWN/FLAT` direction.
- **Skill Radar score**: `Σ(weight × score) / Σ(weight)` where `weight = 0.5^(daysAgo / 14)`, over samples from the last 60 days per skill.
- **Weakness accuracy**: per sub-topic, `Σcorrect / Σtotal` (or `Σscore/100` for score-based skills), topics with fewer than 2 attempts excluded as noise.

## API

New endpoints (all under the existing `AnalyticsController`, `JwtAuthGuard`-protected, same `{ success, data }` envelope as the existing ones):

| Endpoint | Purpose |
|---|---|
| `GET /analytics/metrics?range=7d\|30d\|90d` | Accuracy, completion rate, durations, practice frequency, missed days, goal completion, XP growth, per-skill growth |
| `GET /analytics/timeline?range=today\|7d\|30d\|90d\|custom&from&to` | Per-day XP, study minutes, completed activities, accuracy, completed skills, achievements unlocked |
| `GET /analytics/radar` | Recency-weighted 6-skill radar |
| `GET /analytics/weaknesses` | Per-skill weakest sub-topic + overall top-5 weaknesses, each with a reason and recommended lesson |
| `GET /analytics/coach?refresh=true` | AI Learning Coach advice (goal-adaptive); `refresh=true` bypasses the cache |

`AnalyticsRange` gained `today` and `custom` (existing `7d/30d/90d` untouched); a new `TimelineQueryDto` adds optional `from`/`to` (ISO dates, capped at 91 days, same cap Progress's unified history already uses).

## Frontend

- **`src/lib/analytics-api.ts`** extended with typed clients for all 5 new endpoints (no existing exports changed).
- **`src/Components/Dashboard/AnalyticsCoachPanels.tsx`** (new) — `SkillRadarPanel`, `StudyHeatmapPanel`, `AiCoachPanel`, each self-fetching with its own loading (`LumiverseSkeleton`), error+retry (`LumiverseState`), and ready states, built on the Lumiverse kit. `SkillRadarPanel`'s SVG hexagon math is adapted from Placement's existing `RadarChart` (not modified in place — Placement's own screen is untouched). `StudyHeatmapPanel` is a hand-built CSS-grid contribution graph (no charting library, matching this codebase's existing no-dependency convention) sourced from `/analytics/timeline?range=90d`.
- **`DashboardPage.tsx`**: added `SkillRadarPanel`/`StudyHeatmapPanel` to the main column and `AiCoachPanel` to the aside; replaced the hardcoded "A learning companion is being prepared for a future release" stub in the hero with the real Coach headline (`useCoachHeadline()`), showing a lightweight "Analyzing your recent progress…" state while it loads instead of fake text.
- **`app/(main)/analytics/page.tsx`**: added a Weaknesses + AI Coach section (`WeaknessAndCoachSection`) in the page's existing Tailwind/Vietnamese style (this page doesn't use the Lumiverse kit today — a pre-existing inconsistency this task didn't expand scope to fix), each independently loading/erroring.
- All new panels support dark mode via existing `--lumiverse-*` tokens / Tailwind dark classes already used elsewhere in these files; no new CSS variables were introduced.

## Performance

- Redis cache-aside (via `RedisCacheService`, reusing the existing content-cache Redis connection) on `getMetrics` (5 min), `getRadar` (5 min), `getWeaknesses` (10 min), and `getCoachAdvice` (6 h, keyed by user+goal+day). A Redis outage degrades to DB-only reads (same fail-open behavior as the existing `RedisCacheService`), never a hard failure.
- No heavy aggregation runs synchronously in a request that also does something else — each new metric is its own endpoint, computed on-demand and cached, not bundled into `getOverview`.
- AI Coach is the one Gemini-backed, non-trivial-cost call; the per-user-per-goal-per-day cache means it runs at most a handful of times per user per day even under heavy `refresh` use from the frontend's retry button.
- No new BullMQ job was added (see Scoping decisions above) — a deliberate, documented choice given the read patterns here don't need pre-warming.

## Tests

- **Unit** (`backend/src/modules/analytics/*.spec.ts`, 28 tests, all passing):
  - `weakness-detection.service.spec.ts` — no-data case, noise-guard (< 2 attempts), correct weakest-topic selection + exact reason-string format, Listening's flat-string topic grouping, overall top-5 cap/sort, cache-hit short-circuit.
  - `skill-radar.service.spec.ts` — lifetime-average fallback, `INSUFFICIENT_DATA` case, recency weighting favoring a recent sample over an older one (not a flat average), cache-hit short-circuit.
  - `ai-coach.service.spec.ts` — prompt is grounded in the actual computed metrics (asserts the real XP/topic/accuracy numbers appear in the prompt string), Gemini-failure fallback is metrics-grounded, cache reuse (Gemini called exactly once across two calls), `forceRefresh` bypass, goal-adaptive prompt content.
  - `analytics.service.spec.ts` — `getMetrics` accuracy/completion-rate/goal-completion calculations, cache reuse; `getTimeline` fixed ranges, custom-range validation (missing dates, >91-day rejection), achievement-per-day counting, completed-skills-per-day marking.
- **Runtime (real DB + real Redis)**: `backend/test/analytics-ai-coach-runtime.e2e-spec.ts`, 5/5 passing against the actual local Postgres + Redis instances (GeminiService mocked to avoid real API cost; everything else — Prisma, Redis cache-aside, DashboardService, LearningPathService, SkillLevelResolverService — real):
  - **Case A** (brand-new fixture user, zero activity): every new endpoint returns a well-formed, non-crashing shape (`INSUFFICIENT_DATA` radar, empty weaknesses, 7-day timeline, `null` accuracy).
  - **Case B** (real Grammar progress written to the DB): weakness detection and skill radar recompute from it live. This DB currently has **zero seeded Grammar topics/lessons** (content-generation jobs haven't populated it in this environment), so the lesson-dependent assertions inside this case short-circuit with a logged, non-failing note — the grouping/accuracy/recency logic itself is exhaustively covered by the mocked unit tests above.
  - **Case C**: AI Coach calls Gemini exactly once, reuses the cached result on a second call, and falls back to a working deterministic template (no crash) when Gemini is forced to fail.
  - **Case D**: a second radar read within the TTL is byte-identical to the first (proves the cache path actually short-circuits recomputation, not just that a cache key gets written).
- **Backend build**: `npm run build` (nest build / tsc) — clean, 0 errors.
- **Frontend**: `tsc --noEmit` — clean; `next build` — clean, all 74 routes (including `/dashboard` and `/analytics`) compile and prerender successfully.

## Remaining limitations

1. **Grammar/other lesson content is not seeded in this local environment**, so Case B's "recommend a real next lesson" path couldn't be exercised end-to-end against live content — only against mocked data (unit tests) and the no-content graceful path (e2e). This is an environment/seed-data gap, not a code defect; the same grouping/accuracy logic is used uniformly for every skill regardless of which one happens to have content.
2. **Vocabulary and Listening weaknesses have no dedicated "recommend a lesson" entity** the way Grammar/Reading/Writing/Speaking do (Word/topic and the flat Listening `topic` string aren't lesson containers) — their recommendation is a filtered practice link (`/vocabulary?topic=...`, `/listening?topic=...`) rather than a specific lesson ID. Functionally correct but slightly less specific than the other 4 skills.
3. **The `/analytics` page keeps its pre-existing hand-rolled Tailwind style** (not the Lumiverse kit) for consistency with the rest of that page; the new Weaknesses/Coach section on it therefore doesn't visually match the Lumiverse-based Dashboard panels. Out of this task's scope to reconcile.
4. **No new scheduled/BullMQ pre-warming job** — a deliberate scoping decision (see Performance) given the current read/cache pattern is sufficient; flagged here in case future load characteristics change that calculation.

## Final decision

ANALYTICS: PASSED
AI LEARNING COACH: PASSED
