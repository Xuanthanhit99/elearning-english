# Lumiverse Language Switcher Hide Report

## Files modified

| File | Change |
| ---- | ------ |
| `english-web-build/src/config/features.ts` | Added the single feature flag source: `features.languageSwitcher = false`. |
| `english-web-build/src/Components/Layout/AppHeader.tsx` | Hid the logged-in header language switcher behind the feature flag. |
| `english-web-build/src/Components/HomePage/HomePage.tsx` | Hid the public landing page language switcher behind the feature flag. |
| `english-web-build/src/Components/settings/settings-page.tsx` | Hid the Appearance language setting behind the feature flag; changed the 2FA QR image to `next/image` so targeted lint stays clean. |
| `english-web-build/src/i18n/types.ts` | Set frontend default locale to English for guests without a saved cookie/local setting. |

## Audit table

| File | Component | Display location | Hide method |
| ---- | --------- | ---------------- | ----------- |
| `src/Components/Layout/AppHeader.tsx` | `AppHeader` | Authenticated desktop header | Render only when `features.languageSwitcher` is true |
| `src/Components/HomePage/HomePage.tsx` | `PublicHeader` | Public homepage header | Render only when `features.languageSwitcher` is true |
| `src/Components/settings/settings-page.tsx` | `SettingsPage` | Settings > Appearance | Render language field only when `features.languageSwitcher` is true |
| `src/Components/Layout/LanguageSwitcher.tsx` | `LanguageSwitcher` | Shared switcher component | Kept intact for future re-enable |

## Components hidden

- Header language dropdown
- Public homepage language dropdown
- Settings Appearance language selector

There is no inactive globe icon left in those locations.

## Feature flag location

```ts
// english-web-build/src/config/features.ts
export const features = {
  languageSwitcher: false,
} as const;
```

To restore the UI later, change `languageSwitcher` to `true`.

## Components still kept

- Locale store: `src/store/languageStore.ts`
- Locale cookie: `lumiverse-locale`
- Translation files: `src/i18n/locales/*.ts`
- Translation hook: `src/hooks/useTranslation.ts`
- Locale formatter: `src/lib/locale-format.ts`
- i18n check script: `scripts/check-i18n.mjs`
- Backend settings fields and DTOs: unchanged
- Auth flow and routing: unchanged
- Theme system: unchanged

## Default locale behavior

Guest users now default to English when no saved cookie/localStorage value exists.

Logged-in users still read backend User Settings during auth/settings bootstrap. If a saved language exists there, the internal i18n system can still apply it even though the UI control is hidden.

## Verification

```text
Targeted lint: PASS
Typecheck: PASS
Test: PASS
Build: PASS
i18n check: PASS
```

Commands run:

```text
npx eslint src/config/features.ts src/Components/Layout/AppHeader.tsx src/Components/HomePage/HomePage.tsx src/Components/settings/settings-page.tsx src/i18n/types.ts
npm run typecheck
npm run test
npm run build
npm run i18n:check
```

## Final status

The language selection UI is hidden, and the i18n infrastructure remains intact.
