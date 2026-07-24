# Frontend Responsive Audit Report

## 1. Executive summary

The reported symptom — "mobile-only UI showing up on tablet/desktop, and vice versa" — was traced to a single, well-defined root cause: **a family of leftover prototype page shells** (nine files, referred to below as the "StudyArena" shells after the placeholder branding hardcoded inside them) that each render their own fixed-position sidebar and/or sticky header directly inside their page component. These shells have no Tailwind responsive class at all, so — unlike the real app shell — they are not "mobile content leaking to desktop", they are **desktop-style duplicate navigation chrome with no breakpoint gating**, rendered on top of the real, correctly-responsive `AppShell` (`AppSidebar` + `AppHeader` + `MobileNavigation`) that already wraps every authenticated route.

A previous engineer had discovered part of this problem and partially patched it with two broad, brittle CSS selector hacks (in `globals.css` and inline in `AppShell.tsx`) that hide `<aside>` elements matching a DOM-shape pattern, but only below the `xl` (1280px) breakpoint. That patch works for phones/tablets/small laptops, but at `xl`/large-desktop widths (≥1280px) the duplicate sidebar and (in several pages) a second duplicate header with hardcoded fake stats and a hardcoded fake user ("Minh Anh") render fully visible, alongside the real `AppSidebar`/`AppHeader`.

The fix applied here removes the dead legacy shell markup at its source (the component level) instead of adding more CSS. This is the safer, root-cause fix: no `!important` overrides were added, no new breakpoints or hooks were introduced, and the existing (now-redundant) CSS safety nets were left in place untouched, since removing them carries a small verification risk for zero functional benefit.

No SSR/hydration-based responsive bugs were found — the project does not use `window.innerWidth`, `matchMedia` for layout, or any `isMobile`/`useBreakpoint` hook. All responsive behavior in the live, correct parts of the app is done with plain Tailwind breakpoint classes, which is the right approach and was left unchanged.

## 2. Audit scope

Inspected: `app/` route tree (all `layout.tsx`/`page.tsx`/`loading.tsx`), `src/Components/Layout/*` (the shared app shell), `src/Components/**` page components for every route listed in the task brief, `app/globals.css`, `postcss.config.mjs` (Tailwind v4, no `tailwind.config.*`, no custom breakpoints), `src/hooks/*`, `src/store/*`, and every occurrence of `window.innerWidth`, `matchMedia`, `isMobile`/`isTablet`/`isDesktop`, `useMediaQuery`/`useBreakpoint`, and `fixed`/`sticky` + `h-screen` aside patterns across `src/`.

## 3. Current breakpoint architecture

- Tailwind v4 (`@import "tailwindcss"` in `globals.css`, no `tailwind.config.js`), so the **default** breakpoints apply everywhere: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`.
- This already matches the Lumiverse policy in the task brief (mobile < 768, tablet 768–1023, desktop ≥ 1024, large desktop ≥ 1280) — no breakpoint redefinition was needed.
- The real app shell (`AppShell.tsx`) gates the desktop sidebar/header at `lg` (1024px) and the mobile bottom nav at `lg:hidden` — consistent, single source of truth.
- No JavaScript media-query hook exists anywhere in the codebase (`isMobile`, `useMediaQuery`, `useWindowSize`, `window.innerWidth` were all grepped for — zero hits outside of `themeStore.ts`'s unrelated `prefers-color-scheme` check for dark mode). This means there is **no SSR/hydration risk category** to fix here — good news, and nothing was added.
- The legacy "StudyArena" shells used **no breakpoint classes at all** (not even the wrong ones) — that is the actual defect, not a boundary mismatch.
- Two other legacy sidebars (`MissionsPage`'s and `PetDashboardPage`'s `Sidebar` function, `VocabularyTestPage`'s `TestSidebar`) gate themselves at `2xl:block`/`xl:block` — a third, inconsistent breakpoint choice for "desktop sidebar" — but these are **dead code** (defined, never rendered in the live JSX), so they are not a live bug. Left untouched per "don't delete a component without confirming it isn't used elsewhere" — these aren't used anywhere, but deleting unused functions was out of scope for a responsive-correctness fix.

## 4. Root causes found

1. **Duplicate legacy page shells with zero responsive classes.** Nine live routes rendered their own hardcoded `<aside>` (fixed, `w-260px`–`w-285px`, `h-screen`, `left-0`) and, in most cases, their own `<header>` with fake/duplicate stats — fully unguarded by any `hidden`/`lg:hidden` class — nested inside the already-complete `AppShell`. Confirmed live via `page.tsx` → component import trace for every file below.
2. **Brittle, DOM-shape-matching CSS hacks used to mask (1) instead of fixing it**, in two places (`globals.css` `.single-menu-content` media query, and an inline `<style jsx global>` block in `AppShell.tsx`), both keyed on `aside[class*="fixed"][class*="left-0"][class*="h-screen"]`-style attribute selectors. These only apply below `xl` (1280px), so they mask the sidebar duplication on phones/tablets/small desktops but do nothing at ≥1280px, and neither of them touches the duplicate `<header>` at all.
3. **One additional, narrower instance** of the same pattern in `app/(main)/(option)/check-word/layout.tsx`, which explicitly rendered `VocabularySidebar` (`StudySidebar`, gated `xl:block`, so only visible ≥1280px — masked by the CSS hacks above) and `TopBar` (a second header with **no responsive class of any kind**, so visible at every breakpoint, unmasked by anything).

## 5. Mobile-only leaks (mobile UI visible on tablet/desktop)

**None found.** No component intended to be mobile-only (the real `MobileNavigation` bottom bar, the `AppSidebar` mobile drawer) leaks past its breakpoint. Both use consistent `lg:hidden`/`lg:block` gating and are rendered exactly once, from `AppShell.tsx` only.

## 6. Desktop-only leaks (desktop UI visible on mobile) / duplicate-desktop leaks

The nine legacy shells below rendered an *always-on* desktop-style sidebar (and in most cases a duplicate header) with no responsive class. Below `xl` (1280px) they were already masked by the pre-existing CSS hacks (section 4.2); **at ≥1280px they rendered fully, duplicated alongside the real `AppSidebar`/`AppHeader`.** All nine are now fixed by deleting the dead shell markup at the component level:

| Route | Component | Had duplicate sidebar | Had duplicate header (fake/duplicate stats) |
|---|---|---|---|
| `/grammar/topic/[...slug]` | `GrammarDetailPage.tsx` | yes | yes (hardcoded "Minh Anh") |
| `/grammar/lesson/[...lessonId]` | `GrammarLessonLeaningPage.tsx` (`LessonPageShell`) | yes | yes (hardcoded "Minh Anh") |
| `/reading/categories` | `ReadingCategoriesPage.tsx` | yes | yes (real streak/XP data, still duplicate) |
| `/reading/history` | `ReadingHistoryPage.tsx` | yes | yes (hardcoded fake stats) |
| `/reading/categories/[slug]` | `ReadingTopicDetailPage.tsx` | yes | yes (real data, still duplicate) |
| `/writing/homelog` | `WritingPage.tsx` | yes | yes (hardcoded fake stats) |
| `/speaking/situations` | `SpeakingSituationsPage.tsx` | yes | yes (hardcoded fake stats) |
| `/check-word` | `app/(main)/(option)/check-word/layout.tsx` | yes (masked by CSS hack) | yes, **unmasked at every breakpoint** |

Also found and confirmed **not** live bugs (dead code only, left untouched):
- `FlashcardsPage.tsx` — its aside carries a bare `hidden` class (permanently invisible, harmless).
- `AllFlashcardsPage.tsx`, `CreateFlashcardPage.tsx` — their `Sidebar`/`Header` are wrapped in `<div className="hidden">` or simply never invoked.
- `MissionsPage.tsx`, `PetDashboardPage.tsx` — a `Sidebar` function exists but is never called in the live render (already cleaned up by a prior pass, evidenced by a `{/* legacy page chrome removed */}` comment left in place).
- `VocabularyTestPage.tsx`'s `TestSidebar`, `Vocabulary/detailedperformance/DetailedPerformance.tsx` — defined, never imported/rendered anywhere.
- `Listening_v0/*` (whole folder) — not routed anywhere; superseded by `Listening/*`.
- `src/Components/HomePage/Header.tsx` — a non-responsive, fixed 3-column header with no imports anywhere in `app/`; dead code. The **live** public homepage header (inline in `HomePage.tsx`) is correctly responsive (`hidden lg:flex` desktop nav + `lg:hidden` mobile toggle + mobile panel) and required no change.

## 7. Tablet conflicts

None found. Because the underlying defect was "no responsive class at all" rather than a wrong breakpoint choice, there was no tablet-specific double-render scenario distinct from the desktop one described above — the same fix resolves both. The real `AppShell` never renders both mobile and desktop navigation simultaneously at any width.

## 8. App shell findings

`AppShell.tsx` / `AppSidebar.tsx` / `AppHeader.tsx` / `MobileNavigation.tsx` are correctly implemented:
- Desktop sidebar: `hidden ... lg:block` (fixed, `inset-y-0 left-0`).
- Mobile drawer: separate `<aside>`, `lg:hidden`, slide-in via `translate-x`.
- Mobile bottom nav: `lg:hidden`, `fixed inset-x-0 bottom-0`.
- `AppHeader`: single instance, `fixed`, offsets itself by sidebar width (`lg:left-[96px]`/`lg:left-[280px]`).
- Main content padding: `pb-24 lg:pb-0` (bottom-nav clearance only when the bottom nav exists) and `pt-[76px]` (header clearance) — correct, no leftover mobile padding on desktop.
- `focusMode` (placement test) correctly suppresses the whole shell for a distraction-free test screen.
- Auth pages (`app/(auth)/layout.tsx`) and the public homepage (`app/page.tsx`) do not render `AppShell` at all — no authenticated-shell leakage into public/auth routes.

The only defect at the shell level was the inline `<style jsx global>` block in `AppShell.tsx` (see section 9) — a symptom of the same underlying page-shell duplication, not a shell design flaw.

## 9. Global CSS findings

`app/globals.css`'s `.single-menu-content` block (a `@media (max-width: 1279px)` rule) and `AppShell.tsx`'s inline `<style jsx global>` block both exist solely to paper over the duplicate legacy sidebars described above, via `aside[class*="..."]` attribute-selector matching plus `display: none !important`. Both are now functionally dead (nothing in the live DOM matches their selectors post-fix), but were **left in place, untouched**: removing them carries a small non-zero risk of missing some other instance across the ~150-component codebase, for zero functional upside now that the actual duplication is gone at the source. This is flagged as a safe, optional future cleanup, not performed here in the interest of the smallest safe change.

The rest of `.single-menu-content` (overflow/grid-column/padding clamps for narrow widths) is unrelated defensive CSS for legacy fixed-pixel-width components and was not touched.

The `.dark .lumiverse-theme-compat` block only maps legacy light-mode Tailwind color utilities to dark-mode tokens — confirmed unrelated to visibility/layout, not touched.

## 10. SSR and hydration findings

No hydration risk found or introduced. The app does not do JS-based mobile detection anywhere; all real responsive gating is pure CSS (Tailwind classes), which is SSR-safe by construction (server and client render identical markup; only CSS media queries decide what's visible). `ThemeInitializer`'s anti-flash script and `suppressHydrationWarning` on `<html>` are unrelated to layout and were not touched.

## 11. Page-by-page findings

Full page-by-page classification per the task's route list was performed via targeted inspection (app shell first, then every component matching the duplicate-shell pattern, then a systematic `h-screen`/`fixed`/`sticky` grep across all of `src/`). Detailed per-page notes are in section 6 above and the "not touched" list. All other routes render through the correct, single `AppShell`/public-homepage/auth-layout paths and showed no duplicate-navigation, hidden/flex conflict, or breakpoint-mismatch pattern on inspection of their shell-level code. Notifications drawer, Arena pages, and modal/dialog patterns were spot-checked (section on Arena/Home below) and found correctly responsive already.

## 12. Files changed

- `app/(main)/(option)/check-word/layout.tsx` — removed duplicate `VocabularySidebar`/`TopBar`, now a plain pass-through layout (matches the sibling `vocabulary/layout.tsx` pattern, which already had this commented out).
- `src/Components/Grammar/GrammarDetailPage.tsx`
- `src/Components/Grammar/GrammarLessonLeaningPage.tsx`
- `src/Components/reading/ReadingCategoriesPage.tsx`
- `src/Components/reading/ReadingHistoryPage.tsx`
- `src/Components/reading/ReadingTopicDetailPage.tsx`
- `src/Components/WritingPage/WritingPage.tsx`
- `src/Components/SpeakingPractice/SpeakingSituationsPage/SpeakingSituationsPage.tsx`

Each of the seven component files had its dead `<aside>` (legacy sidebar) and `<header>` (legacy/duplicate header) blocks deleted, and the `<main className="ml-[Npx] flex-1">` offset changed to `<main className="flex-1">` since no local sidebar remains to offset for. No other markup, data-fetching, or business logic was touched in any of these files.

Not touched (documented, no live bug): `FlashcardsPage.tsx`, `AllFlashcardsPage.tsx`, `CreateFlashcardPage.tsx`, `MissionsPage.tsx`, `PetDashboardPage.tsx`, `VocabularyTestPage.tsx`, `Vocabulary/detailedperformance/DetailedPerformance.tsx`, `Listening_v0/*`, `HomePage/Header.tsx`, `globals.css`'s `.single-menu-content` aside-hiding rule, `AppShell.tsx`'s inline `<style jsx global>` hack.

## 13. Responsive utilities consolidated

None needed — no duplicate/conflicting responsive **hooks** existed (there were none at all). The fix was deletion of duplicate **markup**, not consolidation of logic.

## 14. Navigation behavior after fixes

- Mobile (< 768): `AppSidebar` mobile drawer (trigger via `AppHeader`'s menu button) + `MobileNavigation` bottom bar. No legacy sidebar/header renders on any of the nine fixed routes.
- Tablet (768–1023): same as mobile (no `lg` sidebar yet) — matches existing app-wide behavior, unchanged by this fix.
- Desktop (≥1024) / large desktop (≥1280): `AppSidebar` (collapsed/expanded) + `AppHeader` only. The nine routes above no longer render a second sidebar or a second header at any width, including ≥1280px where the old CSS hacks provided no protection.

## 15. Overflow fixes

None required beyond the shell fix — the deleted headers/asides were themselves a source of layout distortion (e.g. fixed `w-[700px]` search bars, `w-[260–285px]` fixed sidebars) at the specific breakpoint where they leaked; removing them removes that overflow/duplication surface simultaneously. No other page-level horizontal-overflow defects were found in the routes inspected.

## 16. Tables/forms/modal/drawer fixes

`NotificationDrawer` (right-side sheet, `w-full max-w-md`, `h-dvh`, backdrop `sm:hidden`) was inspected and found already correct — no change made. No table/form/modal defects were found or required for this fix; a full page-by-page pass over every table/form in the app was out of scope given the confirmed, narrow root cause, per the "smallest safe change" directive.

## 17. Arena responsive validation

Arena components (`ArenaPage.tsx`, `ArenaRoomPage.tsx`, `ArenaRoomRoute.tsx`) use a single fluid layout with breakpoint-gated CSS grid (`lg:grid-cols-[1fr_360px]`, `xl:grid-cols-[440px_1fr]`) and no hardcoded duplicate-shell pattern — no `isMobile`/`fixed`-sidebar issues found. No Arena business logic, socket handling, or scoring was touched, per the constraint that Arena has already passed production backend acceptance.

## 18. Home/dashboard/profile validation

Public homepage (`HomePage.tsx`): correctly responsive header/nav (`hidden lg:flex` desktop nav, `lg:hidden` mobile toggle + panel) — confirmed via direct inspection, no changes needed. Logged-in dashboard uses the real `AppShell` exclusively — no duplicate navigation. Profile page was not found to import any of the fixed legacy shells.

## 19. Automated viewport validation

No existing Playwright/E2E harness was found in the frontend project (`scripts/` only contains a Node auth-redirect smoke script and an i18n checker). Per the instruction to avoid installing a large new testing system, automated multi-viewport UI assertions were not added in this pass; validation was performed via static analysis (import-graph tracing to confirm every affected component is actually routed live, before/after lint and typecheck diffs, and a full production build). This is called out below as the one requirement not fully satisfiable without adding new tooling.

## 20. Lint/typecheck/test/build results

- `npm run typecheck`: **0 errors** (clean before and after).
- `npm run lint` (changed files only): errors went from 9 → 8 (one `@typescript-eslint/no-explicit-any` error was deleted along with the dead code in `WritingPage.tsx`). Warnings rose from 16 → 91, entirely `no-unused-vars` for icon imports and small helper components (`SidebarItem`, `TopStat`, `IconCircle`, `menuGroups`, etc.) that only existed to serve the now-deleted legacy chrome — expected, non-blocking, documented below.
- `npm run build` (`next build --webpack`, the approved production build path): **succeeded**, all 74+ routes compiled and generated, including every fixed route (`/check-word`, `/grammar/topic/[...slug]`, `/grammar/lesson/[...lessonId]`, `/reading/categories`, `/reading/categories/[slug]`, `/reading/history`, `/writing/homelog`, `/speaking/situations`).
- `npm run test` (auth-redirect smoke) and `npm run i18n:check` were not re-run since no auth or i18n code was touched.

## 21. Known unrelated warnings

- The pre-existing `metadataBase` Next.js warning during build (localhost fallback for OG/Twitter images) — present before this change, unrelated to responsive layout, not addressed per task instructions.
- ~75 new `@typescript-eslint/no-unused-vars` **warnings** (not errors) across the seven fixed files, for icon imports and small helper components that only served the deleted legacy chrome. Safe, mechanical, optional cleanup; left as-is to keep this change scoped to the responsive-correctness fix. Does not affect typecheck or the production build.
- One pre-existing, unrelated, uncommitted change was observed in `HomePage.tsx` (an image filename from `.jpg` to `.png`) that was already present in the working tree before this session started and was not made by this task — left untouched.

## 22. Remaining non-blocking UI polish

- The now-dead CSS hacks in `globals.css` (`.single-menu-content` aside-hiding rule) and `AppShell.tsx` (inline `<style jsx global>` block) can be removed in a future pass once the team is comfortable there are no other instances of the legacy-shell pattern left undiscovered; left in place here as a harmless safety net.
- The orphaned dead code identified in section 6 (`Listening_v0/*`, `HomePage/Header.tsx`, various unused `Sidebar`/`TestSidebar` functions, `VocabularySidebar`/`TopBar` exports in `VocabularyPage.tsx`) is safe to delete in a dedicated cleanup pass but was not removed here, since deleting unused code was not necessary to fix the responsive defect and was out of scope for "smallest safe change."
- The new unused-import lint warnings (section 21) are a good candidate for a quick automated cleanup pass.

## 23. Final decision

**FRONTEND RESPONSIVE ACCEPTANCE: PASSED WITH NON-BLOCKING LIMITATIONS**

Rationale: the confirmed, reproducible root cause (duplicate desktop-style navigation shells leaking past their masking breakpoint on nine routes) is fixed at the source, verified via typecheck + lint diff + full production build across all affected routes, with no regressions and no unrelated functionality touched. The "non-blocking limitations" qualifier reflects that (a) no automated multi-viewport browser assertions were added (no existing E2E harness to extend, and installing one was out of scope), and (b) a small amount of now-unreachable defensive CSS and unrelated dead code was intentionally left in place rather than removed, to keep the change minimal and safe.

---

## FINAL MULTI-VIEWPORT VALIDATION

*(Added in a follow-up validation pass. This section closes the two limitations noted in section 23 above — no browser-level validation, and unresolved lint warnings in the fixed files — with real, browser-executed evidence.)*

### 1. Baseline recovery

Confirmed before any changes: current branch `main`; `git status` showed only the 9 files + 2 docs from the prior fix, no `studyarena/**` deletions, no unrelated changes. Grepped all 7 previously-fixed component files plus `check-word/layout.tsx` for `StudyArena`, `Minh Anh`, and the old unguarded `fixed ... h-screen` sidebar pattern — zero hits. The prior fix was fully intact before this pass began.

### 2. Previous fix verification

Re-confirmed via the same grep sweep (above) and by re-reading `AppShell.tsx`, `AppSidebar.tsx`, `AppHeader.tsx`, `MobileNavigation.tsx` — unchanged since the prior session, still correctly `lg`-gated with no duplication.

### 3. Viewports tested

Full 14-viewport spread from the task brief (360×800, 375×812, 390×844, 430×932, 768×1024, 820×1180, 912×1368, 1024×768, 1280×800, 1366×768, 1440×900, 1600×900, 1920×1080) was applied in full to `/dashboard` and `/check-word` (the general app shell and the historically most-broken route). A 4-point primary set (390×844, 820×1180, 1280×800, 1920×1080, one per breakpoint category) was applied to the public routes and every other authenticated route checked. A 2-point extremes set (390×844, 1920×1080) was applied to a broader sanity sweep of additional authenticated routes.

### 4. Routes browser-validated

Real Chromium (Playwright, headless) driven against the project's own already-running dev servers (frontend `:3000`, backend `:3002`, Postgres/Redis containers already up), authenticated with a disposable test account created through the real `/auth/register` → `/auth/login` cookie flow (no localStorage auth, no hardcoded real credentials):

- Public: `/`, `/login`, `/register` (primary-4 viewports)
- App shell: `/dashboard` (full 14-viewport matrix)
- Previously-fixed routes: `/check-word` (full 14-viewport matrix); `/grammar/topic/[slug]`, `/grammar/lesson/[id]`, `/reading/categories`, `/reading/history`, `/reading/categories/[slug]`, `/writing/homelog`, `/speaking/situations` (primary-4 viewports each)
- Additional authenticated sanity sweep (extremes-2 viewports each): `/profile`, `/settings`, `/notifications`, `/vocabulary`, `/arena`, `/community`, `/admin`, `/placement`, `/learning-path`
- Live breakpoint-transition checks on `/dashboard`: resized 767→768, 1023→1024, 1279→1280 within a single page session (no reload)

Total: 100+ real page loads with DOM-level assertions (not screenshot-only).

### 5. Routes static-reviewed only

Deeper sub-routes not requiring their own layout logic (e.g. individual placement test steps, individual Arena match/result states, community post detail, club management, admin sub-tables/forms) were not independently browser-visited in this pass — they inherit the same `AppShell` verified clean on every other route, and were covered by the original session's static code review. No page-local duplicate-shell pattern exists outside the 9 files fixed in the original pass (confirmed by the `h-screen`/`fixed left-0` grep sweep done then), so these are STATIC REVIEW ONLY, not re-verified live here.

### 6. Navigation visibility results

Across every browser-validated route and viewport: mobile/tablet (<1024px) → desktop sidebar absent, exactly one header, bottom nav present; desktop/large-desktop (≥1024px) → exactly one desktop sidebar, exactly one header, bottom nav absent. No route showed both systems at once at any width, including the full 1024–1920px sweep. Zero exceptions across 100+ checks.

### 7. Duplicate chrome results

DOM-level counts of `data-testid="app-sidebar-desktop"` / `app-header` / `app-bottom-nav` (added to `AppSidebar.tsx`, `AppHeader.tsx`, `MobileNavigation.tsx` for reliable automated detection) confirmed exactly one of each visible element at every viewport, on every route checked. A body-text search for the legacy markers `"StudyArena"` and `"Minh Anh"` (the two smoking-gun strings from the original defect) returned **zero matches** on any authenticated route at any viewport.

### 8. Horizontal overflow evidence

`document.documentElement.scrollWidth - window.innerWidth` was measured on every check. Result: **0px overflow on every single route/viewport combination**, public and authenticated, across all 100+ checks. No table, no fixed-width element, no modal produced page-level horizontal scroll at any of the 14 viewports.

### 9. Fixed/sticky overlap results

Not independently measured via bounding-box assertions in this pass (beyond the duplicate-count and overflow checks above); no visual clipping was observed in the screenshots captured for `/dashboard` and `/check-word` at 390/1280/1920px. No regression indicated.

### 10. Modal/drawer results

`NotificationDrawer` was reviewed statically in the original pass (right-side sheet, `w-full max-w-md`, `h-dvh`, backdrop `sm:hidden` by design) — not independently re-opened via browser interaction in this pass. No change was made to any modal/drawer component, so no regression risk exists.

### 11. Table/form/media results

No table/form/media-specific browser interaction was performed in this pass (out of scope — no defect was found or suspected in this area by either audit pass).

### 12. Light/dark results

Dark mode was toggled (`document.documentElement.classList.add("dark")`) and screenshotted on `/dashboard` at 390×844 and 1440×900 during the v2 run as a sanity check; no visual break was observed. Full dark-mode parity across every route/viewport was not exhaustively re-verified (unchanged from the original pass — no CSS was touched that would affect theming).

### 13. SSR/hydration results

No hydration warnings, no React console errors, and no page errors were observed on any of the routes explicitly checked with console/page-error listeners attached (`/reading/categories`, `/reading/history`, `/writing/homelog`, `/speaking/situations`, run twice each). The app continues to use zero JS-based responsive detection (confirmed again in this pass), so there is no hydration-mismatch surface for layout.

### 14. Breakpoint transition results

Live in-page resize on `/dashboard`, no reload:
- 767→768: bottom nav stays visible, sidebar stays absent both before and after (correct — `lg` is 1024, so 768 is still below it).
- 1023→1024: sidebar flips 0→1 and bottom nav flips 1→0 exactly at the transition, with no stuck old-layout state and no duplicate rendering during the switch.
- 1279→1280: sidebar stays visible, bottom nav stays absent both before and after (no `xl`-specific shell change expected, none observed — confirming the historical "only masked below 1280px" defect class is fully gone).

### 15. Files changed during final validation

- `src/Components/Layout/AppSidebar.tsx`, `AppHeader.tsx`, `MobileNavigation.tsx` — added `data-testid` attributes only (`app-sidebar-desktop`, `app-sidebar-mobile-drawer`, `app-header`, `app-bottom-nav`) for reliable automated detection; no behavior/markup/class changes.
- `src/Components/Grammar/GrammarDetailPage.tsx`, `GrammarLessonLeaningPage.tsx`, `src/Components/reading/ReadingCategoriesPage.tsx`, `ReadingHistoryPage.tsx`, `ReadingTopicDetailPage.tsx`, `src/Components/WritingPage/WritingPage.tsx`, `src/Components/SpeakingPractice/SpeakingSituationsPage/SpeakingSituationsPage.tsx` — lint cleanup only (see section 16); no markup changes beyond what was already applied in the original pass.
- `package.json` / `package-lock.json` — added `playwright` as a devDependency; added `"test:responsive"` npm script.
- `scripts/responsive-regression-check.mjs` — new, permanent, minimal regression script (see section 17).
- `docs/frontend-responsive-audit-report.md`, `docs/frontend-responsive-regression-checklist.md` — this update.

### 16. Lint cleanup

Restricted to the 7 files changed by the original responsive fix, as instructed — no whole-project lint pass was run. For each file, removed only: lucide-react icon imports that became unused once the dead legacy sidebar/header JSX was deleted, and the small leftover local helper components/consts (`SidebarItem`, `SidebarTitle`, `TopStat`, `IconCircle`, `Stat`, `menuGroups`, `menus`, one dead `handleSearchSubmit`/`searchKeyword` pair) that existed only to serve that deleted markup. Business-logic imports and components were left untouched.

Result: warnings across the 7 files dropped from 91 → 12 (the remaining 12 are all pre-existing `@next/next/no-img-element` notices, unrelated to this fix). Errors dropped from 8 → 7 (one `@typescript-eslint/no-explicit-any` error was deleted along with a dead component). The 7 remaining errors are all pre-existing (`react-hooks/set-state-in-effect` on real data-fetching effects, `no-explicit-any` on real prop types, two pre-existing unused-var warnings) — none introduced by, or related to, the responsive fix.

### 17. Automated responsive regression coverage

No E2E framework existed in the repo. Playwright (Chromium only) was added as a devDependency — justified because this validation pass proved it works reliably against the project's existing dev workflow, and because the task explicitly calls for exactly this kind of coverage. A small, permanent script was added at `scripts/responsive-regression-check.mjs`, wired to `npm run test:responsive`. It is **not** part of `npm run build` or any CI step — it requires a live dev server and backend, which this repo has no automated way to spin up, so it is a manual/developer-run check, matching the task's "do not introduce a broad permanent testing architecture" constraint.

It asserts exactly the defect class fixed here: sidebar/header/bottom-nav visibility counts at 390/820/1280/1440/1920px on `/dashboard` and `/check-word`, plus a single-viewport (1280px) duplicate-chrome check on all 7 previously-fixed routes, plus a `legacyChrome` text-search guard. Verified working: `npm run test:responsive` → 13/13 checks pass against the current code.

### 18. Typecheck/test/build results

- `npm run typecheck`: 0 errors (both before and after the lint cleanup edits).
- `npm run lint` (7 changed files): see section 16.
- `npm run test:responsive`: 13/13 checks pass (see section 17).
- `npm run build` (`next build --webpack`, confirmed still the approved script in `package.json`): succeeded, all 74+ routes compiled and generated, including every route touched by either audit pass. Only the pre-existing, unrelated `metadataBase` warning appeared.
- `npm run test` (auth-redirect smoke) / `npm run i18n:check`: not re-run — no auth or i18n code was touched in either pass.

### 19. Remaining limitations

- One infrastructure incident occurred mid-validation and is worth recording: the backend dev server (`:3002`) crashed partway through the first full validation run (cause not captured — no log file was being written by the process at the time), which produced a batch of false "stuck on loading skeleton" results for `/reading/*`, `/writing/homelog`, `/speaking/situations`, and the broader sanity sweep. This was correctly diagnosed (curl to the backend returned connection-refused; a diagnostic script with console/page-error capture showed clean loads immediately after restart) and is **not** a frontend defect — it was resolved by restarting the backend (`npm run start:dev`), after which every affected route re-validated cleanly. This is called out explicitly so it is not mistaken for a masked issue.
- 6 disposable test accounts (`*@example.com`, created via the real register flow for validation) remain in the dev database. Deleting them via the API is not exposed, and a raw-SQL delete was attempted but hit a multi-level foreign-key chain (`User` → `UserWeeklyVocabularyPlan` → `UserDailyVocabularyPlan` → `UserDailyVocabularyWord`, and similar chains through Arena/Pet/Community tables) that would require either a proper cascading admin-delete flow or a much larger cleanup script to fully unwind safely. Left in place rather than risk broader/incorrect deletes; listed here so they can be cleaned up deliberately. IDs: `585f095b…`, `e8bfb026…`, `fa0dc875…`, `b9273347…`, `72f47233…`, `94871085…` (see `SELECT * FROM "User" WHERE email LIKE '%example.com%'`).
- Fixed/sticky bounding-box overlap and modal/drawer interaction were not independently re-verified via browser automation in this pass (sections 9–10) — covered by static review only, as in the original pass.
- Full light/dark parity across every route/viewport was not re-verified exhaustively (section 12) — spot-checked only, since no theme-affecting CSS was touched.

### 20. Final decision

**FRONTEND UI VALIDATION: PASSED WITH NON-BLOCKING LIMITATIONS**
