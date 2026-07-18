# Phase 1 - Stage 4 Lint Review

## Summary

Review started after Stage 4 had already been committed to `main`.

Current working tree state:

- `git status`: clean.
- `git diff --stat`: empty.
- `git diff --name-only`: empty.
- `git diff --cached --stat`: empty.
- Current commit: `71c9fe0 [update][commit] update Mission V2, Reward, XP, Coins, Streak, Pet va Leaderboard Events`.

Because there is no uncommitted diff left, there are no file hunks that can be safely restored or kept from the working tree. The review below is based on the latest commit contents and command results.

## Diff Classification

| File/Group | Stage 4 | Likely lint format | Logic change | Risk | Action |
| ---------- | ------- | ------------------ | ------------ | ---- | ------ |
| `backend/prisma/schema.prisma` | EXPECTED_STAGE4 | no | yes | medium | keep |
| `backend/prisma/migrations/20260718090000_add_mission_progress_event_v2/migration.sql` | EXPECTED_STAGE4 | no | yes | medium | keep |
| `backend/src/modules/leaderboard/xp.service.ts` | EXPECTED_STAGE4 | possible | yes | high | keep, build passed |
| `backend/src/modules/learning-path/learning-path.service.ts` | EXPECTED_STAGE4 | possible | yes | high | keep, tests passed |
| `backend/src/modules/learning-path/learning-path.module.ts` | EXPECTED_STAGE4 | possible | yes | medium | keep |
| `backend/src/modules/missions-v2/**` | EXPECTED_STAGE4 | possible | yes | high | keep, tests passed |
| `backend/src/modules/notifications/*.ts` | EXPECTED_STAGE4_SUPPORT | possible | import-only support for tests | low | keep |
| `english-web-build/src/lib/learning-path-api.ts` | EXPECTED_STAGE4 | possible | yes | medium | keep |
| `english-web-build/src/Components/learning-path/LearningPathLessonPage.tsx` | EXPECTED_STAGE4 | possible | yes | medium | keep |
| `english-web-build/src/Components/learning-path/LearningPathScreen.tsx` | EXPECTED_STAGE4 | possible | yes | medium | keep |
| `docs/phase1-stage4-mission-reward-report.md` | EXPECTED_STAGE4 | no | doc | low | keep |
| Backend files outside Stage 4 shown by `git show --name-status HEAD` | UNCERTAIN | likely lint-only for many files | unknown without pre-lint diff | medium | no restore, already committed |
| Frontend files outside Stage 4 | none in working tree | none | none | low | no action |

## Files Touched By Latest Commit

`git show --name-only --pretty=format: HEAD` reports 169 file path lines.

Important note: many backend files outside Stage 4 were included in the Stage 4 commit after `npm run lint` timed out. Since the working tree is now clean and the changes are committed, this review cannot selectively restore lint-only hunks without comparing against an explicit backup branch or pre-lint commit. No destructive restore was performed.

## Files Kept

All committed files are currently kept.

Reason:

- Working tree is clean.
- No staged or unstaged diff exists to classify hunk-by-hunk.
- Backend build passed after Stage 4.
- Frontend build passed after Stage 4.
- Learning Path and Mission controller tests passed after Stage 4.

## Files Restored

None.

Reason:

- No uncommitted diff exists.
- No safe hunk-level restore target exists in the working tree.
- Bulk restore/reset is forbidden and would risk losing user or committed work.

## Files Fixed After Review

- `english-web-build/src/Components/learning-path/LearningPathLessonPage.tsx`
- `english-web-build/src/Components/learning-path/LearningPathScreen.tsx`

Reason:

- Direct non-fix ESLint reported `react-hooks/set-state-in-effect` for Stage 4 Learning Path files.
- Effect calls were deferred with `Promise.resolve().then(...)`.
- No business logic was changed.

## Uncertain Files

Backend files outside the Stage 4 reward path remain `UNCERTAIN` because they were part of the latest commit and may be lint-only, prior feature work, or intentional cleanup. These should be reviewed in a separate commit review if a smaller production diff is required.

## Migration Status

Command:

```text
npx prisma migrate status
```

Result:

```text
Following migrations have not yet been applied:
20260717034435_add_chat_session
20260717040228_add_chat_pet_feature
20260718090000_add_mission_progress_event_v2
```

Action:

- Did not run `prisma migrate dev`.
- Reason: local database has multiple unapplied migrations, including older migrations. Applying Stage 4 alone is not possible through normal Prisma migrate flow.
- Blocker: development/staging DB migration history must be aligned before applying the Stage 4 migration.

## Commands Already Run Before This Review

From Stage 4:

| Command | Result |
| ------- | ------ |
| `npx prisma format` | PASS |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| Backend `npm run build` | PASS |
| Frontend `npm run build` | PASS |
| Learning Path + Mission controller specs | PASS |
| Backend `npm run lint` | TIMEOUT after 120s, mutating script |
| Frontend `npm run lint` | TIMEOUT after 120s |
| Backend targeted non-fix ESLint | FAILED, 56 errors and 7 warnings across targeted backend files/specs |
| Frontend targeted non-fix ESLint before fix | FAILED, 2 errors in Stage 4 Learning Path files |
| Frontend targeted non-fix ESLint after fix | PASS |
| Backend build after review | PASS |
| Frontend build after review | PASS |
| Learning Path + Mission controller specs after review | PASS |

## Safety Decision

Phan A is safe to close with the following caveats:

- No further lint with `--fix` should be run before Stage 5.
- Any lint command should use direct ESLint without `--fix`.
- Migration application is blocked until database migration history is aligned.
- If the team wants a minimal Stage 4 diff, review commit `71c9fe0` against `73bd1bf` in a dedicated cleanup task.
