# Deep Trace 02 — Learning Path, Speaking Processing, Skill Radar

Pinned source: main@13d40d7a649196e88ddbd9f5aeed5c817af14e4d. Static source audit; no runtime PASS.

## Learning Path completion (positive existing controls)
- Controller POST learning-path/lessons/:lessonId/complete resolves authenticated user and invokes LearningPathService.completeLesson(userId,lessonId).
- learning-path.service.ts lines 449–465: resolvePathLesson(userId,lessonId), reject LOCKED, return alreadyCompleted for completed lessons.
- Lines 467–527: deterministic idempotencyKey `learning:LESSON_COMPLETED:${lesson.id}`; xpService.awardXpWithSideEffects(userId,sourceType LESSON,sourceId lesson.id, key, callback). Callback uses tx.lessonProgress.upsert keyed userId_lessonId (lines 488–507), then mission and pet side effects in same tx callback (509–520).
- Lines 529–538: rewardResult.duplicated controls alreadyCompleted and empty reward summary.
- **Correction to earlier generic risk statement:** idempotency and transaction-aware XP side-effect design **are present**; still must verify XpService transaction implementation, uniqueness constraint, concurrency and failure rollback before marking PASS.
- Web consumer english-web-build/src/lib/learning-path-api.ts calls matching start/resume/complete routes.

## Speaking async processing (positive owner checks, open reliability questions)
- SpeakingProcessingService.uploadAndQueue input includes userId, sessionId, file; speakingSession.findFirst where id=sessionId AND userId=input.userId (lines 28–45), rejects completed session (48–50).
- Saves audio to storage (52), creates SpeakingAnswer (54), SpeakingProcessingJob (74), enqueues BullMQ job with attempts 3 and exponential backoff (89–110). Storage/DB/queue are separate steps; test compensation when queue.add fails.
- getStatus queries processing job with userId/sessionId (121–125); retryProcessing queries latest by both (157–161); getResult speakingSession.findFirst with id+userId (235–239).
- retryProcessing returns existing COMPLETED/active jobs (167–185); failed/stale jobs reset and reenqueue with time-based jobId (191–218). Concurrent retries need atomic claim test; time-based retry ID alone does not guarantee one active job.
- Verify audio file MIME/size/duration validation, private access/retention, and scoring worker result ownership. Web/Expo consumer trace pending.

## Skill Radar (actual scoring algorithm)
- analytics/skill-radar.service.ts: 60-day recent window, 14-day exponential half-life, max 40 samples per skill (lines 9–12); six skills Vocabulary, Grammar, Listening, Speaking, Reading, Writing (14–21).
- For each skill choose recency-weighted average if samples, else lifetime average, else zero/INSUFFICIENT_DATA (91–112). Overall arithmetic mean of six scores (115–122). Weighted average weight 0.5^(ageDays/14) (126–139).
- User-specific Prisma queries for samples; verify score units/ranges, normalization, max sample ordering, missing data semantics, language separation and benchmark calibration.
- Web consumer analytics-api.ts calls /analytics/radar. **Not yet established** that radar scores reflect comparable rubrics across six skills.

## Acceptance tests to implement later (not run here)
1. Lesson completion duplicate/concurrent requests and injected DB failure: exactly one XP ledger transaction, one lesson completion and no duplicate pet/mission rewards.
2. Unauthorized/locked lesson: 401/403, no mutation; ensure paid-course access guard in resolvePathLesson.
3. Speaking upload: outsider sessionId cannot upload/read/retry; queue failure recovery and duplicate retry; audio validation and privacy.
4. Skill Radar: deterministic six-skill fixture with recent/old/missing samples; verify weighting, bounded scores, confidence and language isolation.

Status: source evidence recorded, Technical Blueprint still NOT LOCKED; PR #18 Draft. No schema/UI/application code edits or GitHub Actions.
