# Community API Audit

## Source Files

- Feed/posts/reactions/bookmarks/follows: `backend/src/modules/community/community.controller.ts`, `community.service.ts`
- Feed DTOs: `backend/src/modules/community/dto/get-community-feed.dto.ts`, `create-community-post.dto.ts`, `update-community-post.dto.ts`, `create-community-comment.dto.ts`, `update-community-comment.dto.ts`, `react-community-post.dto.ts`
- Comments/social/clubs/messages: `backend/src/modules/community-social/community-social.controller.ts`, `community-social.service.ts`
- Clubs: `backend/src/modules/community-club/community-club.controller.ts`, `community-club.service.ts`, `community-club.dto.ts`
- Realtime: `backend/src/modules/community/gateway/community.gateway.ts`
- Notifications/jobs: `backend/src/modules/community/community-job.service.ts`, `processors/community.processor.ts`
- Prisma: `backend/prisma/schema.prisma`
- Web client/UI: `english-web-build/src/lib/community-api.ts`, `community-social-api.ts`, `community-socket.ts`, `src/Components/Community/*`

## Feed Endpoints

### `GET /community/feed`
- Controller/service: `CommunityController.getFeed` -> `CommunityService.getFeed`
- DTO: `GetCommunityFeedDto`
- Auth: `JwtAuthGuard`
- Authorization: authenticated user; `FOLLOWING` requires user id and uses follows
- Request: `tab`, `cursor`, `limit`, optional `type`, `search`
- Response: `{ items, nextCursor }`
- Pagination: cursor by post id, `take limit + 1`, max limit 30
- Mutation side effects: none
- Idempotency: read-only
- Realtime relationship: post-created/updated/deleted can affect visible feed
- Web consumer: `getCommunityFeed`
- Mobile suitability: primary feed endpoint

### `GET /community/posts/:postId`
- Controller/service: `CommunityController.getPost` -> `CommunityService.getPost`
- DTO: none
- Auth: `JwtAuthGuard`
- Authorization: owner not required; deleted posts filtered
- Request: `postId`
- Response: mapped post with full content, author, media, counts, my reaction/bookmark, parent comments with replies
- Pagination: none
- Mutation side effects: none
- Idempotency: read-only
- Realtime relationship: post/comment/reaction events can update detail
- Web consumer: card/comments use feed plus comments API
- Mobile suitability: primary post detail endpoint

### `POST /community/posts`
- Controller/service: `CommunityController.createPost` -> `CommunityService.createPost`
- DTO: `CreateCommunityPostDto`
- Auth: `JwtAuthGuard`
- Authorization: authenticated user
- Request: `type`, `content`, optional title/category/level/tags/media/club/visibility
- Response: mapped post
- Pagination: none
- Mutation side effects: creates post, emits `community:post-created`
- Idempotency: not idempotent; mobile retry disabled
- Web consumer: `createCommunityPost`
- Mobile suitability: text post creation supported; media upload deferred

### `PATCH /community/posts/:postId`
- Controller/service: `CommunityController.updatePost` -> `CommunityService.updatePost`
- DTO: `UpdateCommunityPostDto`
- Auth: `JwtAuthGuard`
- Authorization: `assertPostOwner`
- Response: mapped post
- Side effects: sets `isEdited`, emits `community:post-updated`
- Idempotency: mutating
- Mobile suitability: backend supports; edit UI deferred

### `DELETE /community/posts/:postId`
- Controller/service: `CommunityController.deletePost` -> `CommunityService.deletePost`
- Auth: `JwtAuthGuard`
- Authorization: owner only
- Response: `{ success: true }`
- Side effects: soft-deletes post, emits `community:post-deleted`
- Mobile suitability: backend supports; destructive UI deferred

## Reactions, Bookmarks, Comments

### `POST /community/posts/:postId/reactions`
- DTO: `ReactCommunityPostDto`
- Request: `{ type }`
- Response: `{ postId, total, byType, viewerReaction }`
- Side effects: upserts one reaction per user/post, increments count only on first reaction, notification job, score job, `community:reaction-updated`
- Idempotency: upsert by `(postId,userId)` for same type is effectively stable; mobile guards rapid taps and disables retry
- Mobile suitability: implemented as LIKE toggle

### `DELETE /community/posts/:postId/reactions`
- Response: reaction summary
- Side effects: deletes existing reaction if present, decrements count, score job, event
- Idempotency: safe if no existing reaction; mobile retry disabled
- Mobile suitability: implemented

### `POST /community/posts/:postId/bookmark`
- Response: `{ bookmarked: true }`
- Side effects: create bookmark if absent, increment count, recalculate score
- Idempotency: guarded by unique bookmark
- Mobile suitability: implemented

### `DELETE /community/posts/:postId/bookmark`
- Response: `{ bookmarked: false }`
- Side effects: delete if present, decrement count, recalculate score
- Idempotency: safe if absent
- Mobile suitability: implemented

### `GET /community/posts/:postId/comments`
- Controller/service: `CommunitySocialController.getComments` -> `CommunitySocialService.getPostComments`
- Auth: `JwtAuthGuard`
- Response: all parent comments with one level of replies
- Pagination: none
- Side effects: none
- Mobile suitability: implemented with FlatList; no comment pagination exists

### `POST /community/posts/:postId/comments`
- DTO: `CreateCommunityCommentDto`
- Request: `content`, optional `parentId`, optional media
- Response: created comment
- Side effects: increments comments count, emits `community:comment-created`, notification job, score job
- Idempotency: not idempotent; mobile retry disabled and preserves draft on failure
- Mobile suitability: implemented for root comments and one-level replies

### `PATCH /community/comments/:commentId`
- DTO: `UpdateCommunityCommentDto`
- Authorization: owner only
- Side effects: sets edited, emits `community:comment-updated`
- Mobile suitability: backend supports; edit UI deferred

### `DELETE /community/comments/:commentId`
- Authorization: owner only
- Side effects: soft-delete, decrement count, emits `community:comment-deleted`
- Mobile suitability: backend supports; delete UI deferred

## Clubs, Social, Realtime

- Clubs endpoints exist under `/community/clubs`; roles include `OWNER`, `ADMIN`, `MODERATOR`, `MEMBER`.
- Feed posts can contain `clubId`, but mapped feed cards do not include club detail today.
- Socket.IO namespace is `/community`, events include `community:post-created`, `community:post-updated`, `community:post-deleted`, `community:comment-created`, `community:comment-updated`, `community:comment-deleted`, `community:reaction-updated`, `community:notification`, messaging and club events.
- Socket auth currently parses `access_token` from cookies only. Mobile uses Bearer auth, no existing mobile socket service exists, and `socket.io-client` is not installed in mobile. HTTP Community remains fully functional; realtime is documented as unsupported for Phase 11 without a backend socket auth contract change.
- Notifications are emitted backend-side for comments, reactions, follows, friends, and messages through `NotificationsService` and community jobs.

## Explicit Answers

1. Feed modes: `FOR_YOU`, `FOLLOWING`, `LATEST`, `POPULAR`.
2. `POPULAR` orders by `score desc`, then `createdAt desc`; score is recalculated from reactions/comments/bookmarks.
3. `FOLLOWING` filters posts by authors followed by the current user.
4. Yes: `LATEST` and default `FOR_YOU` are latest-style feeds today.
5. Pagination is cursor-based by post id.
6. Feed cards return author, title/content, type/category/level/tags/media, counts, viewer reaction, bookmark state, recent comments.
7. Post detail is loaded with `GET /community/posts/:postId`.
8. Media DTO supports `IMAGE`, `AUDIO`, `VIDEO`, `DOCUMENT`; mobile displays images and labels unsupported media.
9. Yes, authenticated users can create posts.
10. Yes, owners can edit/delete posts server-side.
11. Reactions use one reaction per user/post with enum types; mobile uses `LIKE`.
12. Setting reaction is upsert-based and removing is safe if absent.
13. Yes, bookmarks exist.
14. Comments are listed through `GET /community/posts/:postId/comments`.
15. Comments are created through `POST /community/posts/:postId/comments`.
16. One level of replies is supported; reply-to-reply is rejected.
17. Comments are editable/deletable by owner.
18. Clubs are part of Community and posts may belong to clubs, but feed mapping does not expose club details.
19. Club roles: `OWNER`, `ADMIN`, `MODERATOR`, `MEMBER`.
20. Post moderation/status fields include `PUBLISHED`, `HIDDEN`, `DELETED`, `FLAGGED`, plus `deletedAt`; feed filters published and non-deleted.
21. Socket.IO events are listed above.
22. Yes, comment/reaction/follow/social actions emit notifications.
23. Web prepends/updates/removes posts in local component state for socket post events; comments are reloaded/merged in component state.
24. Published/deleted filtering is server-side; authorization remains server-owned.
