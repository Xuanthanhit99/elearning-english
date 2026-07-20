# Lumiverse Theme + i18n Page Coverage Report

## 1. Total pages

```text
Total page routes: 98
Total layouts: 5
Total loading states: 11
Total error states: 1
Total not-found states: 0
Total template states: 0
```

The route list was generated from `english-web-build/app/**/page.tsx`, not from navigation.

## 2. Coverage summary

```text
Pages fully checked: 12
Pages fixed: 3
Pages already correct: 9
Pages partially checked: 84
Pages not checked: 0
Pages excluded: 2
```

Fully checked means the route entry, imported main component, theme foundation, locale persistence behavior, and obvious P0/P1 hard-coded text were reviewed. Many learning-module screens are marked `PARTIAL` because their page entry exists in the matrix, but the deep screen component still has legacy hard-coded copy, old color classes, or known lint debt.

## 3. Page matrix

| Route | Light | Dark | VI | EN | Desktop | Tablet | Mobile | Fixed | Status |
| ----- | ----- | ---- | -- | -- | ------- | ------ | ------ | ----- | ------ |
| `/` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | No | PASS |
| `/auth/callback` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | No | PASS |
| `/auth` | PASS | PASS | FIXED | FIXED | PASS | PASS | PASS | Yes | FIXED |
| `/login` | PASS | PASS | FIXED | FIXED | PASS | PASS | PASS | Yes | FIXED |
| `/register` | PASS | PASS | FIXED | FIXED | PASS | PASS | PASS | Yes | FIXED |
| `/dashboard` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | No | PASS |
| `/profile` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | No | PASS |
| `/settings` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | No | PASS |
| `/placement` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | No | PASS |
| `/placement/introduction` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | No | PASS |
| `/placement/dashboard` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | No | PASS |
| `/placement/test/[sessionId]` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | No | PASS |
| `/placement/test/[sessionId]/processing` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | No | PASS |
| `/placement/test/[sessionId]/result` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | No | PASS |
| `/check-word` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/check-writing` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/pronunciation` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/achievements` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/admin` | EXCLUDED LEGACY | EXCLUDED LEGACY | EXCLUDED LEGACY | EXCLUDED LEGACY | EXCLUDED LEGACY | EXCLUDED LEGACY | EXCLUDED LEGACY | No | EXCLUDED LEGACY |
| `/analytics` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/arena` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/arena/rooms` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/community` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/community/clubs/[clubId]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/courses` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/discover` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/flashcards` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/flashcards/all` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/flashcards/create` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/grammar` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/grammar/[categorySlug]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/grammar/lesson/[...lessonId]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/grammar/topic/[...slug]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/history` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/history/[activityId]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/leaderboard` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/leaderboard/history` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/leaderboard/rewards` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/learn` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/learning-path` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/learning-path/lesson/[lessonId]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/learning-path/lessons/[lessonId]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/lesson-builder` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/lesson-builder/course/[courseId]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/listening` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/listening/dialogue` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/listening/dictation` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/listening/history` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/listening/practice/[sessionId]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/listening/sessions/[sessionId]/result` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/listening/topics` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/missions` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/notifications` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/pet` | EXCLUDED LEGACY | EXCLUDED LEGACY | EXCLUDED LEGACY | EXCLUDED LEGACY | EXCLUDED LEGACY | EXCLUDED LEGACY | EXCLUDED LEGACY | No | EXCLUDED LEGACY |
| `/progress` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/reading` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/reading/articles` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/reading/articles/[slug]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/reading/categories` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/reading/categories/[slug]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/reading/history` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/reading/readingpractice` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/reading/sessions` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/reading/sessions/[sessionId]/result` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/reports` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/search` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/speaking` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/speaking/categories` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/speaking/categories/[slug]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/speaking/history` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/speaking/history/[id]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/speaking/practice/[sessionId]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/speaking/sessions/[sessionId]/processing` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/speaking/sessions/[sessionId]/result` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/speaking/situations` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/speaking/topics` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/speaking/topics/[slug]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/study-rooms` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/vocabulary` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/vocabulary/achievements` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/vocabulary/achievements/activity` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/vocabulary/achievements/detail` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/vocabulary/flashcards` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/vocabulary/overview` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/vocabulary/review` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/vocabulary/skills` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/vocabulary/skills/detailed` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/vocabulary/test` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/writing` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/writing/history` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/writing/history/[sessionId]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/writing/homelog` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/writing/sessions/[sessionId]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/writing/sessions/[sessionId]/processing` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/writing/sessions/[sessionId]/result` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/writing/topics` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/writing/topics/[slug]` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |
| `/writing/topics/[slug]/types` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | No | PARTIAL |

## 4. Hard-coded text summary

```text
P0 found/fixed: Auth UI hard-coded text found and fixed for /auth, /login, /register.
P1 found/fixed: Header/session P1 was fixed in the foundation phase; this pass did not complete every learning-module P1 string.
P2 found/fixed: Not completed in this pass.
P3 remaining: Admin/internal pages remain excluded legacy.
```

Examples of remaining non-P0 debt:
- Dashboard inner panels still contain English literals inside `DashboardPage.tsx`.
- Settings page has many non-appearance Vietnamese strings in the screen component.
- Reading, Speaking, Writing, Arena, Leaderboard and Vocabulary submodules still have legacy hard-coded strings and full-lint debt.
- Several older modules still use fixed `vi-VN` or `en-US` date/number formatting instead of `locale-format.ts`.

## 5. Theme issues summary

```text
Contrast issues: no new blocker found in root shell/auth/profile/dashboard/settings/placement.
Hard-coded color issues: remaining legacy color classes found in admin/analytics/history/progress/reports/search/writing and deeper modules.
Dark-mode issues: active shell and auth are covered; legacy modules remain partial.
Switcher issues: no new issue after previous a11y changes.
Responsive issues: no browser-per-route visual pass was completed for all 98 routes; legacy module tables/modals remain partial.
```

## 6. Files changed

| File | Route/Area | Change | Reason |
| ---- | ---------- | ------ | ------ |
| `english-web-build/src/Components/Auth/Auth.tsx` | `/auth`, `/login`, `/register` | Replaced visible Auth copy/error fallback text with translation keys | Fix P0 auth hard-coded text |
| `english-web-build/src/i18n/types.ts` | i18n | Added `auth` namespace type | Keep dictionaries typed |
| `english-web-build/src/i18n/locales/vi.ts` | i18n | Added Vietnamese auth messages | Auth i18n coverage |
| `english-web-build/src/i18n/locales/en.ts` | i18n | Added English auth messages | Auth i18n coverage |
| `english-web-build/src/i18n/locales/zh.ts` | i18n | Added Chinese auth messages | Keep locale parity |
| `english-web-build/src/i18n/locales/de.ts` | i18n | Added German auth messages | Keep locale parity |
| `docs/lumiverse-theme-i18n-page-coverage-report.md` | docs | Added page-by-page coverage report | Track exact route status |

## 7. Verification

```text
Targeted lint: PASS for Auth/i18n files changed in this pass
Typecheck: PASS
Tests: PASS
Build: PASS
i18n check: PASS
```

Commands run:
- `npx eslint src/Components/Auth/Auth.tsx src/i18n/types.ts src/i18n/locales/vi.ts src/i18n/locales/en.ts src/i18n/locales/zh.ts src/i18n/locales/de.ts`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run i18n:check`

Full frontend lint is still expected to fail from known legacy files outside this pass, as recorded in `lumiverse-theme-i18n-review-report.md`.

## 8. Final conclusion

```text
PARTIAL PAGE COVERAGE
```

All 98 current `page.tsx` routes are listed in the matrix and none are hidden behind navigation assumptions. The Auth P0 i18n issue found in this pass was fixed and verified. The app is not yet eligible for `ALL CURRENT PAGES CHECKED` because many deep learning/social/legacy screen components still need a dedicated i18n/theme migration and browser-level responsive verification.
