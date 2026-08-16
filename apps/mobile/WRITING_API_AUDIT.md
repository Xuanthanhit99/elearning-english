# Phase 9 Writing API Audit

## Source Files
- Controller: `backend/src/modules/writing/writing.controller.ts`
- Main service: `backend/src/modules/writing/writing.service.ts`
- Session helper: `backend/src/modules/writing/writing-session.service.ts`
- Async processing: `backend/src/modules/writing/writing-processing.service.ts`
- BullMQ worker: `backend/src/modules/writing/writing.processor.ts`
- AI evaluator: `backend/src/modules/writing/writing-ai-evaluation.service.ts`
- Queue constants/types: `backend/src/modules/writing/writing-processing.constants.ts`, `writing-processing.types.ts`
- History: `backend/src/modules/writing/writing-history.service.ts`
- DTO: `backend/src/modules/writing/dro/check-writing.dto.ts`
- Models: `backend/prisma/schema.prisma` models `WritingTopic`, `WritingLesson`, `WritingSession`, `WritingProcessingJob`, `WritingTopicProgress`, plus direct-check model `WritingSubmission`
- Web: `english-web-build/src/Components/WritingPage/*`, `english-web-build/src/lib/writing-processing-api.ts`

## Endpoint Audit

### `GET /writing/home`
- Auth: `JwtAuthGuard`
- Controller/service: `WritingController.getHome` -> `WritingService.getHome`
- Request: none
- Response: user, stats, todayPractice, writingPath, recommendations, recentHistory, dailyGoal, progress
- Side effects: none
- Mobile suitability: primary overview and progress source

### `GET /writing/topics`
- Auth: `JwtAuthGuard`
- Controller/service: `WritingController.getTopics` -> `WritingService.getTopics`
- Request: `search`, `difficulty`, `progress`, `sort`, `type`, `page`, `limit`
- Response: `{ items, pagination }`
- Side effects: none
- Mobile suitability: optional topic catalog; Phase 9 mobile uses home recommendations rather than building a full catalog

### `GET /writing/topics/:slug`
- Auth: `JwtAuthGuard`
- Controller/service: `WritingController.getTopicDetail` -> `WritingService.getTopicDetail`
- Request: `sort`
- Response: topic, progress, stats, lessons, about, tips, next lesson
- Side effects: none
- Mobile suitability: supported, but not required for recommended-task flow

### `POST /writing/lessons/:lessonId/start`
- Auth: `JwtAuthGuard`
- Controller/service: `WritingController.startLesson` -> `WritingService.startLesson`
- Request: lesson id
- Response: `{ sessionId, lessonId, reused }`
- Side effects: creates a `WritingSession` or reuses latest unsubmitted session for the user/lesson
- Idempotency: resume-safe for unsubmitted lesson sessions
- Mobile suitability: used to open a recommended Writing task

### `GET /writing/sessions/:sessionId`
- Auth: `JwtAuthGuard`
- Controller/service: `WritingController.getSession` -> `WritingService.getSession`
- Request: session id
- Response: session draft state, lesson prompt/constraints, topic, progress, tips
- Side effects: none
- Lock behavior: submitted sessions are returned as `isSubmitted: true`; web redirects to result
- Mobile suitability: task detail and editor data source

### `POST /writing/sessions/:sessionId/save`
- Auth: `JwtAuthGuard`
- Controller/service: `WritingController.saveDraft` -> `WritingService.saveDraft`
- Request: `{ content, timeSpentSeconds? }`
- Response: updated `WritingSession`
- Side effects: updates session content, backend word count, time spent
- Lock behavior: rejects submitted sessions
- Idempotency: draft update overwrites the same session
- Mobile suitability: server draft autosave

### `POST /writing/sessions/:sessionId/submit`
- Auth: `JwtAuthGuard`
- Controller/service: `WritingController.submitEssay` -> `WritingProcessingService.submit`
- Request: `{ content, timeSpentSeconds? }`
- Response: `{ sessionId, processingJobId?, status, processingUrl, resultUrl? }`
- Side effects: validates content, saves content, creates `WritingProcessingJob`, enqueues BullMQ job
- Async behavior: returns immediately with queued/processing status; AI evaluation happens in worker
- Duplicate behavior: active QUEUED/PROCESSING job is reused; submitted sessions return result/processing metadata
- Mutation retry: unsafe to retry blindly; mobile uses `retry: false`

### `GET /writing/sessions/:sessionId/status`
- Auth: `JwtAuthGuard`
- Controller/service: `WritingController.getSessionStatus` -> `WritingProcessingService.getStatus`
- Request: session id
- Response: job id, session id, status, step, progress, message, error, retryable, stale, resultUrl
- Status values observed: `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`
- Step values observed: `SUBMITTED`, `AI_EVALUATION`, `SAVING_RESULT`, `UPDATING_MISSIONS`, `COMPLETED`, `FAILED`
- Mobile suitability: processing screen polling source

### `POST /writing/sessions/:sessionId/retry-processing`
- Auth: `JwtAuthGuard`
- Controller/service: `WritingController.retryProcessing` -> `WritingProcessingService.retryProcessing`
- Request: session id
- Response: completed result URL or new/active processing metadata
- Side effects: may enqueue a new evaluation only when latest failed/stale and content exists
- Mobile suitability: optional failed-state retry; not automatically invoked

### `GET /writing/sessions/:sessionId/result`
- Auth: `JwtAuthGuard`
- Controller/service: `WritingController.getResult` -> `WritingService.getResult`
- Request: session id
- Response: submitted session, lesson, topic, result scores, feedback, corrections, suggested version, tips, next practice
- Side effects: none
- Mobile suitability: result screen source

### `POST /writing/sessions/:sessionId/retry`
- Auth: `JwtAuthGuard`
- Controller/service: `WritingController.retryEssay` -> `WritingService.retryEssay`
- Request: session id
- Response: new session id for the same lesson
- Side effects: creates a new unsubmitted session
- Mobile suitability: optional result action; not implemented in Phase 9

### `GET /writing/history`
- Auth: `JwtAuthGuard`
- Controller/service: `WritingController.getWritingHistory` -> `WritingHistoryService.getHistory` -> `WritingService.getWritingHistory`
- Request: topic/type/level/status/from/to/page/limit
- Response: stats, items, pagination
- Side effects: none
- Mobile suitability: history source; overview uses recent history from home

### `POST /writing/check`
- Auth: `OptionalJwtGuard` plus throttle
- Controller/service: `WritingController.checkWriting` -> `WritingService.checkWriting`
- Request: direct freeform writing check
- Response: direct AI feedback stored in `WritingSubmission`
- Mobile suitability: out of Phase 9 learning-task scope because it is the direct synchronous checker, not lesson/session/BullMQ flow

## Required Questions
1. Writing prompts/tasks are listed through `/writing/home` recommendations and `/writing/topics`/topic detail lessons.
2. A task is loaded by starting a lesson (`/lessons/:lessonId/start`) and reading `/sessions/:sessionId`.
3. A server-side draft exists in `WritingSession.content`.
4. Autosave is supported by `/writing/sessions/:sessionId/save`.
5. Submission is created through `/writing/sessions/:sessionId/submit`.
6. Submission returns immediately with processing metadata; evaluation is async.
7. Status values include `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`.
8. Evaluation is queued through BullMQ queue `writing-processing`.
9. Client discovers completion through `/writing/sessions/:sessionId/status` polling.
10. Status endpoint and result endpoint exist.
11. Socket.IO is not used by current web Writing updates.
12. Score model: overall, task response, coherence, vocabulary/lexical resource, grammar, all 0-100.
13. Feedback fields include feedback text, strengths, improvements/suggestions, detailed feedback, learning tips, next practice.
14. Corrections are returned from `corrections`/`mistakes`.
15. Suggested rewrite is returned as `suggestedVersion`/`correctedEssay`.
16. XP/progress is backend-owned through `LearningXpPublisher` and mission updates in the worker.
17. Progress is completed when worker updates `WritingSession.isSubmitted = true`.
18. Completed task draft save is rejected; editor should be read-only/redirect to result.
19. Completed task can start a new retry session via `/retry`, but not edit the completed session.
20. Submit is guarded but not fully idempotent by request key; active jobs are reused and completed sessions short-circuit.
21. Duplicate submissions are guarded by running-job checks and mobile pending lock.
22. Backend enforces non-empty content and minimum lesson words. Max words is exposed but not hard-rejected in queued submit.
23. Words are counted with `trim().split(/\s+/).filter(Boolean).length`.
24. History is available through `/writing/history` and recent history in `/writing/home`.

## Mobile Draft Decision
- Server draft: primary source through `/save`.
- Local draft: AsyncStorage fallback for unsent essay text keyed by session id.
- SecureStore is not used for large essay drafts.
- If server content exists, mobile prefers server content; if server content is empty and local draft exists, local draft is restored.
