# Placement + Learning Path API Audit

## Source Files

- Placement home/introduction/manual/retake: `backend/src/modules/placement/placement.controller.ts`, `backend/src/modules/placement/placement.service.ts`
- Placement session start/resume: `backend/src/modules/placement/placement-session/placement-session.controller.ts`, `backend/src/modules/placement/placement-session/placement-session.service.ts`
- Placement test questions: `backend/src/modules/placement/placement-test/placement-test.controller.ts`, `backend/src/modules/placement/placement-test/placement-test.service.ts`
- Special Placement responses: `backend/src/modules/placement/placement-response.controller.ts`, `backend/src/modules/placement/placement-response.service.ts`
- Placement processing: `backend/src/modules/placement-processing/placement-processing.controller.ts`, `placement-processing.service.ts`, `placement-processing.processor.ts`
- Placement result: `backend/src/modules/placement-result/placement-result.controller.ts`, `placement-result.service.ts`
- Retake/dashboard: `backend/src/modules/placement-dashboard/placement-dashboard.controller.ts`, `placement-retake.service.ts`, `placement-dashboard.service.ts`
- Learning Path: `backend/src/modules/learning-path/learning-path.controller.ts`, `learning-path.service.ts`
- Prisma: `backend/prisma/schema.prisma`
- Web clients: `english-web-build/src/lib/placement-api.ts`, `placement-special-response-api.ts`, `placement-processing-api.ts`, `placement-result-api.ts`, `placement-dashboard-api.ts`, `placement-retake-status-api.ts`, `learning-path-api.ts`

## Placement Endpoints

### `GET /placement/home`
- Controller/service: `PlacementController.getHome` -> `PlacementService.getPlacementHome`
- DTO: none
- Auth: `JwtAuthGuard`
- Request: none
- Response: user, placement status/method/overallLevel/skillLevels, options including duration metadata and CEFR levels
- Mutation effects: none
- Idempotency: read-only
- Resume behavior: exposes placement state, not active session detail
- Scoring/XP: none
- Web consumer: `getPlacementHome`
- Mobile suitability: useful for entry/status

### `GET /placement/introduction`
- Controller/service: `PlacementController.getIntroduction` -> `PlacementService.getIntroduction`
- DTO: none
- Auth: `JwtAuthGuard`
- Request: none
- Response: user, active test summary, product intro content, steps, estimated minutes
- Mutation effects: none
- Idempotency: read-only
- Resume behavior: returns `hasActiveSession`, `sessionId`, `answeredQuestions`, `currentStep`
- Scoring/XP: none
- Web consumer: `getPlacementIntroduction`
- Mobile suitability: primary intro/status endpoint

### `POST /placement/session/start`
- Controller/service: `PlacementSessionController.start` -> `PlacementSessionService.startOrResume`
- DTO: `StartPlacementSessionDto` (`mode?`, `level?`)
- Auth: `JwtAuthGuard`
- Request: usually `{ mode: "ADAPTIVE" }`
- Response: `testId`, `sessionId`, `resumed`, `mode`, `level`, `status`, `totalQuestions`, `nextUrl`
- Mutation effects: creates a `PlacementTest` and prepared questions, or reuses active test; sets `User.currentPlacementTestId`
- Idempotency: idempotent unless `forceNew` is used internally; repeated start resumes active session
- Resume behavior: active `IN_PROGRESS` test is returned
- Scoring/XP: none
- Web consumer: `startPlacementTest`
- Mobile suitability: primary start/resume endpoint

### `GET /placement/session/active`
- Controller/service: `PlacementSessionController.active` -> `PlacementSessionService.getActiveSession`
- DTO: none
- Auth: `JwtAuthGuard`
- Request: none
- Response: `hasActiveSession`, session summary with `nextUrl`
- Mutation effects: none
- Idempotency: read-only
- Resume behavior: returns current active test when present
- Scoring/XP: none
- Web consumer: not primary
- Mobile suitability: useful but introduction already covers active state

### `GET /placement-test/:sessionId`
- Controller/service: `PlacementTestController.getSession` -> `PlacementTestService.getSession`
- DTO: none
- Auth: `JwtAuthGuard`
- Request: session id
- Response: one `currentQuestion`, session progress, sections, navigator, autosave; when complete, `currentQuestion: null` and `nextUrl` to processing
- Mutation effects: ensures questions exist; marks session completed when every question is answered/skipped
- Idempotency: mostly read-only except completion status update
- Resume behavior: returns first unanswered/unskipped question
- Scoring behavior: exposes stored session counters, but mobile must not score
- XP: none
- Web consumer: `getPlacementTest`
- Mobile suitability: primary question/session endpoint

### `POST /placement-test/:sessionId/answer`
- Controller/service: `PlacementTestController.answerQuestion` -> `PlacementTestService.answerQuestion`
- DTO: `AnswerPlacementQuestionDto` (`questionId`, `answer`, `spentSeconds?`)
- Auth: `JwtAuthGuard`
- Request: objective question answer
- Response: refreshed session with next current question
- Mutation effects: stores answer, correctness, spent seconds; updates test `total`, `correct`, `score`
- Idempotency: answer can be updated for the same question, but it mutates counters; mobile retry disabled
- Resume behavior: answered question is no longer current
- Scoring behavior: server normalizes and compares answer to `correctAnswer`
- XP: none
- Web consumer: `answerPlacementQuestion`
- Mobile suitability: primary objective answer endpoint

### `POST /placement-test/:sessionId/skip`
- Controller/service: `PlacementTestController.skipQuestion` -> `PlacementTestService.skipQuestion`
- DTO: `SkipPlacementQuestionDto` (`questionId`, `spentSeconds?`)
- Auth: `JwtAuthGuard`
- Request: question id, time
- Response: refreshed session
- Mutation effects: marks question skipped and answered
- Idempotency: mutating; mobile retry disabled
- Resume behavior: skipped question is no longer current
- Scoring/XP: no XP; skipped questions not correct
- Web consumer: `skipPlacementQuestion`
- Mobile suitability: useful for supported objective questions when allowed by product

### `POST /placement/tests/:sessionId/writing`
- Controller/service: `PlacementResponseController.submitWriting` -> `PlacementResponseService.submitWriting`
- DTO: `SubmitPlacementWritingDto` (`questionId`, `content`, `spentSeconds`)
- Auth: `JwtAuthGuard`
- Request: writing content, min 20 characters and server min 20 words
- Response: `questionId`, `wordCount`, evaluation pending state, `nextQuestion`, `savedAt`
- Mutation effects: saves `writingText`, `wordCount`, pending AI feedback, answeredAt
- Idempotency: mutating; mobile retry disabled
- Resume behavior: after refetch, next question becomes current
- Scoring: later in processing worker through AI service
- XP: none here
- Web consumer: `submitPlacementWriting`
- Mobile suitability: supported

### `POST /placement/tests/:sessionId/speaking`
- Controller/service: `PlacementResponseController.submitSpeaking` -> `PlacementResponseService.submitSpeaking`
- DTO: multipart `SubmitPlacementSpeakingDto` plus `audio`
- Auth: `JwtAuthGuard`
- Request: `questionId`, `spentSeconds`, audio file
- Response: audio URL, pending evaluation, next question
- Mutation effects: saves uploaded file and pending AI feedback
- Idempotency: mutating upload; mobile retry disabled
- Resume behavior: after refetch, next question becomes current
- Scoring: later in processing worker through AI service if transcript exists
- XP: none here
- Web consumer: `submitPlacementSpeaking`
- Mobile suitability: supported with Expo audio recording

### `POST /placement/tests/:sessionId/speaking/skip`
- Controller/service: `PlacementResponseController.skipSpeaking` -> `PlacementResponseService.skipSpeaking`
- DTO: `SkipPlacementSpeakingDto` (`questionId`, `action`, `spentSeconds?`)
- Auth: `JwtAuthGuard`
- Request: action `SKIPPED` or `DEFERRED`
- Response: skip/defer state, next question
- Mutation effects: marks Speaking skipped and excluded from overall score
- Idempotency: mutating; mobile retry disabled
- Resume behavior: moves to next question
- XP: none
- Web consumer: `skipPlacementSpeaking`
- Mobile suitability: supported fallback

### `POST /placement/tests/:testId/processing/start`
- Controller/service: `PlacementProcessingController.start` -> `PlacementProcessingService.ensureStarted`
- DTO: none
- Auth: `JwtAuthGuard`
- Request: test id
- Response: processing snapshot
- Mutation effects: creates/resets `PlacementProcessingJob`, step/skill rows, enqueues BullMQ job
- Idempotency: guarded by unique `testId` and queue job id
- Resume behavior: returns existing job snapshot
- Scoring: processing worker evaluates skills, generates learning path, result
- XP: result generation later publishes `PLACEMENT_COMPLETED`
- Web consumer: `startPlacementProcessing`
- Mobile suitability: required after test completion

### `GET /placement/tests/:testId/processing`
- Controller/service: `PlacementProcessingController.getSnapshot` -> `PlacementProcessingService.getSnapshot`
- DTO: none
- Auth: `JwtAuthGuard`
- Request: test id
- Response: status, progress, current step, skills, logs, insights, nextUrl
- Mutation effects: none
- Idempotency: read-only
- Resume behavior: polling endpoint
- XP: none
- Web consumer: `getPlacementProcessing`
- Mobile suitability: required polling endpoint

### `POST /placement/tests/:testId/result/generate`
- Controller/service: `PlacementResultController.generate` -> `PlacementResultService.ensureGenerated`
- DTO: none
- Auth: `JwtAuthGuard`
- Request: test id
- Response: result
- Mutation effects: creates/updates PlacementResult, skill rows, phases, priorities, courses; publishes XP; applies user level through settings
- Idempotency: `ensureGenerated` reuses READY result
- Resume behavior: can be called after completed processing
- Scoring: server authoritative
- XP: yes, `PLACEMENT_COMPLETED`
- Web consumer: `generatePlacementResult`
- Mobile suitability: required before result screen

### `GET /placement/tests/:testId/result`
- Controller/service: `PlacementResultController.getResult` -> `PlacementResultService.getResult`
- DTO: none
- Auth: `JwtAuthGuard`
- Request: test id
- Response: overview CEFR/score/confidence, skills, path phases/priorities, recommended courses, actions
- Mutation effects: none
- Idempotency: read-only
- Resume behavior: fetch later by test id
- XP: none
- Web consumer: `getPlacementResult`
- Mobile suitability: primary result endpoint

### `GET /placement/retake/status`
- Controller/service: `PlacementController.getRetakeStatus` -> `PlacementRetakeService.getRetakeStatus`
- DTO: none
- Auth: `JwtAuthGuard`
- Request: none
- Response: state, allowed, current test id, next URL, cooldown data, latest result
- Mutation effects: none
- Idempotency: read-only
- Resume behavior: can point to in-progress/processing/current result
- XP: none
- Web consumer: `getRetakeStatus`
- Mobile suitability: retake eligibility source

### `POST /placement/retake`
- Controller/service: `PlacementController.retake` -> `PlacementRetakeService.retake`
- DTO: `RetakePlacementDto` (`force?`)
- Auth: `JwtAuthGuard`
- Request: optional force
- Response: test id/next URL
- Mutation effects: prepares a new retake according to retake service rules
- Idempotency: mutating; mobile retry disabled
- Resume behavior: should respect retake service state
- XP: none
- Web consumer: `retakePlacement`
- Mobile suitability: only show when backend allows

### `POST /placement/manual`
- Controller/service: `PlacementController.selectManualLevel` -> `PlacementService.selectManualLevel`
- DTO: `SelectManualLevelDto`
- Auth: `JwtAuthGuard`
- Request: CEFR level
- Response: placement id, method, status, level, skill levels, next URL
- Mutation effects: upserts UserPlacement, UserSkillLevel for all skills, User.englishLevel, UserLearningProfile
- Idempotency: upsert, but mutating
- Resume behavior: not applicable
- XP: none
- Web consumer: `selectManualLevel`
- Mobile suitability: supported but not primary

## Learning Path Endpoints

### `GET /learning-path`
- Controller/service: `LearningPathController.getLearningPath` -> `LearningPathService.getLearningPath`
- Auth: `JwtAuthGuard`, `LearningPathAccessGuard`
- Response: placement-generated path when READY result exists; otherwise `DEFAULT_FOUNDATION` per-skill starting lessons
- Mutation effects: none
- Idempotency: read-only
- Current step: `currentLesson`, then available lesson, or default `nextLesson`
- Progress: persisted through `LessonProgress`
- Web consumer: `getLearningPath`
- Mobile suitability: primary path source

### `POST /learning-path/lessons/:lessonId/start`
- Controller/service: `LearningPathController.startLesson` -> `LearningPathService.startLesson`
- Auth: `JwtAuthGuard`, `LearningPathAccessGuard`
- Request: lesson id
- Response: lesson action result and updated path summary
- Mutation effects: upserts incomplete `LessonProgress`
- Idempotency: upsert
- XP: none
- Web consumer: `startLearningPathLesson`
- Mobile suitability: use only for backend path lessons

### `GET /learning-path/lessons/:lessonId/resume`
- Controller/service: `LearningPathController.resumeLesson` -> `LearningPathService.resumeLesson`
- Auth: `JwtAuthGuard`, `LearningPathAccessGuard`
- Response: lesson action result
- Mutation effects: none
- Idempotency: read-only
- Web consumer: `resumeLearningPathLesson`
- Mobile suitability: use for existing path lesson detail

### `POST /learning-path/lessons/:lessonId/complete`
- Controller/service: `LearningPathController.completeLesson` -> `LearningPathService.completeLesson`
- Auth: `JwtAuthGuard`, `LearningPathAccessGuard`
- Response: rewards, updated path summary
- Mutation effects: marks `LessonProgress` complete, awards XP/pet/mission side effects with idempotency key
- Idempotency: guarded by XP idempotency and already-completed handling
- Web consumer: `completeLearningPathLesson`
- Mobile suitability: not exposed in Phase 10 module routing

## Explicit Answers

1. Placement status is loaded from `/placement/introduction`, `/placement/home`, and `/placement/retake/status`.
2. A new test is created through `/placement/session/start`; retakes use `/placement/retake`.
3. Test creation is resume-idempotent for active tests.
4. Resume returns the active `IN_PROGRESS` test and `GET /placement-test/:sessionId` returns the next unanswered question.
5. Current modes are `ADAPTIVE` and `LEVEL_BASED`.
6. `LEVEL_BASED` builds one fixed CEFR-level plan; `ADAPTIVE` builds a multi-level plan. Current repository pre-prepares an ordered question set; mobile still treats server as authoritative.
7. Backend selects questions through `PlacementSessionService.buildQuestionPlan` and `QuestionBankService.ensurePlacementQuestions`; current next question is first unanswered/unskipped by order.
8. The session endpoint returns one current question at a time plus navigator metadata.
9. Session id and question id are required for answer/special-response endpoints.
10. Current question types are `MULTIPLE_CHOICE`, `FILL_BLANK`, `LISTENING`, `READING`, `SPEAKING`, `WRITING`.
11. Objective answers use `/placement-test/:sessionId/answer`; writing/speaking use special endpoints.
12. Backend determines correctness and later AI evaluation.
13. The test ends when all prepared questions are answered or skipped.
14. CEFR is calculated server-side from processing skill scores/result AI service.
15. Objective correctness is synchronous, but final Placement result is asynchronous processing plus result generation.
16. Yes, processing uses `PlacementProcessingJob`.
17. Yes, result can be fetched later with `/placement/tests/:testId/result`.
18. Yes, skill breakdown is available in result and dashboard.
19. Yes, confidence is available in result overview when generated.
20. Yes, retake support exists.
21. Cooldown/eligibility comes from `/placement/retake/status`.
22. Manual level is supported through `/placement/manual`.
23. Placement result generation publishes `PLACEMENT_COMPLETED` XP.
24. Learning Path is loaded from `/learning-path`; Placement result generation stores phases/priorities/courses.
25. It is generated during Placement processing/result generation; default foundation path exists without Placement.
26. Path source states are `PLACEMENT` and `DEFAULT_FOUNDATION`; lessons have `LOCKED`, `AVAILABLE`, `IN_PROGRESS`, `COMPLETED`.
27. Units/steps are phases, recommended courses, and course lessons; default path has per-skill starting lessons.
28. `currentLesson` is first in-progress lesson, then first available lesson.
29. Default foundation can include all six skills; Placement path recommendations are course-based and skill breakdown includes all skills.
30. Progress is persisted through `LessonProgress`.
31. Path source changes when latest READY PlacementResult changes; no mobile recalculation.
32. No casual path reset endpoint was found; retake can produce a new result/path.
33. Dashboard already exposes `learningPath` and current/continue lesson data in existing mobile dashboard APIs.
34. Web renders a Learning Path screen with phases/courses/lessons from `/learning-path`.
