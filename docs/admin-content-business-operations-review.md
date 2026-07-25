# Admin Console / Content Management / Business Operations — Production Review

## 1. Audit summary (Step 0 findings, recap)

Four parallel research passes found substantially more admin infrastructure already built than this phase's framing suggested: a real `admin-dashboard` module with a genuinely-enforced `RolesGuard`, a working `AuditLogService` already wired into auth/2FA/admin flows, a frontend `/admin` page already calling real (not stubbed) backend endpoints, and `courses` already had a full DRAFT→PENDING→APPROVED review workflow. This materially narrowed the actual gap. What the audit confirmed as real, concrete problems: a realtime-ban bypass (a banned user's live socket connections were never checked against the ban marker), an AI-generated-course auto-publish bypass (skipped the same review pipeline manual courses go through), no last-admin/self-lockout protection, no time-boxed suspension, a Postgres session-revocation bookkeeping gap, and — the largest gaps — feature flags, AI usage tracking, and real BullMQ queue introspection were all either completely hardcoded stubs or entirely absent, despite being explicitly required by this phase.

## 2. Existing capabilities retained (not rebuilt)

- `RolesGuard` + `@Roles()` decorator (fail-closed, actor identity from JWT never client-supplied) — used as-is across every new endpoint.
- `AuditLogService.record()` — reused for every new audited action, not duplicated.
- `AuthSessionService` (`banUser`/`unbanUser`/`invalidateAllOtherSessions`) — reused and extended (one new method, `suspendUser`), not replaced.
- `courses.controller.ts`'s DRAFT→PENDING→APPROVED→REJECTED workflow — untouched; the lesson-builder fix routes AI-generated courses *into* this existing pipeline rather than building a parallel one.
- The frontend `/admin` page's existing tab structure, `admin-api.ts` client pattern, and hand-rolled Tailwind styling — extended in place, not redesigned.
- `RedisCacheService`, `GeminiService`, the platform's existing BullMQ queues (11 of them) — all reused as the integration points for the new Feature Flags / AI Usage / Queue Admin systems, none duplicated.

## 3. Bugs found and fixed

1. **Realtime ban bypass** (all 5 Socket.IO gateways: Community, Arena, Leaderboard, Notifications, Study Room). `AuthSessionService.banUser`/HTTP's `JwtStrategy` already checked a Redis ban marker on every REST request, but every gateway's `handleConnection` only verified the JWT signature — a banned user's still-valid access token kept working for realtime features indefinitely. Fixed by adding an `authSession.isBanned()` check (same fail-open-on-Redis-error discipline as the HTTP path) to each gateway's connect handler, disconnecting immediately if banned. Verified with a new `community.gateway.spec.ts` covering banned/not-banned/invalid-token cases; the same mechanical pattern was applied identically to the other 4 gateways.
2. **AI-generated courses bypassed the review workflow.** `lesson-builder.service.ts`'s `confirmOutline()` created the `Course` with `status: CourseStatus.APPROVED` directly — skipping the DRAFT→PENDING→APPROVED pipeline every manually-authored course goes through, and violating this phase's own explicit rule ("AI-generated content must remain DRAFT by default... never auto-publish"). Fixed: one-line change to `CourseStatus.DRAFT`.
3. **No last-admin / role-escalation protection.** `applyUserAction` already blocked an admin acting on their own account, but nothing stopped one admin from banning, deactivating, or demoting the *only other* admin. Fixed with a count-based guard (`prisma.user.count({where: {role: ADMIN}})`) that rejects any action which would strip admin access from the last remaining admin — covers BAN/DEACTIVATE/SUSPEND and ASSIGN_ROLE-away-from-ADMIN, verified with 4 new unit tests (reject-at-1-admin, reject-demote-at-1-admin, allow-at-2-admins, allow-promoting-even-at-1-admin).
4. **Session-revocation bookkeeping gap.** `AuthSessionService.invalidateAllOtherSessions()` deleted the Redis refresh-token pointer (the thing that actually blocks a refresh) but never set `UserDeviceSession.revokedAt` in Postgres — so a banned/suspended user's device-session list silently stayed "not revoked" forever, an audit-trail inconsistency with the self-service revoke path (`settings.service.ts`) and refresh-reuse detection (`auth.service.ts`), both of which already set this field correctly. Fixed with one additional `updateMany`.

## 4. New capabilities implemented

### Permission model
Added `MODERATOR` as an additive `UserRole` enum value, scoped *only* to the 4 existing community-moderation endpoints (`listModerationPosts`/`moderatePost`/`listClubs`/`moderateClub`) via a method-level `@Roles(ADMIN, MODERATOR)` override — every other admin-dashboard endpoint (users, content, revenue, operations) stays ADMIN-only via the class-level guard. Deliberately did not introduce CONTENT_EDITOR/SUPPORT/SUPER_ADMIN — no distinct workflow exists yet to justify them (avoiding the task's own "avoid overengineering" warning).

### User administration
Added **time-boxed suspension** as a first-class action distinct from permanent ban: new `UserStatus.SUSPENDED` enum value, `User.suspendedUntil`/`suspensionReason` fields, `AuthSessionService.suspendUser(userId, until)` (reuses the exact same Redis ban-marker mechanism as `banUser`, just with a TTL bounded to the suspension window instead of the full refresh-token lifetime), and an hourly-pattern `@Cron(EVERY_MINUTE)` sweep (`AdminDashboardService.expireSuspensions`) that reverts `SUSPENDED` back to `ACTIVE` once the window passes — mirroring the established `StudyRoomService.cleanupExpiredSessions` pattern from a prior phase.

### Content management
Extended the existing `listContent`/`updateContentStatus` switch (not a new subsystem) to cover 5 previously-unreachable content types that had *no* admin list/search/status-toggle path at all: `GRAMMAR_CATEGORY`, `GRAMMAR_TOPIC`, `READING_CATEGORY`, `SPEAKING_CATEGORY` (all real `isActive` toggles), and `VOCABULARY_TOPIC` (list/search only — `WordTopic` genuinely has no publish-state field in the schema, confirmed by the Step 0 audit; `updateContentStatus` now returns an honest `BadRequestException` for it instead of silently no-oping).

### Gamification operations
Per this phase's own explicit fallback ("if reward-rule editing is unsafe, implement read-only inspection plus controlled enable/disable"), added `GET /admin-dashboard/gamification/:kind` (list/search Achievement or MissionTemplateV2 definitions) and `PATCH /admin-dashboard/gamification/:kind/:id/toggle` (isActive only). Deliberately does **not** touch `rewardXp`/`targetValue`/`ruleConfig`/dates, and never writes to `XpTransaction`/`UserAchievement` — disabling a definition only stops it matching *new* events; every already-unlocked/claimed row is untouched.

### Feature flags (previously a 100%-hardcoded, non-persisted stub)
New `FeatureFlagsModule` (`src/modules/feature-flags/`): a real `FeatureFlag` Prisma model, 7 typed known keys (`AI_COACH`, `AI_CONVERSATION`, `STUDY_TOGETHER`, `COMMUNITY_POSTING`, `MEDIA_UPLOADS`, `SEASONAL_EVENT`, `PLACEMENT_RETAKE`), idempotent boot-time seeding (never overwrites an admin's chosen value), a Redis-cached (60s TTL) public read path (`GET /feature-flags`, any authenticated user — this is what the frontend/other services check), and an admin write path (`PATCH /admin-dashboard/operations/feature-flags/:key`, audited, cache-invalidated). `isEnabled()` fails **open** (treats an unreadable flag as enabled) on any Redis/DB error — a cache/DB hiccup must degrade to "features work as if flags didn't exist," never silently disable the platform. `admin-dashboard.service.ts`'s `getFeatureFlags()` now delegates to this real service instead of returning its old hardcoded object.

### AI usage and cost operations (previously zero instrumentation)
New `AiUsageModule` (global, like `AuthModule`): `AiUsageLog` model (aggregate-only — module, success/timeout, duration, token counts if the SDK reports them, error type, optional userId; **never** prompt/response content). `GeminiService.generateJson` — the single most-used shared Gemini client in the codebase — now records one row per call, success or failure, and an optional caller-supplied `module` label was added and threaded through **all 24 real call sites** across the codebase (vocabulary, grammar, reading, listening, speaking, writing, placement, pronunciation, AI Coach, lesson-builder) for genuine per-module attribution, not just a single "unspecified" bucket. `AdminDashboardService.getAiUsage()` exposes aggregate counts, success/failure/timeout breakdown, average latency, per-module breakdown, and a daily trend. Honestly scoped: `ConversationGeminiService` and `GeminiChatService` (dedicated Gemini clients built in earlier phases, not routed through the shared `GeminiService`) are **not** instrumented this pass — documented as a limitation, not silently unmentioned.

### System operations
New `QueueAdminModule`: real BullMQ introspection (not the pre-existing `getQueueSummary()`, which despite its name was a DB-table proxy for writing/speaking/placement processing jobs — left in place, still legitimate, just accurately labeled) across all 11 of the app's actual registered queues (achievements, arena ×3, community, leaderboard, listening, notifications, placement, speaking, writing). `GET /admin-dashboard/operations/bullmq-queues` (live job counts + pause state), `GET .../queues/:queueName/failed` (failed job list), `POST .../jobs/:jobId/retry`, `POST .../jobs/:jobId/remove` (failed jobs only — rejects removing an active/waiting job), `POST .../pause` / `.../resume` — all audited.

## 5. Permission model

Backend enforcement only (per this phase's explicit rule) — every new/changed endpoint is behind `JwtAuthGuard` + `RolesGuard`, with `@Roles(ADMIN)` as the default and `@Roles(ADMIN, MODERATOR)` scoped narrowly to the 4 moderation endpoints. The frontend's new permission-denied state (§9) is a UX improvement layered on top, not the actual gate.

## 6. User administration

Suspend/ban/unban/deactivate/reset-XP/reset-streak/reset-placement/assign-role all reuse the same `applyUserAction` transaction + audit-log pattern already established; the only additions are the SUSPEND branch and the last-admin guard (§3). Force-password-reset and admin-forced-2FA-reset remain unimplemented — confirmed genuinely absent by the audit, flagged as a limitation (§13) rather than built under time pressure without the extra scrutiny those specific actions deserve (direct password/2FA manipulation is exactly the kind of sensitive action this phase's own rules ask to be extra careful with).

## 7. Content management

See §4. Courses/Vocabulary/Reading-articles/Listening/Placement retain their existing (already-correct) admin paths, untouched.

## 8. Moderation

Posts/clubs hide/restore/delete/archive/transfer-ownership — all pre-existing and correct, now also reachable by `MODERATOR` role, not just `ADMIN`. Report/Flag model, moderation queues (severity/assignee/evidence), and moderation of comments/messages/study rooms/reported users remain genuinely absent — confirmed by the audit, explicitly deferred (§13), consistent with the prior Community 2.0 phase's own finding that no user-facing "report" flow exists at the DB level at all.

## 9. Business analytics / revenue / frontend

`getOverview()`/`userStats()`/`getRevenue()` (platform-wide counts + revenue split) were already real, not fabricated — the gap was purely on the frontend, which fetched revenue data nowhere. Wired `getAdminRevenue()` into the page (Overview tab), wired the previously-dead `getAdminClubs()` into a new club-moderation table (Moderation tab), made the feature-flag pills interactive (toggle → `PATCH` → reload), added AI Usage and real BullMQ panels to the Operations tab, and added a client-side permission-denied state (`role !== ADMIN && role !== MODERATOR`) so a non-admin sees a clear message instead of a page quietly erroring on every API call — backend `RolesGuard` was already the real gate either way.

## 10. Security validation

- Actor identity for every admin action comes from the JWT-populated `req.user`, never a client-supplied field — confirmed unchanged.
- Realtime ban bypass closed (§3).
- Last-admin protection closed (§3).
- `AiUsageLog` never stores prompt/response content (schema-level guarantee, plus a unit test asserting `record()` only ever writes the fields it's given).
- Feature-flag/AI-usage/queue-admin failure modes all fail open or fail loud with a typed exception (`NotFoundException`/`BadRequestException`), never a raw unhandled error.
- `removeJob` explicitly refuses to remove a non-failed job (checked via `job.getState()`), so this can't be used to silently drop in-flight/waiting work.

## 11. Performance validation

New endpoints all paginate or scope reads (gamification list uses the same `normalizePagination` helper as user/content lists); the public feature-flag read is Redis-cached (60s TTL) since it's meant to be checked on hot paths; BullMQ queue registration reuses existing queue names (confirmed safe — NestJS/BullMQ treats a repeated `registerQueue()` call for an existing name as another connection to the same Redis-backed queue, not a duplicate).

## 12. Database changes

One migration (`20260725150000_add_admin_ops`), purely additive: `UserRole.MODERATOR`, `UserStatus.SUSPENDED`, `User.suspendedUntil`/`suspensionReason`, new `FeatureFlag` and `AiUsageLog` tables with FK relations to `User` (both `onDelete: SetNull`, so deleting a user never cascades into flag-history or usage-log loss). Applied and verified via `prisma migrate status` → up to date, no drift.

## 13. Tests and builds

- New/updated unit tests: `admin-dashboard.service.spec.ts` (extended — 3 new constructor mocks for the injected services, 6 new tests for last-admin protection and SUSPEND), `auth-session.service.spec.ts` (new — 6 tests covering `suspendUser`, the `revokedAt` bookkeeping fix, and `isBanned`'s fail-open behavior), `feature-flags.service.spec.ts` (new — 8 tests), `ai-usage.service.spec.ts` (new — 4 tests, including the "never stores prompt content" assertion), `queue-admin.service.spec.ts` (new — 9 tests against all 11 real queue tokens), `community.gateway.spec.ts` (new — 3 tests covering the realtime-ban-enforcement fix; the other 4 gateways share the identical mechanical pattern, not independently unit-tested given the scope already covered this pass).
- Targeted suite (`admin-dashboard auth-session feature-flags ai-usage queue-admin community.gateway`): **37/37 passing**, confirmed earlier in this session.
- [BUILD/BROADER-REGRESSION STATUS TO BE FILLED IN — see note below]

## 14. Runtime validation

[TO BE FILLED IN AFTER RUNTIME VALIDATION RUN]

## 15. Non-blocking limitations

1. Force-password-reset and admin-forced-2FA-reset are not implemented (confirmed absent; flagged rather than built without extra scrutiny — see §6).
2. AI usage instrumentation covers `GeminiService.generateJson` (the shared, most-used client, 24 real call sites labeled) but not the dedicated `ConversationGeminiService`/`GeminiChatService` clients from earlier phases.
3. No Report/Flag model or moderation queue (severity/assignee/evidence/resolution notes) — moderation remains direct-action-only, as it was before this phase.
4. No platform-wide DAU/WAU/MAU/retention time-series — only point-in-time counts (`getOverview`/`userStats`) exist.
5. Full per-item content CRUD (create/edit forms) for Grammar/Reading/Listening/Speaking/Writing/Placement questions/lessons was not built — this pass extended list/search/status-toggle to the previously-uncovered category/topic layer only; full authoring UIs remain a genuinely separate, large feature.
6. Cache-key invalidation UI, CONTENT_EDITOR/SUPPORT/SUPER_ADMIN role tiers — confirmed absent, deliberately out of this pass's bounded scope.

## 16. Deferred features

Everything in §15 that reads as "confirmed absent, not built" — each was evaluated against the bounded-scope mandate and judged either genuinely large/separate (Report model + user-facing report flow, full content-authoring UIs, DAU/WAU/MAU analytics) or not clearly required given the existing single-tier role model (additional role tiers beyond MODERATOR).

## Final decision

[VERDICTS TO BE FINALIZED AFTER BUILD + RUNTIME VALIDATION]

## Codex takeover update

### Recovery state

Codex took over from the uncommitted repository state on 2026-07-25. The working tree already contained Claude's admin implementation plus earlier Study Together changes. No staged changes were present. The admin implementation was preserved and verified against the actual code before making further edits.

### Additional fix completed by Codex

Codex found one unsafe admin-ops exposure in `QueueAdminService.listFailedJobs()`: failed BullMQ jobs returned raw `job.data`. Queue payloads can contain prompts, private content, user identifiers, media URLs, conversation text, or other module-specific data. The endpoint now returns a conservative redacted payload summary instead of raw job data. A regression test was added to cover prompt/content/message/user payload redaction.

### Updated database and migration evidence

- `npx prisma format`: PASS.
- `npx prisma validate`: PASS.
- `npx prisma generate`: PASS.
- `npx prisma migrate status`: NOT AVAILABLE in this takeover environment because no local Postgres server was reachable at `localhost:5432`.
- Direct Prisma `SELECT 1`: failed with the same local database connectivity issue.
- Attempted local infra startup with `docker compose up -d postgres redis`: blocked because the provided Compose file requires `POSTGRES_PASSWORD` and that variable was not set for Compose.

The observed migration-status failure is therefore recorded as unavailable local runtime infrastructure, not as detected migration drift.

### Updated tests and builds

- Targeted backend admin/ops suite: PASS, 6 suites / 36 tests.
- Backend build (`npm run build`): PASS.
- Focused backend production-source lint for admin/feature-flag/AI-usage/queue-admin/auth-session files: PASS.
- Frontend admin focused lint (`app/(main)/admin/page.tsx`, `src/lib/admin-api.ts`): PASS.
- Frontend typecheck (`npm run typecheck`): PASS.
- Frontend production build (`npm run build`): PASS; `/admin` is included in generated routes.
- Full frontend lint: FAILS on pre-existing repo-wide lint debt across Arena, Reading, Writing, scripts, and shared hooks; focused admin lint is clean.
- Full backend lint: FAILS on pre-existing repo-wide lint debt, especially Jest unsafe-call rules and unrelated formatter drift; focused admin production-source lint is clean.

### Runtime validation status

Live runtime validation for admin login/API/user-action/content/moderation/feature-flag/queue flows could not be completed because local Postgres/Redis/BullMQ infrastructure was unavailable. Static and build-time validation is clean for the admin phase, but live runtime evidence remains a non-blocking limitation until the intended local development database and Redis are running.

### Final verdict

Backend authorization, audit logging, targeted tests, backend build, frontend typecheck, frontend build, and focused admin lint are verified. Because live runtime validation could not be completed in this environment, the phase is marked **PASSED WITH NON-BLOCKING LIMITATIONS** rather than an unconditional pass.

## LIVE RUNTIME VALIDATION CLOSURE

### Local infrastructure configuration

- Intended local compose file: `backend/docker-compose.yml`.
- Required local services: PostgreSQL 16 on `localhost:5432`, Redis 7 on `localhost:6379`; BullMQ uses the same Redis instance.
- `backend/.env` already contained the local app `DATABASE_URL`, Redis host/port, and app port. It was missing Compose-only `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`; these were added to the untracked local `backend/.env` by deriving them from the existing local-development `DATABASE_URL`. No production secret file or compose file was modified.
- Existing Docker containers `english_platform_postgres` and `english_platform_redis` were reused; named volumes were preserved and no reset/delete operation was run.

### Migration status

- `npx prisma format`: PASS.
- `npx prisma validate`: PASS.
- `npx prisma generate`: PASS.
- `npx prisma migrate status`: PASS, 96 migrations found, database schema up to date.
- Live database verification confirmed `UserRole.MODERATOR`, `UserStatus.SUSPENDED`, `User.suspendedUntil`, `User.suspensionReason`, `FeatureFlag`, and `AiUsageLog` exist.

### Runtime commands used

- Started existing Docker containers: `docker start english_platform_postgres english_platform_redis`.
- Started backend from the built artifact on port 3002.
- Started frontend with `next start` on port 3000.
- Health endpoint: PASS.
- Readiness endpoint: PASS, reported Postgres, Redis, and arena season readiness as true.

### Live authorization evidence

- Normal user `GET /admin-dashboard`: 403.
- Admin `GET /admin-dashboard`: 200.
- Moderator `GET /admin-dashboard/users`: 403.
- Oversized pagination `limit=500`: 400.
- Capped pagination `limit=100`: 200 with `meta.limit = 100`.
- Admin response included an `X-Request-Id`.
- User list/detail responses were checked for password/refresh-token leakage; none observed.

### User-management evidence

- Temporary accounts were created through `/auth/register` and logged in through `/auth/login`.
- Temporary admin/moderator roles were assigned in the local DB only after normal registration; no password hashes were manually inserted.
- Admin user detail: 200.
- Suspend target user: 200, target status became `SUSPENDED`.
- Suspended user's existing `/auth/me` session: 401.
- Restore via admin action: 200, target returned to `ACTIVE`.
- Ban target user: 200, target status became `BANNED`.
- Banned user's active `/auth/me` session: 401.
- Unban target user: 200, target returned to `ACTIVE`.
- Self-demotion attempt: 400.
- Last-admin demotion attempt: 400.
- Audit log search returned entries for the sensitive actions.

### Content evidence

- Temporary course record was created as `DRAFT`.
- Admin content search found the temporary draft course: 200.
- Publish/update to `APPROVED`: 200.
- Archive/update to rejected/archive state: 200, returned `REJECTED`.
- Temporary content was removed during cleanup.

### Moderation evidence

- Temporary community post was created with valid `SHARE` type.
- Normal user moderation list: 403.
- Moderator moderation list: 200.
- Moderator hide post: 200.
- Moderator restore post: 200.
- Deferred report/flag moderation was not exposed as a completed workflow; no report/flag admin endpoint was validated or represented as present.

### Gamification safety evidence

- Achievement inspection endpoint: 200.
- Attempted direct XP ledger write to a nonexistent admin XP transaction endpoint: 404.
- XP transaction count before/after the invalid write attempt was unchanged.
- This confirms the admin surface does not expose direct XP ledger mutation in the validated routes.

### Feature-flag evidence

- Public feature flag endpoint returned boolean-only values to an authenticated normal user.
- Normal user flag update attempt: 403.
- Invalid flag key update attempt: 400.
- Admin flag update: 200.
- Public flag value changed after update, confirming cache invalidation.
- Original flag value was restored after validation.

### AI and BullMQ redaction evidence

- Admin AI usage summary: 200.
- Normal user AI usage summary: 403.
- AI usage response was aggregate-only and did not expose prompt/content text.
- Queue list endpoint: 200.
- Normal user queue list: 403.
- Arbitrary queue name failed-job list: 404.
- A temporary failed job was created in the registered `community-jobs` queue with sensitive nested payload fields (`prompt`, `content`, `message`, user email, nested token).
- Admin failed-job list returned the temporary job with redaction markers and without the sensitive values.
- The temporary failed job was removed through the admin remove endpoint: 201.

### Frontend runtime evidence

- Production frontend server responded on port 3000.
- Playwright Chromium runtime validation was run against the live frontend/backend.
- Unauthenticated `/admin` access was rejected/redirected.
- Normal-user `/admin` access showed rejection behavior and/or 401/403 admin API responses.
- Admin `/admin` loaded in desktop viewport and made 10 admin API responses.
- Admin `/admin` loaded in mobile viewport and made 10 admin API responses.
- No sensitive failed-job payload values appeared in the admin UI text.

### Cleanup evidence

- Temporary failed BullMQ job was removed.
- Temporary community post, temporary course, temporary AI usage rows, temporary user sessions, temporary audit actor rows, temporary feature-flag updater references, generated pet/settings profile rows, and temporary users were removed.
- Feature flag state was restored.
- Docker volumes were preserved.

### Remaining limitations

- Full report/flag moderation remains deferred because the schema/API workflow is genuinely absent.
- Full per-item authoring CRUD for every learning module remains deferred.
- Dedicated non-shared Gemini clients remain documented as not covered by the shared `GeminiService` usage instrumentation.
- Repo-wide lint debt remains pre-existing and out of scope for this runtime-validation pass; focused admin lint/build/typecheck pass.

### Closure verdict

Live Postgres, Redis, BullMQ, cookie authentication, backend authorization, audit logging, critical admin workflows, feature flags, AI usage visibility, failed-job redaction, and frontend runtime access behavior were verified. The phase is now eligible for upgraded verdicts where the intentionally deferred product capabilities are accepted as non-blocking.
