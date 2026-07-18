# Phase 1 Stage 5 - Vocabulary Production Flow

## Scope

- Module: Vocabulary only.
- Goal: stabilize daily vocabulary flow, weekly plan behavior, per-word progress, daily completion, SRS review, extra words, and reload state.
- No database schema change was required.

## API Contract Checked

| API | Owner Source | Purpose | Status |
| --- | --- | --- | --- |
| `GET /vocabulary/profile` | Cookie user | Load/create learning profile and daily word target | Existing |
| `PATCH /vocabulary/profile` | Cookie user | Update level/goal/daily target | Existing |
| `GET /vocabulary/weekly-plan` | Cookie user | Create/repair current weekly plan with 7 topics | Existing |
| `GET /vocabulary/today` | Cookie user | Bootstrap/fill today's plan and return reload state | Existing |
| `GET /vocabulary/daily/:dayId/words` | Cookie user + day ownership | Load daily words with progress and notebook state | Existing |
| `POST /vocabulary/words/:wordId/progress` | Cookie user | Save per-word state and update LEARN_WORD mission once per word | Existing |
| `POST /vocabulary/daily/:dayId/complete` | Cookie user + day ownership | Complete daily goal, schedule SRS, publish reward | Updated |
| `POST /vocabulary/daily/:dayId/extra` | Cookie user + day ownership | Add optional extra words without duplicating daily words | Updated |
| `GET /vocabulary/review` | Cookie user | Paginated SRS due list | Existing |
| `POST /vocabulary/review/submit` | Cookie user | Submit review answers and update SRS interval | Existing |
| `GET /vocabulary/weekly-test` | Cookie user | Unlock weekly test from learned words, not forced after 7 days | Existing |

## Backend Changes

- `completeDailyVocabulary` now sends idempotency keys to Mission V2:
  - `vocabulary:daily:{dayId}:complete-lesson`
  - `vocabulary:daily:{dayId}:study-lesson`
- Learning XP already uses `learning:VOCABULARY_COMPLETED:{dayId}`, so daily XP remains idempotent through the existing Stage 4 reward pipeline.
- `pickWordsForUser` now accepts `excludeWordIds` and excludes both learned words and words already assigned to the current daily plan.
- `fillTodayPlanWords` now returns the exact word IDs created for the request.
- `addExtraDailyVocabulary` now accepts only `5`, `10`, or `20`; invalid values fall back to `5`.
- `addExtraDailyVocabulary` keeps backward compatibility by returning the full daily plan in `words`, and adds:
  - `requestedAmount`
  - `addedCount`
  - `addedWords`
- Vocabulary controller/service specs now provide required dependencies so the module can be tested directly.
- Vocabulary imports were normalized to relative paths for Jest compatibility.

## Frontend Changes

- Vocabulary UI now reads `addedWords` from `POST /vocabulary/daily/:dayId/extra`.
- After choosing "Học thêm 5/10/20 từ", the active word jumps to the first newly added word.
- Existing `words` response still powers the full daily plan, so old behavior remains compatible.
- Completion modal and old progress behavior are preserved.

## Business Rules Verified

- Daily goal defaults to the user profile target.
- Weekly plan creation/repair already ensures seven different topics when the pool has enough data.
- Weekly test is available after the user has learned at least one topic/day in the week; it no longer forces a full 7-day lock.
- Per-word progress remains idempotent for mission counting because LEARN_WORD only increments on first counted progress state.
- Completion reload returns `completed: true` and does not reload the lesson as new.
- Extra words do not create duplicates from the current daily plan.
- Extra words use the existing same-day plan and do not create a second daily plan.

## Commands Run

| Command | Result |
| --- | --- |
| `npx prisma validate` | Passed |
| `npm test -- --runTestsByPath src/modules/vocabulary/vocabulary.controller.spec.ts src/modules/vocabulary/vocabulary.service.spec.ts --runInBand` | Passed |
| `npm run build` in `backend` | Passed |
| `npm run build` in `english-web-build` | Passed |
| Targeted backend ESLint without fix | Failed on pre-existing unsafe `any`/unused issues in large Vocabulary files |
| Targeted frontend ESLint without fix | Failed on pre-existing lint debt in `VocabularyPage.tsx` |

## Known Risks

- `VocabularyPage.tsx` is still very large and contains existing lint debt. It builds, but should be split in Phase 2.
- The `Word` model does not store a real `imageUrl`; the frontend currently uses curated emoji/SVG fallback images. A production AI image pipeline requires a schema field or media table.
- Local migration status is not fully applied in this workstation database, so migration status remains blocked until the database owner applies pending migrations.

## Checklist

- [x] Audit Vocabulary backend/frontend/schema.
- [x] Keep API compatibility.
- [x] Fix extra words returning/jumping to too many words.
- [x] Prevent extra-word duplicate selection against current daily plan.
- [x] Make Mission V2 daily completion idempotent.
- [x] Preserve Learning XP reward idempotency.
- [x] Verify weekly test can unlock before seven completed days.
- [x] Run Prisma validation.
- [x] Run targeted Vocabulary tests.
- [x] Run backend production build.
- [x] Run frontend production build.
- [ ] Clean remaining Vocabulary lint debt in a dedicated refactor.
- [ ] Add persistent AI image/media support for vocabulary illustrations.
