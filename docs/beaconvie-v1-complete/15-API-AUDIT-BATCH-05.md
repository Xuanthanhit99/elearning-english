# API Audit Batch 05 — Remaining 21 Controllers

Source: main@13d40d7a649196e88ddbd9f5aeed5c817af14e4d. All remaining 21 controller files inspected at route-declaration level. Controller-relative paths; method-level effective guards, DTO validation, service ownership and Web/Expo consumers remain to be verified.

| Controller (prefix) | Method/path declarations | DTOs / service / guards |
|---|---|---|
| analytics (root) | GET analytics/overview,analytics/skills,analytics/skills/:skill,analytics/activity,analytics/metrics,analytics/timeline,analytics/radar,analytics/weaknesses,analytics/coach,reports/weekly,reports/monthly,reports/range | AnalyticsQueryDto,ReportQueryDto,TimelineQueryDto; AnalyticsService,SkillRadarService,WeaknessDetectionService,AiCoachService; JWT, Throttler |
| gemini (gemini) | No GET/POST/PATCH/DELETE route decorators detected | inspect source for nonstandard routes and module registration |
| speaking-processing (speaking) | POST sessions/:sessionId/upload, sessions/:sessionId/retry-processing; GET sessions/:sessionId/status,sessions/:sessionId/result | CreateSpeakingUploadDto; SpeakingProcessingService; JWT |
| speaking-practice (speaking-practice) | GET sessions/:sessionId; POST sessions/:sessionId/transcribe,evaluate,finish-practice | EvaluateSpeakingDto,TranscribeSpeakingDto; SpeakingService; JWT |
| listening-job (admin/listening-jobs) | POST generate,backfill-audio | ListeningJobService,ListeningAudioBackfillService; JWT, RolesGuard |
| tts (tts) | POST speak | SynthesizeSpeechDto; TtsService; JWT |
| chat-session (chat-session) | POST message,sessions; GET sessions/:id/messages,pet | CreateMessageDto; ChatSessionService,GeminiChatService; JWT, Throttler |
| certificates (certificates) | POST courses/:courseId/generate; GET my,:code | CertificatesService; JWT |
| coupons (coupons) | POST root; GET root | CreateCouponDto; CouponsService; JWT, RolesGuard |
| course-landing (courses/:courseId/landing) | PATCH root; GET root | CreateCourseLandingDto; CourseLandingService; JWT, RolesGuard |
| course-pages (courses/:courseId/page) | GET root; PATCH root | UpdateCoursePageDto; CoursePagesService; JWT, RolesGuard |
| dashboard (dashboard) | GET root | DashboardService; JWT |
| lesson-builder (lesson-builder) | POST outline,projects/:projectId/confirm-outline,projects/:projectId/generate-content; GET projects,projects/:projectId,courses/:courseId; PATCH projects/:projectId/outline | CreateLessonBuilderOutlineDto,UpdateBuilderOutlineDto,GenerateBuilderContentDto; LessonBuilderService; JWT |
| notifications (notifications) | GET root,unread-count; POST read,read-all; PATCH :id/archive,:id/read,read-all; DELETE :id | NotificationsService; JWT |
| reviews (reviews) | POST courses/:courseId; GET courses/:courseId | CreateReviewDto; ReviewsService; JWT |
| search (root) | GET search,search/suggestions,discovery,recommendations | SearchQueryDto,SearchSuggestionQueryDto; SearchService; JWT |
| sections (root) | POST courses/:courseId/sections; PATCH sections/:id; DELETE sections/:id | CreateSectionDto,UpdateSectionDto; SectionsService; JWT, RolesGuard |
| settings (settings) | GET root,learning,ai,speaking,notifications,community,appearance,privacy,devices,learning-dna,export; PATCH root,notifications; POST reset-section,learning-dna/recalculate; DELETE devices/:sessionId,devices | UpdateSettingsDto,UpdateNotificationSettingsDto,ResetSettingsSectionDto; SettingsService,SettingsQueryService,SettingsCommandService,LearningDnaService; JWT |
| study-room (study-rooms) | GET root,mine,:roomId,:roomId/history; POST root,:roomId/join,join-by-code,:roomId/start,:roomId/end,:roomId/members/:memberUserId/kick,ban,mute,unmute; DELETE :roomId/leave | CreateStudyRoomDto,ListStudyRoomsDto,JoinStudyRoomByCodeDto; StudyRoomService; JWT, Throttler |
| upload (upload) | POST image,video | UploadService; JWT, RolesGuard |
| words (words) | POST check; GET history | CheckWordDto; WordsService; OptionalJWT+Throttler, JWT |

## High-priority acceptance gates
1. AI Scoring: rubric and score provenance, calibrated against fixed evaluation dataset, retries/fallbacks, abuse and cost limits; isolate users and languages.
2. Speaking processing and TTS: ownership for sessionId, media validation, signed upload/access, asynchronous job idempotency, privacy and retention.
3. Payments: verify order ownership, trusted server callback, amount/currency, atomic idempotent entitlement, refund and historical compatibility before Premium/Affiliate.
4. Mobile: live API routes, auth refresh, recording permissions, background resume, language-scoped progress and store billing compliance.
5. Study rooms/settings/notifications: ownership and membership, permission boundaries, device revocation and personal data export.
6. Admin jobs/coupons/lesson builder: RBAC, teacher ownership, queue safety, quotas and duplicate generation.
7. Map DTO schemas and method-level guards, trace Web/Expo consumers, execute local 401/403/owner/outsider and exact-head integration tests.

**Inventory milestone:** 74/74 backend controller files inspected for route declarations across batches 01–05 and initial 8 controllers. **Not complete:** service-level authorization, DTO validation, client-consumer matrix, global prefix verification, production runtime and QA. No Technical Blueprint LOCK or release approval.
