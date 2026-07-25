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
