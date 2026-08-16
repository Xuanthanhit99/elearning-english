# BeaconVie Mobile Migration Audit

## 1. Existing architecture

- The repository currently uses root-level projects instead of the requested `apps/web` and `apps/api` layout.
- Existing web applications:
  - `frontend/` is a Vite React app with npm (`frontend/package.json`, `frontend/package-lock.json`).
  - `english-web-build/` is the production-like Next.js app for BeaconVie with npm (`english-web-build/package.json`, `english-web-build/package-lock.json`).
- Existing backend:
  - `backend/` is a NestJS API with Prisma, Redis/BullMQ, Socket.IO, JWT auth, and npm (`backend/package.json`, `backend/package-lock.json`).
- There is no root workspace package file and no root pnpm workspace file.
- Existing TypeScript configs:
  - `frontend/tsconfig.json` references `tsconfig.app.json` and `tsconfig.node.json`.
  - `backend/tsconfig.json` uses `module: "nodenext"` and partial strictness (`strictNullChecks: true`, `noImplicitAny: false`).
  - `english-web-build/package.json` exposes `typecheck`.

## 2. Web code reusable by React Native

- API endpoint knowledge can be reused from `english-web-build/src/lib/*-api.ts`.
- User shape can be adapted from `english-web-build/src/store/authStore.ts`.
- Brand tokens can be reused from `english-web-build/app/globals.css`.
- Language/content structure can be referenced from `english-web-build/src/hooks/useTranslation` and related i18n files if needed later.

## 3. Web code that cannot be reused

- Next.js pages and route code under `english-web-build/app/` use web-only primitives (`main`, `section`, `button`, `input`, `Link`, `Image`, browser redirects).
- `english-web-build/src/Components/Auth/Auth.tsx` depends on `next/navigation`, `next/image`, `sessionStorage`, `window.location`, and HTML forms.
- Tailwind/CSS token classes from `english-web-build/app/globals.css` cannot be directly used in React Native.
- The web Axios client in `english-web-build/src/lib/axios.ts` relies on browser cookies through `withCredentials: true`.

## 4. Shared TypeScript code that may be reused

- No shared package currently exists.
- Candidate reusable code for a later shared package:
  - DTO-compatible request/response types from `english-web-build/src/lib/*-api.ts`.
  - Auth user state shape from `english-web-build/src/store/authStore.ts`.
  - Route and API constants from the web API modules.

## 5. Existing backend APIs

- Backend bootstrap: `backend/src/main.ts`.
- CORS allows credentialed requests and the `Authorization` header in `backend/src/main.ts`.
- Auth routes are defined in `backend/src/modules/auth/auth.controller.ts`:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `POST /auth/forgot-password`
  - `POST /auth/reset-password`
  - `POST /auth/change-password`
  - `POST /auth/verify-email`
  - `POST /auth/resend-verification`
  - `GET /auth/me`
  - social OAuth routes for Google and Facebook
  - profile/avatar routes under `/auth/me`
- Learning and product areas are organized as Nest modules under `backend/src/modules/`, including vocabulary, placement, reading, speaking, writing, progress, community, notifications, study room, documents, missions, achievements, and arena-related code.

## 6. Existing authentication architecture

- Web login posts to `/auth/login` in `english-web-build/src/Components/Auth/Auth.tsx`.
- Web Axios uses `withCredentials: true` in `english-web-build/src/lib/axios.ts`.
- Backend login creates JWT access and refresh tokens in `backend/src/modules/auth/auth.service.ts`.
- Tokens are sent as cookies in `backend/src/modules/auth/auth.service.ts`.
- Cookie options are in `backend/src/modules/auth/auth-cookie.util.ts`:
  - `access_token` and `refresh_token` are `httpOnly`.
  - `logged_in` is visible to the browser.
  - `sameSite: "lax"`, `secure` in production.
- `POST /auth/refresh` reads `req.cookies?.refresh_token` in `backend/src/modules/auth/auth.controller.ts`.
- JWT strategy extracts only `access_token` from cookies in `backend/src/modules/auth/strategies/jwt.strategy.ts`.
- There is no CSRF middleware found in `backend/src/main.ts`; the current design relies on same-site cookie behavior and CORS.

## 7. Mobile authentication risks

- Current `JwtStrategy` does not extract bearer tokens from the `Authorization` header.
- Login returns user data but not access/refresh tokens in the JSON response.
- Refresh reads the refresh token only from cookies.
- React Native does not provide browser-grade cookie behavior equivalent to the web flow.
- Secure mobile token storage must use `expo-secure-store`; tokens must not be stored in AsyncStorage or logs.

## 8. Recommended mobile architecture

- Keep the mobile app inside `apps/mobile` with its own npm lockfile.
- Use Expo Router with native route groups:
  - `src/app/(tabs)`
  - `src/app/(auth)`
- Use a mobile-specific API client later with:
  - `EXPO_PUBLIC_API_URL`
  - `Authorization: Bearer <accessToken>` once backend supports it.
- Future backend auth change should add a mobile-safe token response/refresh path or extend current auth routes to support bearer access tokens and refresh-token rotation from a request body/header.

## 9. Package manager recommendation

- Use npm for `apps/mobile`.
- Do not migrate the repository to pnpm; existing projects already use separate npm lockfiles.
- Keep mobile dependency and lockfile changes isolated to `apps/mobile/package.json` and `apps/mobile/package-lock.json`.

## 10. Environment strategy

- Mobile uses `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SOCKET_URL`.
- Do not hard-code LAN IPs in source.
- Android emulator may need `http://10.0.2.2:3002`.
- Physical Android/iOS devices need the development computer's LAN IP.
- Production should use `https://api.beaconvie.com`.

## 11. Migration phases

- Phase 0: repository audit and migration document.
- Phase 1: Expo app foundation in `apps/mobile`.
- Phase 2: Expo Router tabs, providers, theme tokens, and base UI.
- Phase 3: API client and mobile authentication design/implementation.
- Phase 4: authenticated profile and dashboard data.
- Phase 5: learning module slices such as placement, vocabulary, practice, and community.

## 12. Known risks

- The current machine uses Node `v20.19.0`; React Native 0.86 packages warn that they expect Node `^20.19.4 || ^22.13.0 || ^24.3.0 || >=25.0.0`.
- `npm audit` reports vulnerabilities in the mobile dependency tree after initial Expo install; these should be reviewed separately because Expo SDK compatibility may constrain upgrades.
- Backend auth is currently browser-cookie-specific.
- Some existing source files contain mojibake in Vietnamese strings; mobile files added in this phase use valid UTF-8.
