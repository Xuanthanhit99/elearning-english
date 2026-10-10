# API Audit Batch 03 — Community and Documents

Source: main@13d40d7a649196e88ddbd9f5aeed5c817af14e4d. 10 controllers, 110 route declarations. Static controller-level audit only; runtime, exact global prefix, per-route guards, service ownership and consumer tracing remain pending.

| Controller | Prefix | Route inventory (HTTP method + controller-relative path) | DTO and service evidence |
|---|---|---|---|
| community | community | GET feed,posts/:postId,bookmarks; POST posts,posts/:postId/comments,posts/:postId/reactions,posts/:postId/bookmark,users/:userId/follow; PATCH posts/:postId,comments/:commentId; DELETE posts/:postId,comments/:commentId,posts/:postId/reactions,posts/:postId/bookmark,users/:userId/follow | CreateCommunityPostDto,CreateCommunityCommentDto,GetCommunityFeedDto,ReactCommunityPostDto,UpdateCommunityPostDto,UpdateCommunityCommentDto; CommunityService; JwtAuthGuard |
| community-club | community | POST follows/:userId,clubs,clubs/:clubId/join,clubs/:clubId/posts,clubs/:clubId/messages,clubs/:clubId/events,clubs/:clubId/events/:eventId/attend,clubs/:clubId/resources; DELETE follows/:userId,clubs/:clubId/leave,clubs/:clubId/members/:memberId; PATCH clubs/:clubId/members/:memberId; GET follows/following,follows/followers,clubs/:clubId,clubs/:clubId/members,clubs/:clubId/posts,clubs/:clubId/messages,clubs/:clubId/events,clubs/:clubId/resources | CreateClubDto,CreateClubEventDto,CreateClubMessageDto,CreateClubPostDto,CreateClubResourceDto,UpdateClubMemberDto; CommunityClubService; JwtAuthGuard |
| community-club-permission | community | GET clubs/:clubId/management; POST clubs/:clubId/join-request,clubs/:clubId/invites; PATCH clubs/:clubId/join-requests/:requestId/approve,clubs/:clubId/join-requests/:requestId/reject,club-invites/:inviteId/accept,club-invites/:inviteId/reject,clubs/:clubId/transfer-ownership,clubs/:clubId/members/:memberId/role; DELETE clubs/:clubId/members/:memberId/kick,clubs/:clubId/leave-safe,clubs/:clubId/delete-safe | InviteClubMemberDto,RequestJoinClubDto,TransferClubOwnershipDto,UpdateClubMemberRoleDto; CommunityClubPermissionService; JwtAuthGuard |
| community-social | community | GET posts/:postId/comments,users/search,friends,friend-requests,clubs,challenges,leaderboard,conversations,conversations/:conversationId/messages; POST friends/requests/:userId,challenges,challenges/:challengeId/join,conversations/direct/:userId,conversations/:conversationId/messages; PATCH friends/requests/:requestId/accept,reject,cancel; PATCH challenges/:challengeId/progress; DELETE friends/:friendId | CreateCommunityChallengeDto,SendCommunityMessageDto,UpdateChallengeProgressDto; CommunitySocialService; JwtAuthGuard |
| community-upload | community | POST uploads | CreateCommunityMediaDto; JwtAuthGuard; service dependency not confirmed |
| documents | documents | GET root,:id/related,:slug; POST :id/view,:id/download,:id/bookmark,:id/rating,:id/report; DELETE :id/bookmark | DocumentListQueryDto,RateDocumentDto,ReportDocumentDto; DocumentsService,DocumentInteractionsService; OptionalJwtGuard/JwtAuthGuard |
| my-documents | documents/me | GET upload-access,root,bookmarks,:id; PATCH :id; DELETE :id | UpdateMyDocumentDto; MyDocumentsService,DocumentInteractionsService,CommunityDocumentUploadAccessService; JwtAuthGuard |
| document-upload | documents/uploads | POST root,:documentId/resubmit,:documentId/create-revision | CreateDocumentUploadDto; DocumentUploadService; JwtAuthGuard + CommunityDocumentUploadGuard |
| admin-documents | admin/documents | GET root,:id,:id/versions/:versionId/review-download; POST root,:id/approve,:id/reject,:id/request-changes,:id/publish,:id/unpublish,:id/hide,:id/remove,:id/restore,:id/retry,:id/rollback/:versionId,reports/:reportId/resolve; PATCH :id | AdminApproveDocumentDto,AdminCreateOfficialDocumentDto,AdminRejectDocumentDto,AdminRequestChangesDto,AdminResolveReportDto,AdminUpdateDocumentDto; AdminDocumentsService; JwtAuthGuard + RolesGuard |
| admin-generation | admin/documents | POST generate,generations/:id/cancel,generations/:id/retry,generations/:id/retry-section/:sectionKey; GET generations,generations/:id | CreateDocumentGenerationDto; DocumentGenerationService; JwtAuthGuard + RolesGuard |

## Acceptance gaps
- Club join/invite/ownership transfer, moderation, direct messages and member-role mutations must reject outsiders and enforce server-side ownership.
- Uploads need file validation, quota, content moderation, copyright and abuse controls; resource access must respect visibility and subscription.
- Admin review/download/rollback/retry must be role-scoped and audited; repeated publish/retry must be idempotent.
- Verify DTO validators, exact handler guards, services and web/mobile consumers, then 401/403, owner/member/outsider, concurrent mutation and upload tests.
- No claim of DONE/BROKEN without runtime evidence.

Progress: 38/74 controller declarations inspected, 36 remaining. No GitHub Actions, schema or application UI changes.
