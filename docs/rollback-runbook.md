# Rollback Runbook

## When To Roll Back

Rollback when any of these occur after release:

- Backend `/health/ready` remains failed for more than 5 minutes.
- Login or refresh is broken for normal users.
- Admin moderation or user safety workflows are unavailable.
- Migration caused data corruption or prevents critical reads/writes.
- Error rate remains elevated after the first mitigation attempt.

## App Rollback

1. Announce rollback in the release channel.
2. Stop further deployments.
3. Identify the last known good backend commit or image.
4. Redeploy the last known good backend.
5. Redeploy the matching frontend if the frontend changed.
6. Run production smoke checks.
7. Keep the new release disabled until root cause is known.

## Database Rollback

Database rollback is not automatic. Prefer forward fixes unless the release owner confirms data loss or unrecoverable schema breakage.

1. Stop writes if corruption is active.
2. Preserve current database state with a new emergency backup.
3. Restore the pre-release backup into an isolated database.
4. Compare affected tables and decide whether to restore, patch forward, or manually repair.
5. If restoring production, record downtime start, backup source, restore operator, and validation result.

## Rollback Validation

- [ ] `/health/ready` passes.
- [ ] Login and refresh pass.
- [ ] Admin console opens.
- [ ] Core learning dashboard opens.
- [ ] No repeated migration/runtime errors in logs.
- [ ] Incident record includes cause, impact, and follow-up owner.
