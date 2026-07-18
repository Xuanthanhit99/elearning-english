# Phase 1 Stage 6A - Grammar And Reading Production Flow

## 1. Executive Summary

Stage 6A focused only on Grammar and Reading.

- Grammar now has safer idempotent completion for both submit and manual complete.
- Reading now blocks starting unpublished articles and uses Mission V2 idempotency keys.
- Both modules continue to use authenticated cookie user context; no frontend `userId` was added.
- No schema or migration change was required.
- Backend build, frontend build, Prisma validate/generate, Grammar tests, Reading tests, and Stage 3-5 regression smoke tests passed.

## 2. Grammar Before/After

| Thành phần | Có backend | Có frontend | Dùng dữ liệu thật | Trạng thái | Hành động |
| --- | --- | --- | --- | --- | --- |
| Grammar Home | Yes | Yes | Yes | DONE | Audited |
| Category | Yes | Yes | Yes | DONE | Audited |
| Topic | Yes | Yes | Yes | DONE | Audited |
| Lesson/Learning | Yes | Yes | Yes | DONE | Audited |
| Practice Submit | Yes | Yes | Yes | DONE | Backend idempotency hardened |
| Result/Progress | Yes | Yes | Yes | PARTIAL | Progress is stored; detailed per-question answer history is not modeled |
| Reward/Mission | Yes | Yes | Yes | DONE | Mission V2 idempotency keys added |
| History | Progress-based | Recent lessons | Yes | PARTIAL | No separate attempt history model |

## 3. Reading Before/After

| Thành phần | Có backend | Có frontend | Dùng dữ liệu thật | Trạng thái | Hành động |
| --- | --- | --- | --- | --- | --- |
| Reading Home | Yes | Yes | Yes | DONE | Audited |
| Category | Yes | Yes | Yes | DONE | Audited |
| Article Detail | Yes | Yes | Yes | DONE | Audited |
| Start/Resume Session | Yes | Yes | Yes | DONE | Published guard added |
| Answer Save | Yes | Yes | Yes | DONE | Backend grades answer |
| Submit/Result | Yes | Yes | Yes | DONE | Existing transaction/idempotency kept |
| Progress | Yes | Yes | Yes | DONE | Existing transaction kept |
| History | Yes | Yes | Yes | DONE | Dead route button fixed |

## 4. Grammar Flow

```text
/grammar
-> /grammar/[categorySlug]
-> /grammar/topic/[topicSlug or id]
-> /grammar/lesson/[lessonId]
-> POST /grammar/lessons/:lessonId/start
-> GET /grammar/lessons/:lessonId/learning
-> POST /grammar/lessons/:lessonId/submit or complete
-> GrammarLessonProgress
-> Mission V2 + Learning XP
```

Changes:

- `submitLesson` now returns current completed state without overwriting score/completedAt if the lesson is already completed.
- `submitLesson` uses backend answer normalization and scoring.
- `submitLesson` uses a transaction plus conditional `completed: false` update so concurrent submit only has one first completion.
- `completeLesson` now behaves the same way: already-completed lessons are returned without reward/mission duplication.
- Manual complete now publishes `GRAMMAR_COMPLETED` only on first completion.

## 5. Reading Flow

```text
/reading
-> /reading/categories
-> /reading/categories/[slug]
-> /reading/articles/[slug]
-> POST /reading/articles/:articleId/start
-> POST /reading/sessions/:sessionId/answer
-> POST /reading/sessions/:sessionId/submit
-> GET /reading/sessions/:sessionId/result
-> GET /reading/history
```

Changes:

- `startReadingArticle` now only starts published articles.
- Mission V2 updates now have idempotency keys per article/action.
- History page button no longer points to missing `/reading/report`; it points to `/reading/articles`.

## 6. Learning Path Integration

No new Learning Path architecture was added in this stage.

- Grammar/Reading completion remains module-owned.
- Both modules publish Learning XP events through the existing Stage 4 `LearningXpPublisher`.
- Mission V2 progress is integrated from module completion.
- Direct Learning Path lesson status updates were not added because no stable Grammar/Reading to LearningPathLesson mapping table was confirmed in this stage.

## 7. Reward/Event Map

| Module | Completion source | Event | Mission | XP | Learning Path | Idempotency |
| --- | --- | --- | --- | --- | --- | --- |
| Grammar | `GrammarLessonProgress(userId, lessonId)` | `GRAMMAR_COMPLETED` | `COMPLETE_LESSON`, `STUDY_LESSON`, optional `COMPLETE_QUIZ` | Learning XP rule | Existing indirect/dashboard progress only | `grammar:lesson:{lessonId}:...`, `learning:GRAMMAR_COMPLETED:{lessonId}` |
| Reading | `ReadingSession(id)` | `READING_COMPLETED` | `READ_ARTICLE`, `COMPLETE_LESSON`, `STUDY_LESSON`, optional `COMPLETE_QUIZ`, `STUDY_MINUTES` | Learning XP rule | Existing indirect/dashboard progress only | `reading:article:{articleId}:...`, `learning:READING_COMPLETED:{sessionId}` |

## 8. API Contract

### Grammar

| Method | Endpoint | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/grammar/dashboard` | Cookie | `level?` | stats/categories/topics/roadmap |
| GET | `/grammar/categories` | Cookie | none | category cards |
| GET | `/grammar/categories/:categorySlug/detail` | Cookie | slug | category detail |
| GET | `/grammar/topics` | Cookie | `level?` | topic list |
| GET | `/grammar/topics/:topicId/detail` | Cookie | id/slug | topic detail |
| GET | `/grammar/topics/:topicId/lessons` | Cookie | id/slug | lesson list |
| GET | `/grammar/lessons/:lessonId/learning` | Cookie | id/slug | lesson theory/practice/progress |
| POST | `/grammar/lessons/:lessonId/start` | Cookie | none | progress |
| POST | `/grammar/lessons/:lessonId/submit` | Cookie | `{ answers: [{ questionId, answer }] }` | backend score/result/progress |
| POST | `/grammar/lessons/:lessonId/complete` | Cookie | none | progress/nextLesson/reward state |
| POST | `/grammar/lessons/:lessonId/note` | Cookie | `{ note }` | saved note |

### Reading

| Method | Endpoint | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/reading/home` | Cookie | none | home dashboard |
| GET | `/reading/categories` | Cookie | filters | category list |
| GET | `/reading/categories/:slug` | Cookie | slug | category detail |
| GET | `/reading/articles` | Cookie | filters/page | article list |
| GET | `/reading/articles/:slug` | Cookie | slug | article/session/questions |
| POST | `/reading/articles/:articleId/start` | Cookie | none | session id/start time |
| POST | `/reading/sessions/:sessionId/answer` | Cookie | `{ questionId, selected }` | saved backend-graded answer |
| POST | `/reading/sessions/:sessionId/submit` | Cookie | none | score/result/reward state |
| GET | `/reading/sessions/:sessionId/result` | Cookie | session id | result detail |
| GET | `/reading/history` | Cookie | page/status/range | paginated history |

## 9. Database Changes

- Schema: no model change.
- Migration: none created.
- Index: none added.
- Data impact: no destructive or backfill operation.
- Rollback: revert touched code files only.
- Local migration status: blocked because local DB still has 3 unapplied migrations:
  - `20260717034435_add_chat_session`
  - `20260717040228_add_chat_pet_feature`
  - `20260718090000_add_mission_progress_event_v2`

## 10. Files Changed

| File | Thay đổi | Lý do |
| --- | --- | --- |
| `backend/src/modules/grammar/grammar.service.ts` | Idempotent submit/complete, Learning XP on manual completion, mission idempotency keys | Prevent duplicate rewards/missions and completedAt overwrite |
| `backend/src/modules/grammar/grammar.controller.ts` | Relative imports | Jest compatibility |
| `backend/src/modules/grammar/grammar.module.ts` | Relative Prisma import | Consistency/Jest compatibility |
| `backend/src/modules/grammar/*.spec.ts` | Mock providers | Make module smoke tests executable |
| `backend/src/modules/reading/reading.service.ts` | Published guard and mission idempotency keys | Prevent unpublished start and duplicate mission progress |
| `backend/src/modules/reading/reading.controller.ts` | Relative imports | Jest compatibility |
| `backend/src/modules/reading/reading.module.ts` | Relative Prisma import | Consistency/Jest compatibility |
| `backend/src/modules/reading/*.spec.ts` | Mock providers | Make module smoke tests executable |
| `english-web-build/src/Components/reading/ReadingHistoryPage.tsx` | Removed dead route and fixed React effect lint error | Avoid production 404 and lint error |

## 11. Tests

| Command/Test | Result |
| --- | --- |
| `npm test -- --runTestsByPath src/modules/grammar/grammar.controller.spec.ts src/modules/grammar/grammar.service.spec.ts --runInBand` | Passed |
| `npm test -- --runTestsByPath src/modules/reading/reading.controller.spec.ts src/modules/reading/reading.service.spec.ts --runInBand` | Passed |
| Stage 3-5 regression smoke tests for Learning Path, Mission V2, Vocabulary | Passed |
| `npx prisma format` | Passed; no schema diff remained |
| `npx prisma validate` | Passed |
| `npx prisma generate` | Passed |
| Backend `npm run build` | Passed |
| Frontend `npm run build` | Passed |
| `git diff --check` | Passed |
| `npx prisma migrate status` | Failed because local DB has unapplied migrations |

## 12. Lint Debt

Backend non-fix lint on Grammar/Reading files still fails due existing technical debt:

- `@typescript-eslint/no-unsafe-*` in `grammar.controller.ts`, `grammar.service.ts`, `reading.service.ts`.
- Unused DTO imports existed in `grammar.controller.ts`.

Frontend non-fix lint on the touched Reading History file:

- Error fixed: `react-hooks/set-state-in-effect`.
- Remaining warning: `<img>` usage at `ReadingHistoryPage.tsx`.

No lint command with `--fix` was run.

## 13. Known Issues

- `BLOCKER`: Local database migration status is not clean; apply pending migrations before staging/production verification.
- `MEDIUM`: Grammar has no dedicated session/attempt/answer model, so detailed historical per-question review is limited.
- `MEDIUM`: Reading schema has `@@unique([userId, articleId])`, so true multi-attempt "practice again" is not supported without schema work.
- `LOW`: Frontend Reading History still has an `<img>` lint warning.
- `LOW`: Some mojibake text exists in legacy Vietnamese strings.

## 14. Production Visibility Decision

- Grammar: `READY` for Phase 1 with known limitation on detailed attempts.
- Reading: `READY` for Phase 1 with known limitation on multiple attempts.

## 15. Stage 6B Readiness

Ready to move to Writing after migration state is made clean in the target environment. The same completion contract should be reused: one module-owned completion source, one Learning XP event, Mission V2 idempotency keys, and no frontend `userId`.
