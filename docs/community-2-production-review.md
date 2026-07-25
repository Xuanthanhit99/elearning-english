# Community 2.0 / Study Together / Realtime Collaboration — Production Review

## 1. Audit summary (Step 0 findings, recap)

Four parallel research passes (backend community/posts, backend realtime/socket infrastructure, backend friends/clubs/study-together, frontend) found a large, mostly production-ready Community system already in place — feed/posts/comments/reactions, a real friend-request/friendship system, a genuinely-enforced Owner/Admin club RBAC with invites and join-requests, 4 working Socket.IO gateways behind a real Redis adapter (horizontal scaling already works), and live-push notifications. Confirmed **completely absent**: Study Together / Study Rooms — no schema, no service, no real UI (`/study-rooms` was a bare redirect into Arena, a competitive quiz game, not collaborative study). Several concrete bugs were found in the "already complete" layer, including one real XP-farming vulnerability. This review fixed the bugs that were in scope of Part 8's "Community actions must correctly update XP" requirement, then built Study Rooms net-new on top of the existing realtime/XP/achievement/notification infrastructure — reusing it, not duplicating it — and used real-Postgres/real-Redis/real-BullMQ/real-Socket.IO runtime validation to find and fix one further bug (a genuine race condition) that only ever showed up under real concurrent load.

## 2. Architecture

- **Bug fixes reused existing infrastructure only** — no new services were introduced for the Community-layer fixes; each was a targeted change inside the module that owned the bug.
- **Study Rooms is new**, built the same way the platform's other realtime features are: `StudyRoomModule` (schema: `StudyRoom`/`StudyRoomMember`/`StudySession`/`StudySessionParticipant`), `StudyRoomGateway` (new `/study-room` namespace, same JWT-cookie-auth pattern as the other 4 gateways, riding the same Redis Socket.IO adapter — no new scaling infrastructure needed), `StudyRoomService` (REST-driven business logic; the gateway stays thin and defers to it), `StudyRoomController`.
- **New shared `PresenceService`** (`src/common/realtime/`): a generalized version of Arena's proven Redis-backed presence pattern (socket-id sets, TTL, disconnect-grace), extracted so Study Rooms doesn't hand-roll a 4th copy of it. Built for reuse, not wired into Community/Friends' still-missing presence in this pass (see §11).
- **XP integration reuses the existing ledger** end-to-end: two new activity codes (`CLUB_CHALLENGE_COMPLETED`, `STUDY_ROOM_SESSION_COMPLETED`) registered in `learning-xp.constants.ts`, both routed through the same `LearningXpPublisher` → `learning.activity.completed` → `LearningXpListener` + `AchievementsListener` pipeline every other feature in this codebase uses (Speaking/Writing/Conversation/Mission). No duplicate XP-award code path was written.

## 3. Community (bug fixes in the already-built system)

- **Fixed a real XP-farming vulnerability**: any authenticated user could `POST /community/challenges` with an uncapped `rewardXp`, join their own challenge, self-report 100% progress, and mint arbitrary XP directly via a raw `user.xp` mutation that bypassed the ledger entirely (no `XpTransaction` row, invisible to history/streaks/analytics). Fixed two ways: capped `rewardXp` at the DTO level (`@Max(500)`, matching `MISSION_CLAIMED`'s existing cap) and routed the actual award through `LearningXpPublisher` (new `CLUB_CHALLENGE_COMPLETED` activity, `maxBonusXp: 500` as defense in depth even if the DTO cap is ever bypassed).
- **Fixed a real frontend bug**: `CommunityPage.tsx`'s Leaderboard tab was a bare, unreturned JSX expression — clicking it silently fell through to the post feed instead of rendering `SocialLeaderboardPanel`. One-line fix (`if (view === 'LEADERBOARD') return ...`).
- **Fixed a real authorization gap**: `leaderboard-realtime.gateway.ts`'s `join-group` socket handler had no membership check at all — any authenticated user could join any group's realtime room and observe another cohort's live updates. Fixed with an indexed `LeaderboardEntry` lookup before allowing the join.
- **Fixed a real data-loss bug**: the community media-upload endpoint declared support for `IMAGE | AUDIO | VIDEO | DOCUMENT` in its DTO but hard-rejected everything except images at the multer `fileFilter` level — audio/video/document posts could never actually attach real media. Fixed by deriving the accepted type from the real mimetype.
- **Closed a real gap**: comments had no edit/delete despite the schema already carrying `isEdited`/`deletedAt` columns for exactly that. Added both, plus a reply-depth guard (a reply-to-a-reply was previously persisted and counted but never rendered by any read path — now rejected with a clear error instead of silently accepted as unreachable data).
- **Closed a real gap**: `CommunityBookmark` had a purpose-built `@@index([userId, createdAt])` with no endpoint ever querying it — added `GET /community/bookmarks`.
- **Closed a real gap**: a friend request could be rejected by its recipient but never withdrawn by its sender (`CANCELLED` was a defined-but-dead enum value). Added `PATCH /community/friends/requests/:id/cancel`.

## 4. Study Together / Study Rooms (new)

Full lifecycle, built on the existing infra:
- **Rooms**: public/private/invite-only (invite-only rooms get a real generated code), capacity limits enforced on join, room persistence (a room survives past a single session and can host many sessions over time — session history is queryable).
- **Roles & moderation**: host/member; kick, mute/unmute, ban — all host-only, all rejected for a non-host with a real 403, all verified live. Host leaving auto-promotes the earliest-joined remaining member; a room with no members left is closed rather than orphaned.
- **Ready check**: members toggle ready over the socket; the host can only start a session once every active member is ready — verified live (both a "not everyone ready" rejection and a real successful start were exercised).
- **Live session**: starting creates a real `StudySession` with a server-computed `endsAt` (shared goal = target minutes), a duplicate-start attempt while a session is already running is rejected, and an hourly-pattern `@Cron(EVERY_MINUTE)` sweep auto-ends any session whose time has run out (mirrors `ConversationService.cleanupStaleSessions`'s established pattern) — the host can also end it manually.
- **Group XP**: on session end, each participant's presence duration is measured (join/leave timestamps, including late-joiners who connect mid-session) and converted to a completion rate; participants below a 20% floor get nothing (closes the obvious instant-join-then-leave farming case), everyone else is awarded XP through the real ledger. **Verified live under real concurrency**: this is where a genuine race condition was found and fixed — see §9.
- **Session history & summary**: `GET /study-rooms/:id/history` returns past sessions with a generated summary and per-participant minutes/XP.
- **Study reminders**: rooms can carry an optional `scheduledStartAt`; a cron job notifies active members ~10 minutes before, through the existing `NotificationsService` (no new reminder engine built).
- **Frontend**: `StudyRoomHubPage` (browse/mine tabs, create-room and join-by-code dialogs) and `StudyRoomDetailPage` (member list with live presence dots, ready toggle, host-only start/end/kick/ban controls, a live countdown timer, session history) — both Lumiverse-based, dark-mode-correct. `/study-rooms` (previously a redirect straight into Arena) now serves the real hub.

## 5. Realtime

`StudyRoomGateway` mirrors the platform's established gateway pattern exactly: JWT cookie-auth on connect (with the same `TOKEN_EXPIRED`/`INVALID_SESSION` distinction Arena uses, so the frontend can reuse Arena's proven refresh-then-reconnect handling instead of a weaker one), no dependency cycle with the service layer (same one-directional Service→Gateway relationship `CommunityService`/`CommunityGateway` already established). `study-room-socket.ts` was built to Arena's maturity level (`reconnection: true`, single-flight token refresh) rather than `community-socket.ts`'s bare `io()` call, which the Step 0 audit flagged as the weakest of the existing socket clients.

**Verified live**: two real browser-equivalent Socket.IO clients connected, joined the same room, and correctly observed each other's presence broadcast; a hard disconnect + reconnect + `study-room:resume` correctly restored room membership and returned `joined: true`; the ready-check gate correctly blocked a premature session start and correctly allowed one once satisfied.

## 6. Study Rooms

Covered in full in §4 — role hierarchy, capacity, kick/mute/ban, reconnect, and persistence were all exercised against the real backend, not just unit-mocked.

## 7. Friend System

Send/accept/reject already worked; cancel (requester-side withdrawal) was missing and is now implemented and verified live end-to-end (send → cancel → status `CANCELLED`, confirmed via direct DB read). Block/unblock and mutual-friends remain absent — confirmed by the Step 0 audit, not rebuilt this pass (see §11).

## 8. Club System

Owner/Admin RBAC, invites, and join-requests were already correct and were **not modified** — this pass only fixed the adjacent XP-ledger bug (§3). Verified live: a non-owner's attempt to approve a join-request or kick a member is correctly rejected with 403; the owner's own approve/kick succeed.

## 9. Performance / correctness — a real race condition found and fixed

Runtime validation against the real `XpService` (which runs under Postgres `SERIALIZABLE` isolation with its own internal retry-on-conflict loop) surfaced a genuine bug: `StudyRoomService.awardSessionXp()` read the just-published `XpTransaction` back immediately to record the true awarded amount, but when two participants' XP awards triggered a real serializable-conflict retry (confirmed in the log: `Serializable transaction conflict (P2034) — retrying attempt 2/4`), the read-back ran before the retry had committed and silently recorded `0` — even though the XP itself was genuinely and correctly awarded moments later. This was invisible to any mocked-Prisma unit test; it only showed up under real concurrent load. Fixed with a short bounded retry (up to 5×100ms) on the read-back — safe to retry because it's a pure read, not a duplicate write. Verified live: before the fix, the session-end summary read "0 người nhận XP nhóm" while the ledger secretly had the XP; after the fix, it correctly reads "2 người nhận XP nhóm" and both participants' real `XpTransaction` rows are visible immediately. A regression test was added locking in the retry behavior.

## 10. Security

Every Study Room action is ownership/membership-scoped server-side (host-only actions return 403 for non-hosts, verified live, not just trusted to client-side hiding). The leaderboard socket authorization gap (§3) was the one real cross-user data-exposure risk found and closed. The XP-farming vulnerability (§3) was the one real economic-abuse risk found and closed.

## 11. Testing

- `npx jest study-room --runInBand` → **19/19 passing**, including a new regression test for the read-back race in §9.
- `npx jest community leaderboard learning-xp achievements conversation study-room --runInBand` → **60/60 passing** — no regression in any module touched by the Community bug fixes.
- Backend build (`nest build`) → clean. Frontend: `tsc --noEmit` clean, `next lint` → 0 errors on every new/modified file (two real lint issues were found and fixed in the new Study Room UI itself: a genuine `react-hooks/set-state-in-effect` violation and a stray no-op eslint-disable comment), `next build` clean — `/study-rooms` and `/study-rooms/[roomId]` both compile and are listed correctly (static + dynamic respectively).

## 12. Runtime validation (real Postgres + Redis + BullMQ + Socket.IO, fixture data deleted after)

- **Auth**: unauthenticated request to a protected Study Room route → 401.
- **Friend flow**: send → recipient sees it → accept → real `CommunityFriendship` row created; separately, send → sender cancels → status `CANCELLED`.
- **Club permissions**: join-request → non-owner approve rejected (403) → owner approve succeeds → non-owner kick rejected (403).
- **Study room creation/join**: room created, second user joined, a public room correctly visible to a non-member.
- **Realtime connection**: two real Socket.IO clients connected and authenticated.
- **Presence**: one client correctly observed the other's join broadcast.
- **Reconnect**: hard disconnect + reconnect + `study-room:resume` → `joined: true`.
- **Duplicate-action prevention**: starting an already-in-session room a second time → rejected (400). (Generic chat-message-level duplicate prevention — flagged in the Step 0 audit as a pre-existing gap in `community-social` DMs/club chat — was **not** built this pass; see §13.)
- **XP integration**: real `XpTransaction` rows created for both study-room participants (post-fix), and for the club-challenge-completion path.
- **Achievement integration**: `study_room_first` achievement correctly transitioned to `CLAIMABLE` after the session ended, confirmed via direct DB read (not just the API response).
- **Notification delivery**: a real `ACHIEVEMENT_UNLOCKED` notification was created for the host.
- **Session history**: correctly returned the just-completed session with its summary.

## 13. Remaining limitations (non-blocking)

1. **Chat-message duplicate-send prevention is a pre-existing, unfixed gap** — `community-social` DMs and club chat have no idempotency/client-request-id on message creation (Arena's `clientRequestId` pattern is the one place in the codebase this is done right). Confirmed in the Step 0 audit, not addressed this pass — a genuinely separate feature area from Study Rooms.
2. **Block/unblock and mutual-friends are absent** — confirmed by the Step 0 audit, not built this pass (no model, no code).
3. **Presence/online-status is now real for Study Rooms only** — Community/Friends' `handleDisconnect` remains a no-op and `showOnlineStatus`/`publicProfile` settings remain stored-but-unenforced. The new `PresenceService` (§2) is built generically enough to close this gap in a future pass without more new infrastructure, but wasn't wired into Community/Friends this pass (out of bounded scope).
4. **Matchmaking / "find a study partner" queue does not exist** — Study Rooms supports browse-and-join and invite-by-code, not an automated pairing queue. A genuinely separate, larger feature.
5. **Pinned posts, @mentions, true backend repost, a user-facing "report" flow, club achievements/missions** — all confirmed absent by the Step 0 audit, all out of this pass's bounded scope, all flagged rather than silently unmentioned.
6. **Voice chat is not implemented** — confirmed as a boolean flag on Arena rooms only, no real WebRTC infrastructure anywhere in the codebase.

## Final decision

**COMMUNITY 2.0: PASSED WITH NON-BLOCKING LIMITATIONS**
**STUDY TOGETHER: PASSED WITH NON-BLOCKING LIMITATIONS**
**REALTIME COLLABORATION: PASSED WITH NON-BLOCKING LIMITATIONS**

All three verdicts reflect: builds and the full targeted test suite pass (60/60); authentication, friend-request, and club-permission flows were verified against the real backend, not assumed; Study Room's realtime behavior (connect, presence, reconnect, ready-check, session lifecycle) was verified live with real concurrent Socket.IO clients; a real race condition in XP awarding was found under genuine concurrent load and fixed with a regression test added; XP, achievement, and notification integration were each verified end-to-end against real data, not mocks. The limitations in §13 are honestly-scoped, pre-existing or explicitly out-of-bounds gaps (chat dedup, block/unblock, cross-feature presence, matchmaking, voice) — documented, not silently dropped, and none of them block real-world use of what was actually built and fixed this pass.
