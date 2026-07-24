# Lesson AI Fallback — Operational Runbook

Companion to `docs/auth-and-ai-content-flow-audit.md`. This is the practical "how do I operate/debug this" reference.

## How AI fallback is triggered, per module

| Module | Trigger condition | Where |
|---|---|---|
| Vocabulary | `pickWordsForUser` finds fewer than `limit` words after checking the strict DB query and the static fallback bank | `backend/src/modules/vocabulary/vocabulary.service.ts` |
| Listening | `ensureQuestions()` computes a shortfall; if `existed === 0` (true cold start) does a capped (max 3) synchronous Gemini call under a Redis lock, otherwise enqueues a BullMQ job for the rest | `backend/src/modules/listening/listening.service.ts` |
| Reading | Nightly cron only (`0 2 * * *`), stops once 10 articles exist per category×level | `backend/src/modules/reading/reading-job/reading-job.service.ts` |
| Grammar | **Disabled** — the generator exists but its cron is commented out; content does not grow automatically today | `backend/src/modules/grammar/grammar-job/grammar-job.service.ts` |
| Speaking | Every call to "generate question" or "evaluate answer" hits Gemini directly (no shortfall check — by design, each is a fresh generation/evaluation) | `backend/src/modules/speaking/speaking.service.ts` |
| Writing | `/writing/check` (quick single-answer check, has its own exact-match DB lookup first); `/writing/sessions/:id/submit` (async, always evaluates via Gemini) | `backend/src/modules/writing/writing.service.ts`, `writing-processing.service.ts` |
| Placement (current) | `QuestionBankService.ensurePlacementQuestions()` computes `missingCount`, generates only the shortfall under a PG advisory lock | `backend/src/modules/question-bank/question-bank.service.ts` |
| Placement (legacy) | Every call to `POST /placement-tests/generate` generates a full fresh test — confirmed unused by the frontend, now throttled to 3/10min per user | `backend/src/modules/placement-tests/placement-tests.service.ts` |

## How to identify generation state

- **Synchronous endpoints** (Vocabulary, Speaking sync, Writing `/check`, Placement legacy): no persisted "state" — the HTTP request is either still in flight or has returned. Check backend logs for `console.error`/`Logger` output tagged with the service name.
- **Async job-backed endpoints** (Writing submit, Speaking upload, Placement full-test processing): poll the status endpoint —
  - `GET /writing/sessions/:id/status` → `{ status, step, progress, message, errorMessage, retryable, isStale }`
  - `GET /speaking/sessions/:id/status` → same shape (as of this pass, now includes `retryable`/`isStale` too)
  - `GET /placement/tests/:id/processing` (also has an SSE stream at `/placement/tests/:id/processing/events`)
- Job rows live in Postgres: `WritingProcessingJob`, `SpeakingProcessingJob`, `PlacementProcessingJob` (+ `PlacementProcessingStepState`/`PlacementProcessingSkillState`/`PlacementProcessingLog`). Query by `sessionId`/`userId`, ordered by `createdAt desc`, to see the latest attempt and its `status`/`errorMessage`.

## How to retry

- **Writing**: `POST /writing/sessions/:id/retry-processing` — re-submits if the latest job is `FAILED` or stale (>15 min in `PROCESSING`).
- **Speaking**: `POST /speaking/sessions/:id/retry-processing` (added this pass) — re-enqueues the same job using the already-uploaded audio (`audioPath` on the `SpeakingProcessingJob` row), no re-recording needed. Frontend: the "Thử chấm lại" button on `SpeakingProcessingPage.tsx` now appears whenever `status.retryable` is true.
- **Placement processing**: the processing screen's "Retry processing" button re-POSTs `/placement/tests/:id/processing/start`.
- **Vocabulary / Listening / legacy Placement**: no explicit retry endpoint — the client just re-requests the same data; the shortfall/lock logic naturally re-attempts generation only if content is still missing.

## Redis keys

- `auth:refresh:<jti>` — refresh-token session pointer (auth, not lesson content), TTL 7 days.
- `listening:cold-start-lock:<level>:<topicSlugOrHash>` — Listening's distributed generation lock, TTL 60s, `SET NX`.
- No lesson *content* is ever cached in Redis anywhere in the codebase — Postgres is always the source of truth for lesson data. If Redis is unavailable, Listening's lock acquisition **fails closed** (denies the synchronous fallback rather than allowing an unlocked generation) — confirmed intentional in `listening.service.ts`'s `tryAcquireColdStartLock`.

## Database records to inspect

- `Word` (Vocabulary), `ReadingArticle`/`ReadingQuestion`/`ReadingVocabulary`, `ListeningQuestion` (has `questionHash` unique constraint + `source`/`aiModel` metadata columns — not currently surfaced in any API response, admin/debugging only), `PlacementQuestion` (same pattern, plus `usageCount` for reuse-spreading), `SpeakingProcessingJob`, `WritingProcessingJob`, `PlacementProcessingJob`.
- None of these tables' AI-provenance columns (`source`, `aiModel`, `questionHash`, `isAiGenerated`) are exposed in any client-facing API response today — they exist for admin/debugging queries only.

## Gemini quota/rate-limit behavior

- `GeminiService.generateJson()` (the shared service, used by about half the call sites): 3 retries per model, 2 models tried in sequence, 30s timeout per attempt — so a fully-exhausted call can take up to ~3 minutes before failing.
- Services with their own direct SDK client (Writing, Speaking, Placement-AI, Placement-result-AI, Words, Arena-question, chat) each have their own retry/timeout policy — see the audit doc §14 for the full per-service breakdown. Not all of them have a timeout configured; a hung Gemini call on those paths blocks the request/job until an upstream infra timeout (if any) intervenes.
- 429/503/`RESOURCE_EXHAUSTED` errors are treated as retryable where retry logic exists; other errors are not retried.

## How to disable AI fallback / use DB-only degraded mode

There is no single global "AI fallback off" switch. Per module:
- **Vocabulary**: if Gemini is unreachable, `generateWordsByGemini` catches the error and falls back to a small static word bank (`buildFallbackWords`) — only has entries for a handful of topics (food, technology, environment, daily life, travel, business, health, conversation); other topics will surface a `BadRequestException` if the DB genuinely has nothing.
- **Listening**: falls back to 3 hardcoded static questions on Gemini failure in the synchronous cold-start path; the async BullMQ path retries via BullMQ's own `attempts: 4` + backoff and otherwise just leaves the existing question pool as-is.
- **Writing/Speaking async pipelines**: on failure, the job is marked `FAILED` with `errorMessage` — no fallback content is served; the user sees the retry UI.
- To fully disable Gemini calls for local development, unset `GEMINI_API_KEY` — most services check for it at construction time and throw immediately (e.g. `SpeakingService`'s constructor), so this is an explicit, visible failure rather than silent degraded behavior.

## How to clear stale generation locks

- **Listening's Redis lock** (`listening:cold-start-lock:*`): expires on its own after 60 seconds; can be deleted manually via `redis-cli DEL <key>` if needed, but this is rarely necessary given the short TTL.
- **Placement/Vocabulary's Postgres advisory lock** (`QuestionGenerationLockService`): `pg_advisory_lock` is automatically released when the holding transaction ends (including on a crashed connection), so there is no persistent "stuck lock" state to clean up — restarting the backend process or waiting for the transaction to time out (120s `timeout` configured on the interactive transaction) is sufficient.

## How to avoid duplicate generation

- Listening and Placement-processing use BullMQ's `jobId` uniqueness (same `jobId` = same job, a second `queue.add` with that id is a no-op).
- Vocabulary and Placement (current) use the PG advisory lock with a double-checked-locking re-query after acquiring the lock.
- The legacy Placement-test-generation endpoint has neither — it is now throttled (3 requests / 10 minutes / user) as a stopgap. If this endpoint is ever revived for real traffic, it needs the same lock treatment as the current Placement flow before that happens.

## Operational alerts (recommended, not yet implemented)

None of the observability items in the original brief (structured metrics for cache-hit/DB-hit/AI-fallback-triggered/lock-wait/generation-duration/validation-failure) exist today — this pass did not add them, since doing so meaningfully (with actual dashboards/alerting) requires infrastructure decisions (which metrics backend, which alerting channel) outside this audit's scope. If/when observability is added, the highest-value signals to start with are: Gemini failure rate per service, BullMQ job `FAILED` rate for the three processing queues, and Redis-unavailable events during Listening's lock acquisition (since that path is explicitly fail-closed and would otherwise silently degrade user-visible content availability).
