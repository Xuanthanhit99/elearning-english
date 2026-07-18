# Phase 1 - Stage 4: Mission V2, Reward, XP, Coins, Streak, Pet, Leaderboard

## 1. Executive Summary

Before this stage, Learning Path lesson completion only updated `LessonProgress`. Mission V2 progress had no event idempotency ledger, and Mission claim returned an error for already-claimed missions. XP already had a strong audit source via `XpTransaction.idempotencyKey`.

After this stage, Learning Path lesson completion uses one backend reward path:

```text
Learning Path complete
-> stable idempotency key
-> XP transaction
-> lesson progress
-> Mission V2 progress
-> Pet/coins/streak
-> leaderboard DB entry
-> Redis/socket leaderboard sync after commit
-> reward summary response
```

Blockers remaining:

- Full idempotency tests for concurrent DB/Redis failure scenarios are not present in the repo.
- Existing learning modules still have mixed patterns and were not rewritten in this stage by scope.
- Backend and frontend lint commands timed out at 120 seconds, so lint is not reported as passed.

## 2. Event Map

| Event | Source | Mission | XP | Coins | Streak | Pet | Leaderboard | Idempotency |
| ----- | ------ | ------- | -- | ----- | ------ | --- | ----------- | ----------- |
| `LESSON_COMPLETED` | `POST /learning-path/lessons/:lessonId/complete` | `COMPLETE_LESSON` missions increment once | `XpTransaction` source `LESSON` | PetProfile coins +12 by existing lesson rule | PetProfile/UserXpProfile streak once per day | PetReward + PetProfile | `LeaderboardEntry` DB + Redis sync | `learning:LESSON_COMPLETED:{lessonId}` |
| `MISSION_CLAIMED` | `POST /missions-v2/:missionId/claim` | mission `CLAIMED` once | Learning XP publisher -> `XpTransaction` source `MISSION` | Mission reward transaction/PetProfile | Not changed by claim | PetProfile mission reward | via XP listener | `learning:MISSION_CLAIMED:{missionId}` |
| Mission progress event | `MissionV2ProgressService.increase` | increments active matching missions | none by itself | none | none | none | none | optional `idempotencyKey` stored in `MissionProgressEventV2` |
| `VOCABULARY_COMPLETED` | existing Vocabulary service | existing direct mission calls | Learning XP publisher | not changed here | not changed here | not changed here | via XP listener | existing source id |
| `GRAMMAR_COMPLETED` | existing Grammar service | existing direct mission calls | Learning XP publisher | not changed here | not changed here | not changed here | via XP listener | existing source id |
| `READING_COMPLETED` | existing Reading service | existing direct mission calls | Learning XP publisher | not changed here | not changed here | not changed here | via XP listener | existing source id |
| `LISTENING_COMPLETED` | existing Listening service | existing direct mission calls | Learning XP publisher | not changed here | not changed here | not changed here | via XP listener | existing source id |
| `SPEAKING_COMPLETED` | existing Speaking processors/services | existing direct mission calls | Learning XP publisher | not changed here | not changed here | not changed here | via XP listener | existing source id |
| `WRITING_COMPLETED` | existing Writing processor | existing direct mission calls | Learning XP publisher | not changed here | not changed here | not changed here | via XP listener | existing source id |
| `PLACEMENT_COMPLETED` | existing Placement result service | not changed here | Learning XP publisher | not changed here | not changed here | not changed here | via XP listener | existing source id |

## 3. Reward Flow

```text
Completion
-> Event key
-> XpService.awardXpWithSideEffects
-> DB transaction
-> XP profile + XpTransaction
-> LessonProgress
-> Mission V2 progress
-> Pet/coins/streak
-> LeaderboardEntry
-> Commit
-> Redis leaderboard sync
-> Reward summary response
```

## 4. Idempotency Strategy

- Learning Path lesson reward key: `learning:LESSON_COMPLETED:{lessonId}`.
- XP duplicate protection uses existing unique `XpTransaction.idempotencyKey`.
- Mission progress events can now use `MissionProgressEventV2.idempotencyKey`.
- Mission claim remains protected by existing unique `MissionRewardTransactionV2.userMissionId`.
- Concurrent duplicate XP creation catches Prisma unique violation and returns existing transaction.
- Redis sync only runs when the DB transaction creates a new XP transaction and leaderboard entry update.

## 5. Mission Rules

- `COMPLETE_LESSON` missions increment by 1 when a Learning Path lesson is rewarded the first time.
- Progress is capped at `target`.
- `ACTIVE` becomes `COMPLETED` when progress reaches target.
- `COMPLETED` becomes `CLAIMED` only through the claim endpoint.
- Claim retry returns current reward state instead of applying rewards again.
- Daily/weekly generation logic was audited but not rewritten.
- Timezone currently follows server/local `Date` behavior for streak, consistent with existing Pet service. User timezone is not yet modeled.

## 6. XP and Coins

- XP source of truth: `XpTransaction`.
- User total XP and `UserXpProfile.totalXp` are updated in the same transaction as the XP transaction.
- Learning Path lesson completion awards user XP through source `LESSON`.
- Mission claim publishes `MISSION_CLAIMED`; duplicate publish is safe through XP idempotency.
- Coins source for lesson completion remains `PetProfile.coins` using existing lesson pet reward rule.
- No new hard-coded coin source was added outside the existing lesson reward values.

## 7. Streak

- Business rule follows the existing Pet service:
  - first valid study activity in a day sets/increments streak;
  - same-day activity does not increment;
  - next-day activity increments;
  - missed day resets to 1.
- Learning Path completion updates `PetProfile.streak`, `PetProfile.bestStreak`, `PetProfile.lastStudyDate`.
- `UserXpProfile.currentStreak` and `longestStreak` are also synchronized for leaderboard/profile views.
- Timezone: server-local date boundary. User timezone support is not configured.

## 8. Pet

- Existing lesson pet reward rule was preserved:
  - pet XP +30
  - coins +12
  - food +1
  - HP/happiness/hunger/energy clamped to 0-100
- `PetReward` remains unique by `(userId, lessonId)`.
- No random pet creation was introduced. The existing pending pet behavior is preserved when no pet profile exists.

## 9. Leaderboard

- Leaderboard receives points from committed XP transactions only.
- `XpService.awardXpWithSideEffects` updates leaderboard DB entries inside the reward transaction.
- Redis sorted set sync runs after commit.
- Duplicate reward event does not call Redis `ZINCRBY` again.
- Existing weekly close/reward logic was not expanded in this stage.

## 10. API Contract

| Method | Endpoint | Request | Response | Idempotent |
| ------ | -------- | ------- | -------- | ---------- |
| `POST` | `/learning-path/lessons/:lessonId/complete` | cookie-auth only | lesson, learningPath, alreadyCompleted, rewards | Yes |
| `POST` | `/missions-v2/:missionId/claim` | cookie-auth only | mission, alreadyClaimed, reward | Yes |
| `POST` | `/missions-v2/progress` | action/progress payload; optional `idempotencyKey` | updatedCount, missionUpdates, duplicated | Yes when key provided |

## 11. Files Changed

| File | Change | Reason |
| ---- | ------ | ------ |
| `backend/prisma/schema.prisma` | Added `MissionProgressEventV2` | Mission progress idempotency ledger |
| `backend/prisma/migrations/20260718090000_add_mission_progress_event_v2/migration.sql` | New safe migration | Create ledger table and indexes |
| `backend/src/modules/leaderboard/xp.service.ts` | Added `awardXpWithSideEffects` | Transactional XP + reward side effects |
| `backend/src/modules/learning-path/learning-path.service.ts` | Integrated completion reward summary | One-time reward for Learning Path lesson |
| `backend/src/modules/learning-path/learning-path.module.ts` | Imported LeaderboardModule | Access XpService |
| `backend/src/modules/missions-v2/services/mission-v2-progress.service.ts` | Added optional idempotency key support | Prevent duplicate mission progress |
| `backend/src/modules/missions-v2/services/mission-v2-reward.service.ts` | Made claim idempotent | Safe retry/double click |
| `backend/src/modules/missions-v2/types/mission-v2-event.types.ts` | Added source/idempotency fields | Support deduped events |
| `backend/src/modules/missions-v2/dto/progress-mission-v2.dto.ts` | Added optional source/idempotency fields | API compatibility |
| `backend/src/modules/missions-v2/missions-v2.controller.ts` | Fixed relative guard import | Jest/build consistency |
| `backend/src/modules/notifications/*.ts` | Fixed relative Prisma imports | Jest consistency |
| `backend/src/modules/missions-v2/services/*.ts` | Fixed relative Prisma imports | Jest consistency |
| `english-web-build/src/lib/learning-path-api.ts` | Added reward summary type | Frontend maps backend reward |
| `english-web-build/src/Components/learning-path/LearningPathLessonPage.tsx` | Shows reward summary | No client-side fake rewards |

## 12. Database Changes

- Schema: added `MissionProgressEventV2`.
- Migration: `20260718090000_add_mission_progress_event_v2`.
- Backfill: not required because this is an event ledger for new events.
- Duplicate audit: not required before unique index because table is new.
- Data impact: additive table only, no existing data is modified.
- Rollback: drop table and indexes if needed.

## 13. Test Results

| Test/Command | Result |
| ------------ | ------ |
| `npx prisma format` | PASS |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| Backend build `npm run build` | PASS |
| Frontend build `npm run build` | PASS |
| Learning Path + Mission controller specs | PASS, 5 suites |
| Backend lint `npm run lint` | TIMEOUT after 120s |
| Frontend lint `npm run lint` | TIMEOUT after 120s |
| Dedicated concurrent reward integration tests | NOT AVAILABLE |
| Redis failure/retry integration tests | NOT AVAILABLE |

## 14. Known Issues

### HIGH

- Existing Vocabulary/Grammar/Reading/Listening/Speaking/Writing modules still use mixed mission progress and XP publish patterns. They were audited but not rewritten in this stage by scope.
- Mission progress idempotency only applies when callers provide `idempotencyKey`. Legacy calls without a key keep old behavior.

### MEDIUM

- Streak timezone uses server-local date. User timezone support is not modeled yet.
- Mission claim DB reward can be recovered by calling claim again if XP publish failed, because `MISSION_CLAIMED` XP is idempotent.

### LOW

- Lint commands need longer CI timeout or smaller lint target.

## 15. Stage 5 Readiness

Stage 5 can begin for Vocabulary. Before marking Vocabulary production-ready, its completion events should be routed through the same idempotent reward pattern or must pass stable `idempotencyKey` values into Mission V2 progress.
