# BeaconVie Theme Rebranding Report

## 1. Executive summary

This pass upgraded the visual language of the existing Light/Dark theme system into a branded "BeaconVie" design system — **Beacon Day** (morning sky, soft ocean, sunlit horizon) and **Beacon Night** (deep ocean navy, moonlight, the lighthouse's own beam as the brightest accent) — without redesigning any page or rewriting any component structure.

The existing architecture was already token-based (`--lumiverse-*` CSS custom properties in `app/globals.css`, consumed via `var(--lumiverse-*)` across a shared `Lumiverse.tsx` component library and the app shell). That architecture was kept as-is; only token **values** were revisited, the token **set** was expanded with missing semantic categories, and the handful of shared components that bypassed tokens with literal Tailwind colors (`bg-blue-50`, `bg-red-500`, `bg-slate-950/*`, etc.) were updated to reference the new tokens instead. Individual page components (the ~150 route-level files) were intentionally not touched, per "do not redesign the application" / "do not rewrite pages."

A delightful confirmation found along the way: the product's existing AI-companion mascot ("Lumi") is already illustrated as a lighthouse character with a glowing beam — the Beacon brand direction fits assets already in production, it isn't a stretch.

## 2. Current theme audit

- **Token layer**: `app/globals.css` `:root` / `.dark` blocks define ~18 CSS custom properties (background, ink, muted, primary, primary-strong, cyan, violet, gold, rose, mint, card, card-soft, border, ring, shadow, soft-shadow, radius, radius-sm). Consumed everywhere via Tailwind arbitrary values, e.g. `text-[var(--lumiverse-ink)]`.
- **Shared component library**: `src/Components/UI/Lumiverse.tsx` — `LumiverseCard`, `LumiverseSectionHeader`, `LumiverseStatCard`, `LumiverseButton`, `LumiverseBadge`, `LumiverseProgress`, `LumiverseSkeleton`, `LumiverseState`, `LumiverseDialog`, `LumiverseDialogCloseButton`. Already almost entirely token-driven.
- **Shared app shell**: `AppShell.tsx`, `AppSidebar.tsx`, `AppHeader.tsx`, `MobileNavigation.tsx`, `NotificationDrawer.tsx`, `ThemeToggle.tsx`, `LanguageSwitcher.tsx` — mostly token-driven, but with recurring literal Tailwind escapes: `bg-blue-50 dark:bg-white/10` (5 occurrences, "selected/active" highlight), `bg-red-500` / `text-red-600 hover:bg-red-50` (notification badge, logout button), `bg-blue-100` (avatar fallback), `bg-slate-950/40|/78|/88|/92` (overlays and shell backing, bypassing the card/border tokens with generic Tailwind slate).
- **Legacy compatibility layer**: `.dark .lumiverse-theme-compat` in `globals.css` remaps light-only Tailwind utility classes (`bg-white`, `bg-slate-50`, `text-slate-900`, etc.) used throughout older, pre-token page components to the semantic card/ink/muted tokens for dark mode. This layer is unchanged in structure — it automatically inherits the new Beacon Night values, which is exactly the point of a token architecture.
- **Persistence**: `useThemeStore` (Zustand, `localStorage` key `"poppylingo-theme"` — a holdover from an earlier product name, left untouched to avoid resetting existing users' saved preference). Theme choices remain `LIGHT` / `DARK` / `SYSTEM` internally and in any existing i18n strings; this pass did not touch i18n.
- **Anti-flash script**: inline script in `app/layout.tsx` reads the same `localStorage` key before hydration — unchanged, still correct against the new tokens since it only toggles the `.dark` class.

## 3. New design tokens

All existing variable **names** were kept (`--lumiverse-*`) to avoid a full-codebase rename that would touch nearly every component — that would qualify as a redesign/rewrite, which was explicitly out of scope. Only values changed, plus new tokens were added:

**Beacon Day (`:root`)** — morning sky blue background, deep navy ink, ocean blue primary, lighthouse-gold accent, soft ocean cyan, twilight violet, kelp-green mint.

**Beacon Night (`.dark`)** — deep navy background (`#060f22`, never pure black), moonlight ink, brightened gold (`#ffcf72`) so the "beacon" accent is the visually brightest thing on the page, deepened shadows.

**New semantic tokens** (both themes): `--lumiverse-success`, `--lumiverse-warning`, `--lumiverse-danger` / `--lumiverse-danger-soft`, `--lumiverse-focus`, `--lumiverse-primary-soft`, `--lumiverse-hover-tint`, `--lumiverse-active-tint`, `--lumiverse-disabled`, `--lumiverse-shell-surface` / `--lumiverse-shell-surface-strong` (header/sidebar/bottom-nav backing), `--lumiverse-overlay` (modal/drawer backdrop), `--lumiverse-xp`, `--lumiverse-ranking`, `--lumiverse-arena`, `--lumiverse-notification`, and a 5-color qualitative `--lumiverse-chart-1..5` palette for future chart work.

Full before/after values are in `app/globals.css`'s `:root` and `.dark` blocks, with inline comments marking the Beacon Day / Beacon Night sections.

## 4. Backgrounds

Both themes use a layered, single continuous gradient (no illustrations, no decorative clutter, per brief):

- **Day**: soft cyan sky-glow (top-left) + violet twilight edge (top-right) + a very faint warm horizon glow (bottom) over a white-to-sky-blue linear gradient.
- **Night**: a subtle warm gold glow in the upper-right (the distant lighthouse beam) + moonlit blue glow (top-left) + violet depth (bottom-right) over a deep-navy linear gradient (`#060f22 → #0a1730 → #050b1a`).

## 5. Components audited and updated

Updated to reference the new tokens instead of literal Tailwind colors (all are genuinely shared components, not page-level):

- `src/Components/Layout/AppHeader.tsx` — shell background, notification badge, avatar fallback, logout button, dropdown/search-suggestion hovers, XP/streak icons (now carry `.lumiverse-beacon-glow`).
- `src/Components/Layout/AppSidebar.tsx` — shell background (desktop rail + mobile drawer), backdrop overlay, collapse/expand button, nav-item hover.
- `src/Components/Layout/MobileNavigation.tsx` — shell background, active/hover states.
- `src/Components/Layout/LanguageSwitcher.tsx`, `ThemeToggle.tsx` — active/hover menu-item states.
- `src/Components/Notifications/NotificationDrawer.tsx` — "mark all read" hover.
- `src/Components/UI/Lumiverse.tsx` (the shared design-system library) — `LumiverseStatCard` icon background, `LumiverseButton` danger/ghost tones, `LumiverseState` error tone, `LumiverseDialog` backdrop, `LumiverseDialogCloseButton` hover.

Audited and found already correct / left untouched: `AppShell.tsx` (structural only, no color literals), `ResponsiveContainer.tsx`, `AppLogo.tsx`/`AppIcon.tsx` (brand marks, not restyled — logo identity is out of scope for a token pass), Arena/leaderboard/table/form/skeleton styling inside individual **pages** (out of scope — see section 8).

New utility added: `.lumiverse-beacon-glow` (a restrained `drop-shadow` that only activates in dark mode) applied to the header's streak/XP icons — the one place in the shared shell where the "lighthouse light as brightest accent" idea could be expressed without touching page content.

## 6. Pages verified (visual, not rewritten)

Screenshot-verified in both themes at 1440×900 against the live dev server: public homepage, `/dashboard`, `/leaderboard`, `/notifications`. All render with consistent shell chrome, correct contrast, and the new gradient backgrounds; no layout shift or broken styling observed. Other routes were not individually screenshotted — they inherit the same shell and the same `.lumiverse-theme-compat` mapping already proven correct in the earlier responsive-audit pass, and no page-level markup was changed in this pass, so no page-specific regression risk was introduced.

## 7. Accessibility

- `:focus-visible` now explicitly references the new `--lumiverse-focus` token (aliased to the existing ring token) — no visual change, clarified intent.
- Danger text/background pairs (`--lumiverse-danger` on `--lumiverse-danger-soft`, and white-on-`--lumiverse-danger` for buttons/badges) were chosen to keep contrast at least as strong as the previous rose-based literals in both themes.
- Beacon Night's brightened gold (`#ffcf72`) against the deep navy background comfortably exceeds WCAG AA for the small accent/icon use it's applied to.
- No focus, hover, active, or disabled interaction pattern was removed or restructured — only the color values feeding them changed.
- Keyboard navigation, tab order, and dialog focus-trapping (`LumiverseDialog`) were not touched.

## 8. Remaining polish (non-blocking, explicitly out of scope)

- The ~150 individual page components still contain their own literal Tailwind color utilities (`bg-blue-50`, hex-coded backgrounds, etc.) predating the token system — the `.lumiverse-theme-compat` layer already neutralizes the worst dark-mode offenders, but a full migration of every page to token-based colors was explicitly out of scope ("do not rewrite pages") and would be a much larger, separate initiative.
- Chart components (if/when built) can adopt the new `--lumiverse-chart-1..5` tokens; no chart-rendering code currently exists to update.
- `AppLogo`/brand mark colors were not restyled — confirming/updating the logo's own palette against Beacon Day/Night was not requested and carries its own brand-asset risk.
- A full route-by-route dark-mode screenshot sweep (all ~40 authenticated routes) was not performed — 4 representative routes were checked; the underlying mechanism (tokens + compat layer) is identical for every other route.

## 9. Validation

- `npm run typecheck`: 0 errors.
- `npm run lint` (all files touched in this pass): 0 errors, 2 warnings — both pre-existing and unrelated (`PawPrint`/`ShieldCheck` unused imports in `AppSidebar.tsx`, present before this change).
- `npm run build` (`next build --webpack`): see final report for result captured at completion.
- Visual: Playwright screenshots of home/dashboard/leaderboard/notifications in both Beacon Day and Beacon Night, reviewed directly — consistent shell, correct contrast, gradients render as intended, no broken layout.
