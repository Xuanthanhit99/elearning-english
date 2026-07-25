# Frontend Responsive Regression Checklist

Use this checklist when validating any future responsive/layout change. Widths reference the BeaconVie breakpoint policy: mobile < 768, tablet 768â€“1023, desktop â‰¥ 1024, large desktop â‰¥ 1280 (Tailwind v4 defaults: `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`).

## Automated check

`npm run test:responsive` (in `english-web-build/`) runs `scripts/responsive-regression-check.mjs` against a live dev server (frontend `:3000`, backend `:3002` must already be running) and asserts the exact checks in the table below via real DOM measurements. Not part of `npm run build` or CI â€” run it manually before/after touching `AppShell`, `AppSidebar`, `AppHeader`, `MobileNavigation`, or any page-level shell.

## Exact viewport checks

`AppSidebar`, `AppHeader`, and `MobileNavigation` carry `data-testid="app-sidebar-desktop"` / `"app-header"` / `"app-bottom-nav"` respectively â€” use these for reliable automated or manual DOM queries instead of guessing at class names.

| Width | Expected `app-sidebar-desktop` (visible) | Expected `app-header` (visible) | Expected `app-bottom-nav` (visible) |
|---|---|---|---|
| 390px | 0 | 1 | 1 |
| 820px | 0 | 1 | 1 |
| 1024px | 1 | 1 | 0 |
| 1280px | 1 | 1 | 0 |
| 1440px | 1 | 1 | 0 |
| 1920px | 1 | 1 | 0 |

For every row above, on every authenticated route:
- [ ] Duplicate app sidebar: `document.querySelectorAll('[data-testid="app-sidebar-desktop"]')` filtered to `display !== "none"` is exactly the count in the table (never 2+).
- [ ] Duplicate app header: same check for `[data-testid="app-header"]` â€” exactly 1, never 2+.
- [ ] Legacy StudyArena chrome: `document.body.innerText` contains neither `"StudyArena"` nor `"Minh Anh"` (the two markers of the legacy prototype shell fixed in this audit).
- [ ] Page scroll width: `document.documentElement.scrollWidth - window.innerWidth <= 2` (zero-tolerance for page-level horizontal overflow; small containers with intentional inner scroll â€” tables, carousels â€” are exempt as long as the outer page doesn't scroll).
- [ ] Bottom-nav overlap: at <1024px, the last interactive element/button in page content is not visually covered by the fixed bottom nav (check computed bottom padding on `AppShell`'s `<main>` is present whenever the bottom nav renders).

## Mobile navigation
- [ ] `MobileNavigation` bottom bar renders only at < 1024px (`lg:hidden`).
- [ ] `AppSidebar`'s mobile drawer only opens via the header menu button, closes on route change and on Escape.
- [ ] No page-local component duplicates the bottom nav or drawer.

## Tablet navigation
- [ ] Between 768â€“1023px, exactly one navigation system is visible (mobile drawer/bottom nav) â€” never both mobile and desktop chrome at once.
- [ ] No page renders a second sidebar/header that only "wakes up" between specific tablet widths.

## Desktop sidebar
- [ ] `AppSidebar` desktop rail renders only at â‰¥ 1024px (`lg:block`), collapsed/expanded width reflected correctly in `AppHeader`'s left offset and `AppShell`'s `main` left padding.
- [ ] **Check â‰¥ 1280px specifically** (the "large desktop" boundary): no page renders a second, page-local `<aside>` alongside the real sidebar. (This was the exact class of bug fixed in this pass â€” CSS hacks below 1280px can mask a duplicate that still shows above it.)

## Header
- [ ] Exactly one `<header>` renders per authenticated page â€” `AppHeader` only. Watch for page components that render their own `sticky top-0` header with search/stats/user-menu duplicating `AppHeader`.
- [ ] No header shows hardcoded/fake user data (a strong signal of leftover prototype chrome, e.g. the "Minh Anh" placeholder found and removed in this pass).

## Public layout
- [ ] `app/page.tsx` and `app/(auth)/*` never render `AppShell`, `AppSidebar`, or `MobileNavigation`.
- [ ] Public homepage header collapses to a hamburger/mobile panel below `lg` and never shows the desktop nav row at the same time as the mobile panel.

## Authenticated layout
- [ ] Every route under `app/(main)/**` renders through `AppShell` exactly once; nested `layout.tsx` files (e.g. `check-word`, `vocabulary`) must not re-render sidebar/header chrome â€” pass `{children}` straight through.
- [ ] New skill-module pages should not introduce their own page-local sidebar/header "shell" â€” reuse `AppShell`'s chrome.

## Arena gameplay
- [ ] Mobile bottom nav / desktop sidebar must not overlap or shrink the gameplay area (check the `lg:grid-cols-[1fr_360px]` / `xl:grid-cols-[440px_1fr]` breakpoints still leave a usable width).
- [ ] No Arena screen recalculates authoritative game/score values client-side.

## Modals
- [ ] Mobile: modal width is viewport-safe (`max-w-[calc(100vw-â€¦)]`), content scrolls internally, close button stays reachable.
- [ ] Desktop: modal does not become accidentally full-screen.
- [ ] Modal clipping: no modal's header/footer is cut off by the viewport at 390px or 820px; `max-height` respects `90dvh` or similar.
- [ ] Hidden overlay: closing a modal/drawer/dropdown removes its backdrop from the DOM or sets `pointer-events: none` â€” no invisible element left intercepting clicks on the page underneath.

## Drawers
- [ ] `NotificationDrawer` (and any future drawer) is a single instance, correct side, backdrop only where intended (currently `sm:hidden` backdrop by design), no duplicate backdrop stacking.
- [ ] Body scroll lock (if used) is released on close.

## Tables
- [ ] Wide tables scroll horizontally within their own container; the page itself never gains horizontal scroll from a table.

## Forms
- [ ] Paired fields stack on mobile; buttons/validation text never overflow the viewport.

## Images
- [ ] `next/image` usage has sensible `sizes`/`width`/`height`; avoid introducing new plain `<img>` (existing ones are pre-existing lint warnings, not new).

## Horizontal overflow
- [ ] `html, body { overflow-x: clip }` (already set globally) â€” do not reintroduce fixed pixel widths (`w-[Npx]`) without a responsive fallback on any new page-local component.

## Safe area
- [ ] Bottom-fixed controls respect `env(safe-area-inset-bottom)` (already applied in `MobileNavigation`).

## Hydration
- [ ] Do not introduce `window.innerWidth`/`matchMedia`-based layout branching. This codebase intentionally uses CSS-only breakpoints for layout, which is SSR-safe by construction â€” keep it that way.

## Light theme / Dark theme
- [ ] New components should use the `--beaconvie-*` CSS variables rather than hardcoded light-only Tailwind grays, so they don't need an entry in `globals.css`'s `.beaconvie-theme-compat` dark-mode override block.
- [ ] Verify no new component needs `.beaconvie-theme-compat` overrides for basic light/dark legibility.
- [ ] Toggling `.dark` on `<html>` does not change sidebar/header/bottom-nav visibility counts (theme must never affect layout structure, only colors).

## Production build
- [ ] `npm run typecheck` â€” 0 errors.
- [ ] `npm run lint` on changed files â€” no new errors versus the pre-change baseline (warnings from newly-dead imports after a deletion are expected and should be cleaned up, not left indefinitely).
- [ ] `npm run build` (`next build --webpack`, the approved production path) succeeds and every touched route appears in the route table.
- [ ] Re-check the exact viewport table above against the production build output (`npm run start`), not only `npm run dev` â€” dev-mode on-demand compilation can mask or mimic issues that don't reflect production behavior.
