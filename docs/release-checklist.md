# Release Checklist

Use this checklist for every production release.

## Before Release

- [ ] Confirm the release commit is the exact commit to deploy.
- [ ] Confirm GitHub Actions CI is green.
- [ ] Confirm backend critical dependency audit is clean.
- [ ] Confirm frontend critical dependency audit is clean.
- [ ] Review high-severity dependency advisories and confirm accepted-risk owner or patched version.
- [ ] Confirm no production secrets are committed.
- [ ] Confirm `DATABASE_URL`, `REDIS_URL`, Gemini, and JWT secrets are configured in Railway.
- [ ] Confirm `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, and `NEXT_PUBLIC_SITE_URL` are configured in Vercel.
- [ ] Confirm `FRONTEND_URL=https://beaconvie.com`.
- [ ] Confirm `CORS_ORIGINS=https://beaconvie.com`.
- [ ] Confirm `AUTH_COOKIE_DOMAIN=.beaconvie.com`.
- [ ] Create a database backup.
- [ ] Verify that backup in an isolated restore database.
- [ ] Confirm rollback commit/image is available.
- [ ] Build the backend and frontend production containers, or confirm Railway/Vercel provider builds from the same commit are green.

## Release

- [ ] Put the application in a change window.
- [ ] Run Prisma migrations with `prisma migrate deploy`.
- [ ] Deploy backend.
- [ ] Wait for backend `/health/ready` to pass.
- [ ] Deploy frontend.
- [ ] Run release smoke checks against production.
- [ ] Check logs for startup errors and repeated 5xx responses.
- [ ] Check queue health and failed jobs.
- [ ] Check admin console health page.

## After Release

- [ ] Confirm login, refresh, logout, and admin access.
- [ ] Confirm learning dashboard loads.
- [ ] Confirm one realtime path connects.
- [ ] Confirm upload/media URLs load.
- [ ] Confirm no secrets appear in logs.
- [ ] Keep heightened monitoring for at least 30 minutes.
- [ ] Record the deployed commit, migration result, backup file, and smoke result.
