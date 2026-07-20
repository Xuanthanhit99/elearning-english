# Lumiverse Home/Profile/Auth Redesign Review Report

Ngay cap nhat: 2026-07-21

## 1. Review summary

### Da xac nhan dung

- `/` la public homepage, khong dung App Shell/sidebar.
- `/dashboard` la authenticated home va lay data that tu `GET /dashboard`.
- `/profile` nam trong App Shell va dung data that tu `/auth/me`, `/dashboard`, `/achievements/overview`.
- Protected route duoc guard bang cookie-presence trong `english-web-build/proxy.ts`.
- Backend van la security boundary that: cac endpoint private nhu `/dashboard`, `/auth/me`, `/auth/me/profile` van co guard backend.
- App Shell khong render `PetSelectionPrompt` hoac `FloatingPetCompanion`.
- Home, Dashboard, Profile khong goi `/pets/me` trong luong chinh da sua.

### Da sua them trong review

- Dong bo `proxy.ts` dung chung `normalizeRedirectPath` tu `src/lib/auth-redirect.ts` de tranh drift logic.
- Tang cuong safe redirect helper:
  - Chap nhan internal path hop le.
  - Giu query string va hash khi path duoc truyen tu client.
  - Decode an toan mot lan cho `%2Fdashboard`.
  - Tu choi `%252Fdashboard`, external URL, scheme nguy hiem, `/login`, `/auth/callback`.
- Them frontend test script nho `npm run test` cho `auth-redirect`.
- Them `backend` script `lint:check` read-only, khong co `--fix`.
- App Shell phan biet auth bootstrap 5xx/network error voi unauthenticated:
  - 5xx hien retry state, khong logout nham.
  - 401/session invalid van de axios refresh flow xu ly va redirect login.
- Khôi phuc type cast trong `backend/src/modules/writing/writing-ai-evaluation.service.ts` vi lint `--fix` da lam backend build fail.

### Rui ro da loai bo

- Open redirect qua `redirect=https://evil.example`.
- Redirect loop vao `/auth`, `/login`, `/register`, `/auth/callback`.
- Mat query/hash trong session-expired redirect client-side.
- Backend lint script tiep tuc sua file khi verification: da them `lint:check` de dung thay the.
- App Shell coi 5xx `/auth/me` la logout.

### Trang thai cuoi

READY WITH KNOWN LEGACY ISSUES

Ly do khong chon `PRODUCTION READY`: backend unit tests, full frontend lint va backend lint check van fail do legacy issues dien rong; nhieu diff ngoai pham vi dang ton tai trong worktree can review rieng truoc khi release/commit.

## 2. Git diff review

| File | Scope | Reason | Action |
| ---- | ----- | ------ | ------ |
| `english-web-build/proxy.ts` | Auth redirect/session | Cookie-presence route guard, auth route redirect | Kept/Modified |
| `english-web-build/src/lib/auth-redirect.ts` | Auth redirect/session | Shared safe redirect helper | Kept/Modified |
| `english-web-build/scripts/test-auth-redirect.mjs` | Auth redirect/session | Unit-style verification for redirect helper without adding framework | Kept |
| `english-web-build/package.json` | Verification | Adds `npm run test` for redirect helper | Kept |
| `backend/package.json` | Verification | Adds read-only `lint:check`; keeps existing `lint --fix` | Kept |
| `english-web-build/src/lib/axios.ts` | Auth redirect/session | Refresh flow preserves return URL and hash | Kept/Modified |
| `english-web-build/src/Components/Auth/Auth.tsx` | Auth redirect/session | Login/social redirect returns to safe destination | Kept |
| `english-web-build/app/(auth)/auth/callback/page.tsx` | Auth redirect/session | OAuth callback uses sanitized stored return URL | Kept |
| `english-web-build/app/(auth)/login/page.tsx` | Auth route | `/login` alias | Kept |
| `english-web-build/app/(auth)/register/page.tsx` | Auth route | `/register` alias | Kept |
| `english-web-build/app/layout.tsx` | Session bootstrap | Mounts `AuthInitializer` | Kept |
| `english-web-build/src/store/authStore.ts` | Session bootstrap | Adds auth status incl. `error` | Kept/Modified |
| `english-web-build/src/Components/Auth/AuthInitializer.tsx` | Session bootstrap | Root bootstrap handles 5xx as error | Kept/Modified |
| `english-web-build/src/Components/Layout/AppShell.tsx` | Session bootstrap/Profile/App layout | Loading skeleton, no pet prompt, 5xx retry state | Kept/Modified |
| `english-web-build/src/Components/HomePage/HomePage.tsx` | Homepage redesign | Public landing, CTA redirects, no protected API fetch | Kept |
| `english-web-build/src/Components/Dashboard/DashboardPage.tsx` | Dashboard redesign | Real dashboard data, companion coming soon | Kept |
| `english-web-build/src/Components/Profile/ProfilePage.tsx` | Profile redesign | Real backend data, edit DTO, companion modal | Kept |
| `english-web-build/src/i18n/*` | Profile/i18n | Profile namespace for locales | Kept |
| `backend/src/modules/writing/writing-ai-evaluation.service.ts` | Build fix from lint side effect | Restored type cast removed by lint `--fix` | Modified |
| `backend/src/**` many files | Outside current phase / lint side effect / prior work | Large diffs and/or formatting from existing dirty worktree and previous `lint --fix` | Needs review |
| `english-web-build/src/Components/ReadingPractice/**` deleted | Outside current phase / prior work | Large deletions not required by this review | Needs review |
| `english-web-build/src/Components/placement*/**` many files | Outside current phase / prior work | Large placement redesign diffs pre-existing in worktree | Needs review |
| `english-web-build/src/Components/Pets/**` | Legacy pet module | Module still exists; not mounted in AppShell/Home/Profile | Needs review |

## 3. Auth routing matrix

| User state | Route | Expected behavior | Result |
| ---------- | ----- | ----------------- | ------ |
| Guest | `/` | Public homepage renders | Confirmed by route/design review and build |
| Guest | `/dashboard` | Proxy redirects to `/auth?redirect=/dashboard` | Confirmed by proxy code |
| Guest | `/profile` | Proxy redirects to `/auth?redirect=/profile` | Confirmed by proxy code |
| Guest | `/learning-path?tab=a` | Query preserved in redirect | Confirmed by proxy code |
| Guest | private URL with hash | Browser does not send hash to proxy; client-side session-expired flow preserves hash | Partial, documented browser limitation |
| Authenticated | `/` | Redirect to `/dashboard` per current design decision | Confirmed by proxy code |
| Authenticated | `/dashboard` | Render App Shell after `/auth/me` succeeds | Confirmed by code/build |
| Authenticated | `/auth?redirect=/profile` | Redirect to `/profile` | Confirmed by proxy/helper |
| Expired session | `/dashboard` | Cookie may pass proxy, backend `/auth/me`/dashboard rejects, axios refresh fails once then redirects to login | Confirmed by code review |
| OAuth callback success | `/auth/callback?status=success` | Use sanitized `sessionStorage.auth_redirect`, fallback `/dashboard` | Confirmed by test/helper + code |
| OAuth callback error | `/auth/callback?status=error` | Replace to `/auth?error=social_login_failed` | Confirmed by code |
| Invalid redirect URL | `https://evil.example` | Fallback `/dashboard` or login without redirect | Confirmed by `npm run test` |
| Encoded internal URL | `%2Fdashboard` | Normalizes to `/dashboard` | Confirmed by `npm run test` |
| Double-encoded URL | `%252Fdashboard` | Rejected, fallback `/dashboard` | Confirmed by `npm run test` |

## 4. Backend test fixes

| Spec | Original error | Fix | Result |
| ---- | -------------- | --- | ------ |
| `backend/src/modules/placement/placement-question-pool/placement-question-pool.service.spec.ts` | Missing `PrismaService`, `PlacementAiService` | Not fixed; legacy TestingModule issue | FAIL |
| `backend/src/modules/vocabulary/vocabulary.controller.spec.ts` | Missing `AchievementsService` | Not fixed; legacy TestingModule issue | FAIL |
| `backend/src/modules/pronunciation/pronunciation.controller.spec.ts` | Missing `PronunciationService` | Not fixed; legacy TestingModule issue | FAIL |
| `backend/src/modules/placement-processing/placement-processing.controller.spec.ts` | Missing `PlacementProcessingService` | Not fixed; legacy TestingModule issue | FAIL |
| `backend/src/modules/orders/orders.controller.spec.ts` | Missing `OrdersService` | Not fixed; legacy TestingModule issue | FAIL |
| `backend/src/modules/course-landing/course-landing.service.spec.ts` | Missing `PrismaService` | Not fixed; legacy TestingModule issue | FAIL |
| `backend/src/modules/writing/writing-ai-evaluation.service.ts` | Build error: `result` is `unknown` after lint side effect | Restored narrow type cast | Backend build PASS |

Backend test summary after review: 62 failed, 46 passed, 108 total. The failures are broad legacy spec setup issues, not caused by the auth/home/profile changes.

## 5. Lint review

```text
Frontend new-scope lint:
PASS

Frontend full lint:
FAIL - 448 problems (190 errors, 258 warnings)

Backend lint check:
FAIL - 3892 problems (3581 errors, 311 warnings)

Files changed by lint --fix:
Many backend files were already modified after running the original backend lint script with --fix.

Files reverted/restored:
Restored backend/src/modules/writing/writing-ai-evaluation.service.ts type cast so backend build passes.

Legacy lint issues:
Frontend: Arena, Reading, leaderboard/shared libs, hooks, image warnings.
Backend: common guards/decorators/helpers, writing module, specs and many services with no-unsafe-* rules.
```

No global rule was disabled. No `it.skip`, `describe.skip`, or `test.skip` was added.

## 6. Verification results

```text
Frontend targeted lint: PASS
Frontend full lint: FAIL
Frontend typecheck: PASS
Frontend test: PASS
Frontend build: PASS

Backend lint check: FAIL
Backend test: FAIL
Backend build: PASS

Prisma format: PASS
Prisma validate: PASS
Prisma generate: PASS
Prisma migrate status: PASS
```

Commands actually run:

- `cd english-web-build && npm run test`
- `cd english-web-build && npx eslint <targeted files>`
- `cd english-web-build && npx tsc --noEmit --pretty false`
- `cd english-web-build && npm run build`
- `cd english-web-build && npm run lint -- --max-warnings=0`
- `cd backend && npm run lint:check -- --max-warnings=0`
- `cd backend && npm run build`
- `cd backend && npm run test -- --runInBand`
- `cd backend && npx prisma format`
- `cd backend && npx prisma validate`
- `cd backend && npx prisma generate`
- `cd backend && npx prisma migrate status`

## 7. Remaining legacy issues

### Frontend full lint

- Module/file: `src/Components/Arena/*`
- Loi: `any`, setState in effect, `Date.now` during render, direct `window.location.href`.
- Lien quan phase hien tai: No.
- Block release: Only if CI requires full lint pass.
- De xuat: Arena lint hardening phase.

- Module/file: `src/Components/reading/*`
- Loi: setState in effect, image warnings, hook dependency warnings.
- Lien quan phase hien tai: No.
- Block release: Only if CI requires full lint pass.
- De xuat: Reading lint hardening phase.

- Module/file: `src/lib/api-error.ts`, `src/lib/leaderboard-api.ts`, `src/lib/community-club-permission-api.ts`
- Loi: `no-explicit-any`.
- Lien quan phase hien tai: Shared legacy, not introduced by redirect helper.
- Block release: Only if CI requires full lint pass.
- De xuat: Type shared API error and leaderboard response contracts.

### Backend lint check

- Module/file: `backend/src/common/*`
- Loi: `no-unsafe-*`, unbound method, enum comparison.
- Lien quan phase hien tai: No.
- Block release: Only if CI requires backend lint pass.
- De xuat: Type Express request/user decorators and guards.

- Module/file: `backend/src/modules/writing/*`
- Loi: Broad unsafe AI/Prisma response typing.
- Lien quan phase hien tai: No, except one restored cast needed for build.
- Block release: Only if CI requires backend lint pass.
- De xuat: Define AI response interfaces and parser guards.

- Module/file: many `*.spec.ts`
- Loi: Jest globals/types unresolved by lint config plus no-unsafe calls.
- Lien quan phase hien tai: No.
- Block release: Only if CI requires backend lint pass.
- De xuat: Update ESLint test environment/globals and typed mocks.

### Backend tests

- Module/file: many `*.spec.ts`
- Loi: TestingModule missing providers/mocks (`PrismaService`, feature services, processing services).
- Lien quan phase hien tai: No.
- Block release: Yes if CI requires unit test pass.
- De xuat: Create shared testing helpers for Prisma/config/redis/event publisher and update specs module by module.

### Pet legacy

- Module/file: `english-web-build/src/Components/Pets/*`, `/pet` route, StudySidebar/MobileStudyNav links.
- Loi: Pet module and links still exist outside Home/Dashboard/Profile/AppShell.
- Lien quan phase hien tai: Partially.
- Block release: Not for Home/Profile/Auth, but can expose unfinished feature if `/pet` is reachable.
- De xuat: Product decision: route `/pet` should either render coming soon or redirect to `/dashboard` until feature is ready.

### Git diff outside scope

- Module/file: backend analytics/progress/search/admin, frontend placement/reading deletions, logo asset.
- Loi: Large pre-existing/side-effect diffs in dirty worktree.
- Lien quan phase hien tai: No or unclear.
- Block release: Yes for review hygiene.
- De xuat: Manual review by owner before staging/commit; do not bulk revert without confirming ownership.

## 8. Final status

READY WITH KNOWN LEGACY ISSUES

This phase is ready for the Home/Profile/Auth scope because:

- Frontend targeted lint passes.
- Redirect helper tests pass.
- Frontend typecheck passes.
- Frontend build passes.
- Backend build passes.
- Prisma status is clean.
- Open redirect cases are rejected.
- Pet onboarding is not mounted in Home/Dashboard/Profile/AppShell.

It is not production-ready for the whole repository because:

- Full frontend lint still fails with legacy issues.
- Backend lint check still fails with legacy issues.
- Backend test suite still fails with broad missing provider/mock setup.
- Worktree contains many out-of-scope diffs that need owner review before staging.
