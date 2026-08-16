# Phase 8 Listening API Audit

## Source Files
- Controller: `backend/src/modules/listening/listening.controller.ts`
- Service: `backend/src/modules/listening/listening.service.ts`
- DTOs: `backend/src/modules/listening/dto/start-listening.dto.ts`, `submit-listening-answer.dto.ts`, `rate-listening-session.dto.ts`
- Models: `backend/prisma/schema.prisma` models `ListeningQuestion`, `ListeningSession`, `ListeningSessionAnswer`, `UserListeningProgress`
- Audio generation: `backend/src/modules/listening/listening-tts.service.ts`, `backend/src/modules/listening-job/*`, `backend/src/config/static-assets.config.ts`
- General TTS: `backend/src/modules/tts/tts.controller.ts`, `backend/src/modules/tts/tts.service.ts`
- Redis lock: `backend/src/modules/listening/listening-redis.provider.ts`, `ListeningService.tryAcquireColdStartLock`
- Web: `english-web-build/src/Components/Listening/*`

## Endpoint Audit

### `GET /listening/home`
- Controller: `ListeningController.getHome`
- Service: `ListeningService.getHome`
- Auth: `JwtAuthGuard`
- Request: none
- Response: stats, current level, streak, `continueSession`, `dailyRecommendation`, `recentSessions`
- Side effects: none
- Mobile suitability: primary overview data source

### `GET /listening/history?page=&limit=`
- Controller: `ListeningController.getHistory`
- Service: `ListeningService.getHistory`
- Auth: `JwtAuthGuard`
- Request: page/limit query, max effective limit 50
- Response: paginated completed sessions
- Side effects: none
- Mobile suitability: optional history/recent list; overview currently uses home recent sessions

### `POST /listening/practice/start`
- Controller: `ListeningController.startPractice`
- DTO: `StartListeningDto`
- Service: `ListeningService.startPractice`
- Auth: `JwtAuthGuard`
- Request: `{ level?: A1|A2|B1|B2|C1|C2, topic?: string max 100, limit?: 1..20 }`
- Response: `ListeningPractice` session payload
- Side effects: creates or resumes an active session, creates session answer rows, may enqueue question/audio generation jobs, may run capped cold-start generation
- Mutation behavior: resumes existing `IN_PROGRESS` session for same user/level/topic; unique index handles concurrent create race
- Idempotency: start is resume-safe for same user/level/topic while a session is in progress
- Mobile suitability: used for starting recommended/topic practice and resuming by level/topic from `home.continueSession`

### `GET /listening/practice`
- Controller: `ListeningController.startPracticeLegacy`
- DTO: `StartListeningDto`
- Service: `ListeningService.startPractice`
- Auth: `JwtAuthGuard`
- Request: same fields as query params
- Response/side effects: same as `POST /listening/practice/start`
- Mobile suitability: legacy web compatibility only; mobile uses POST

### `POST /listening/sessions/:sessionId/answer`
- Controller: `ListeningController.submitAnswer`
- DTO: `SubmitListeningAnswerDto`
- Service: `ListeningService.submitAnswer`
- Auth: `JwtAuthGuard`
- Request: `{ questionId, selectedAnswer: A|B|C|D, timeSpent: 0..3600, listenedCount: 0..100 }`
- Response: question id, selected answer, correct answer, correctness, explanation, transcript, progress
- Side effects: updates existing `ListeningSessionAnswer`, recalculates session correct/wrong/skipped
- Mutation behavior: editable only while session is not completed
- Idempotency: per-question update overwrites the same row; not XP-awarding
- Transcript behavior: transcript is returned only after this answer is submitted
- Mobile suitability: used one question at a time; correctness displayed only after backend response

### `POST /listening/sessions/:sessionId/skip`
- Controller: `ListeningController.skipQuestion`
- Service: `ListeningService.skipQuestion`
- Auth: `JwtAuthGuard`
- Request: `{ questionId, timeSpent?, listenedCount? }`
- Response: question id and progress
- Side effects: marks answer skipped and recalculates progress
- Transcript behavior: after reloading the session, skipped questions are considered revealed
- Mobile suitability: used by native skip button

### `POST /listening/sessions/:sessionId/flag`
- Controller: `ListeningController.flagQuestion`
- Service: `ListeningService.flagQuestion`
- Auth: `JwtAuthGuard`
- Request: `{ questionId, isFlagged? }`
- Response: session id, question id, `isFlagged`
- Side effects: toggles review flag; allowed after completion too
- Mobile suitability: not implemented in Phase 8 mobile to keep scope focused

### `POST /listening/sessions/:sessionId/finish`
- Controller: `ListeningController.finishSession`
- Service: `ListeningService.finishSession`
- Auth: `JwtAuthGuard`
- Request: none
- Response: session result summary fields, `alreadyCompleted`, `missionUpdated`, `resultUrl`
- Side effects: marks completed, computes score, awards XP/coins, updates `UserListeningProgress`, updates pet profile, updates missions and learning XP when attempted > 0
- Idempotency: completed sessions return existing result without rewards; concurrent finish uses `updateMany` race guard
- Mobile suitability: final completion action; mutation retry disabled

### `GET /listening/sessions/:sessionId/result`
- Controller: `ListeningController.getResult`
- Service: `ListeningService.getSessionResult`
- Auth: `JwtAuthGuard`
- Request: session id
- Response: summary, completed question review, feedback
- Transcript behavior: completed result includes transcript per question
- Mobile suitability: result/review source

### `POST /listening/sessions/:sessionId/rating`
- Controller: `ListeningController.rateSession`
- DTO: `RateListeningSessionDto`
- Service: `ListeningService.rateSession`
- Auth: `JwtAuthGuard`
- Request: `{ rating: 1..5, comment?: string max 500 }`
- Response: session id, rating, ratedAt, message
- Side effects: updates rating columns for completed sessions only
- Mobile suitability: optional; not implemented in Phase 8

### `POST /listening/sessions/:sessionId/retry`
- Controller: `ListeningController.retrySession`
- Service: `ListeningService.retrySession`
- Auth: `JwtAuthGuard`
- Request: none
- Response: new practice session using previous questions
- Mobile suitability: optional result action; not implemented in Phase 8

### `POST /listening/sessions/:sessionId/continue`
- Controller: `ListeningController.continueSession`
- Service: `ListeningService.continueSession`
- Auth: `JwtAuthGuard`
- Request: none
- Response: new practice session mixing wrong questions and fresh questions
- Mobile suitability: optional result action; not implemented in Phase 8

## Required Questions
1. Listening activities are listed through `GET /listening/home`; backend exposes recommendations, an active session, and recent completed sessions rather than a full static activity catalog.
2. An activity is loaded by starting/resuming practice through `POST /listening/practice/start`; no direct `GET session detail` endpoint exists.
3. A session starts through `POST /listening/practice/start`.
4. The audio URL comes from `ListeningQuestion.audioUrl` in the practice payload.
5. Audio is primarily pre-generated/stored by Listening jobs; cold start can synchronously generate up to 3 questions/audio items under a Redis lock.
6. `/tts/speak` does not participate in Listening practice. Listening uses `ListeningTtsService`, while `/tts/speak` is a separate authenticated pronunciation/general TTS endpoint.
7. Listening audio URL is absolute by default: `BACKEND_PUBLIC_URL + getListeningAudioUrlPrefix() + filename`, served from backend static files.
8. The static Listening audio URL does not require bearer headers in the current implementation.
9. Audio files are generated as MP3.
10. Transcript is gated by backend response shaping.
11. In active practice, transcript/correct answer/explanation are null until the question is answered or skipped; completed result includes transcript.
12. No replay limit is enforced by backend or web.
13. Cold-start synchronous generation has a 60-second Redis lock/cooldown per level/topic. Playback itself has no cooldown.
14. Redis is involved in cold-start fallback locking through `LISTENING_REDIS`, not per-user playback/session state.
15. Current questions are multiple-choice A/B/C/D only.
16. Answers are submitted per question to `/listening/sessions/:sessionId/answer`; finish is separate.
17. Backend grades correctness.
18. XP is awarded on `/finish`, `correct * 3`, only once, and learning XP is published only if at least one question was attempted.
19. Completion is `ListeningSession.status = COMPLETED` after `/finish`.
20. Finish is idempotent/race-safe; answer updates are row overwrites; start is active-session resume-safe.
21. Completed session cannot be edited, but result can be reopened; retry/continue create new sessions.
22. Backend exposes progress through `GET /listening/home`, active practice progress, result, and paginated history.

## Audio Package Decision
- Expo SDK: 57.0.12
- Existing project had no audio dependency.
- Selected package: `expo-audio` `~57.0.3`
- Install command: `npx expo install expo-audio`
- Rationale: Expo SDK 57 documentation lists `expo-audio` as the current Expo-maintained audio library, included in Expo Go, with Android/iOS/Web support, remote sources, status, seek, playback rate, and source headers.
- Not selected: `expo-av`, because Phase 8 requires checking SDK 57 guidance and avoiding deprecated package assumptions.
- App config: plugin set to playback-only with microphone permission and recording disabled.
- Background: disabled for this learning use case; app pauses audio on background.
