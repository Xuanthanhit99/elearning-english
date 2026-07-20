# Lumiverse Phase 3F Report: Learning Path

## Summary

Phase 3F redesigns the Learning Path as a Lumiverse Journey timeline while preserving all existing path, lock, unlock, progress, lesson start, route, and access-gate logic.

No backend, database, Prisma, auth, API contract, or routing behavior was changed.

## Audit

Files audited:

- `src/Components/learning-path/LearningPathScreen.tsx`
- `src/Components/learning-path/LearningPathGate.tsx`
- `src/lib/learning-path-api.ts`
- `src/lib/learning-path-access-api.ts`
- `app/(main)/learning-path/page.tsx`
- `app/(main)/learning-path/lessons/[lessonId]/page.tsx`

Existing flow preserved:

- Access gate still uses `getLearningPathAccess()`.
- Path screen still uses `getLearningPath()`.
- Lesson start still uses `startLearningPathLesson(lesson.id)`.
- Locked lessons are not started and remain non-clickable.
- Lesson routes still use backend-provided `lesson.href`.
- Placement-required redirects remain controlled by existing API response.

## Implemented

- Rebuilt Learning Path hero with current level, score, progress, completed lessons, and lesson totals.
- Added current/next lesson card using real `currentLesson` or `nextLesson`.
- Converted path content into a vertical journey timeline.
- Added stage/course summaries with progress.
- Added locked, available, in-progress, and completed node states.
- Added explanatory locked node text without changing lock logic.
- Added stages, priorities, and skill baseline side panels using backend data.
- Added empty state when courses/lessons are missing.

## Files Modified

- `src/Components/learning-path/LearningPathScreen.tsx`

## Business Rules Preserved

- No manual unlock changes.
- No fake rewards.
- No fake lessons.
- No new route generation.
- No backend changes.
- No auth changes.

## Accessibility

- Available and current lesson nodes use real buttons.
- Completed nodes use real links.
- Locked nodes use non-clickable labelled elements with `aria-disabled`.
- Progress bars expose Lumiverse progress semantics.
- Timeline is rendered as ordered list content.
- Touch targets are large enough for mobile.

## Responsive Strategy

- Desktop: hero plus side panels and journey timeline.
- Tablet/mobile: vertical timeline, stacked panels, no horizontal overflow.
- Course and lesson cards use responsive wrapping.

## Verification

Scoped lint passed:

```text
npx eslint src/Components/learning-path/LearningPathScreen.tsx src/Components/learning-path/LearningPathGate.tsx
```

TypeScript passed:

```text
npx tsc --noEmit
```

Build passed:

```text
npm run build
```

## Visual QA

Authenticated visual QA may be blocked by the known refresh-token issue in `src/lib/axios.ts`. That issue was not modified.

Recommended screenshots:

- `/learning-path` desktop with current lesson.
- `/learning-path` mobile timeline.
- Locked lesson node.
- Completed lesson node.
- Empty path state.
- Placement-required redirect state.

## Remaining Risks

- Locked reason is derived from current path order because the API does not expose a specific per-node lock reason.
- If a course is marked unavailable, lesson actions remain disabled by UI to respect backend state.
