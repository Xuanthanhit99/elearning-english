# BeaconVie Mobile Store Readiness Audit

Date: 2026-08-16

This is a technical readiness audit for Google Play Internal Testing and later public production. It is not legal advice.

## Play Listing Assets

| Item | Status | Notes |
| --- | --- | --- |
| App name | READY | `BeaconVie` in `app.json`. |
| Android package | READY | `com.beaconvie.app`. Keep stable before first Play upload. |
| Version | READY | `1.0.0`. |
| Version code | READY | `1`. Do not reset after upload. |
| App icon | READY | `assets/icon.png` exists. |
| Adaptive icon | READY | Foreground, background, and monochrome adaptive icon assets exist. |
| Splash | READY | `assets/splash-icon.png` configured. |
| Screenshots | MISSING | Capture from Internal Testing build on real devices after critical flows are verified. |
| Feature graphic | MISSING | Required for polished Play listing. |
| Short description | MISSING | Product copy needed. |
| Full description | MISSING | Product copy needed. |
| Support contact | MISSING | Store support email/contact URL needed. |
| Privacy policy URL | MISSING | Web route policy lists `/privacy`, but no verified public privacy-policy page/file was found in this repo scan. Confirm deployed URL before Play submission. |
| Account deletion policy | MISSING | App supports account creation. No public account deletion route/process was verified. Google Play disclosure/process is required before public production. |
| Age/content considerations | REVIEW REQUIRED | Educational app with community/user-generated content and AI features. Complete Play content rating truthfully. |

## Data Safety Technical Inventory

The mobile app may process or transmit the following data through the BeaconVie backend:

- Email address and authentication/session information.
- Profile name, username, avatar URL/fallback, bio, phone if provided, learning goal, and interests.
- Learning activity, XP, streaks, progress, answers, placement results, skill levels, and leaderboard status.
- Listening, reading, grammar, vocabulary, writing, and placement exercise responses.
- User-generated Community posts, comments, replies, reactions, and bookmarks.
- Companion chat messages and generated assistant responses.
- Notification records, unread state, and notification preferences.
- Device/session metadata used for authentication and session management.

No mobile client secrets should be included. `EXPO_PUBLIC_*` values are public configuration only.

## Permission Audit

- Microphone: not requested. `expo-audio` is configured with recording/background recording disabled.
- Modify audio settings: requested by the resolved Expo Android config for playback/audio-session behavior.
- Location: not requested.
- Contacts: not requested.
- Storage/media library: not requested.
- Notifications: push notifications are deferred to V1.1 and should not block Internal Testing.

## Production Dependencies

- Production API: `https://api.beaconvie.com`.
- Production socket URL: `https://api.beaconvie.com`.
- Companion generation depends on backend provider configuration such as `GEMINI_API_KEY`; no Gemini credential belongs in mobile.

## Release Notes

- Push Notifications: DEFERRED TO V1.1.
- Avatar upload: deferred.
- Arena: visible from Dashboard but Android full match/reconnect remains unverified. Treat as experimental/internal-only for Internal Testing and hide before public v1 if still unverified.
- Public production must wait for the Internal Testing checklist to pass on real Android devices.
