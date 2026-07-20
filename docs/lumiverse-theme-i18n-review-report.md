# Lumiverse Theme + i18n Review Report

## 1. Executive summary

Theme before changes: Lumiverse already had a custom theme foundation using Zustand persistence, a root `ThemeInitializer`, an inline anti-flash script in `app/layout.tsx`, Tailwind `.dark` class support, and Lumiverse CSS variables in `globals.css`. This was kept.

i18n before changes: Lumiverse already had a custom TypeScript dictionary system, `useTranslation()`, four locales (`vi`, `en`, `zh`, `de`), `LanguageSwitcher`, and a persisted language store. This was kept.

Kept unchanged: no new theme/i18n library was introduced; route-prefix i18n was not added; auth redirect logic was not rewritten; database schema was not changed.

Changed: locale persistence now also writes a cookie, auth bootstrap syncs saved backend `theme` and `language` once after `/auth/me`, theme/language switchers have stronger accessibility behavior, shared locale formatting helpers were added, and critical/header strings were moved into translations.

Added: `npm run i18n:check`, `npm run typecheck`, and a reusable `src/lib/locale-format.ts`.

Final status: `READY WITH KNOWN LEGACY ISSUES`.

## 2. Existing architecture

Theme provider: custom root initializer, not `next-themes`. `ThemeInitializer` applies `.dark` on `<html>`.

Theme persistence: `useThemeStore` with Zustand persist key `poppylingo-theme`; source of truth on client is local store. Backend User Settings is long-term sync only.

Background system: no separate user-selectable background theme was found in the active app shell. Existing page backgrounds use Lumiverse CSS variables and dark variants.

i18n library: custom TypeScript dictionaries and `useTranslation()` hook.

Locale routing: no route prefix. `/`, `/dashboard`, `/profile`, auth pages, and callbacks keep their existing route behavior.

Locale persistence: Zustand persist key `poppylingo-locale`, now mirrored into cookie `lumiverse-locale`.

User Settings integration: backend already has `UserSettings.theme` and `UserSettings.language`, validated by Prisma enums and `UpdateSettingsDto`. Frontend now reads settings once after authenticated bootstrap and applies them locally.

## 3. Files audited

Theme:
- `english-web-build/app/layout.tsx`
- `english-web-build/app/globals.css`
- `english-web-build/src/Components/ThemeInitializer.tsx`
- `english-web-build/src/store/themeStore.ts`
- `english-web-build/src/Components/Layout/ThemeToggle.tsx`

i18n:
- `english-web-build/src/i18n/types.ts`
- `english-web-build/src/i18n/index.ts`
- `english-web-build/src/i18n/locales/vi.ts`
- `english-web-build/src/i18n/locales/en.ts`
- `english-web-build/src/i18n/locales/zh.ts`
- `english-web-build/src/i18n/locales/de.ts`
- `english-web-build/src/hooks/useTranslation.ts`
- `english-web-build/src/Components/LanguageInitializer.tsx`
- `english-web-build/src/Components/Layout/LanguageSwitcher.tsx`

Settings:
- `english-web-build/src/lib/settings-api.ts`
- `english-web-build/src/lib/settings-types.ts`
- `english-web-build/src/Components/settings/settings-page.tsx`

AppShell and navigation:
- `english-web-build/src/Components/Auth/AuthInitializer.tsx`
- `english-web-build/src/Components/Layout/AppShell.tsx`
- `english-web-build/src/Components/Layout/AppHeader.tsx`
- `english-web-build/src/Components/Layout/AppSidebar.tsx`
- `english-web-build/src/Components/Layout/MobileNavigation.tsx`

Backend:
- `backend/prisma/schema.prisma`
- `backend/src/modules/settings/dto/update-settings.dto.ts`
- `backend/src/modules/settings/settings-command.service.ts`
- `backend/src/modules/settings/settings-query.service.ts`
- `backend/src/modules/settings/settings.defaults.ts`

Tests:
- `english-web-build/scripts/test-auth-redirect.mjs`
- `english-web-build/scripts/check-i18n.mjs`

## 4. Issues found

| Severity | File | Issue | Cause | Fix |
| -------- | ---- | ----- | ----- | --- |
| P0 | `AppShell.tsx` | Auth session error text was hard-coded and ASCII-only | Previous auth hardening added local text directly | Moved to `common.authSessionError*` keys |
| P1 | `languageStore.ts` | Locale was only localStorage-backed | Existing no-prefix i18n did not mirror locale to cookie | Added `lumiverse-locale` cookie write/read |
| P1 | `AuthInitializer.tsx` | Saved backend theme/language were not applied during bootstrap | Settings sync only happened inside Settings page | Read settings once after authenticated `/auth/me` |
| P1 | `LanguageSwitcher.tsx` | Dropdown lacked complete menu semantics and Escape handling | Basic custom dropdown | Added `aria-haspopup`, `role=menu`, `menuitemradio`, Escape close |
| P1 | `ThemeToggle.tsx` | Dropdown lacked complete menu semantics and Escape handling | Basic custom dropdown | Added `aria-haspopup`, `role=menu`, `menuitemradio`, Escape close |
| P1 | `AppHeader.tsx` | Header still had hard-coded “Search all results” and locale-neutral number formatting | Mixed translated and direct strings | Added dictionary keys and locale formatter |
| P1 | i18n files | No automated dictionary consistency check | Custom i18n had no guardrail | Added `npm run i18n:check` |

## 5. Files changed

| File | Change | Reason | Business logic impact |
| ---- | ------ | ------ | --------------------- |
| `english-web-build/package.json` | Added `typecheck` and `i18n:check` scripts | Match verification checklist | No runtime impact |
| `english-web-build/scripts/check-i18n.mjs` | New dictionary consistency checker | Catch missing/extra keys, empty values, mismatches | No runtime impact |
| `english-web-build/src/store/languageStore.ts` | Added locale cookie persistence | Guest reload/direct URL support | Locale remains client-first |
| `english-web-build/src/store/themeStore.ts` | Added `isThemeChoice()` | Validate backend setting before applying | Prevents invalid theme writes |
| `english-web-build/src/Components/Auth/AuthInitializer.tsx` | Sync backend theme/language after auth | Logged-in long-term settings sync | No PATCH loop |
| `english-web-build/src/Components/LanguageInitializer.tsx` | Validate locale before applying `<html lang>` | Avoid invalid html lang | Fallback to default locale |
| `english-web-build/src/Components/Layout/LanguageSwitcher.tsx` | Improved a11y and keyboard close | Accessible language selection | No route changes |
| `english-web-build/src/Components/Layout/ThemeToggle.tsx` | Improved a11y and keyboard close | Accessible theme selection | No provider changes |
| `english-web-build/src/Components/Layout/AppHeader.tsx` | Translated search action and level prefix; locale number format | Reduce P1 hard-coded text | Header respects current locale |
| `english-web-build/src/Components/Layout/AppShell.tsx` | Translated auth-session error state | P0 auth text coverage | Error behavior unchanged |
| `english-web-build/src/lib/locale-format.ts` | Added date/number/relative helper functions | Shared locale-aware formatting | No DB/data change |
| `english-web-build/src/i18n/*` | Added keys in all locales | Keep dictionaries aligned | i18n check passes |

## 6. Theme coverage

| Area | Light | Dark | System | Mobile | Status |
| ---- | ----- | ---- | ------ | ------ | ------ |
| Root layout | Yes | Yes | Yes | Yes | Pass |
| Public homepage | Yes | Yes | Yes | Yes | Pass from existing implementation |
| Auth pages | Yes | Partial | Yes | Yes | Known remaining hard-coded auth copy; theme foundation works |
| Dashboard shell | Yes | Yes | Yes | Yes | Pass |
| Profile shell | Yes | Yes | Yes | Yes | Pass |
| Settings appearance | Yes | Yes | Yes | Yes | Pass |
| Header switcher | Yes | Yes | Yes | Yes | Pass |
| Language switcher | Yes | Yes | N/A | Yes | Pass |
| Legacy modules | Mixed | Mixed | Mixed | Mixed | Not completed in this phase |

## 7. Locale coverage

| Namespace | vi | en | Missing | Empty | Placeholder mismatch |
| --------- | -: | -: | ------: | ----: | -------------------: |
| common | 10 | 10 | 0 | 0 | 0 |
| header | 18 | 18 | 0 | 0 | 0 |
| theme | 3 | 3 | 0 | 0 | 0 |
| sidebar | 27 | 27 | 0 | 0 | 0 |
| settings | 29 | 29 | 0 | 0 | 0 |
| home | 43 | 43 | 0 | 0 | 0 |
| footer | 5 | 5 | 0 | 0 | 0 |
| profile | 48 | 48 | 0 | 0 | 0 |
| dashboard | 47 | 47 | 0 | 0 | 0 |

`npm run i18n:check` passed across `vi`, `en`, `zh`, and `de`.

## 8. Hard-coded text

Total findings: not exhaustively counted across the whole legacy frontend because the active scope is Theme/i18n for used surfaces.

P0 handled:
- AppShell auth-session verification error text moved to translations.

P1 handled:
- Header search-all action moved to translations.
- Header level prefix moved to translations.
- Header stat number formatting now uses current locale.

Kept intentionally:
- Brand/product names such as Lumiverse, IELTS, TOEIC, CEFR.
- Backend log/test text.
- Legacy/admin/internal module strings outside this phase.

Not fully handled in this phase:
- Auth form marketing copy still contains hard-coded text.
- Dashboard inner panels still contain several English literals.
- Settings page has many legacy Vietnamese strings outside appearance controls.
- Learning modules still have mixed hard-coded UI text.

Reason: converting all legacy screens would be a broad copy/i18n migration and outside the focused Theme/i18n foundation pass requested here.

## 9. Persistence behavior

Guest theme: local Zustand persistence via `poppylingo-theme`; root anti-flash script applies before hydration.

Logged-in theme: local UI applies immediately. Backend setting is read once after auth bootstrap and applied as long-term sync.

Guest locale: local Zustand persistence via `poppylingo-locale`, mirrored to cookie `lumiverse-locale`.

Logged-in locale: local UI applies immediately. Backend setting is read once after auth bootstrap and applied to the language store/cookie.

Backend settings sync: PATCH is only triggered by explicit switcher/settings actions, not by render.

Error behavior: `/auth/me` 5xx/network errors are not treated as logout.

Reload behavior: theme and locale persist locally; no locale route prefix or redirect loop is introduced.

## 10. Verification results

```text
Frontend targeted lint: PASS
Frontend full lint: FAIL
Frontend typecheck: PASS
Frontend tests: PASS
Frontend build: PASS
i18n check: PASS

Backend lint check: FAIL
Backend tests: FAIL / KNOWN LEGACY FAILURES
Backend build: PASS

Prisma format: NOT REQUIRED
Prisma validate: NOT REQUIRED
Prisma generate: NOT REQUIRED
Prisma migrate status: NOT REQUIRED
```

Commands run:
- `npx eslint app/layout.tsx src/Components/ThemeInitializer.tsx src/Components/LanguageInitializer.tsx src/store/themeStore.ts src/store/languageStore.ts src/i18n/types.ts src/i18n/index.ts src/i18n/locales/vi.ts src/i18n/locales/en.ts src/i18n/locales/zh.ts src/i18n/locales/de.ts src/hooks/useTranslation.ts src/lib/locale-format.ts src/Components/Auth/AuthInitializer.tsx src/Components/Layout/ThemeToggle.tsx src/Components/Layout/LanguageSwitcher.tsx src/Components/Layout/AppHeader.tsx src/Components/Layout/AppShell.tsx scripts/check-i18n.mjs`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run i18n:check`
- `npm run lint -- --max-warnings=0`
- `cd backend && npm run lint:check -- --max-warnings=0`
- `cd backend && npm run build`
- `cd backend && npm run test -- --runInBand`

## 11. Known legacy issues

Legacy outside Theme/i18n:
- Full frontend lint still fails with 448 problems, mostly in Arena, Reading, Writing, leaderboard helpers, and legacy hooks.
- Backend lint check still fails with 3890 problems, mostly typed-lint/no-unsafe errors across specs and older modules.
- Backend tests still fail: 62 suites failed, 46 passed, 108 total. Main cause is missing TestingModule providers/mocks such as `PrismaService`, `AchievementsService`, `PronunciationService`, `PlacementProcessingService`, `PlacementTestService`, and similar.

Theme/i18n issues still remaining:
- Auth page, dashboard panels, and settings page still have hard-coded copy that should be migrated in a dedicated copy/i18n pass.
- Some older modules still use hard-coded `vi-VN`/`en-US` formatting. A shared helper now exists, but not every legacy usage was migrated.

Release blockers:
- No new Theme/i18n release blocker found in the changed files.

Non-blocking for this phase:
- Full repo lint/test failures are legacy and outside the scoped files changed here.

## 12. Final status

`READY WITH KNOWN LEGACY ISSUES`

The Theme/i18n foundation is now usable for active public/private shells, the switchers are more accessible, locale persistence is stronger, i18n consistency is checked automatically, and targeted verification passed. Full repository lint/test remains blocked by known legacy issues outside this phase.
