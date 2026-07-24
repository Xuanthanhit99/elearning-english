# Learning Path & Profile Input Audit

Audit performed prior to this remediation pass. Reconstructed to disk from the
original chat-delivered report so it can be referenced going forward; content
unchanged from what was originally returned.

## 1. Learning Jobs — Already Correct

- Listening job: real BullMQ retry/backoff (4-5 attempts, exponential),
  `jobId`-based dedup + concurrency cap, DB existence check before persisting,
  cache invalidation on new rows, real admin manual-trigger endpoint.
- Vocabulary job: iterates the full A1-C2 level range, has cache invalidation
  wired to the caching pass, reachable via lazy on-demand generation plus an
  admin endpoint.
- Reading job: full DB-check-before-Gemini, article+vocabulary+questions
  created atomically in one `$transaction`.
- Placement question bank (prior caching pass): Postgres advisory lock +
  cache-before-lock.
- Dashboard's per-skill progress card is genuinely keyed by skill.
- Profile edit form's controlled-input wiring (rendering/state-sync) is correct.

## 2. Learning Jobs — Incorrect or Incomplete

| Issue | Where |
|---|---|
| Cron fully disabled (dead) | Grammar (`grammar-job.service.ts:25-29`, 5 commented decorators) |
| Only generates A1, only 1 of 5 categories | Grammar (`categories.slice(0,1)`, `['A1']`) |
| Only a single hardcoded level (B1) for every topic | Writing (`writing-job.service.ts:51`) |
| Only 3 hardcoded topic/level-range configs, no C1/C2 | Speaking (`speaking-job.service.ts:39-75`) |
| No B2/C1/C2; B1 double-weighted vs A1/A2 | Listening (`configs` array only 4 fixed level/topic pairs) |
| No lock/dedup at all | Reading, Speaking, Writing, Vocabulary (partial) |
| No retry policy | Grammar, Reading, Speaking (no try/catch around main loop), Writing, Vocabulary |
| No cache invalidation | Grammar (low risk), Reading, Speaking (real risk — genuine `update:` block) |
| No admin/manual trigger endpoint | Grammar, Reading, Writing |
| `search.service.ts` discards computed user level (`currentLevel: null`) | dead personalization |

## 3. Skill and Level Coverage

| Skill | Job levels | Seed | Job output | Status |
|---|---|---|---|---|
| Vocabulary | A1-C2 (job), per-user default hardcoded A1 | 2 topics / 4 words | topics+words | Functional but cold-start dependent |
| Grammar | A1 only (job dead) | assumed external | 0 guaranteed | Not production-ready — job unreachable |
| Reading | A1-B2 | 6 categories | up to 10/combo | Functional, cron-dependent |
| Listening | A1,A2,B1x2 topics | none (flat strings) | questions direct | Functional, best-engineered, narrow range |
| Speaking | 3 hardcoded ranges (max B2) | 8 categories, 0 real lessons | up to 5/topic/run | Partially functional |
| Writing | B1 only | 4 topics / 4 lessons | up to 5/topic/type | Functional only at B1 |

## 4. Placement-Based Assignment — Current Flow (at time of audit)

Per-skill score/level computed correctly into `PlacementResultSkill`, but only
the single overall level was propagated downstream (`Settings.currentLevel`).
`UserSkillLevel` was never written to by the automated placement-test flow.
**(Since fixed — see remediation section 1 below.)**

## 5. No-Placement Fallback — Current Flow (at time of audit)

Learning Path (aggregate feature) is gated behind placement
(`LearningPathAccessGuard` -> `NOT_STARTED` -> redirect `/placement`) —
intentional. Per-skill practice pages are not gated, but each used its own
siloed hardcoded default level (Vocabulary A1, Reading A1, Listening
B1-in-code/A1-in-schema inconsistency — **since fixed**).

## 6. Content Ordering and Prerequisites

Only Grammar has genuine progress-based sequential unlock. Speaking has a
static admin `isLocked` flag. Reading explicitly disables locking. Writing/
Listening have none. Vocabulary topics were fetched `orderBy: { name: 'asc' }`
— alphabetical, not curriculum order.

## 7. Database and Job Risks

No distributed lock in Grammar/Reading/Speaking/Writing/Vocabulary jobs.
Speaking's job has no try/catch around its main loop. `/health/ready` does not
check per-skill content readiness. No seed script wired into `npm run`/prisma
hooks.

## 8. Frontend Learning-Path Risks

`LearningPathScreen.loadLearningPath` checks `response?.code ===
"PLACEMENT_REQUIRED"` to redirect to `/placement`, but the backend's global
`HttpExceptionFilter` only forwards `message`/`error`/`statusCode` — custom
`code`/`nextUrl` fields are dropped. This branch is unreachable dead code.

## 9. Profile Edit Form — Current Bugs (at time of audit)

`cleanProfilePayload()` silently dropped empty-string fields, making it
impossible to clear `bio`/`goal`/`englishLevel`/`learningGoal` once set, even
though the backend DTO/service would accept an explicit empty string for
these. **(Since fixed — see remediation section below.)**

## 10. Files That Needed Changes

See remediation report (`docs/learning-job-remediation-report.md`) for the
full file list and what was actually changed in this and the prior pass.

## 11. Proposed Implementation Plan (original)

Bounded first pass: profile clear-field fix, Listening default-level fix,
PlacementResultSkill -> UserSkillLevel sync. Broader job/schema remediation
(this document's items 2, 6, 7, 8, 10) deferred to a follow-up pass — now
addressed in the remediation section below.

## 12. Files and Logic That Must Not Be Touched

Global auth architecture, Redis content-cache infrastructure and Gemini
consolidation from the prior pass, the Postgres advisory lock
(`QuestionGenerationLockService`) and the Listening Redis cold-start lock,
`selectManualLevel`'s intentional all-skills collapse.

---

## Remediation (this pass)

Full account in `docs/learning-job-remediation-report.md`:

1. Per-skill Placement consumption — `SkillLevelResolverService`, consumed by all 6 skills + Dashboard + Learning Path.
2. No-Placement default flow — `LearningPathService.buildDefaultFoundationPath`; `/learning-path` access gate relaxed.
3. Curriculum ordering — `WordTopic.order` migration; alphabetical/`createdAt` ordering removed repo-wide.
4. Job coverage (Grammar/Reading/Speaking/Writing/Listening/Vocabulary) — A1–B2 policy, full category coverage.
5. Grammar cron root cause (decorator fully commented out) and fix.
6. Lock/deduplication — `QuestionGenerationLockService` reused for Grammar/Reading/Speaking/Writing.
7. Readiness thresholds — named constants per job.
8. Gemini cost controls — env-configurable Grammar cadence; existing deficit-only generation preserved everywhere.
9. Existing-progress/retake reconciliation — verified correct by construction (upsert-based), no code change needed.
10. PLACEMENT_REQUIRED decision — gate relaxed at the source instead of touching the shared exception filter; dead frontend branch removed.
11. Files changed, 12. Migration, 13. Tests, 14. Runtime validation, 15. Remaining limitations — see the report.
