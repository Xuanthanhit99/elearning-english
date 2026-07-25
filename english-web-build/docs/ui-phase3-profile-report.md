# UI Phase 3 â€” Profile + Settings

## Audit

**Profile** (`src/Components/Profile/ProfilePage.tsx`, 902 lines): already well-built on the BeaconVie design system, with consistent `BeaconVieState tone="empty"` handling for no-personal-info, no-skill-progress, no-learning-stats, and no-achievements states, and a proper top-level error/loading state. Found and fixed a handful of literal colors that had drifted from the token system: a stale `var(--beaconvie-primary,#1746ff)` fallback (the old pre-rebrand primary hex, hardcoded as a CSS fallback value â€” harmless today since the token is always defined, but wrong if ever read literally), several `bg-blue-50 dark:bg-white/8` icon backgrounds, and one modal backdrop using raw `bg-slate-950/80` instead of the overlay token.

**Settings** (`src/Components/settings/settings-page.tsx`, 910 lines, built on shared primitives in `src/Components/settings/ui.tsx`): this was the most significant finding of the phase. The shared `ui.tsx` primitives â€” `SectionCard`, `Field`, `Toggle`, `Select`, used by literally every field on the entire settings page â€” were built entirely from generic Tailwind `slate-*`/`violet-*` classes with no connection to the `--beaconvie-*` token system at all. Practically, this meant Settings had its own, disconnected dark mode (plain gray-900/800/700 surfaces) that looked like generic dashboard-template dark mode rather than Beacon Night's deep navy â€” precisely the "GitHub-like dark mode" the Beacon Theme brief said to avoid, and a real violation of "all use the same design language" from this program's own brief. The same pattern repeated throughout `settings-page.tsx` itself: input fields, secondary buttons, the tab rail, two confirmation modals (2FA setup, delete account), and most muted/heading text all used raw slate/violet/red instead of tokens or the existing `.beaconvie-card` / `.beaconvie-input` / `.beaconvie-button-soft` / `.beaconvie-button-primary` utility classes that the rest of the app already relies on.

## Improvements made

**`src/Components/settings/ui.tsx`** (rewritten, same API/props, zero logic change):
- `SectionCard` â†’ `.beaconvie-card` (was a hand-rolled slate border/bg).
- `Field` â†’ token-based border/ink/muted text.
- `Toggle` â†’ checked state now `--beaconvie-primary` (was `violet-600`), track now token-based.
- `Select` â†’ `.beaconvie-input` + `--beaconvie-focus` ring (was raw slate border + `ring-violet-500`).

**`src/Components/settings/settings-page.tsx`**: tab rail â†’ `.beaconvie-card` + `--beaconvie-primary-soft`/`--beaconvie-hover-tint` for active/hover; ~9 form inputs â†’ `.beaconvie-input`; 6 secondary buttons â†’ `.beaconvie-button-soft`; 2 primary confirm buttons â†’ `.beaconvie-button-primary`; page/section headings and ~8 muted-text instances â†’ `--beaconvie-ink`/`--beaconvie-muted`; revoke-device button and delete-account button â†’ `--beaconvie-danger`; both confirmation-modal backdrops â†’ `--beaconvie-overlay`; both modal panels â†’ `.beaconvie-card`; device-list-item border, backup-codes box, and code-display block â†’ token-based border/surface.

**`src/Components/Profile/ProfilePage.tsx`**: removed the stale hardcoded primary-color fallback; ~4 icon backgrounds â†’ `--beaconvie-primary-soft`; one modal backdrop â†’ `--beaconvie-overlay`.

Net effect: Settings now visually matches the rest of the app in both Beacon Day and Beacon Night, instead of rendering its own disconnected gray theme.

## Files changed

`src/Components/settings/ui.tsx`, `src/Components/settings/settings-page.tsx`, `src/Components/Profile/ProfilePage.tsx`.

## Validation

- `npm run typecheck`: 0 errors.
- `npm run lint` (all 3 changed files): 0 errors, 0 warnings.
- `npm run build` (checkpoint build covering Phases 1â€“3): result recorded in the final production report.

## Remaining (non-blocking)

- Avatar upload / badge display in Profile were reviewed and already use consistent card treatment â€” no further changes made.
- Security/privacy tabs in Settings (2FA, sessions, data export, delete account) were reviewed for token consistency only; the underlying flows and copy were not touched, per "preserve business logic."
