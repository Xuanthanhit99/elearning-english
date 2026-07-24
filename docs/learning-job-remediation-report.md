# Learning Job & Learning Path Remediation Report

Implements the remaining items from `docs/learning-path-and-profile-input-audit.md`. Does not repeat or rework: Profile edit empty-string persistence, Listening default level A1, PlacementResult → UserSkillLevel propagation, Authentication, Redis content cache architecture, GeminiService consolidation.

## 1. Per-Skill Placement Consumption (end-to-end)

New shared, Global service: `backend/src/common/skill-level/` — `SkillLevelResolverService.resolveSkillLevel(userId, skill)` resolves **one skill at a time**, priority order:

1. `UserSkillLevel` row for `(userId, skill)` → `source: 'PLACEMENT'` (or `'MANUAL_LEVEL'` if `source === MANUAL`).
2. `Settings.currentLevel` (backward-compat only) → `'DEFAULT_FOUNDATION'` if it's still the untouched schema default (A1 + autoDetect on), else `'MANUAL_LEVEL'`.
3. Hardcoded A1 foundation → `'DEFAULT_FOUNDATION'`.

Consumed by:
- **Vocabulary** (`getOrCreateProfile`): new-profile creation uses the resolved level instead of hardcoded `'A1'`.
- **Reading** (`getOrCreateProgress`, `getOrCreateProgressCategories`): same pattern, via new `toReadingLevel()`.
- **Listening** (`getHome`): `recommendedLevel` fallback now resolves instead of a hardcoded constant.
- **Grammar** (`getDashboard`): when no explicit `level`/`'ALL'` query param is given (previously left every level unfiltered and hardcoded the roadmap display to `'B1'`), now resolves the user's real Grammar level and filters by it.
- **Speaking** (`getHome`): `recommendedTopics` now prioritizes topics whose `[minLevel, maxLevel]` bracket the resolved level (falls back to unfiltered top-4 if none match).
- **Writing** (`getRecommendations`, now takes `userId`): filters lessons by resolved level, ordered by explicit `order` (was `createdAt desc`, ignoring the user entirely).
- **Dashboard** (`dashboard.service.ts`): `buildSkillProgress` already read `PlacementResultSkill`/`UserSkillLevel` per skill (audit item, no change needed) — `learningPath` mapping updated to branch on `source`.
- **Learning Path** (`learning-path.service.ts`): `buildDefaultFoundationPath` resolves all 6 skills independently and finds each one's first ordered lesson (see §11).

Verified with a mixed-level test (`skill-level-resolver.service.spec.ts`, `resolveAllSkillLevels` test): Vocabulary B1 / Grammar A1 / Reading A2 / Listening B1 / Speaking A1 / Writing A2 resolve independently — never collapsed to one global value.

## 2. No-Placement Default Flow

`LearningPathService.getLearningPath` no longer throws `NotFoundException` when no `PlacementResult` exists. It calls `buildDefaultFoundationPath(userId)`:
- Resolves all 6 skills via the resolver (no Gemini call — pure Postgres reads).
- Per skill, finds the first lesson **at that resolved level**, ordered by explicit `order` fields (never `createdAt`/alphabetical): Grammar via `GrammarTopic.order`→`GrammarLesson.order`; Reading via `ReadingCategory.order`→`ReadingArticle.order`; Speaking via `SpeakingTopic.order`→`SpeakingLesson.order` (bracketed by `minLevel`/`maxLevel`, computed in application code — see §3); Writing via `WritingTopic.order`→`WritingLesson.order`; Vocabulary via `WordTopic.order` (new field, see §3); Listening via a content-existence check (no topic/lesson entity for this skill).
- Returns `source: 'DEFAULT_FOUNDATION'`, `courses: []`, `phases: []` — never `null`/404.
- **`LearningPathAccessService`**: the `NOT_STARTED` (never took Placement) branch changed from `allowed: false` (redirect to `/placement`) to `allowed: true` (state stays `'NOT_STARTED'` so the frontend can still show the recommendation banner) — since real foundation content is now always available, hard-blocking the route contradicted "users without Placement should still receive beginner content." The other gated states (`IN_PROGRESS`, `PROCESSING`, `RESULT_PENDING`, `LEARNING_PATH_PENDING`) are untouched — those represent an unfinished attempt, not "never started," and redirecting to resume/check it is still correct.
- Idempotent by construction: pure reads, no writes, no Gemini calls.

## 3. Curriculum Ordering

- **Additive migration** `20260724065235_add_word_topic_order`: `ALTER TABLE "WordTopic" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;` — applied against the live local Postgres (`prisma migrate dev`), `prisma migrate status` confirms in sync.
- Every `wordTopic.findMany`/`findFirst` in `vocabulary.service.ts` and `vocabulary-job.service.ts` that used `orderBy: { name: 'asc' }`, `orderBy: { createdAt: 'asc' }`, or no `orderBy` at all now uses `orderBy: [{ order: 'asc' }, { name: 'asc' }]` (name kept only as a tiebreaker). One exception left untouched: a weekly-variety topic pool that's immediately `this.shuffle()`d afterward — adding order there would be inert.
- Repo-wide grep for `orderBy: { (name|title): 'asc' }` across Grammar/Reading/Speaking/Writing/Listening/Vocabulary: zero remaining matches.
- Speaking's `minLevel`/`maxLevel` range check can't be expressed as a Prisma `lte`/`gte` filter (Prisma's generated enum filter only exposes `equals`/`in`/`notIn` for Postgres native enums) — `isSpeakingLevelInRange()` (exported from `speaking.service.ts`) does the ordinal comparison in application code instead, shared by both `SpeakingService.getHome` and `LearningPathService`'s foundation-path lookup.
- Canonical order confirmed: CEFR level → category/topic `order` → lesson `order` → question `order` (all already present per-skill except Vocabulary, now fixed).
- C1/C2 deliberately **not** added to any generation loop — see §6.

## 4. Grammar Cron — Root Cause & Fix

**Root cause** (traced per the required checklist): provider registration ✅ correct, `ScheduleModule.forRoot()` ✅ registered in `app.module.ts`, module import ✅ correct — the sole cause was the `@Cron` decorator itself: 5 stacked candidate lines, **all commented out**, left over from manual dev-testing iterations and never restored. Compounded by two artificial restrictions in the method body: `categories.slice(0, 1)` (only 1 of 5 categories) and a hardcoded `['A1']` level array. No swallowed exception, no invalid cron expression, no duplicate schedule owner — it was simply dead by omission.

**Fix**: single `@Cron(GRAMMAR_JOB_CRON)` (env-configurable, defaults to `'0 2 * * *'`, matching every other job's cadence), full `categories` loop, `SUPPORTED_CONTENT_LEVELS` (A1–B2) instead of `['A1']`. No second cron created — the existing method/decorator was fixed in place.

## 5. Lock / Deduplication

All four jobs the audit flagged as missing a lock now use the **existing** Postgres advisory lock (`QuestionGenerationLockService`, the same infrastructure already used by Vocabulary/Placement) — no new locking mechanism introduced:

- **Grammar**: `grammar-topic:{categorySlug}:{level}`, re-checks topic count after acquiring.
- **Reading**: `reading-article:{categorySlug}:{level}`, re-checks article count after acquiring.
- **Speaking**: `speaking-lesson:{topicSlug}`, re-checks lesson count after acquiring; also added a per-config `try/catch` around the main loop (previously one Gemini failure aborted every remaining category for that run).
- **Writing**: `writing-lesson:{topicSlug}:{type}:{level}`, re-checks lesson count after acquiring.
- **Listening**: already had a real lock (BullMQ `jobId` dedup + `concurrency: 2`) — no change needed, only level-range expansion (see §6).
- **Vocabulary**: already lock-guarded (`pickWordsForUser`'s Gemini path) — unchanged.

Flow matches the required pattern exactly: check Postgres → threshold insufficient → acquire lock → re-check Postgres → generate only the deficit → persist idempotently (existing `upsert`s) → (Vocabulary/Listening already refresh Redis on write, from the prior caching pass) → release lock (automatic on callback return).

## 6. Job Coverage by Skill and Level

| Skill | Before | After | Levels |
|---|---|---|---|
| Grammar | Dead cron, 1/5 categories, A1 only | Live cron, all 5 categories | A1–B2 |
| Reading | Live, A1–B2, no lock | Live, A1–B2, **+lock** | A1–B2 (unchanged range) |
| Speaking | Live, 3/8 categories, no lock, no try/catch | Live, **8/8 categories**, **+lock**, **+try/catch** | A1–B2 (maxLevel normalized down from some seed rows' optimistic C1) |
| Writing | Live, **B1 only**, no lock | Live, **A1–B2**, **+lock** | A1–B2 |
| Listening | Live, BullMQ lock, missing B2 | Live, BullMQ lock, **+B2** configs | A1–B2 |
| Vocabulary | Live (on-demand + admin), A1–C2, lock-guarded | Unchanged | A1–C2 (already full range — the one skill whose job matched its enum from the start) |

**Why A1–B2, not full CEFR**: `SUPPORTED_CONTENT_LEVELS` (`backend/src/common/skill-level/skill-level.types.ts`) is the single named source for this — derived from Reading's pre-existing A1–B2 precedent and Writing's own `WritingLevel` enum (which doesn't even define C2). No job/seed had genuine C1/C2 coverage before this pass; none was added.

## 7. Content Readiness Thresholds

Named constants replacing bare magic numbers, one per job: `GRAMMAR_TOPICS_PER_CATEGORY_LEVEL_THRESHOLD` (10), `READING_ARTICLES_PER_CATEGORY_LEVEL_THRESHOLD` (10), `SPEAKING_LESSONS_PER_TOPIC_THRESHOLD` (20), `WRITING_LESSONS_PER_TOPIC_TYPE_LEVEL_THRESHOLD` (5). Not a new validation framework — same `count >= threshold` check every job already had, just named instead of bare.

## 8. Gemini Cost Controls

- `GRAMMAR_JOB_CRON` env var added (default unchanged) — the one job whose cadence actually changed (dead → live) gets an operator override without a code change.
- No job's per-run batch size was widened beyond what already existed (`count: 1` topic/lesson, `count: 3` questions for Grammar; `Math.min(need, 5)` for Speaking; existing per-run caps for Writing/Reading) — turning Grammar's cron back on is bounded to ~5 categories × 4 levels × 1 topic/night until each combo's 10-topic threshold is met, then near-zero.
- Every job already followed (and still follows) check-Postgres-first; none was changed to call Gemini unconditionally.

## 9. Existing-Progress & Placement-Retake Reconciliation

Verified, no code change needed — `PlacementRetakeService.retake()` creates a **new** `PlacementTest` row and updates `User.currentPlacementTestId`; it never deletes `UserDeviceSession`, XP, completed-lesson, or `UserSkillLevel` history. When the new test's result is generated, `PlacementResultService.generate()` (from the prior session's fix) **upserts** `UserSkillLevel` per skill (update-in-place, not delete+recreate) and creates a new, separate `PlacementResult` row per `testId` — old results remain as history, never duplicated into active state. Confirms all of: no deletion of completed lessons/XP, no relocking, per-skill level updates on retake, no duplicate path records.

## 10. PLACEMENT_REQUIRED Decision

Traced the full contract: `LearningPathAccessGuard` threw `ForbiddenException({ code: 'PLACEMENT_REQUIRED', ...access })`, but the shared `HttpExceptionFilter` (`backend/src/common/filters/http-exception.filter.ts`) only forwards `message`/`error`/`statusCode` from any exception body — custom fields are dropped for every client, not just this one. Rather than changing that shared filter (blast radius: every module using structured error bodies) for one page, the **product-level** fix was to remove the reason the gate needed to exist at all: `LearningPathAccessService`'s `NOT_STARTED` branch now returns `allowed: true` (§2), since real foundation content is always available. The dead frontend branch (`response?.code === "PLACEMENT_REQUIRED"`) was removed from `LearningPathScreen.tsx` — it can no longer be reached and was never reachable before either way. `HttpExceptionFilter` itself was **not** touched.

## 11. Files Changed

**Backend — new**: `common/skill-level/{skill-level.types.ts, skill-level-resolver.service.ts, skill-level-resolver.service.spec.ts, skill-level.module.ts}`, migration `20260724065235_add_word_topic_order/migration.sql`.

**Backend — modified**: `app.module.ts` (register `SkillLevelModule`); `prisma/schema.prisma` (`WordTopic.order`); `modules/{vocabulary,grammar,reading,listening,speaking,writing}.service.ts` (resolver consumption, exported `to*Level()` helpers, ordering fixes); `modules/vocabulary-job/vocabulary-job.service.ts` (ordering fixes); `modules/{grammar,reading,speaking,writing}-job` job files + their `.module.ts` (cron/lock/coverage fixes, `QuestionGenerationLockModule` import); `modules/listening-job/listening-job.service.ts` (B2 configs); `modules/learning-path/learning-path.service.ts` (fallback path, `source` tagging); `modules/learning-path-access/learning-path-access.service.ts` (`NOT_STARTED` gate relaxed); `modules/dashboard/dashboard.service.ts` (branch on `learningPath.source`); `modules/placement-result/placement-result.service.ts`, `modules/auth/*`, `modules/gemini/gemini.service.ts`, `modules/words/*`, `modules/speaking-processing/*`, `modules/writing/writing-ai-evaluation.service.ts`, `modules/admin-dashboard/admin-dashboard.service.ts`, `modules/question-bank/question-bank.service.ts` — **pre-existing from the prior two sessions' work, unchanged this pass** (listed by `git status` only because they weren't yet committed).

**Backend — test fixes** (regression from new constructor params, same pattern as the prior session): `grammar.service.spec.ts`, `reading.service.spec.ts`, `vocabulary.service.spec.ts`, `listening.service.spec.ts`, `writing.service.spec.ts`, `writing-job.service.spec.ts` — added `SkillLevelResolverService`/`QuestionGenerationLockService` mocks.

**Frontend — modified**: `src/lib/learning-path-api.ts` (widened `LearningPathData` type, new `LearningPathStartingLesson`/`LearningPathSkillLevel`, `source` field — additive, backward compatible); `src/Components/learning-path/LearningPathScreen.tsx` (removed dead branch, renders `DEFAULT_FOUNDATION` shape via existing `SkillPanel`/`LumiverseState`, no new components); `src/Components/Profile/ProfilePage.tsx`, `SpeakingPractice/SpeakingPracticePage.tsx`, etc. — **pre-existing from the prior session's cache/AbortController pass, unchanged this pass**.

## 12. Database Migration

One additive migration, applied against the live local Postgres instance (`postgresql://postgres:***@localhost:5432/english_platform`):
```sql
ALTER TABLE "WordTopic" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
```
`prisma migrate status` confirms: 92 migrations found, database schema up to date. No historical migration file edited.

## 13. Tests

### Grammar cron registration test (Task 2)

`grammar-job.service.spec.ts` now boots a real `ScheduleModule.forRoot()` + `GrammarJobService` and asserts, via `SchedulerRegistry`, that a live cron job is actually registered and running after the fix (proving the decorator is no longer commented out, not just that the class compiles). Also added:
- a readiness-execution test (runs `generateDailyGrammarData()` end-to-end against mocks, no throw, no unnecessary Gemini call when content already meets threshold);
- an overlap test proving the `isRunning` guard turns a concurrent second call into a true no-op (asserted via call counts, not timing);
- a lock-acquisition test proving `QuestionGenerationLockService.withLock` is actually invoked (and its callback actually executes — see the mock-hygiene fix below) when content is below threshold.

### Resolution of the 16 previously-failing tests (Task 3)

Classified each, then fixed properly (no assertions weakened):

| Failure | Classification | Fix |
|---|---|---|
| `admin-dashboard.service/controller.spec.ts` | Missing Nest dependency mocks (`PrismaService`, `AuditLogService`, `AuthSessionService`) | Added mocks; added real behavioral tests (BAN calls `authSessionService.banUser`, UNBAN calls `unbanUser`, controller delegation) |
| `placement-dashboard.service/controller.spec.ts` | Missing `PrismaService` mock | Added mock; added a real test (`NotFoundException` for a missing user; controller response envelope) |
| `teacher-dashboard.service/controller.spec.ts` | Missing `PrismaService` mock | Added mock; added a real revenue-aggregation test (see incidental finding below) |
| `speaking-practice.service.spec.ts` | Missing `PrismaService` mock | Fixed — service is currently an empty stub with no methods, so "should be defined" is the only valid assertion until it gains behavior |
| `speaking-practice.controller.spec.ts` | Missing `SpeakingService` mock | Added mock + a delegation test |
| `speaking.service.spec.ts` | Missing 6 constructor mocks (accumulated across 3 sessions of consolidation work) | Added mocks; added a real regression test for this session's level-aware `recommendedTopics` fix (prioritizes in-range topics, falls back to unfiltered rather than ever being empty) |
| `speaking.controller.spec.ts` | Missing `SpeakingService` mock | Added mock + delegation test |
| `vocabulary.controller.spec.ts` | Missing `AchievementsService` mock | Added mock + a `getTopics` delegation test |
| `vocabulary-job.service.spec.ts` | Missing 4 constructor mocks | Added mocks; added real tests for `ensureWordsForTopic`'s cache-invalidation-on-write and DB-first (no Gemini call when already sufficient) behavior |
| `grammar-job.service.spec.ts` | Missing 3 constructor mocks | See Grammar cron section above |
| `reading-job.service.spec.ts` | Missing 3 constructor mocks | Added mocks; added lock-below-threshold and skip-above-threshold tests |
| `speaking-job.service.spec.ts` | Missing 3 constructor mocks | Added mocks; added tests for full 8-category coverage, try/catch resilience (one config failing doesn't abort the rest), and lock acquisition |
| `question-bank.service.spec.ts` | Missing 6 constructor mocks | Added mocks; added tests for cache-hit-skips-lock and cache-miss-generates-only-the-deficit |

None were "genuine existing defects" in the strict sense of blocking behavior, and none were "environment-dependent" — all 16 were the same root cause (Nest CLI default scaffolding — `providers: [XService]` with zero mocks — never filled in across 2-3 prior work sessions).

**Incidental finding (not fixed, out of scope):** while writing `teacher-dashboard.service.spec.ts`, found `TeacherDashboardService.getRevenue`'s per-course aggregation increments `courseRevenueMap[courseId].order += 1` against an object initialized with an `orders` (plural) key — a property-name mismatch that would produce `NaN` for that specific field. The new test asserts only the fields that compute correctly (`totalRevenue`/`totalOrders`/`totalStudents`); it does not assert on the broken per-course `order` count, and the underlying code was **not** modified — Teacher Dashboard revenue reporting is unrelated to Learning Job/Path remediation and outside this task's scope. Flagged here for a future, separate fix.

**Test-authoring bug found and fixed during this cleanup:** `jest.resetAllMocks()` in `beforeEach` wipes the implementation of any mock function *declared with one at module scope* — including `const lockServiceMock = { withLock: jest.fn((_key, cb) => cb()) }` used across the new Grammar/Reading/Speaking/Writing job specs and the question-bank spec. This silently turned `withLock` into a no-op after every reset, meaning several "acquires the lock" tests were passing **without their callback ever executing** — a real bug in my own test setup, not the production code (`Do not weaken assertions merely to obtain green tests` cuts the other way here: these assertions were accidentally *too weak* to catch their own mock being broken). Fixed by re-establishing `lockServiceMock.withLock.mockImplementation(...)` inside `beforeEach`, after `resetAllMocks()`, in all 4 affected files, and strengthened each affected test with an additional assertion (e.g. `expect(geminiServiceMock.generateJson).toHaveBeenCalled()`) that only passes if the lock callback genuinely ran.

### Final test counts

- **Targeted suite** (every module touched across this and the prior two sessions — vocabulary/grammar/reading/listening/speaking/writing/question-bank/dashboard-family/learning-path/skill-level): **87/87 tests passing, 34/34 suites passing** (up from 46/62 with 16 failures at the start of this task).
- **Full backend suite** (`npx jest`, entire project, 132 suites/462 tests): 337 passing; 125 failing across 57 suites, **zero of which are in this remediation's scope** (confirmed by cross-referencing suite names — the failures are pre-existing, unrelated modules: Orders, Payments, Courses, Certificates, Coupons, Enrollments, Lessons, Missions, Quizzes, Reviews, Sections, Wallet, Auth controller, Chat-session, Pronunciation, several Placement sub-modules, and Arena integration specs that need live Redis/infra). These are out of scope for "Learning Job and Learning Path remediation" per this task's own instruction to not repeat the global audit — left untouched.

## 14. Runtime Validation (Cases A–D) — actually executed

New e2e-tier spec `backend/test/learning-path-runtime-cases.e2e-spec.ts` (`npm run test:e2e`, real local Postgres, no mocked `PrismaService`). Required one test-infra fix: `test/jest-e2e.json` was missing `modulePaths`, so it couldn't resolve this codebase's `src/...`-absolute imports at all (confirmed the pre-existing `app.e2e-spec.ts` would have hit the same failure had it ever been run) — added `"modulePaths": ["<rootDir>/.."]`, a test-config-only fix.

Result: **5/5 passing**, real DB round-trips, no live Gemini call anywhere in this spec (Cases A/B/D don't touch Gemini-dependent code at all — proven structurally, since the minimal test module doesn't even provide `GeminiService`; Case C replicates the exact `UserSkillLevel` upsert `PlacementResultService.generate()` performs, without invoking the real AI generation step).

- **Case A (No Placement)**: fixture user, zero `UserSkillLevel` rows. `resolveAllSkillLevels` → all 6 skills independently resolve to A1/`DEFAULT_FOUNDATION`. `getLearningPath` → `source: 'DEFAULT_FOUNDATION'`, 6 skills, never null. **Observed in this DB**: real starting content already exists for **Vocabulary and Listening** (well-formed `startingLesson` pointers returned); Grammar/Reading/Speaking/Writing had none yet at the time of the run (expected — their crons were dead/narrow until this pass and haven't completed a cycle against this DB yet).
- **Case B (Mixed levels)**: fixture user, `UserSkillLevel` rows written for Vocabulary B1 / Grammar A1 / Reading A2 / Listening B1 / Speaking A1 / Writing A2. Verified 3 independent ways: raw DB rows (6, one per skill), `LearningPathService.getLearningPath`'s `skills[]`, and `SkillLevelResolverService.resolveSkillLevel` called individually per skill — all agree, none collapsed to a single value.
- **Case C (Retake)**: fixture user with an initial Grammar A1 `UserSkillLevel` + (when this DB has any real Grammar lesson) a completed-lesson progress row. Performed the exact upsert `PlacementResultService.generate()` does, moving Grammar to B1. Verified: exactly one `UserSkillLevel` row for that (user, skill) — no duplicate; the completed-lesson progress row is untouched (`completed: true`, `score: 90` preserved); the resolver immediately reflects the new B1 level.
- **Case D (Concurrent generation)**: real `QuestionGenerationLockService` (genuine Postgres advisory lock, not mocked) with 3 concurrent callers racing on the same key in a check-then-generate callback — exactly 1 effective generation recorded; a second test confirms a lock on a different key is never blocked by an unrelated key's lock.

## Build Results

**Backend**: `nest build` — clean, 0 errors. `prisma validate` — schema valid. `prisma migrate status` — 92 migrations found, database schema up to date (live local Postgres, `english_platform`). Targeted suite 87/87 passing; e2e runtime-validation suite 5/5 passing.

**Frontend**: `eslint` (targeted at this session's changed files, `learning-path-api.ts` + `LearningPathScreen.tsx`) — clean, 0 errors/warnings. `tsc --noEmit` — clean, 0 errors. `node scripts/test-auth-redirect.mjs` — passed (exit 0). `next build --webpack` — clean, all 74 routes compiled/generated successfully (0 build errors).

## 15. Remaining Limitations

- **Full backend suite** has 125 failing tests across 57 suites entirely outside this remediation's scope (see §13) — not addressed, per explicit scope discipline.
- **Skill landing pages / lesson-detail pages** beyond Dashboard and Learning Path were not individually rewired to display `source`/`assessedLevel` metadata — Grammar/Reading/Speaking/Writing/Vocabulary/Listening's own pages already consume the resolver server-side (so they show the *correct* level), but don't yet surface *why* (the `source` badge) in their own UI the way Learning Path/Dashboard now do. Scoped out to avoid a wider frontend redesign.
- **Speaking's per-topic `maxLevel`** was normalized to B2 across all 8 categories in the job config for consistency with `SUPPORTED_CONTENT_LEVELS`; `seed-speaking.ts` (a separate, manually-run script) still labels Technology/Culture up to C1 — a cosmetic mismatch between the one-time seed data and the job's steady-state policy, pre-existing and not corrected here.
- **Teacher Dashboard revenue `order` field bug** (found incidentally, §13) — not fixed, unrelated module, out of scope.
- **Case D** validates the lock mechanism generically (a controlled missing-content condition with a mocked generation callback), not each of Grammar/Reading/Speaking/Writing's job methods individually under real concurrent HTTP load — the lock primitive itself is proven correct against the real DB; each job's specific use of it is proven correct at the unit level (§13) instead.
- **Grammar/Reading content** does not yet exist for A1 in the connected DB as of this run (per Case A's observation) — this is an expected, time-bound state (their crons run nightly and were only just fixed/widened in this pass), not a defect.

## Final Decision

**LEARNING JOB AND PATH REMEDIATION: PASSED**
