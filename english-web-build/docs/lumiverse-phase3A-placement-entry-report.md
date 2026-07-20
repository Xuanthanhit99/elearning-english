# Lumiverse Phase 3A Report: Placement Entry Experience

## 1. Audit Summary

Before writing any code, every file touching the placement entry flow was read and traced end to end.

**Routing (App Router, all confirmed live and wired):**

- `/placement` → `PlacementEntry.tsx` — Placement Home. Already rewritten in a prior, uncommitted pass to the Lumiverse design system, backed by `GET /placement/dashboard`. It already covered the FIRST_TIME / IN_PROGRESS / PROCESSING / COMPLETED states, retake-cooldown handling, and a skills-assessed panel, but had no secondary "manual level" action and used ad-hoc pulse divs for loading.
- `/placement/introduction` → `PlacementIntroduction.tsx` — Preparation/Instruction screen. Already Lumiverse-styled and functional against `GET /placement/introduction` + `POST /placement/session/start`. Its "before you begin" list didn't explicitly call out Internet/Quiet-environment readiness, and it also used ad-hoc pulse loading.
- `/placement/dashboard` → `PlacementDashboardScreen.tsx` — the "Existing Result Home" (rich completed-state view: radar chart, priorities, learning path, history, comparison, recommended courses). This file had **not** been migrated to Lumiverse tokens — it used raw `violet-*`/`slate-*` Tailwind classes, had no dark-mode support, and its FIRST_TIME/IN_PROGRESS/PROCESSING short-circuit states used a bespoke `StatusState` component instead of the shared `LumiverseState`.
- `/placement/test/[sessionId]`, `/placement/test/[sessionId]/processing`, `/placement/test/[sessionId]/result` — Question UI, timer, save-answer, processing, and result page. **Out of scope**, not touched, not read beyond confirming they exist and that no Phase 3A file constructs URLs into them other than by relaying `nextUrl`/`processingUrl`/`resultUrl`/`testUrl` values returned by the backend (never hardcoded).

**Orphan file found:** `src/Components/placement/PlacementLanding.tsx` is not imported by any route (`app/**`). It is an older, non-Lumiverse ("PoppyLingo" violet/fuchsia gradient) implementation of the same "home" concept, built against a *different* backend contract (`GET /placement/home`, `POST /placement/manual`) than the one the live `/placement` route uses (`GET /placement/dashboard`, `POST /placement/retake`). It also references a `/placement/certificate` route that does not exist anywhere in `app/`. It was left untouched (not in scope to delete), but its existence is worth a cleanup pass later — see Technical Risks.

**Manual Level Selection — verified real, not invented.** The brief only allows adding this secondary CTA if it's backed by a real feature. Traced `selectManualLevel()` in `src/lib/placement-api.ts` → `POST /placement/manual`, and confirmed the backend route is live: `backend/src/modules/placement/placement.controller.ts:62` (`@Post('manual')`) alongside `@Get('home')` at line 38. Certificate upload was **not** added, since no route or controller endpoint for it exists anywhere in the codebase (`/placement/certificate` is dead in `PlacementLanding.tsx`).

**Design system available for reuse:** `src/Components/UI/Lumiverse.tsx` (`LumiverseCard`, `LumiverseButton`, `LumiverseBadge`, `LumiverseProgress`, `LumiverseState`, `LumiverseSkeleton`, `LumiverseSectionHeader`, `LumiverseStatCard`) and the `--lumiverse-*` CSS custom properties in `app/globals.css` (light/dark variants, global `:focus-visible` ring, global `prefers-reduced-motion` rule already blanket-disabling animations/transitions).

## 2. Files Modified

- `src/Components/UI/Lumiverse.tsx` — added `LumiverseDialog` and `LumiverseDialogCloseButton` (see below); file now requires `"use client"` because of the added `useEffect`/`useRef`.
- `src/Components/placement/PlacementEntry.tsx` — added the Manual Level Selection secondary CTA and dialog, switched pulse-loading to `LumiverseSkeleton`, migrated `RetakeDialog` onto `LumiverseDialog`.
- `src/Components/placement/PlacementIntroduction.tsx` — added an explicit readiness checklist (Internet/Headphones/Microphone/Quiet environment), switched pulse-loading to `LumiverseSkeleton`, simplified the back-button label.
- `src/Components/placement-dashboard/PlacementDashboardScreen.tsx` — full token restyle to `--lumiverse-*`/`lumiverse-card`, dark-mode support added, `StatusState`/loading/error states rebuilt on `LumiverseState`/`LumiverseSkeleton`/`LumiverseButton`, `RetakeModal` migrated onto `LumiverseDialog`, radar chart given an accessible name. All data bindings, hooks, and business logic left byte-identical.

## 3. Files Created

- `app/(main)/placement/loading.tsx`
- `app/(main)/placement/introduction/loading.tsx`
- `app/(main)/placement/dashboard/loading.tsx`
- `docs/lumiverse-phase3A-placement-entry-report.md`
- `.claude/launch.json` (local dev-server launch config used only to QA this phase in the Browser pane; harmless to keep)

No files were deleted.

## 4. Components Reused

- `LumiverseCard`, `LumiverseButton`, `LumiverseBadge`, `LumiverseProgress`, `LumiverseState`, `LumiverseSkeleton` — reused as-is across all three screens.
- `LumiverseDialog` / `LumiverseDialogCloseButton` — new, but added to the shared design-system file specifically so the three dialogs in scope (Retake on Entry, Manual Level on Entry, Retake on Dashboard) share one accessible implementation instead of three copies of the same escape/focus-trap/backdrop logic.
- No new component library, no duplicate "PlacementCard"/"modal" implementations were introduced; the pre-existing `PlacementLanding.tsx` manual-level-modal pattern was used only as a visual reference, not copied wholesale (it was rebuilt on `LumiverseDialog` with Lumiverse tokens).

## 5. API/Services Reused

No API surface, DTO, or route was changed. Reused exactly as found:

- `getPlacementDashboard()`, `retakePlacement()` — `src/lib/placement-dashboard-api.ts` (`GET/POST /placement/dashboard`, `/placement/retake`).
- `getPlacementIntroduction()`, `startPlacementTest()` — `src/lib/placement-api.ts` (`GET /placement/introduction`, `POST /placement/session/start`).
- `selectManualLevel()` — `src/lib/placement-api.ts` (`POST /placement/manual`), newly *wired into the UI* (the function already existed, unused by any live route before this phase).

## 6. User States Implemented

- **First-time user** (`PlacementEntry`, state `FIRST_TIME`): hero, skill list, "how adaptive testing works", primary CTA to preparation, and the new secondary CTA "Choose my level manually" → `LumiverseDialog` with CEFR A1–C2 grid → `POST /placement/manual` → navigates to the backend-provided `nextUrl`. No session is created just by visiting the page.
- **Unfinished session** (`IN_PROGRESS`): Resume card showing start date/save-state, linking to the backend-provided `testUrl`. Never discards or recreates a session.
- **Completed** (`COMPLETED`): summary card with level/score, links to Continue Learning and the existing result/dashboard URL, plus Retake (respecting the cooldown flow already implemented, unchanged).
- **Processing**: link to the backend-provided `processingUrl` (screen itself untouched, out of scope).
- **Existing Result Home** (`PlacementDashboardScreen`): all six sub-states (loading, error, FIRST_TIME, IN_PROGRESS, PROCESSING, COMPLETED-with-full-analysis) restyled, none of the state-selection logic altered.
- **Resume Test**: preparation screen (`PlacementIntroduction`) already detects `data.test.hasActiveSession` and swaps the button to "Resume test" against the same `startPlacementTest()` call the backend treats as idempotent resume-or-start.
- **Preparation/Instruction**: step checklist, adaptive explanation, readiness checklist (new), skills grid, session status panel.
- **Loading**: both component-level skeletons (`LumiverseSkeleton`, `aria-busy`/`aria-live` regions) and new route-level `loading.tsx` for all three routes.
- **Error**: `LumiverseState tone="error"` with retry action on all three screens (pre-existing pattern, now consistent across all three).
- **Empty state**: N/A beyond error/first-time — no separate empty-result condition exists in the API contract.

## 7. Responsive Strategy

No layout grid breakpoints were changed on `PlacementEntry`/`PlacementIntroduction` (they already used `sm:`/`lg:`/`xl:` grid-template-column breakpoints down to a single column on narrow viewports). `PlacementDashboardScreen`'s existing `md:`/`lg:`/`xl:` grids were preserved unchanged — only class *values* for color/border/background were swapped, not structural/layout classes, so the existing responsive behavior at 320/375/430/768/1024/1440/1920 is unaffected by this phase. The new `LumiverseDialog` uses `w-full max-w-lg`/`max-w-xl` with `p-4` outer padding, so it stays within viewport bounds down to 320px.

## 8. Accessibility Improvements

- New `LumiverseDialog`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Escape-to-close, Tab/Shift+Tab focus trap, initial focus moved into the dialog on open, focus restored to the trigger on close, backdrop click closes.
- Loading regions now use `aria-busy="true"` + `aria-live="polite"` with a visually-hidden status string, instead of silent pulsing divs.
- The dashboard radar chart (`<svg>`) now has `role="img"` and a computed `aria-label` summarizing the overall score and every per-skill score, instead of being an unlabeled decorative graphic.
- CEFR level buttons in the new Manual Level dialog use `aria-pressed` for the selected state (not color alone).
- Global `:focus-visible` ring and `prefers-reduced-motion` rules (pre-existing, `app/globals.css`) automatically cover every new interactive element and the `lumiverse-shimmer` skeleton animation — no per-component overrides were needed or added.

## 9. Technical Risks

- **`src/Components/placement/PlacementLanding.tsx` is dead code** (unreferenced by any route, targets a different/older API contract, links to a non-existent `/placement/certificate` route). Left untouched per scope, but it will keep confusing future audits until it's deleted — worth a small, separate cleanup task.
- **Pre-existing, unrelated bug found during manual QA** (see Build/Test section below): after logging in, the app can get stuck indefinitely on the root `app/loading.tsx` skeleton, reproduced on both `/placement` and the untouched `/dashboard` route, with the dev server logging repeated `AxiosError: Không có refresh token` from `src/lib/axios.ts`'s refresh interceptor. This is **not** caused by any file in this phase (none of the three touched screens, `app/loading.tsx`, or `app/layout.tsx` were part of the diagnosis) — filed separately as a background task suggestion rather than fixed here, since it's out of Phase 3A's scope and touches session/cookie handling shared by the whole app.
- `LumiverseDialog` newly requires `Lumiverse.tsx` to be a Client Component (`"use client"` added). This is safe — every existing consumer of this file is already a Client Component — but any *future* Server Component that imports only the previously-stateless pieces (e.g. `LumiverseBadge`) will now pull in a client boundary. Not an issue today; worth remembering if this file is ever imported from a Server Component.

## 10. Build Result

`npm run build` (Next.js 16.2.9, Turbopack) — **PASS**. All 76 routes generated, including the three touched routes and the three new `loading.tsx` segments:

```
├ ○ /placement
├ ○ /placement/dashboard
├ ○ /placement/introduction
├ ƒ /placement/test/[sessionId]
├ ƒ /placement/test/[sessionId]/processing
├ ƒ /placement/test/[sessionId]/result
```

## 11. TypeScript Result

`npx tsc --noEmit` — **PASS**, exit code 0, no errors.

## 12. Scoped Lint Result

`npx eslint` on all touched/created files — **PASS**, 0 errors, 0 warnings (one `no-unused-vars` warning on an unused `LumiverseCard` import in the dashboard file was caught and fixed before the final pass).

## Manual/Live QA — Partial, Honestly Reported

I started both the backend (`npm run start:dev`, confirmed `Nest application successfully started`, DB migrations already up to date) and the frontend dev server via the Browser pane, and verified in a real browser:

- Visiting `/placement` while logged out correctly redirects to `/auth` (confirms the auth guard chain around the route is intact).
- The new `loading.tsx` chunks (`app_(main)_placement_loading_tsx`, etc.) are bundled and served for `/placement`, `/placement/introduction`, `/placement/dashboard`.
- Backend route `GET /placement/dashboard` correctly returns `401` without a session.

I then registered a throwaway local test account (`POST /auth/register` against the local dev DB — safe, local-only, reversible) and logged in through the real login form to visually verify the FIRST_TIME state, the new Manual Level dialog, and the restyled Dashboard. **This part did not complete**: immediately after login, the app got stuck on the root loading skeleton indefinitely — reproduced identically on the untouched `/dashboard` route, and traced to a refresh-token/session-handling issue in `src/lib/axios.ts` (see Technical Risks), not to anything changed in this phase. I stopped chasing it once it was clearly outside Phase 3A's scope and confirmed it wasn't caused by these changes, and filed it as a separate background-task suggestion instead of silently declaring the UI verified.

**Net effect:** build, type-check, and lint all pass cleanly, and static/served-route verification succeeded, but I could not visually confirm the FIRST_TIME/IN_PROGRESS/COMPLETED states or the new Manual Level dialog rendering correctly in a live authenticated browser session. That should be re-verified once the session bug above is fixed — I'm flagging this rather than claiming a full visual pass I didn't actually get.

Both dev servers (backend and frontend) were stopped after testing.
