# Leaderboard + Arena API Audit

## Backend contracts used

### Leaderboard

- `GET /leaderboards/me`
- `GET /leaderboards/weekly?page=&limit=`
- `GET /leaderboards/monthly?page=&limit=`
- `GET /leaderboards/friends?page=&limit=`
- Socket namespace `/leaderboard`
- Socket auth: web cookie `access_token` or mobile `handshake.auth.token`
- Socket events used:
  - emit `leaderboard:join-group`
  - emit `leaderboard:leave-group`
  - listen `leaderboard:group-updated`
  - listen `leaderboard:weekly-result`
  - listen `leaderboard:reward-available`
  - listen `leaderboard:season-started`

The mobile app reads rank, XP, league/group, and entries exactly as returned by the backend. Pagination uses `page` and `limit`; because the backend response does not expose total counts, mobile infers another page only when the current page is full.

### Arena

- `GET /arena/lobby`
- `GET /arena/season/current`
- `GET /arena/rooms/:roomId`
- `POST /arena/queue`
- `POST /arena/queue/leave`
- `POST /arena/rooms/:roomId/join`
- `POST /arena/rooms/:roomId/ready`
- `POST /arena/rooms/:roomId/leave`
- `POST /arena/rooms/:roomId/retry`
- `POST /arena/rooms/:roomId/questions/:questionId/answer`
- Socket namespace `/arena`
- Socket auth: web cookie `access_token` or mobile `handshake.auth.token`
- Socket events used:
  - emit `arena:room:join`
  - emit `arena:resume`
  - emit `arena:room:leave`
  - listen `arena:room:snapshot`
  - listen `arena:connected`
  - listen `arena:unauthorized`

## Backend behavior confirmed

- Public matchmaking is supported for `RANKED`.
- New ranked matchmaking supports team formats `SOLO_1V1`, `TEAM_2V2`, and `TEAM_3V3`.
- `FRIEND_CHALLENGE` is enabled only for private rooms, not public matchmaking.
- `AI_PRACTICE`, `SURVIVAL`, `BLITZ`, and `TOURNAMENT_LEGACY` are disabled for new matchmaking.
- Arena answer correctness, score, winner, rating, rewards, progression, match finalization, and duplicate-answer handling are server-owned.
- Leaderboard privacy display rules are server-owned.

## Mobile implementation notes

- Added full Leaderboard screen at `src/app/leaderboard/index.tsx`.
- Added Arena lobby at `src/app/arena/index.tsx`.
- Added Arena match screen at `src/app/arena/match/[matchId].tsx`.
- Added Arena result screen at `src/app/arena/result/[matchId].tsx`.
- Reused the Phase 12 socket manager and extended namespaces with `/leaderboard` and `/arena`.
- Added dashboard entry points for Arena and Leaderboard.
- Mobile does not calculate ELO, winners, score, correctness, timers, rewards, or matchmaking. It displays server snapshots and mutation responses.

## Backend compatibility change

`ArenaCookieAuthService` and `LeaderboardCookieAuthService` now delegate to the shared `NotificationCookieAuthService`. This preserves existing web cookie auth and enables mobile socket `auth.token` handshakes for `/arena` and `/leaderboard`.

## Unsupported or intentionally hidden on mobile

- Daily leaderboard: no confirmed backend endpoint in the audited contract.
- New AI practice/survival/blitz/tournament matchmaking: backend mode registry marks these disabled.
- Friend challenge room creation: backend supports private rooms, but the Phase 14 mobile entry focuses on ranked matchmaking and joining public rooms.
