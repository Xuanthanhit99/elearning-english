# Phase 7 Reading API Audit

## Backend module
- Controller: `backend/src/modules/reading/reading.controller.ts`
- Service: `backend/src/modules/reading/reading.service.ts`
- DTOs: `backend/src/modules/reading/dto/get-reading-articles.dto.ts`, `backend/src/modules/reading/dto/get-reading-history.dto.ts`, `backend/src/modules/reading/dto/reading-home.dto.ts`
- Auth: every `/reading/*` endpoint is protected by `JwtAuthGuard`.

## Web reference
- Reading screens live under `english-web-build/src/Components/reading`.
- Web uses native API routes through the shared API client, not mock data.
- Web lesson flow loads article detail, starts/resumes a session, saves answers, submits, then reads `/reading/sessions/:sessionId/result`.

## Endpoints used by mobile
- `GET /reading/articles`
  - Query: `page`, `limit`, `category`, `difficulty`, `status`, `sort`, `keyword`.
  - Response: `meta`, `summary`, `filters`, `articles`, `achievements`.
  - Article cards include id, slug, title, description, category, difficulty, read time, word count, question count, XP, status, and progress percent.
- `GET /reading/articles/:slug`
  - Response: `article`, nullable `session`, `questions`, `vocabulary`, optional `tip`.
  - Questions include server-saved `selected` values when a session already exists.
- `POST /reading/articles/:articleId/start`
  - Starts or resumes the unique user/article session.
  - Response: `sessionId`, `articleId`, `startedAt`.
- `POST /reading/sessions/:sessionId/answer`
  - Body: `{ questionId, selected }`.
  - Upserts one answer and returns `{ id, questionId, selected, isCorrect }`.
  - Mobile does not show correctness here; result review comes from the result endpoint.
- `POST /reading/sessions/:sessionId/submit`
  - No request body.
  - Finalizes score, accuracy, earned XP, streak, missions, and learning XP on the server.
  - Idempotent for completed sessions and guarded against concurrent double completion.
- `GET /reading/sessions/:sessionId/result`
  - Response: `summary`, `questions`, `vocabulary`, `suggestions`, plus comparison/performance metadata.

## Server-owned behavior
- Correctness is calculated by backend when answers are saved.
- Completion, score, accuracy, earned XP, reading progress, streaks, missions, and global learning XP are finalized by backend submit.
- Duplicate submit is safe server-side, but mobile also disables duplicate taps and uses `retry: false` for non-idempotent mutations.

## Mobile scope decisions
- Phase 7 implements only Reading.
- No backend changes were required.
- Mobile uses authenticated Axios and TanStack Query.
- The native flow passes ids between screens, not full lesson payloads.
- Runtime authenticated device testing remains unverified without user credentials.
