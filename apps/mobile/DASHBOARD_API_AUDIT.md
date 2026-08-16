# Dashboard API Audit

Phase 4 target: power the Expo home dashboard from authenticated backend data and avoid temporary client-side numbers.

## Primary Endpoint

### `GET /dashboard`

- Backend: `backend/src/modules/dashboard/dashboard.controller.ts`
- Service: `backend/src/modules/dashboard/dashboard.service.ts`
- Web consumer: `english-web-build/src/lib/dashboard-api.ts`
- Auth: `JwtAuthGuard`
- Mobile decision: **use as the primary home dashboard source**

Returned data already covers the mobile home requirements:

- User identity/profile: `user`
- XP and level: `xp.total`, `xp.today`, `xp.week`, `xp.level`
- Streak: `currentStreak`
- Daily goal: `today.studyMinutes`, `today.targetStudyMinutes`, `today.dailyGoalProgress`, `today.isGoalCompleted`
- Learning path: `learningPath`, `currentLesson`, `continueLearning.items`, `recommendedLesson`
- Skill/module progress: `skillProgress` and `analytics.skillBreakdown`
- Weekly chart data: `weeklyActivity` and `week.dailySeries`
- Missions: `todayMissions`
- Widget visibility: `widgetVisibility`

This endpoint is the best fit because the backend already joins settings, XP, pet/streak, missions, learning path, recent/in-progress lessons, skill progress, and weekly activity in one authenticated call.

## Supporting Endpoints

### `GET /auth/me`

- Backend: existing auth module
- Mobile status: already used by the auth bootstrap/profile flow
- Mobile decision: **not needed for home dashboard render**

The dashboard response includes a `user` object. The mobile screen only falls back to the auth store user while dashboard data is unavailable.

### `GET /progress`

- Backend: `backend/src/modules/progress/progress.controller.ts`
- Web consumer: `english-web-build/src/lib/progress-api.ts`
- Auth: `JwtAuthGuard`
- Mobile decision: **not used on initial home**

Useful for a dedicated progress screen because it returns overview, skills, in-progress items, history recommendations, and generated metadata. The home dashboard does not need this extra request because `/dashboard` already contains today/week metrics, skill progress, and continue-learning data.

### `GET /progress/history`

- Backend: `backend/src/modules/progress/progress.controller.ts`
- Web consumer: `english-web-build/src/lib/progress-api.ts`
- Auth: `JwtAuthGuard`
- Mobile decision: **not used on initial home**

Good for paginated history/activity screens, not the top-level mobile dashboard.

### `GET /progress/activities/:activityId`

- Backend: `backend/src/modules/progress/progress.controller.ts`
- Web consumer: `english-web-build/src/lib/progress-api.ts`
- Auth: `JwtAuthGuard`
- Mobile decision: **not used on initial home**

Good for a result/detail screen after tapping an activity.

### `GET /learning-path`

- Backend: `backend/src/modules/learning-path/learning-path.controller.ts`
- Web consumer: `english-web-build/src/lib/learning-path-api.ts`
- Auth: `JwtAuthGuard` and `LearningPathAccessGuard`
- Mobile decision: **not used on initial home**

The dashboard response already includes a compact learning path, current lesson, next lesson, and recommended lesson. The full learning-path endpoint should be used by the mobile Learn tab later.

### `GET /leaderboards/me`

- Backend: `backend/src/modules/leaderboard/leaderboard.controller.ts`
- Service: `backend/src/modules/leaderboard/leaderboard.service.ts`
- Auth: `JwtAuthGuard`
- Mobile decision: **optional secondary query**

This endpoint returns the current user's active leaderboard profile and rank when the user has an active leaderboard entry. The mobile dashboard fetches it independently and renders the card only when it returns usable data, so dashboard failures and leaderboard failures do not block each other.

### `GET /leaderboards/weekly`

- Backend: `backend/src/modules/leaderboard/leaderboard.controller.ts`
- Web consumer: `english-web-build/src/lib/leaderboard-api.ts`
- Auth: `JwtAuthGuard`
- Mobile decision: **not used on initial home**

The web dashboard uses this endpoint for richer leaderboard panels. Mobile uses `/leaderboards/me` instead to avoid pulling a full list for a small home card.

### `GET /settings`

- Backend: `backend/src/modules/settings/settings.controller.ts`
- Web consumer: `english-web-build/src/lib/settings-api.ts`
- Auth: `JwtAuthGuard`
- Mobile decision: **not used on initial home**

The dashboard service already reads settings through `SettingsQueryService` and exposes dashboard-specific preferences, daily target minutes, and widget visibility.

## Backend Changes

No backend changes were needed for Phase 4. The current backend already exposes authenticated dashboard and leaderboard data in shapes suitable for the mobile home screen.

## Mobile Data Strategy

- Use TanStack Query with `authenticatedApiClient` for `/dashboard`.
- Use a separate optional TanStack Query for `/leaderboards/me`.
- Render skeletons during initial loading.
- Preserve stale dashboard data during background refetch.
- Use pull-to-refresh to refetch dashboard data and invalidate the optional leaderboard query.
- Hide optional sections when the backend returns no data.
- Route backend web hrefs to existing mobile tabs only: Learn, Practice, Community.
