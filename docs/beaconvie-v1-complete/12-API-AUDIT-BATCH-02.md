# API Audit Batch 02 — Placement, Grammar, Vocabulary, Quizzes, Progress

Source main@13d40d7a649196e88ddbd9f5aeed5c817af14e4d. Controller-level static evidence only. 12 controller files, 100 route declarations (including 46 Vocabulary routes). Guards/DTOs below are observed references, not endpoint-by-endpoint authorization proof. Global API prefix and actual runtime contracts need verification.

| Controller (prefix) | Routes | DTO references | Guard / service / ownership evidence |
|---|---|---|---|
| grammar (grammar) | GET dashboard,categories,categories/:categorySlug/detail,topics,topics/:topicId/lessons,lessons/:lessonId,topics/:topicId/detail,lessons/:lessonId/learning; POST lessons/:lessonId/submit,start,complete,note | ReportGrammarQuestionDto,SubmitGrammarAnswerDto | JwtAuthGuard, CurrentUser, GrammarService |
| placement-dashboard (placement) | GET dashboard,history,tests/:testId/compare | none found | JwtAuthGuard, PlacementDashboardService, req.user.id |
| placement-processing (placement/tests) | POST :testId/processing/start; GET :testId/processing, :testId/processing/events | none found | JwtAuthGuard, PlacementProcessingService, user ID passed |
| placement-result (placement/tests) | POST :testId/result/generate; GET :testId/result | none found | JwtAuthGuard, PlacementResultService |
| placement-tests (placement-tests) | POST submit,generate; GET history | SubmitPlacementTestDto,GeneratePlacementTestDto | JwtAuthGuard, ThrottlerGuard, PlacementTestsService, req.user.id |
| placement-response (placement/tests) | POST :sessionId/speaking, :sessionId/speaking/skip, :sessionId/writing | SubmitPlacementWritingDto,SubmitPlacementSpeakingDto,SkipPlacementSpeakingDto | JwtAuthGuard, PlacementResponseService, user ID passed |
| placement-session (placement/session) | POST start,retake,:testId/abandon; GET active | RetakePlacementSessionDto,StartPlacementSessionDto | JwtAuthGuard, PlacementSessionService, user ID from id/userId/sub |
| placement-test (placement-test) | GET :sessionId; POST :sessionId/answer,flag,skip | AnswerPlacementQuestionDto,FlagPlacementQuestionDto,SkipPlacementQuestionDto | JwtAuthGuard, PlacementTestService, req.user.id |
| placement (placement) | GET home,introduction,retake/status; POST retake,manual,start | SelectManualLevelDto,StartPlacementTestDto,RetakePlacementDto | JwtAuthGuard, PlacementService, PlacementRetakeService |
| progress (progress) | GET root,skills,skills/:skill,in-progress,history,activities/:activityId,courses/:courseId; POST lessons/:lessonId/complete | ProgressHistoryQueryDto | JwtAuthGuard, ProgressService, req.user.id |
| quizzes (root) | POST lessons/:lessonId/quizzes,quizzes/submit; GET lessons/:lessonId/quizzes,lessons/:lessonId/quiz-result | CreateQuizDto,SubmitQuizDto | JwtAuthGuard, RolesGuard for teacher/admin create, QuizzesService |
| vocabulary (vocabulary) | GET topics,profile,overview,overview/skills,overview/skills/activities,overview/achievements,overview/achievements/:key,overview/achievements/:key/activity,today,weekly-plan,search,random,words/:wordId/detail,words/:wordId/relations,daily/:dayId/words,daily/:dayId/words/:wordId/navigation,notebook,words/:wordId/flashcard,daily/:dayId/flashcards,me/history,weekly-test,weekly-test/review,review,review/dashboard,review/suggestions,me/stats,challenge/today,review/session; PATCH profile; DELETE words/:wordId/notebook; POST words/:wordId/progress,words/:wordId/notebook,flashcards/review,flashcards/:wordId/review,daily/:dayId/complete,daily/:dayId/extra,topics,words,generate-words,weekly-test/start,weekly-test/submit,weekly-test/retry,challenge/:challengeId/submit,words/:wordId/share,review/submit,review/session | CreateWordDto,CreateTopicDto,UpdateLearningProfileDto,SubmitWeeklyTestDto,SubmitReviewDto,UpdateWordProgressDto,SubmitReviewSessionDto | JwtAuthGuard, RolesGuard for selected methods, VocabularyService, AchievementsService, CurrentUser |

## Risk checks before acceptance
1. Placement: session owner isolation, retake restrictions, speaking/writing async processing, SSE access, result generation idempotency and CEFR calibration.
2. Vocabulary: daily completion XP uniqueness, word progress/flashcard concurrency, notebook access and AI generation limits; teacher/admin authorization on mutations.
3. Grammar and Quizzes: answer/submit correctness, retry abuse, access to paid lessons, teacher ownership of question creation.
4. Progress: user scoping, double-complete rewards and reconciliation with learning-path and skills.
5. All: verify DTO runtime validation, service ownership, frontend/Expo consumers, 401/403 and exact route prefix.

Audit coverage: 28 of 74 controllers route declarations inspected; 46 controllers remain. This document does not certify functional QA or security.
