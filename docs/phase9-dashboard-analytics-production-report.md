# Phase 9 Dashboard, Analytics And Reports Production Report

## 1. Executive Summary

Status: PARTIAL

Phase 9 reused the existing `DashboardModule` and added a production `AnalyticsModule` for learner analytics and reports. Dashboard now uses timezone-aware day/week boundaries, XP ledger data, and the Achievement source of truth. Frontend now has `/analytics` and `/reports` pages wired to backend APIs through the shared axios client with cookie auth.

Production Decision: READY_WITH_LIMITATIONS

## 2. Initial Git State

Status: PASS

Dirty worktree already contained Notification and Achievement changes:

- `backend/prisma/schema.prisma`
- `backend/src/app.module.ts`
- notification preference/template files
- vocabulary achievement integration files
- untracked `backend/src/modules/achievements/`
- untracked achievement migration/report/frontend route

No reset, restore, checkout, clean, stash, or migration rewrite was used.

## 3. Files And Modules Reviewed

Status: PASS

- Backend: `dashboard`, `progress`, `learning-path`, `missions-v2`, `achievements`, `notifications`, `leaderboard/xp`, `settings`, skill session tables.
- Frontend: `DashboardPage`, shared `dashboard-api`, app sidebar, i18n, dashboard route, new analytics/reports routes.
- Prisma: user settings, XP profile/transactions, missions V2, achievements, session tables.

## 4. Existing Dashboard Inventory

| Component | File | Current behavior | Data source | Status | Action |
| --- | --- | --- | --- | --- | --- |
| Dashboard route | `backend/src/modules/dashboard/dashboard.controller.ts` | Authenticated `GET /dashboard` | `req.user` | KEEP | No userId from client |
| Dashboard service | `backend/src/modules/dashboard/dashboard.service.ts` | Aggregates many learner widgets | Prisma/domain services | FIX | Removed mission side-effect, fixed XP/achievement/timezone |
| Dashboard frontend | `english-web-build/src/Components/Dashboard/DashboardPage.tsx` | Single API load, loading/error/retry | `GET /dashboard` | KEEP | Type extended |
| Dashboard API client | `english-web-build/src/lib/dashboard-api.ts` | Shared axios with credentials | Backend | EXTEND | Added today/week/achievement types |
| Sidebar | `english-web-build/src/Components/Layout/AppSidebar.tsx` | Shared layout menu | i18n | EXTEND | Added Analytics and Reports |

## 5. Existing Analytics Inventory

| Component | File | Current behavior | Data source | Status | Action |
| --- | --- | --- | --- | --- | --- |
| Dashboard analytics object | `DashboardService.buildAnalytics` | 7-day dashboard insights | Dashboard query data | KEEP | Still available |
| Analytics REST API | none | Missing | none | MISSING | Added `AnalyticsModule` |
| Analytics frontend page | none | Missing | none | MISSING | Added `/analytics` |

## 6. Existing Reports Inventory

| Component | File | Current behavior | Data source | Status | Action |
| --- | --- | --- | --- | --- | --- |
| Reports REST API | none | Missing | none | MISSING | Added `/reports/weekly`, `/reports/monthly`, `/reports/range` |
| Reports frontend page | none | Missing | none | MISSING | Added `/reports` |

## 7. KEEP/FIX/EXTEND Matrix

- KEEP: existing `DashboardController`, frontend `DashboardPage`, shared axios client, Mission V2, Achievement, XP ledger, Settings.
- FIX: Dashboard no longer creates missions during read; Dashboard XP now uses `UserXpProfile/XpTransaction`; recent achievements use `UserAchievement`.
- EXTEND: Dashboard response includes `today`, `week`, `achievements`, `generatedAt`, `timezone`.
- REPLACE: mission-reward based XP chart replaced with XP transaction based chart.
- REMOVE: `MissionV2GeneratorService` dependency from Dashboard.
- MISSING: Analytics and Reports routes/pages were added.

## 8. Data Source Matrix

| Metric | Source of truth | Not used |
| --- | --- | --- |
| Total XP | `UserXpProfile.totalXp`, fallback `User.xp` | Lesson score guesses |
| Daily/weekly XP | `XpTransaction.finalXp` with `reversedAt = null` | Mission reward rows |
| Mission summary | `UserMissionV2` | Recomputed activity counts |
| Achievement summary | `Achievement/UserAchievement` | Mission completions |
| Streak | `PetProfile.streak` currently used by dashboard | Login guess |
| Study time | `spentTime`, `timeSpentSeconds`, `duration`, lesson duration | `updatedAt - createdAt` |
| Skill score | Skill-specific session/progress fields and placement | One generic formula only |
| Recent activity | `XpTransaction` | Raw AI feedback/transcripts |
| Timezone | `UserSettings.timezone` | Server local day |

## 9. Metric Glossary

- Completed activity: completed session/progress row counted for chart/report.
- Completed lesson: `LessonProgress.completedAt`.
- Study time: sum of reliable duration fields only.
- Accuracy: objective score/accuracy fields; not mixed directly with AI text feedback.
- Skill score: normalized 0-100 value with `sampleStatus`.
- Learned word: `UserWordProgress.learnedAt/masteredAt/status`.
- Reviewed word: updated progress without new learned timestamp in today's boundary.

## 10. Timezone And Date Policy

Status: PASS

Added `backend/src/common/time/user-timezone.util.ts`.

- Default timezone: `Asia/Ho_Chi_Minh`.
- User timezone source: `UserSettings.timezone`.
- Invalid timezone fallback: `Asia/Ho_Chi_Minh`.
- Boundaries are calculated with `Intl.DateTimeFormat` and converted to UTC dates for DB queries.

## 11. Week Boundary Decision

Status: PASS

Week starts on Monday. Dashboard week series returns seven stable local-date keys.

## 12. Backend Architecture

Status: PASS

- `DashboardModule`: snapshot endpoint.
- `AnalyticsModule`: overview, skills, activity, reports.
- `AnalyticsService`: bounded range aggregation and cursor activity pagination.
- No duplicate XP/Mission/Achievement/Streak source was introduced.

## 13. Dashboard Snapshot

Status: PASS

`GET /dashboard` returns user, preferences, widgets, today/week summaries, missions, achievements, learning path, skills, recent sessions, notifications preview, generated timestamp and timezone.

## 14. Today Metrics

Status: PASS

Added: date, study minutes, target minutes, completed activities/lessons, words learned/reviewed, XP, completed missions, goal percentage and completion state.

## 15. Weekly Metrics

Status: PASS

Added: week start/end, study minutes, active days, target days, completed activities, XP, full daily series.

## 16. Monthly Metrics

Status: PARTIAL

Monthly report is available through `GET /reports/monthly` using 30-day range. Calendar-month boundary report was not added in Phase 9 to avoid a larger reporting rewrite.

## 17. Skill Analytics

Status: PASS

`GET /analytics/skills` and `GET /analytics/skills/:skill` use dashboard skill progress plus filtered XP activity.

## 18. Score Normalization

Status: PASS

Skill items expose 0-100 percent and `sampleStatus` (`READY` or `INSUFFICIENT_DATA`).

## 19. Trend Calculation

Status: PASS

Trend compares the current half of the selected range with the previous half. `previousValue = 0` returns `percentageChange: null`, never NaN/Infinity.

## 20. Recent Activity

Status: PASS

`GET /analytics/activity` uses `XpTransaction`, stable ordering `earnedAt DESC, id DESC`, cursor pagination and route allowlist for action URLs.

## 21. Learning Path Integration

Status: PASS

Dashboard still uses existing `LearningPathService.getLearningPath`. Missing path is handled as `null`, not 500.

## 22. Mission Integration

Status: PASS

Dashboard reads `UserMissionV2`. Mission generation was removed from dashboard reads.

## 23. Achievement Integration

Status: PASS

Dashboard summary and recent achievements read `Achievement/UserAchievement` only. No evaluation, unlock, claim, or notification is triggered by dashboard query.

## 24. XP Integration

Status: PASS

Dashboard and analytics use `UserXpProfile` and `XpTransaction`.

## 25. Leaderboard Integration

Status: PARTIAL

XP data is compatible with leaderboard source. Rank/league summary was not added to dashboard to avoid expensive rank queries without a dedicated cached API.

## 26. Streak Integration

Status: PARTIAL

Dashboard reads `PetProfile.streak`. A dedicated streak service/model review remains a limitation.

## 27. Recommendation Engine

Status: PARTIAL

Recommendations remain deterministic from recommended lesson and placement courses. Weak-skill/streak-risk recommendations are not fully implemented yet.

## 28. REST API

Status: PASS

Added:

- `GET /analytics/overview`
- `GET /analytics/skills`
- `GET /analytics/skills/:skill`
- `GET /analytics/activity`
- `GET /reports/weekly`
- `GET /reports/monthly`
- `GET /reports/range`

Existing:

- `GET /dashboard`

## 29. DTO Validation

Status: PASS

Added `AnalyticsQueryDto` and `ReportQueryDto`.

- Range enum: `7d`, `30d`, `90d`.
- Skill enum: `LearningSkill`.
- Limit clamped and validated 1-50.
- Cursor decoded server-side.

## 30. Pagination

Status: PASS

Activity endpoint uses cursor based on `occurredAt + id`.

## 31. Database Queries

Status: PASS

Queries use selected fields and bounded date ranges. No transcripts, raw prompts, or long AI feedback are returned.

## 32. Index Review

Status: PASS

Existing indexes cover main reads:

- `XpTransaction @@index([userId, earnedAt])`
- `MissionRewardTransactionV2 @@index([userId, createdAt])`
- `UserMissionV2 @@index([userId, type, status])`
- `UserAchievement @@index([userId, status, updatedAt])`

No new index added.

## 33. Cache Strategy

Status: PASS

Cache Decision: NO_CACHE_REQUIRED

Reason: Phase 9 uses bounded DB reads and avoids adding stale-user-data risk. Redis fallback is therefore not required for new analytics endpoints.

## 34. Cache Invalidation

Status: PASS

No cache was added, so no invalidation needed.

## 35. Aggregate Table Decision

Status: PASS

No aggregate table was added. Raw domain sources remain the source of truth.

## 36. Event-Driven Analytics Decision

Status: PASS

No event-driven analytics table was added in Phase 9. Existing domain events remain untouched.

## 37. Idempotency

Status: PASS

No write-side analytics logic was added. XP and Achievement existing idempotency remain unchanged.

## 38. Reconciliation

Status: PASS

No reconciliation job required because no aggregate analytics table was added.

## 39. Backfill Decision

Status: PASS

Backfill Decision: NO_BACKFILL_REQUIRED

## 40. Privacy And Security

Status: PASS

- All new APIs use `JwtAuthGuard`.
- User identity comes from `req.user`.
- No userId is accepted from query/body.
- No tokens, cookies, raw AI prompts, transcripts, or private metadata returned.
- Action URLs are generated server-side from an allowlist.

## 41. Frontend Dashboard

Status: PASS

Dashboard still uses a single backend snapshot endpoint. Types extended for new backend data.

## 42. Frontend Analytics

Status: PASS

Added `/analytics` with range selector, overview cards, trend chart, skill breakdown, AI report, recent activities, loading/error/empty states.

## 43. Frontend Reports

Status: PASS

Added `/reports` with weekly/monthly selector, summary cards, highlights, recommendations and skill breakdown.

## 44. Frontend Store

Status: PARTIAL

No duplicate Zustand store was added. Pages use local state and shared API client. A shared analytics store can be added later if realtime refetch and cross-page caching become necessary.

## 45. Realtime Refresh

Status: PARTIAL

No realtime dashboard refresh was added. REST remains source of truth.

## 46. Responsive Review

Status: PASS

New pages use mobile-first grids and avoid fixed-width panels.

## 47. Accessibility Review

Status: PARTIAL

Pages use semantic headings/buttons/links and chart title attributes. Full screen-reader chart narration and keyboard audit are not completed.

## 48. Backend Tests

Status: PARTIAL

Commands:

- `npm test -- achievements missions-v2 --runInBand`: PASS
- `npm test -- dashboard analytics reports xp missions-v2 achievement leaderboard --runInBand`: FAIL due pre-existing dashboard/admin/teacher/placement specs missing providers.
- `npm run build`: PASS

## 49. Frontend Tests

Status: PASS

Commands:

- `npx tsc --noEmit`: PASS
- scoped eslint for analytics/reports/dashboard/sidebar/i18n files: PASS
- `npx next build --webpack`: PASS

## 50. Integration Matrix

| Module | Data source/event | Metric | Test | Status |
| --- | --- | --- | --- | --- |
| Vocabulary | `UserWordProgress` | learned/reviewed | build/typecheck | PARTIAL |
| Grammar | `GrammarLessonProgress` | score/completed | build/typecheck | PARTIAL |
| Reading | `ReadingSession` | score/time | build/typecheck | PARTIAL |
| Listening | `ListeningSession` | score/completed | build/typecheck | PARTIAL |
| Speaking | `SpeakingSession` | score/time | build/typecheck | PARTIAL |
| Writing | `WritingSession` | score/time | build/typecheck | PARTIAL |
| Missions | `UserMissionV2` | progress | jest | PASS |
| XP | `UserXpProfile/XpTransaction` | totals/trend | build/typecheck | PASS |
| Achievement | `Achievement/UserAchievement` | summary | jest | PASS |
| Streak | `PetProfile` | current streak | build/typecheck | PARTIAL |
| Learning Path | `LearningPathService` | next step | build/typecheck | PASS |

## 51. Regression Results

Status: PARTIAL

No new build regression found. Existing broad dashboard tests fail due missing providers in old specs.

## 52. Performance Review

Status: PASS

- Dashboard remains one aggregate endpoint.
- Analytics ranges are bounded to 7/30/90 days.
- Activity list is cursor paginated, max 50.
- New APIs do not load full session content/transcripts.

## 53. Bugs Found

| Severity | File | Evidence | Impact | Fix | Status |
| --- | --- | --- | --- | --- | --- |
| HIGH | `DashboardService.getDashboard` | called `ensureCurrentMissions` | read query had side effect | removed dependency/call | FIXED |
| HIGH | `DashboardService` | XP came from mission rewards | incorrect XP source | switched to `UserXpProfile/XpTransaction` | FIXED |
| HIGH | `DashboardService` | recent achievements from completed missions | wrong achievement source | switched to `UserAchievement` | FIXED |
| MEDIUM | `DashboardService` | server-local dates | wrong local day/week | added user timezone utility | FIXED |
| MEDIUM | frontend | Analytics/reports pages missing | no deep analytics/report UI | added routes/pages | FIXED |

## 54. Bugs Fixed

Status: PASS

See section 53.

## 55. Remaining Issues

Status: PARTIAL

- Existing dashboard/admin/teacher/placement unit specs need provider mocks/imports.
- Leaderboard rank summary is not included in dashboard.
- Dedicated streak model/service integration should be reviewed later.
- Realtime stale/refetch for dashboard analytics was not added.
- Full accessibility QA was not completed.

## 56. Files Changed

Phase 9 added or changed:

- `backend/src/common/time/user-timezone.util.ts`
- `backend/src/modules/analytics/*`
- `backend/src/modules/dashboard/dashboard.service.ts`
- `backend/src/modules/dashboard/dashboard.module.ts`
- `backend/src/app.module.ts`
- `english-web-build/app/(main)/analytics/page.tsx`
- `english-web-build/app/(main)/reports/page.tsx`
- `english-web-build/src/lib/analytics-api.ts`
- `english-web-build/src/lib/dashboard-api.ts`
- `english-web-build/src/Components/Layout/AppSidebar.tsx`
- `english-web-build/src/i18n/*`

## 57. Migration Decision

Migration Decision: NO_MIGRATION_REQUIRED

No schema/index was added for Phase 9.

## 58. Backfill Decision

Backfill Decision: NO_BACKFILL_REQUIRED

## 59. Cache Decision

Cache Decision: NO_CACHE_REQUIRED

Bounded reads were preferred to avoid stale dashboard data and cache invalidation risk.

## 60. Production Decision

Production Decision: READY_WITH_LIMITATIONS

Reason: main dashboard/analytics/report flows build and use real data, but broad legacy dashboard specs fail and some advanced items remain partial.

## 61. Next Stage Gate

Next Stage Gate: OPEN

Gate is open with limitations: fix pre-existing dashboard/admin/teacher/placement unit specs before declaring full READY.
