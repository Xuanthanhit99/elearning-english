# BeaconVie Brand Completion Report

## Scope

- Replaced legacy brand naming in the frontend with BeaconVie.
- Added semantic BeaconVie brand assets under `public/brand`.
- Regenerated favicon, app icons, manifest icons, and legacy compatibility assets.
- Switched the application font to Poppins.
- Set Vietnamese as the only selectable UI locale while preserving internal locale-code compatibility.
- Replaced legacy mascot/logo references with BeaconVie assets.
- Updated homepage metadata, Open Graph, Twitter metadata, manifest description, public header, homepage hero, and core Writing labels.

## Brand Assets Added

- `public/brand/beaconvie-logo-wide.png`
- `public/brand/beaconvie-brand-guide.png`
- `public/brand/beaconvie-ai-mascot.png`
- `public/brand/beaconvie-wallpaper-vertical.png`
- `public/brand/beaconvie-hero-banner.png`
- `public/brand/beaconvie-logo-dark.png`
- `public/brand/beaconvie-logo-light.png`
- `public/brand/beaconvie-logo-blue.png`
- `public/brand/beaconvie-app-icon.png`
- `public/brand/beaconvie-app-icon-alt.png`
- `public/brand/beaconvie-mark.png`
- `public/brand/beaconvie-logo-glow.png`

## Validation

- `npm run typecheck`: passed.
- `npm run build`: passed.
- Legacy-brand scan for `Foxy`, `BeaconVie`, `Beacon`, `Beacon`, `cat-home`, `loho/icon`, `Learn English Adventure`, and `Sample Essay`: no matches in app/source/public text files.

## Notes

- `npm run lint` still fails because of existing broad lint debt across Arena, Reading, hooks, scripts, and API helper files. These failures are not specific to the BeaconVie rebrand and were not refactored.
- Next.js production build reports non-blocking warnings for the deprecated `middleware` convention and missing `metadataBase`.

## Supplemental Brand Content Standardization

Date: 2026-07-25

Additional closure work completed:

- Confirmed the legacy-brand term scan is clean outside dependency/build caches.
- Confirmed the legacy-brand filename scan is clean outside dependency/build caches.
- Standardized the remaining multi-locale UI content maps so internal `en`, `zh`, and `de` compatibility keys now resolve to the Vietnamese BeaconVie copy instead of stale mixed-language content.
- Finished visible-copy cleanup in the mobile navigation, app sidebar group labels, homepage metrics, Placement entry/introduction screens, Writing topics/detail/session/result/history screens, admin moderation labels, reports, search placeholder, and loading image alt text.
- Preserved technical identifiers, route names, enum values, icon imports, and English-learning exercise content where English is part of the lesson material or API contract.
- Left the existing broad lint debt untouched because it is unrelated to the brand/content standardization and would require a separate cleanup pass.

Validation evidence:

- `npm run typecheck`: passed after supplemental edits.
- `npm run build`: passed after supplemental edits.
- Production build generated 77 static pages successfully.
- Build warning observed: Next.js reports the existing `middleware` file convention is deprecated in favor of `proxy`; no release-blocking build error was produced.

Technical exceptions:

- Terms such as `Home`, `Settings`, `Loading`, `Writing`, `Community`, and `Progress` still appear where they are component names, function names, route component names, lucide icon imports, enum keys, type names, or learning-domain identifiers.
- English words remain inside learning exercises, CEFR/IELTS/TOEIC labels, API contracts, and prompts where English is required for English-learning functionality.
