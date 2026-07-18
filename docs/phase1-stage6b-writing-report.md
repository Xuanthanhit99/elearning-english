# Phase 1 - Stage 6B Writing Production Flow

## Scope

- Module: Writing only.
- Backend checked: controller, service, Prisma models, BullMQ queue, processor, Gemini evaluation, history, result, retry and Mission V2 integration.
- Frontend checked: Writing session, processing, result, history routes and processing API helpers.
- No database reset was performed.
- No migration was applied automatically.
- Speaking, Listening, Grammar, Reading and Vocabulary were not refactored.

## Prisma Migration Status

`npx prisma migrate status` reported 77 migrations and 3 pending migrations:

- `20260717034435_add_chat_session`
- `20260717040228_add_chat_pet_feature`
- `20260718090000_add_mission_progress_event_v2`

Because this stage is Writing-only and the instruction was not to apply migrations without verification, these migrations were left untouched.

## Backend Changes

- Added safe retry endpoint: `POST /writing/sessions/:sessionId/retry-processing`.
- Hardened `POST /writing/sessions/:sessionId/submit` behavior:
  - Returns existing queued/processing job for normal double click.
  - Returns result URL when the session is already completed.
  - Allows a new processing job if the previous processing job is stale.
- Hardened `GET /writing/sessions/:sessionId/status`:
  - Verifies ownership through `userId`.
  - Returns completed status when a result already exists even if no processing job is found.
  - Adds `retryable` and `isStale` fields for frontend recovery.
- Prevented saving a draft after the Writing session is already completed.
- Added Gemini evaluation timeout via `WRITING_GEMINI_TIMEOUT_MS`, default `45000`.
- Added malformed Gemini JSON handling so queue jobs fail cleanly instead of crashing with raw parser errors.
- Made Writing processor idempotent:
  - Skips Gemini and reward updates when the session already has a result.
  - Uses conditional `updateMany` to save a result only when `isSubmitted = false`.
  - Sends Mission V2 progress with `sourceId` and stable `idempotencyKey`.
- Kept Learning XP idempotency through existing `LearningXpPublisher` and `LearningXpListener`.
- Normalized Writing module imports from `src/...` to relative imports so Jest can resolve the module.
- Added minimal mocks in existing Writing specs to validate DI without DB/Redis/Gemini.

## Frontend Changes

- Added `retryWritingProcessing(sessionId)` API helper.
- Extended `WritingProcessingStatus` with:
  - `id: string | null`
  - `retryable`
  - `isStale`
- Updated `WritingProcessingPage`:
  - Uses shared API error normalization.
  - Keeps polling after retry.
  - Shows "Thử chấm lại" when backend marks the job retryable.
  - Redirects to result when backend returns `resultUrl`.
- Updated `WritingSessionPage`:
  - Redirects completed sessions to result.
  - Prevents save/submit double click.
  - Handles immediate `resultUrl` from submit.
  - Disables save while saving/submitting.

## Production Safety Cases

- Double submit: guarded by running job reuse and frontend button lock.
- Reload processing: status endpoint returns latest job or completed result state.
- Worker restart: BullMQ attempts remain configured with exponential backoff.
- Gemini timeout: job fails cleanly and frontend can retry.
- Gemini malformed JSON: job fails cleanly and frontend can retry.
- Stuck session: stale processing jobs become retryable after 15 minutes.
- Ownership: status, submit, retry and result read use logged-in `userId`.
- Result already saved: processor exits without re-awarding missions or XP.
- Reward already granted: Mission V2 uses stable idempotency keys; XP already uses stable learning idempotency keys.

## Verification

- `backend`: `npm run build` passed.
- `backend`: `npm test -- writing` passed.
- `frontend`: `npm run build` passed.

## Remaining Risks

- There are 3 pending migrations unrelated to this Writing patch. They should be reviewed before deployment.
- Writing still contains older direct AI checking APIs such as `/writing/check` and legacy direct `submitEssay` logic. They were kept for compatibility and not rewritten.
- Some older UI strings in Writing files still appear with encoding issues in the repository. The production flow was fixed without broad UI copy cleanup to keep this stage scoped.

## Checklist

- [x] Audit existing Writing backend.
- [x] Audit existing Writing frontend.
- [x] Check Prisma migration status.
- [x] Harden submit/status/result flow.
- [x] Add retry processing recovery.
- [x] Add Gemini timeout and JSON error handling.
- [x] Make processor and Mission V2 updates idempotent.
- [x] Prevent editing completed Writing sessions.
- [x] Update frontend processing retry UI.
- [x] Run backend build.
- [x] Run Writing tests.
- [x] Run frontend build.
