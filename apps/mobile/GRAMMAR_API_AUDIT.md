# Grammar API Audit

Phase 6 target: build the mobile Grammar experience using the existing backend contract and preserving existing progress/reward rules.

## Sources Inspected

- Controller: `backend/src/modules/grammar/grammar.controller.ts`
- Service: `backend/src/modules/grammar/grammar.service.ts`
- Generation job: `backend/src/modules/grammar/grammar-job/grammar-job.service.ts`
- Hash utility: `backend/src/modules/grammar/utils/hash.util.ts`
- Prisma schema: `backend/prisma/schema.prisma`
- Web overview: `english-web-build/src/Components/Grammar/GrammarPage.tsx`
- Web topic detail: `english-web-build/src/Components/Grammar/GrammarDetailPage.tsx`
- Web lesson flow: `english-web-build/src/Components/Grammar/GrammarLessonLeaningPage.tsx`

## Data Models

- `GrammarCategory`: category title/slug/icon/color/order.
- `GrammarTopic`: category, title, slug, description, level, order, active flag.
- `GrammarLesson`: topic, title, slug, structured JSON `content`, duration, order.
- `GrammarQuestion`: lesson, `question`, `options`, `correctAnswer`, `explanation`, difficulty, order.
- `GrammarLessonProgress`: unique `(userId, lessonId)`, completed flag, score, completedAt.
- `GrammarLessonNote`: unique `(userId, lessonId)`.

## Endpoints

### `GET /grammar/dashboard`

- Controller: `GrammarController.getDashboard`
- Service: `GrammarService.getDashboard`
- DTO: query `level?: string`
- Auth: `JwtAuthGuard`
- Web consumer: `GrammarPage.tsx`
- Request shape: optional `?level=A1|A2|B1|B2|ALL`
- Response shape: `stats`, `categories`, `topics`, `roadmap`, `recentLessons`, `recommend`
- Mutations: none
- Side effects: none
- XP behavior: none
- Idempotency: read-only
- Mobile suitability: primary Grammar overview source

### `GET /grammar/categories`

- Controller: `GrammarController.getCategories`
- Service: `GrammarService.getCategories`
- Auth: `JwtAuthGuard`
- Response shape: category cards with total/completed lessons and progress
- Mobile suitability: optional; dashboard already includes category cards

### `GET /grammar/categories/:categorySlug/detail`

- Controller: `GrammarController.getCategoryDetail`
- Service: `GrammarService.getCategoryDetail`
- Auth: `JwtAuthGuard`
- Response shape: category, topics, roadmap, related categories, tips
- Mobile suitability: deeper category screen; not required for Phase 6 core flow

### `GET /grammar/topics`

- Controller: `GrammarController.getTopics`
- Service: `GrammarService.getTopics`
- Auth: `JwtAuthGuard`
- Request shape: optional `?level=...`
- Response shape: topic rows with id, slug, title, description, level, category, totalLessons, completedLessons, progress
- Mobile suitability: usable, but `/grammar/dashboard` already includes topics

### `GET /grammar/topics/:topicId/lessons`

- Controller: `GrammarController.getLessons`
- Service: `GrammarService.getLessonsByTopic`
- Auth: `JwtAuthGuard`
- Response shape: ordered lessons in a topic with progress fields
- Mobile suitability: useful when drilling into a topic

### `GET /grammar/topics/:topicId/detail`

- Controller: `GrammarController.getTopicDetail`
- Service: `GrammarService.getTopicDetail`
- Auth: `JwtAuthGuard`
- Web consumer: `GrammarDetailPage.tsx`
- Response shape: topic overview, lessons, roadmap, related topics, main usages
- Mobile suitability: useful later for topic detail; Phase 6 overview can route directly to the first available lesson

### `GET /grammar/lessons/:lessonId`

- Controller: `GrammarController.getLesson`
- Service: `GrammarService.getLessonDetail`
- Auth: `JwtAuthGuard`
- Response shape: cached lesson content merged with live user progress
- Mutations: none
- Mobile suitability: suitable, but `/grammar/lessons/:lessonId/learning` is richer for the mobile lesson flow

### `POST /grammar/lessons/:lessonId/start`

- Controller: `GrammarController.startLesson`
- Service: `GrammarService.startLesson`
- Auth: `JwtAuthGuard`
- Request shape: none
- Response shape: `{ message, progress }`
- Mutations: upserts `GrammarLessonProgress` with `completed=false`, `score=0`
- Side effects: starts/resumes progress record
- XP behavior: none
- Idempotency: idempotent upsert; repeated starts do not complete or reward
- Mobile suitability: call before loading lesson learning data

### `GET /grammar/lessons/:lessonId/learning`

- Controller: `GrammarController.getLessonLearning`
- Service: `GrammarService.getLessonLearning`
- Auth: `JwtAuthGuard`
- Web consumer: `GrammarLessonLeaningPage.tsx`
- Response shape:

```ts
{
  id: string;
  title: string;
  subtitle: string;
  topic: { id: string; title: string; level: string; category: { id: string; title: string } };
  level: string;
  duration: string;
  rewardXp: number;
  rewardCoin: number;
  currentIndex: number;
  totalLessons: number;
  progress: number;
  completedLessons: number;
  completedExercises: number;
  totalExercises: number;
  earnedXp: number;
  completed: boolean;
  content: {
    overview: string;
    summary: string;
    structure: string[];
    notes: string[];
    examples: Array<{ en: string; vi: string }>;
    tips: string[];
  };
  questions: Array<{ id: string; question: string; options: string[]; difficulty?: string | null }>;
  lessons: Array<{ id: string; order: number; title: string; duration: string; completed: boolean; locked: boolean; status: string }>;
  prevLessonId: string | null;
  nextLessonId: string | null;
}
```

- Mutations: none
- Mobile suitability: primary lesson/exercise source

### `POST /grammar/lessons/:lessonId/submit`

- Controller: `GrammarController.submitLesson`
- Service: `GrammarService.submitLesson`
- Auth: `JwtAuthGuard`
- DTO: inline controller body, not `SubmitGrammarAnswerDto`
- Request shape:

```ts
{
  answers: Array<{ questionId: string; answer: string }>
}
```

- Response shape:

```ts
{
  score: number;
  correct: number;
  total: number;
  results: Array<{
    questionId: string;
    question: string;
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    explanation?: string | null;
  }>;
  completed: true;
  alreadyCompleted: boolean;
  completedAt: string | Date | null;
  missionUpdated: boolean;
}
```

- Mutations: evaluates all lesson questions server-side, creates progress if missing, marks progress completed on first submission, stores score/completedAt
- Side effects: missions update and `GRAMMAR_COMPLETED` XP publish on first completion
- XP behavior: backend-owned, only published on first completion
- Idempotency: duplicate-safe for rewards/progress. If the lesson is already completed, service returns existing score with `alreadyCompleted=true`, `total=0`, empty results, and no mission update.
- Mobile suitability: primary exercise completion endpoint. Mutations should use `retry: false` to avoid ambiguous double submits.

### `POST /grammar/lessons/:lessonId/complete`

- Controller: `GrammarController.completeLesson`
- Service: `GrammarService.completeLesson`
- Auth: `JwtAuthGuard`
- Request shape: none
- Response shape: `{ message, progress, nextLessonId, completed, alreadyCompleted, missionUpdated }`
- Mutations: marks a no-quiz/theory lesson complete with score `100`
- Side effects: missions update and `GRAMMAR_COMPLETED` XP publish on first completion
- XP behavior: backend-owned
- Idempotency: duplicate-safe via completed check and `updateMany` where `completed=false`
- Mobile suitability: use only when a lesson has no questions

### `POST /grammar/lessons/:lessonId/note`

- Controller: `GrammarController.saveLessonNote`
- Service: `GrammarService.saveLessonNote`
- Auth: `JwtAuthGuard`
- Request shape: `{ note: string }`
- Mobile suitability: deferred; not needed for Phase 6 core flow

## Required Questions

1. How are grammar topics listed?
   - `GET /grammar/dashboard` includes `topics`; `GET /grammar/topics` also returns ordered topics.

2. How is a lesson loaded?
   - Web calls `POST /grammar/lessons/:lessonId/start`, then `GET /grammar/lessons/:lessonId/learning`.

3. How are questions generated/fetched?
   - Questions are generated server-side by `GrammarJobService.generateQuestionsByGemini` and stored in `GrammarQuestion`. Mobile fetches stored questions through `/learning`.

4. How is an answer submitted?
   - Submit all answers together to `POST /grammar/lessons/:lessonId/submit`.

5. What does `sentenceHash` do?
   - `backend/src/modules/grammar/utils/hash.util.ts` normalizes text and hashes a sentence with SHA-256. The current mobile-facing grammar APIs do not accept a client-provided sentence hash. Mobile must not generate its own hash.

6. Can answers be submitted multiple times?
   - The endpoint can be called again, but if progress is already completed it returns `alreadyCompleted=true` and does not re-score/reward. The mobile client should still prevent duplicate taps and set mutation retry to false.

7. Is result correctness determined server-side?
   - Yes. `GrammarService.submitLesson` compares normalized submitted answers with `GrammarQuestion.correctAnswer`.

8. Are explanations returned by backend?
   - Yes. Submit results include `question.explanation`.

9. When is progress persisted?
   - `startLesson` creates in-progress rows. `submitLesson` or `completeLesson` marks the lesson completed and stores score/completedAt.

10. When is XP awarded?
    - Backend publishes `GRAMMAR_COMPLETED` only on first completion.

11. What defines lesson/session completion?
    - Quiz lesson: successful `/submit` marks completion. Theory/no-question lesson: `/complete` marks completion.

12. Are questions static or generated?
    - Generated by backend job/AI, then stored as static `GrammarQuestion` records.

13. Does the backend distinguish exercise types?
    - Current learning payload exposes multiple-choice questions only: `question` plus `options[]`. No type field is exposed in the active lesson flow.

14. Is there a daily grammar limit?
    - No daily limit was found in the controller/service for grammar.

15. Is there a review/remediation flow?
    - No dedicated grammar review endpoint was found. Progress and recent lessons exist, but remediation is not separate.

## Phase 6 Mobile Strategy

- Enable Grammar in Learning Hub.
- Use `GET /grammar/dashboard` for Grammar overview and topic/progress list.
- Route topic cards to the first real lesson found through `GET /grammar/topics/:topicId/lessons`.
- Use `POST /start` then `GET /learning` for lesson content.
- Render structured JSON content natively.
- Render only the backend-supported multiple-choice question shape.
- Submit answers through `POST /submit`; do not evaluate locally.
- Use `POST /complete` only for no-question lessons.
- Invalidate grammar and dashboard queries after confirmed completion.
