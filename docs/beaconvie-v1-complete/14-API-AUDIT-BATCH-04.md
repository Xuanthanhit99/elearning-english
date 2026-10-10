# API Audit Batch 04 — Admin and Gamification

Source main@13d40d7a649196e88ddbd9f5aeed5c817af14e4d. 15 controllers, 100+ route declarations. Controller-level static inspection; do not infer runtime security from decorators alone.

| Controller (prefix) | HTTP route declarations | DTOs / guards / service references |
|---|---|---|
| admin-dashboard (admin-dashboard) | GET root,revenue,users,users/:id,content,moderation/posts,moderation/clubs,gamification/:kind,audit-logs,operations,operations/queues,operations/health,operations/feature-flags,operations/bullmq-queues,operations/ai-usage,operations/queues/:queueName/failed; PATCH users/:id/action,content/:type/:id/status,moderation/posts/:id,moderation/clubs/:id,gamification/:kind/:id/toggle,operations/feature-flags/:key; POST operations/queues/:queueName/jobs/:jobId/retry,operations/queues/:queueName/jobs/:jobId/remove,operations/queues/:queueName/pause,operations/queues/:queueName/resume | AdminContentStatusDto,AdminFeatureFlagDto,AdminGamificationToggleDto,AdminListQueryDto,AdminModerationActionDto,AdminUserActionDto; JwtAuthGuard+RolesGuard; AdminDashboardService |
| teacher-dashboard (teacher-dashboard) | GET revenue | JwtAuthGuard+RolesGuard; TeacherDashboardService |
| feature-flags (feature-flags) | GET root | JwtAuthGuard; FeatureFlagsService |
| achievements (achievements) | GET root,overview,history,:code; POST :code/claim | AchievementQueryDto; JwtAuthGuard; AchievementsService |
| arena (arena) | GET me,lobby,rating/history,season/current,admin/operations,rooms/:roomId; POST admin/reconciliation/run,admin/season-lifecycle/run,rooms,rooms/:roomId/join,queue,queue/leave,rooms/:roomId/start,ready,leave,retry,events,rooms/:roomId/questions/:questionId/answer,rooms/:roomId/finish | CreateArenaRoomDto,FinishArenaMatchDto,JoinArenaRoomDto,QueueArenaDto,CreateArenaEventDto,SubmitArenaAnswerDto,SetArenaReadyDto; JwtAuthGuard/RolesGuard; ArenaService,ArenaRateLimiterService |
| leaderboard (leaderboards) | GET me,weekly,monthly,friends,clubs/:clubId,skills/:skill,history,rewards; POST rewards/:assignmentId/claim; PATCH privacy | LeaderboardQueryDto; JwtAuthGuard; LeaderboardService |
| leaderboard-admin (admin/leaderboards) | GET seasons,xp-transactions; POST xp-adjustments,seed-rewards | AdminAdjustXpDto; JwtAuthGuard+RolesGuard; PrismaService,XpService |
| leaderboard-maintenance (admin/leaderboard/maintenance) | POST bootstrap,assign-missing-users,recover-stuck-seasons,expire-rewards | JwtAuthGuard+RolesGuard; LeaderboardBootstrapService,LeaderboardRewardService |
| leaderboard-phase3-admin (admin/leaderboard/phase-3) | POST close-expired-week | JwtAuthGuard+RolesGuard; LeaderboardWeeklyCloseService |
| leaderboard-reward (leaderboard/rewards) | GET root; POST :id/claim | JwtAuthGuard; LeaderboardRewardService |
| social-leaderboard (leaderboards/social) | GET friends,my-clubs,clubs/:clubId,activity/friends,activity/clubs/:clubId,challenges/me; POST challenges,challenges/:challengeId/accept | JwtAuthGuard; SocialLeaderboardService |
| pets (pets) | GET me; POST me,lessons/:lessonId/reward; PATCH me/care | UpsertPetDto,CarePetDto; JwtAuthGuard; PetsService |
| wallet (root) | GET teacher-wallet,teacher-wallet/withdraws,admin-wallet/withdraws; POST teacher-wallet/withdraw; PATCH admin-wallet/withdraws/:id/approve,reject,paid | CreateWithdrawDto; JwtAuthGuard+RolesGuard; WalletService |
| missions (missions) | GET me; PATCH :id/claim; POST root | JwtAuthGuard/RolesGuard; MissionsService |
| missions-v2 (missions-v2) | GET me; POST progress,:missionId/claim | ProgressMissionV2Dto; JwtAuthGuard; MissionV2ProgressService,MissionV2QueryService,MissionV2RewardService |

## Priority acceptance gaps
- Admin operations endpoints must enforce admin-only RBAC, audit logs, and protect queue retries/removals and feature flag mutation.
- Wallet withdrawals: teacher ownership, amount/currency validation, state machine, payout proof, concurrent approvals and audit.
- XP/rewards/mission claims: uniqueness, double-claim prevention, reconciliation and idempotent settlement.
- Arena: anti-cheat, replay/retry, rate limiting, room member isolation and event ordering.
- Club/friend leaderboards: privacy, membership, tenant isolation and moderation.
- Map exact per-method guards and DTO validators; inspect service authorization and Web/Expo consumers before marking DONE.

Progress: 53/74 controller files inspected for route declarations; 21 remain. No production QA or Technical Blueprint LOCK.
