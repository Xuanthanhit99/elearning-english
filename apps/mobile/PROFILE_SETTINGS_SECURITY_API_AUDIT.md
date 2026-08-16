# Profile + Settings + Account Security API Audit

## Profile

### `GET /auth/me`

- Controller: `AuthController.me`
- Service: `AuthService.getMe`
- DTO: none
- Auth: `JwtAuthGuard`
- Request: authenticated bearer token or web cookie access token
- Response: `{ success, data: { getUser } }`
- Fields returned: `id`, `fullname`, `email`, `avatar`, `username`, `bio`, `goal`, `interests`, `phone`, `level`, `xp`, `isPro`, `role`, `englishLevel`, `learningGoal`, `createAt`
- Mutation behavior: read-only
- Security: access token is validated; banned users are blocked by `JwtStrategy`
- Web consumer: `english-web-build/src/Components/Profile/ProfilePage.tsx`
- Mobile suitability: suitable for Profile header and editable form defaults

### `PATCH /auth/me/profile`

- Controller: `AuthController.updateProfile`
- Service: `AuthService.updateProfile`
- DTO: `UpdateProfileDto`
- Auth: `JwtAuthGuard`
- Request fields: `fullname`, `username`, `bio`, `goal`, `interests`, `phone`, `englishLevel`, `learningGoal`
- Response: updated user subset with profile/progress/account fields
- Mutation behavior: partial update; username uniqueness checked
- Idempotency: PATCH is effectively idempotent for same field values
- Security: cannot change `email`, `role`, password, XP, or account status
- Web consumer: `ProfilePage.saveProfile`
- Mobile suitability: suitable; implemented with React Hook Form and Zod

### `PATCH /auth/me/avatar`

- Controller: `AuthController.updateAvatar`
- Service: `AuthService.updateAvatar`
- DTO: multipart `avatar`
- Auth: `JwtAuthGuard`
- Request: uploaded image file
- Response: updated user/avatar
- Web consumer: `ProfilePage.handleAvatarSelected`
- Mobile suitability: display is suitable; upload deferred because Expo image picker/upload flow is not installed in this phase

### `GET /achievements/overview`

- Controller/service: achievements module
- Auth: authenticated in web usage
- Response: achievement summary/recent/goals when available
- Web consumer: `ProfilePage`
- Mobile suitability: optional compact section; failures do not block profile

## Settings

### `GET /settings`

- Controller: `SettingsController.getSettings`
- Service: `SettingsQueryService.getSettings`
- DTO: none
- Auth: `JwtAuthGuard`
- Response: full `UserSettings`
- Behavior: upserts defaults if missing; cached in Redis
- Web consumer: `settingsApi.get`
- Mobile suitability: suitable for Settings overview/learning edits

### `PATCH /settings`

- Controller: `SettingsController.updateSettings`
- Service: `SettingsCommandService.updateSettings`
- DTO: `UpdateSettingsDto`
- Auth: `JwtAuthGuard`
- Request: partial writable settings fields only
- Response: updated `UserSettings`
- Mutation behavior: diffs changed fields, normalizes arrays, emits `settings.updated`, records audit log for sensitive fields
- Idempotency: same values return previous settings without writing
- Mobile suitability: suitable; used for learning/privacy settings

### `GET /settings/learning`

- Controller: `SettingsController.getLearningSettings`
- Service: `SettingsQueryService.getLearningSettings`
- Response: learning goal, daily minutes, preferred skills, current level, auto detect level, challenge mode, weekly/rest/study preferences, focus/energy/adaptive flags
- Mobile suitability: implemented through full settings cache and PATCH `/settings`

### `GET/PATCH /settings/notifications`

- Controller: `SettingsController.getNotificationSettings` / `updateNotificationSettings`
- Service: `SettingsQueryService.getNotificationSettings` / `SettingsCommandService.updateNotificationPreferences`
- DTO: `UpdateNotificationSettingsDto`
- Request fields: `dailyReminderEnabled`, `dailyReminderTime`, `missionReminder`, `friendActivity`, `clubNotification`, `leaderboardNotification`, `aiFeedbackNotification`, `emailNotification`, `pushNotification`
- Response: updated settings
- Security: settings-only; no Expo push device registration here
- Mobile suitability: suitable; push shown as a stored preference, not active device push setup

### `GET /settings/privacy`

- Controller: `SettingsController.getPrivacySettings`
- Service: `SettingsQueryService.getPrivacySettings`
- Response: `publicProfile`, `showStreak`, `showAchievements`, `showOnlineStatus`, `showLastSeen`, `dataPersonalization`, `analyticsConsent`
- Mobile suitability: suitable; implemented

## Security

### `POST /auth/change-password`

- Controller: `AuthController.changePassword`
- Service: `AuthService.changePassword`
- DTO: `ChangePasswordDto`
- Auth: `JwtAuthGuard` plus throttling
- Request: `currentPassword`, `newPassword`
- Response: message
- Mutation behavior: validates current password, hashes new password, clears failed login state, revokes all sessions
- Idempotency: not idempotent; no automatic retry
- Security implications: current password required; no password is stored client-side; successful change requires fresh login
- Web consumer: `ChangePasswordCard`
- Mobile suitability: suitable; implemented

### `GET /settings/devices`

- Controller: `SettingsController.getDevices`
- Service: `SettingsService.getDevices`
- Auth: `JwtAuthGuard`
- Response: active `UserDeviceSession[]` with `id`, `deviceName`, `browser`, `os`, `ipAddress`, `current`, `lastActiveAt`, `createdAt`
- Mobile suitability: suitable; implemented with conservative presentation

### `DELETE /settings/devices/:sessionId`

- Controller: `SettingsController.revokeDevice`
- Service: `SettingsService.revokeDevice`
- Auth: `JwtAuthGuard`
- Behavior: rejects current session; invalidates refresh-token pointer first, then marks `revokedAt`
- Idempotency: repeated revoke after success returns not found
- Mobile suitability: suitable for other sessions only

### `DELETE /settings/devices`

- Controller: `SettingsController.revokeOtherDevices`
- Service: `SettingsService.revokeOtherDevices`
- Auth: `JwtAuthGuard`
- Response: `{ revokedCount }`
- Behavior: invalidates all non-current sessions and records audit log
- Mobile suitability: suitable; implemented

### `POST /auth/logout`

- Controller: `AuthController.logout`
- Service: `AuthService.logout`
- DTO: `LogoutDto`
- Auth: refresh token body or cookie
- Behavior: invalidates refresh token/session if valid, clears cookies, returns generic success
- Mobile suitability: suitable; reused through central sign-out helper

## Explicit answers

1. Current profile endpoint: `GET /auth/me`.
2. Editable fields: `fullname`, `username`, `bio`, `goal`, `interests`, `phone`, `englishLevel`, `learningGoal`.
3. Full name can be changed.
4. Avatar can be changed by `PATCH /auth/me/avatar`; mobile upload deferred.
5. Email cannot be changed by authenticated profile/settings APIs.
6. Email verification exists through token verify/resend, not email change.
7. XP/level are returned by `/auth/me`; Dashboard provides richer XP/streak.
8. Achievements overview exists and is optional on mobile.
9. Learning statistics are available through `/dashboard`.
10. General settings exist in `UserSettings`.
11. Learning preferences exist through `/settings/learning` and PATCH `/settings`.
12. Notification preferences exist through `/settings/notifications`.
13. Privacy settings exist through `/settings/privacy`.
14. Settings are stored together in `UserSettings` but exposed through grouped read endpoints.
15. Updates use PATCH for settings/profile and DELETE for revocation.
16. Settings updates are idempotent for unchanged values.
17. Change password uses `POST /auth/change-password`.
18. Current password is required.
19. Changing password revokes every session.
20. Device sessions are listed by `GET /settings/devices`.
21. Current device is identified by backend `current`.
22. Revoke other session uses `DELETE /settings/devices/:sessionId`.
23. Revoke all other is supported by `DELETE /settings/devices`.
24. Current-session revoke via devices endpoint is rejected; use logout.
25. Remote revocation prevents refresh. Existing access JWT may remain valid until expiry unless banned marker applies.
26. `/auth/me` checks access JWT and ban marker, not per-session jti.
27. Sockets check JWT/ban marker; ordinary session revocation is detected on refresh, not immediate access JWT expiry.
28. Logout invalidates refresh/session and clears cookies.
29. Security audit logs are generated; notification generation is not implemented by mobile.
30. Email verification state is written in backend but not returned by `/auth/me`.
