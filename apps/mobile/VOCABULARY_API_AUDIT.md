# Vocabulary API Audit

Phase 5 target: build a native Learning Hub and production-ready Vocabulary foundation using existing backend APIs only.

## Web Consumers Inspected

- `english-web-build/src/Components/Vocabulary/VocabularyPage.tsx`
- `english-web-build/src/Components/Vocabulary/VocabularyTestPage.tsx`
- `english-web-build/src/lib/tts-api.ts`
- `english-web-build/src/Components/Dashboard/DashboardPage.tsx`

## Backend Sources Inspected

- Controller: `backend/src/modules/vocabulary/vocabulary.controller.ts`
- Service: `backend/src/modules/vocabulary/vocabulary.service.ts`
- DTOs:
  - `backend/src/modules/vocabulary/dto/update-word-progress.dto.ts`
  - `backend/src/modules/vocabulary/dto/submit-review.dto.ts`
  - `backend/src/modules/vocabulary/dto/review-session-answer.dto.ts`
  - `backend/src/modules/vocabulary/dto/submit-weekly-test.dto.ts`
  - `backend/src/modules/vocabulary/dto/update-learning-profile.dto.ts`
- TTS:
  - `backend/src/modules/tts/tts.controller.ts`
  - `english-web-build/src/lib/tts-api.ts`

## Endpoints

### `GET /vocabulary/profile`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.getProfile`
- Service: `VocabularyService.getOrCreateProfile`
- DTO: none
- Web consumer: `VocabularyPage.tsx`
- Response shape: user vocabulary profile, including level and daily target fields.
- Mutations: none
- Idempotency: read endpoint creates a profile if missing.
- Mobile suitability: suitable for settings/profile surfaces; not required for the first mobile session because `/vocabulary/today` and `/dashboard` provide enough.

### `GET /vocabulary/overview`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.getOverview`
- Service: `VocabularyService.getLearningOverview`
- DTO: none
- Web consumer: overview/progress surfaces
- Response shape: aggregate vocabulary learning overview.
- Mutations: none
- Idempotency: read-only.
- Mobile suitability: suitable later for a deeper vocabulary analytics screen.

### `GET /vocabulary/today`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.getToday`
- Service: `VocabularyService.getTodayVocabulary`
- DTO: none
- Web consumer: `VocabularyPage.tsx`
- Response shape:

```ts
{
  locked: boolean;
  completed: boolean;
  id: string;
  status: string;
  topic?: { id: string; name: string; description?: string | null };
  words?: Array<{ id: string; wordId: string; order: number; word: VocabularyWord }>;
}
```

- Mutations: may lazily create the current weekly/day plan and repair/fill missing words.
- Idempotency: suitable to call repeatedly. Existing daily plan is reused; missing plans/words are created or repaired server-side.
- Mobile suitability: primary vocabulary overview/session source.

### `GET /vocabulary/weekly-plan`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.getWeeklyPlan`
- Service: `VocabularyService.getOrCreateUserWeeklyPlan`
- DTO: none
- Web consumer: `VocabularyPage.tsx`, `VocabularyTestPage.tsx`
- Response shape: weekly plan with seven daily plans, each containing topic and selected words.
- Mutations: creates/repairs current weekly plan if missing or incomplete.
- Idempotency: suitable to call repeatedly; unique `userId_weekStart` prevents duplicate weekly plans.
- Mobile suitability: optional overview context. Not required for one-word session.

### `GET /vocabulary/daily/:dayId/words`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.getDailyWords`
- Service: `VocabularyService.getDailyWords`
- DTO: none
- Web consumer: `VocabularyPage.tsx`
- Response shape:

```ts
{
  id: string;
  status: string;
  topic: { id: string; name: string };
  words: Array<{
    id: string;
    wordId: string;
    order: number;
    word: VocabularyWord;
    progress: UserWordProgress | null;
    inNotebook: boolean;
  }>;
}
```

- Mutations: none.
- Idempotency: read-only.
- Mobile suitability: primary study-session word source.

### `POST /vocabulary/words/:wordId/progress`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.updateProgress`
- Service: `VocabularyService.updateWordProgress`
- DTO: `UpdateWordProgressDto`
- Allowed statuses: `NEW`, `LEARNING`, `KNOWN`, `REVIEW`
- Web consumer: `VocabularyPage.tsx`
- Request shape:

```ts
{ status: 'NEW' | 'LEARNING' | 'KNOWN' | 'REVIEW' }
```

- Response shape: updated `UserWordProgress` plus `missionProgressUpdated`.
- Mutations: upserts `UserWordProgress`, increments `seenCount`, updates `correctCount` for `KNOWN`, `wrongCount` for `REVIEW`, schedules `reviewAt`, and may advance mission progress on first counted status.
- Idempotency: not fully idempotent. Repeating the same action increments counters again. Mobile must not silently retry or advance on failed requests.
- Mobile suitability: primary word action endpoint.

### `POST /vocabulary/daily/:dayId/complete`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.completeDailyVocabulary`
- Service: `VocabularyService.completeDailyVocabulary`
- DTO: none
- Web consumer: `VocabularyPage.tsx`
- Response shape: completed daily plan with topic/words, `completed: true`, `alreadyCompleted: boolean`.
- Mutations: sets daily plan status to `COMPLETED`, ensures every word has progress/review schedule, advances missions, and publishes `VOCABULARY_COMPLETED` XP event.
- Idempotency: protected. If already completed, returns `alreadyCompleted: true` and does not re-award completion missions.
- Mobile suitability: required for server-confirmed completion.

### `POST /vocabulary/daily/:dayId/extra`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.addExtraDailyVocabulary`
- Service: `VocabularyService.addExtraDailyVocabulary`
- DTO: inline `{ amount?: number }`
- Web consumer: `VocabularyPage.tsx`
- Response shape: updated daily plan with `addedWords`, `addedCount`, `requestedAmount`.
- Mutations: adds extra words using server selection.
- Idempotency: not a default mobile-session action because repeated calls intentionally add words.
- Mobile suitability: defer until a richer vocabulary phase.

### `GET /vocabulary/review`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.getReviewWords`
- Service: `VocabularyService.getReviewWords`
- Query: `page`, `limit`
- Web consumer: `VocabularyPage.tsx`, `VocabularyTestPage.tsx`
- Response shape: paginated due words with progress counts and `reviewAt`.
- Mutations: none.
- Idempotency: read-only.
- Mobile suitability: suitable for later review flow; overview can show due count from `/vocabulary/me/stats`.

### `GET /vocabulary/review/suggestions`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.getReviewSuggestions`
- Service: `VocabularyService.getReviewSuggestions`
- Web consumer: `VocabularyPage.tsx`
- Response shape: due/weak word suggestions.
- Mobile suitability: not needed for Phase 5 foundation.

### `POST /vocabulary/review/submit`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.submitReview`
- Service: `VocabularyService.submitReview`
- DTO: `SubmitReviewDto`
- Request shape:

```ts
{ answers: Array<{ wordId: string; isCorrect: boolean }> }
```

- Mutations: updates SRS review progress.
- Mobile suitability: review flow deferred.

### `GET /vocabulary/me/stats`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.getMyStats`
- Service: `VocabularyService.getMyStats`
- Web consumer: `VocabularyPage.tsx`
- Response shape:

```ts
{
  totalWords: number;
  learnedWords: number;
  masteredWords: number;
  reviewDue: number;
  notebookWords: number;
  testsTaken: number;
  memoryRate: number;
}
```

- Mutations: none.
- Idempotency: read-only.
- Mobile suitability: suitable for Vocabulary overview summary.

### `GET /vocabulary/words/:wordId/detail`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.getWordDetail`
- Service: `VocabularyService.getWordDetail`
- Web consumer: `VocabularyPage.tsx`
- Response shape: full word detail plus user progress.
- Mobile suitability: defer; daily words already include required fields.

### `GET /vocabulary/words/:wordId/relations`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.getWordRelations`
- Service: `VocabularyService.getWordRelations`
- Web consumer: `VocabularyPage.tsx`
- Response shape: synonyms, antonyms, same-topic words.
- Mobile suitability: defer; not needed for focused one-word study.

### `GET /vocabulary/daily/:dayId/words/:wordId/navigation`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.getWordNavigation`
- Service: `VocabularyService.getWordNavigation`
- Web consumer: `VocabularyPage.tsx`
- Response shape: `currentIndex`, `total`, `previous`, `current`, `next`.
- Mobile suitability: optional. Mobile can keep local index because daily word order is already server-provided; server still owns progress/completion.

### `GET /vocabulary/daily/:dayId/flashcards`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.getDailyFlashcards`
- Service: `VocabularyService.getDailyFlashcards`
- Web consumer: `VocabularyPage.tsx`
- Response shape: flashcard cards for the daily words.
- Mobile suitability: defer; Phase 5 uses explicit word progress actions.

### `POST /vocabulary/flashcards/:wordId/review`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.reviewFlashcard`
- Service: `VocabularyService.reviewFlashcard`
- Request shape: `{ isCorrect?: boolean; rating?: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY' }`
- Response shape: review result with next status/review date.
- Mobile suitability: defer to review/flashcard phase.

### `GET /vocabulary/weekly-test`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.getWeeklyTest`
- Service: `VocabularyService.getWeeklyTest`
- Web consumer: `VocabularyTestPage.tsx`
- Mobile suitability: defer; weekly test is outside Phase 5 foundation.

### `POST /vocabulary/weekly-test/submit`

- Auth: `JwtAuthGuard`
- Controller: `VocabularyController.submitWeeklyTest`
- Service: `VocabularyService.submitWeeklyTest`
- DTO: `SubmitWeeklyTestDto`
- Mobile suitability: defer.

### `POST /tts/speak`

- Auth: controller has no guard in inspected file.
- Controller: `TtsController.speak`
- Service: `TtsService.synthesize`
- Web consumer: `english-web-build/src/lib/tts-api.ts`
- Request shape: `{ text: string; lang?: 'en' | 'vi' }`
- Response shape: `{ audioUrl: string }`
- Mobile suitability: backend source is suitable, but React Native playback needs an Expo audio package. Audio playback is not implemented in this phase to avoid adding media dependencies before the core persistence flow is verified.

## Answers To Required Questions

- Vocabulary day/session creation: `GET /vocabulary/today` lazily calls weekly/day plan creation and fills missing words.
- Session creation idempotency: yes for the current week/day. Existing plans are reused and repaired.
- Word completion: `POST /vocabulary/words/:wordId/progress` with `LEARNING`, `KNOWN`, or `REVIEW`.
- Progress granularity: word-by-word progress is sent immediately; daily completion is a separate server-confirmed mutation.
- Quiz/review effect: weekly test and review endpoints update user word progress, especially wrong words due for review.
- XP behavior: daily completion publishes a `VOCABULARY_COMPLETED` XP event; mobile must not calculate XP locally.
- Daily limit: user profile has `dailyWordTarget`; extra words are available only through `POST /vocabulary/daily/:dayId/extra`.
- Pronunciation/audio: word objects can include `phonetic` and `audio`; backend TTS exists through `/tts/speak`.
- Examples: word objects include `example`.
- Learned/review states: backend stores `UserWordProgress` with `NEW`, `LEARNING`, `KNOWN`, `REVIEW`, and service logic also handles `MASTERED` in SRS flows.

## Phase 5 Mobile Strategy

- Learning Hub reuses `/dashboard` cache for module progress.
- Vocabulary overview uses `GET /vocabulary/today` and `GET /vocabulary/me/stats`.
- Vocabulary session uses `GET /vocabulary/daily/:dayId/words`.
- Word actions use `POST /vocabulary/words/:wordId/progress`.
- Completion uses `POST /vocabulary/daily/:dayId/complete`.
- Dashboard and vocabulary queries are invalidated after confirmed word/completion mutations.
