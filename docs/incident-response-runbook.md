# Incident Response Runbook

## Severity

- SEV1: Site unavailable, login broken, data loss, payment/user-safety risk.
- SEV2: Major feature unavailable, high error rate, admin moderation degraded.
- SEV3: Partial degradation with workaround.

## First 10 Minutes

1. Name one incident lead.
2. Open the incident channel.
3. Capture start time, affected systems, and first symptoms.
4. Check backend `/health/ready`.
5. Check frontend availability.
6. Check recent deploys and migrations.
7. Check database and Redis availability.
8. Decide whether to roll back, disable a feature, or continue diagnosis.

## Diagnostics

- Backend logs by request ID.
- Railway deployment and runtime logs.
- Vercel deployment and edge logs.
- Database connection count and slow queries.
- Redis connectivity and memory.
- Queue failures and retries.
- Admin audit logs for suspicious changes.

## Communication

- Update stakeholders every 15 minutes for SEV1.
- Keep customer-facing language plain and factual.
- Do not speculate about root cause before evidence exists.
- Record all mitigation actions with timestamps.

## Closure

- Confirm health checks and smoke checks pass.
- Confirm error rate has returned to baseline.
- Confirm no data repair remains.
- Write a short post-incident review with timeline, root cause, impact, and follow-up actions.
