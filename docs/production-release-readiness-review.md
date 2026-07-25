# Production Release Readiness Review

Date: 2026-07-25

## Verdict

PRODUCTION RELEASE V1.0: NOT READY

The application has strong product and runtime foundations, but the release process still depends on external verification that cannot be proven from the repository alone: Railway/Vercel deployment settings, DNS/TLS, production secrets, external alert delivery, backup/restore evidence, and a hosted CI run.

## Ready

- Backend and frontend production Dockerfiles exist.
- The Next frontend now uses standalone output and runs `server.js` directly in the runtime image.
- Backend health and readiness endpoints exist.
- Postgres, Redis, and Arena readiness are checked by `/health/ready`.
- Production CORS fails fast when no frontend origin is configured.
- Auth cookies are secure in production and support a shared parent domain.
- Request IDs are generated and exposed to browser clients.
- Prisma slow-query logging exists through `PRISMA_SLOW_QUERY_MS`.
- Backend Redis clients support both `REDIS_URL` and `REDIS_HOST`/`REDIS_PORT` deployment styles.
- Prisma migration folders all contain `migration.sql`.
- CI workflow has been added for backend, frontend, release scripts, audits, and secret scan.
- Release smoke, baseline load, backup, and restore-verification scripts have been added.

## Release Blockers

- Hosted CI has not been run in GitHub Actions yet.
- Railway backend deployment settings are not present in the repo and must be verified in Railway.
- Vercel frontend settings are not present in the repo and must be verified in Vercel.
- DNS, TLS, and cookie behavior for `beaconvie.com` and `api.beaconvie.com` must be verified on HTTPS.
- External monitoring and alert delivery are not configured as code.
- Backup and isolated restore must be rehearsed against staging or production-like data before public launch.
- Local Docker builds could not be completed because Docker Desktop returned an engine EOF during `npm ci`; rerun container builds before release.
- Dependency audits report high-severity advisories in backend and frontend dependency trees. `npm audit --audit-level=critical` passes, but high advisories require a planned dependency update because the suggested fixes include breaking changes.

## Required Production Environment

Backend:

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `FRONTEND_URL=https://beaconvie.com`
- `CORS_ORIGINS=https://beaconvie.com`
- `AUTH_COOKIE_DOMAIN=.beaconvie.com`
- `GEMINI_API_KEY`
- `REDIS_URL` for managed Redis, or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`
- `REDIS_PORT`
- `REDIS_PASSWORD` when Redis requires auth

Frontend:

- `NEXT_PUBLIC_API_URL=https://api.beaconvie.com`
- `NEXT_PUBLIC_SOCKET_URL=https://api.beaconvie.com`
- `NEXT_PUBLIC_SITE_URL=https://beaconvie.com`

## Validation Commands

Run these before every release:

```powershell
cd D:\elearning-english\backend
npm ci
npx prisma validate
npx prisma generate
npm run build
npm test -- --runInBand
npm audit --audit-level=critical
```

```powershell
cd D:\elearning-english\english-web-build
npm ci
npm run typecheck
npm run i18n:check
npm run build
npm test
npm audit --audit-level=critical
```

```powershell
cd D:\elearning-english
node scripts/smoke/release-smoke.mjs
node scripts/load/baseline-load.mjs
```

## Required Go-Live Evidence

- GitHub Actions CI green on the release commit.
- Staging database backup created.
- Isolated restore verified.
- Prisma migrations applied with `prisma migrate deploy`.
- Backend `/health/ready` passing on staging and production.
- Frontend home page, login, admin console, learning dashboard, and realtime path smoke-tested on HTTPS.
- Rollback target identified and tested.
- Alert contacts and escalation path verified.

## Validation Evidence From 2026-07-25 Local Run

- `npx prisma validate`: passed.
- Backend production build: passed.
- Frontend typecheck: passed.
- Frontend production build with `NEXT_PUBLIC_API_URL=https://api.beaconvie.com`: passed.
- Next standalone artifact: `.next/standalone/server.js` exists.
- Frontend smoke test (`npm test`): passed.
- Backend focused release tests: passed 14 tests across auth/session/static config coverage.
- Migration folder structure check: passed; every migration directory contains `migration.sql`.
- Release script syntax checks: passed.
- Pattern-based local secret scan excluding generated/vendor/build folders: no findings.
- Backend full Jest run: timed out locally after 180 seconds and must be rerun in CI.
- Docker backend/frontend image builds: inconclusive due Docker engine EOF during dependency installation.
- Backend critical audit: no critical vulnerabilities, but high vulnerabilities remain.
- Frontend critical audit: no critical vulnerabilities, but high vulnerabilities remain.

## Remaining Limitations

- The repository cannot prove external provider state.
- Compose remains a useful fallback but is not equivalent to Railway/Vercel configuration.
- Provider-specific observability setup must be completed in the hosting consoles or added later as infrastructure code.

## FINAL RELEASE GATE EVIDENCE

Date: 2026-07-25

### Isolated Restore Validation

- Backup source: `C:\Users\Admin\AppData\Local\Temp\beaconvie-release-evidence-20260725-160205\english_platform-20260725-160205.sql`
- Backup SHA256: `4F7F405CAA98F17188FDB50170CE9AEF16DEF4C7977CB0BC8DCFC8F3BB93C643`
- Isolated restore database used for validation: `release_restore_20260725165058`
- Restore validation status: passed.
- Cleanup status: temporary restore database dropped.
- Original local database and Docker volumes were not reset or deleted.
- Restored Prisma migration rows: 96.
- Restored public table count from prior restore evidence: 167.

Representative restored table checks:

- `_prisma_migrations`: exists, 96 rows.
- `User`: exists, 0 rows in this local backup.
- `UserDeviceSession`: exists, 0 rows in this local backup.
- `LessonProgress`: exists, 0 rows in this local backup.
- `UserXpProfile`: exists, 0 rows in this local backup.
- `XpTransaction`: exists, 0 rows in this local backup.
- `Achievement`: exists, 21 rows.
- `UserAchievement`: exists, 0 rows in this local backup.
- `FeatureFlag`: exists, 7 rows.
- `AiUsageLog`: exists, 0 rows in this local backup.
- `CommunityPost`: exists, 0 rows in this local backup.

Representative integrity checks:

- Duplicate user email groups: 0.
- Negative `UserXpProfile.totalXp`: 0.
- Orphan `UserDeviceSession.userId`: 0.
- Orphan `LessonProgress.userId`: 0.
- Orphan `XpTransaction.userId`: 0.
- Orphan `UserAchievement.userId`: 0.

### Backend Regression Evidence

- Jest discovered 143 backend spec files.
- Non-module partition command: `npx jest --runInBand --detectOpenHandles --testPathPatterns src/app src/common src/config src/prisma`
- Non-module partition result: passed, 6 suites, 28 tests, 21.576 seconds.
- Arena unit-like partition command: `npx jest --runInBand --detectOpenHandles --testPathPatterns src/modules/arena/mode src/modules/arena/rate-limit src/modules/arena/question/arena-question-hash.util.spec.ts src/modules/arena/question/arena-question-parser.spec.ts src/modules/arena/question/arena-question-validator.spec.ts src/modules/arena/battle/arena-battle-engine.service.spec.ts`
- Arena unit-like partition result: passed, 6 suites, 79 tests, 2.916 seconds.
- A-C non-Arena module partition result: failed quickly, not a timeout. Failing suites were `chat-session.controller.spec.ts`, `chat-session.service.spec.ts`, `certificates.controller.spec.ts`, `certificates.service.spec.ts`, `coupons.controller.spec.ts`, and `coupons.service.spec.ts`; failures are missing Nest testing providers such as service or Prisma dependencies.
- Arena integration partition result: timed out. `src/modules/arena` timed out at 300 seconds. `arena-power-up.integration.spec.ts` timed out at 180 seconds even without `--detectOpenHandles`, so at least one Arena integration suite is not completing its body or teardown in this local environment.
- Backend full regression status: failed. This remains a release blocker until fixed or proven green in deterministic CI partitions without omitting release-critical suites.

### Docker Evidence

- Docker daemon and Compose were available: Docker Engine 29.5.2, Docker Desktop 4.75.0, Compose v5.1.3.
- Backend and frontend Docker builds both failed with Docker engine EOF during `npm ci`, before application compilation.
- Docker later reported plugin metadata failures and `The paging file is too small for this operation to complete`, and local Node audit/tree commands also failed with out-of-memory errors.
- Classification: infrastructure/daemon memory or paging-file instability, not an application build failure. No application code change was made to work around this.
- Docker production build status: failed/inconclusive as release evidence. This remains a release blocker until a clean Docker or provider build completes from the release commit.

### Dependency Advisory Disposition

No `npm audit fix --force` was run.

Backend high advisories:

- `brace-expansion` via `minimatch` chains.
  - Severity: high.
  - Direct/transitive: transitive.
  - Runtime: mixed. Mostly dev/test tooling through Jest/ESLint/Nest CLI, with production-lockfile presence also visible through Google/archiver/exceljs-related dependency paths.
  - Exploitability in BeaconVie: low based on repository evidence; the app does not expose untrusted glob or brace pattern expansion as a user-facing API.
  - Available fix: npm audit reports force fixes with breaking dependency changes.
  - Disposition: accepted risk only with owner signoff; not safely auto-fixed in release closure.
  - Release blocker: not critical by audit level, but remains high-priority accepted-risk item requiring signoff.

Frontend high advisories:

- `brace-expansion` via `minimatch` chains.
  - Severity: high.
  - Direct/transitive: transitive.
  - Runtime: dev-only in frontend lockfile paths associated with ESLint and related tooling.
  - Exploitability in BeaconVie: low; no production user-facing glob expansion path identified.
  - Available fix: breaking/forced audit fix path.
  - Disposition: accepted risk with owner signoff; planned dependency update after release gate.
  - Release blocker: not if formally accepted, otherwise remains unresolved high advisory.

- `postcss` under `next`.
  - Severity: high.
  - Direct/transitive: transitive through Next.
  - Runtime: primarily build/framework dependency; production exploitability depends on processing attacker-controlled CSS or source maps, which is not a BeaconVie user flow identified in this repo.
  - Available fix: npm audit reported a breaking/unsafe fix path rather than a safe patch in this lockfile.
  - Disposition: accepted risk with owner signoff; monitor Next patch release and upgrade deliberately.
  - Release blocker: not if formally accepted, otherwise unresolved high advisory.

- `sharp`.
  - Severity: high.
  - Direct/transitive: transitive/optional through Next.
  - Runtime: potentially present in frontend dependency tree, but `next.config.ts` sets `images.unoptimized: true`, reducing exposure to Next image optimization paths.
  - Exploitability in BeaconVie: low-to-medium depending on whether any production deployment enables image optimization or processes untrusted uploaded images through Sharp.
  - Available fix: requires dependency/framework update path; no forced fix applied.
  - Disposition: accepted risk with owner signoff only if production image optimization remains disabled and uploads are not processed by Sharp.
  - Release blocker: blocker if production enables Next image optimization or untrusted Sharp processing.

### External Verification Required

The following mandatory release evidence is not available from the local workspace and must not be treated as passed:

- GitHub Actions real run on the release commit.
- Railway production backend and worker configuration.
- Vercel production frontend configuration.
- DNS and TLS for `beaconvie.com`, `www.beaconvie.com` if used, and `api.beaconvie.com`.
- Production cookies.
- Production CORS.
- Production health/readiness.
- Production smoke tests.
- Rollback target in Railway and Vercel.

### Final Gate Verdict

PRODUCTION RELEASE V1.0: NOT READY

Blocking reasons:

- Backend full regression is not green.
- Docker production build evidence is not green due local Docker infrastructure failure.
- GitHub Actions, Railway, Vercel, DNS/TLS, production cookie/CORS, production health/readiness, production smoke, and rollback target verification remain externally required.
- High dependency advisories require explicit accepted-risk signoff or safe patched upgrades.
