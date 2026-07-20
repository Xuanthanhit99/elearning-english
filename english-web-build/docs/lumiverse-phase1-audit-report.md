# Lumiverse Phase 1 Audit & Refactor Report

Date: 2026-07-20

## Scope

Phase 1 establishes the Lumiverse design foundation for the active Next.js frontend in `english-web-build`.

No backend, database, API contract, authentication flow, cookie handling, or business logic was changed.

## Current Frontend Structure

- Framework: Next.js 16 App Router.
- Styling: Tailwind CSS 4 via `app/globals.css`.
- API/auth: Axios client in `src/lib/axios.ts` with `withCredentials: true`, refresh flow through `/auth/refresh`, and redirect to `/auth` on failed refresh.
- Shared app layout:
  - Root layout: `app/layout.tsx`
  - Main authenticated layout: `app/(main)/layout.tsx`
  - Shared shell: `src/Components/Layout/AppShell.tsx`
  - Shared header: `src/Components/Layout/AppHeader.tsx`
  - Shared sidebar: `src/Components/Layout/AppSidebar.tsx`
  - Shared logo/container: `src/Components/UI/AppLogo.tsx`, `src/Components/UI/ResponsiveContainer.tsx`
- Major modules present:
  - Homepage, Auth, Dashboard, Placement, Learning Path, Vocabulary, Grammar, Listening, Speaking, Writing, Missions, Community, Leaderboard, Pet, Notifications, Analytics, Settings, Reading, Arena, Admin.

## Phase 1 Changes

- Added Lumiverse CSS tokens in `app/globals.css`:
  - Brand colors from the supplied PoppyLingo logo: royal blue, electric cyan, violet, gold, rose, mint.
  - App background, card/surface, border, shadow, radius, focus ring, input, button, progress, skeleton shimmer utilities.
  - Dark mode token support.
- Updated root body styling to use the global Lumiverse background instead of fixed page colors.
- Updated app shell spacing for the new header/sidebar rhythm.
- Restyled shared header:
  - Glass navigation surface.
  - Lumiverse search input.
  - Updated stats, notification button, profile menu, and dropdown surface.
- Restyled shared sidebar:
  - Glass sidebar surface.
  - Gradient active navigation item.
  - Updated collapsed state and premium card.
- Restyled language and theme dropdown controls.
- Reworked the shared logo presentation using the existing `poppylingo-logo.png` asset.
- Added reusable UI foundation in `src/Components/UI/Lumiverse.tsx`:
  - `LumiverseCard`
  - `LumiverseButton`
  - `LumiverseBadge`
  - `LumiverseProgress`
  - `LumiverseSkeleton`
  - `LumiverseState`
- Updated global loading and error surfaces.
- Applied the new shared skeleton/state/progress primitives to Dashboard without changing `getDashboard()` or data flow.

## Files Changed

- `app/globals.css`
- `app/layout.tsx`
- `app/loading.tsx`
- `app/error.tsx`
- `src/Components/Layout/AppShell.tsx`
- `src/Components/Layout/AppHeader.tsx`
- `src/Components/Layout/AppSidebar.tsx`
- `src/Components/Layout/LanguageSwitcher.tsx`
- `src/Components/Layout/ThemeToggle.tsx`
- `src/Components/UI/AppLogo.tsx`
- `src/Components/UI/ResponsiveContainer.tsx`
- `src/Components/UI/Lumiverse.tsx`
- `src/Components/Dashboard/DashboardPage.tsx`

## Refactor Plan By Phase

1. Phase 1: Lumiverse foundation and shared app shell.
2. Phase 2: Homepage and Auth/Placement onboarding.
3. Phase 3: Dashboard, Analytics, Progress, History, Reports.
4. Phase 4: Learning Path, Vocabulary, Grammar, Listening, Speaking, Reading, Writing.
5. Phase 5: Missions, Community, Leaderboard, Pet, Inventory-like reward surfaces, Notifications.
6. Phase 6: Settings, Profile, Admin/Teacher utility surfaces, responsive QA, production hardening.

## Acceptance Criteria

- All screens continue to call existing API/state hooks and do not use static demo replacements.
- `src/lib/axios.ts` remains compatible with httpOnly cookie auth.
- Shared shell appears consistent across desktop/tablet/mobile.
- Loading, empty, and error states use Lumiverse primitives as modules are migrated.
- Lint and production build pass after each completed phase, or remaining failures are documented.

## Verification

- Scoped lint for Phase 1 changed files: passed.
- Production build: passed with `npm run build`.
- Full repo lint: failed before Phase 1 can be considered globally clean. Current failures are concentrated in older modules and rules, including:
  - `react-hooks/set-state-in-effect` in Writing, Arena, Reading, Leaderboard hooks.
  - `react-hooks/purity` for render-time `Date.now()` usage.
  - `@typescript-eslint/no-explicit-any` in Arena and several API helpers.
  - Existing warnings for unused variables and `<img>` usage across older pages.

These full-repo lint failures were not introduced by the Lumiverse foundation files touched in Phase 1.
