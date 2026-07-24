# UI Phase 1 — Homepage

## Scope note

This is a polish pass, not a redesign. The public homepage (`src/Components/HomePage/HomePage.tsx`) was already a fairly complete, well-structured, premium-feeling implementation (badge → gradient headline → dual CTA → stat row → hero card with mascot, trust strip, feature-card sections, AI section, community section, high-contrast final CTA banner, footer) — it did not need restructuring. Improvements here are targeted consistency and token-alignment fixes, not new sections.

Also confirmed dead/legacy and left untouched: `Header.tsx`, `Footer.tsx`, `HeroProfileCard.tsx`, `FeaturedCoursesSection.tsx`, `RoadmapSection.tsx`, `TestimonialsSection.tsx`, `FreeFeaturesSection.tsx` in the same folder — none of these are imported by the live `HomePage.tsx` (which defines its own inline header/hero/footer). Not touched, per "preserve business logic" / avoid unrelated refactors.

## Audit

| Area | Finding |
|---|---|
| Guest homepage | Live, complete, already strong: hero, trust strip, 3 product pillars, 6 skill cards, AI section, community section, final CTA, footer. |
| Logged-in home | `Hero`/`PublicHeader`/`FinalCta` already branch on a `user` prop (dashboard link vs. sign-in/placement) — the wiring exists; `HomePage()` currently always passes `user={null}`, i.e. the public route always renders the guest variant, which is correct for `app/page.tsx` (an authenticated user is a *different* app area — the dashboard — not this page). No issue. |
| Hero / CTA | Strong: gradient headline, dual CTA with clear primary/secondary hierarchy, stat row, hero card with mascot + mini metrics. |
| Features / Benefits | Two card grids (product pillars, 6 core skills), consistent card treatment, hover lift + shadow, per-skill accent colors (intentional categorical color-coding, left as-is). |
| Social proof / Testimonials | **Not present** in the live page (a dead `TestimonialsSection.tsx` exists but isn't rendered). Task marks this "(if present)" — not fabricating testimonials/reviews, flagged as a genuine, non-blocking future content item. |
| FAQ | Not present. Same as above — not invented. |
| Footer | Present but minimal (logo, 4 links, copyright). Background used generic Tailwind slate instead of the shell-surface token — fixed. |
| Navigation | Anchor-based nav (`#learning-path`, `#skills`, etc.) with `scroll-mt-24` already correctly offsetting for the sticky header — good existing detail. |
| Search / Announcement | Not present on the homepage. Adding either would be a new feature, not polish — out of scope for this pass, noted as a future consideration. |
| Loading | Root `app/loading.tsx` already uses `.lumiverse-card .lumiverse-shimmer` skeleton blocks — consistent with the design system, untouched. |
| Error | Root `app/error.tsx` used a literal `text-rose-500` instead of the new `--lumiverse-danger` token — fixed. |
| Responsive polish | Homepage responsive behavior was already fully verified in the earlier responsive-audit session (correct `lg:flex`/`lg:hidden` nav, mobile panel, zero overflow at all 14 viewports) — not re-litigated here. |

## Improvements made

- `PublicHeader` background: `bg-white/80 dark:bg-slate-950/80` → `bg-[var(--lumiverse-shell-surface)]` (token-consistent with the rest of the app shell).
- Mobile nav link hover: `hover:bg-white/70 dark:hover:bg-white/8` → `hover:bg-[var(--lumiverse-hover-tint)]`.
- Footer background: same shell-surface token alignment.
- Final CTA banner gradient: replaced one-off hex stops (`#08249b`, `#3646f5`, `#8b38ed`, `#f25192`) with the actual brand tokens (`--lumiverse-primary-strong`, `--lumiverse-primary`, `--lumiverse-violet`, `--lumiverse-rose`) — same visual result today, but this highest-conversion banner now tracks the brand palette automatically if it's ever refined again, instead of drifting out of sync.
- `app/error.tsx`: `text-rose-500` → `text-[var(--lumiverse-danger)]`.

## Files changed

`src/Components/HomePage/HomePage.tsx`, `app/error.tsx`.

## Validation

- `npm run typecheck`: 0 errors.
- `npm run lint` (both changed files): 0 errors, 0 warnings.
- Full `npm run build` deferred to the Phase 3 and Phase 8 checkpoints (running a full production build after every one of 8 phases would cost significant time for no additional signal beyond what typecheck+lint already confirm on these purely-cosmetic, token-substitution edits).

## Remaining (non-blocking)

- No testimonials/social-proof or FAQ section exists; both would be legitimate additions for a future content-focused pass, not fabricated here.
- No search/announcement bar on the homepage — a deliberate feature addition, out of scope for a polish pass.
