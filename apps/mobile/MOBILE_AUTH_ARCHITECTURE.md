# BeaconVie Mobile Auth Architecture

## Web Auth Transport

The existing BeaconVie web app remains cookie-based.

- Web login uses `POST /auth/login` through `english-web-build/src/lib/axios.ts` with `withCredentials: true`.
- The backend sets `httpOnly` `access_token` and `refresh_token` cookies and a visible `logged_in` cookie.
- Web refresh still uses `POST /auth/refresh` with `req.cookies.refresh_token`.
- Web logout still uses `POST /auth/logout` with `req.cookies.refresh_token`.

No existing web request needs to send a bearer token.

## Mobile Auth Transport

The mobile app uses explicit bearer transport against the same auth endpoints.

- Mobile sends `X-BeaconVie-Auth-Transport: bearer` for auth requests.
- `POST /auth/login` returns the same generated `accessToken` and `refreshToken` that the backend also writes as cookies.
- `POST /auth/refresh` accepts `{ "refreshToken": "..." }` in the request body and returns the rotated `accessToken` and `refreshToken`.
- Authenticated mobile requests send `Authorization: Bearer <accessToken>`.
- `POST /auth/logout` accepts `{ "refreshToken": "..." }` so mobile can revoke the same session pointer used by web refresh-cookie sessions.

## JWT Extraction Strategy

Backend JWT validation uses one Passport JWT strategy with two supported transports:

1. `Authorization: Bearer <token>`
2. existing `access_token` cookie fallback

Bearer takes precedence. Cookie extraction remains supported for the web app.

## Refresh Flow

The mobile Axios client uses a single-flight refresh lock.

1. An authenticated request receives `401`.
2. The original request is marked with `_retry`.
3. The client starts one `POST /auth/refresh` request with the SecureStore refresh token.
4. Other simultaneous 401 responses wait for the same refresh promise.
5. On success, both tokens are replaced in SecureStore and waiting requests retry with the new bearer access token.
6. On failure, SecureStore is cleared, auth state becomes unauthenticated, and the query cache is cleared.

Backend refresh still rotates refresh tokens through `AuthSessionService.rotate`, so mobile does not bypass session revocation or replay protection.

## SecureStore Usage

Mobile stores tokens only in Expo SecureStore:

- `beaconvie.accessToken`
- `beaconvie.refreshToken`

Tokens are never persisted in Zustand and are never logged.

## Logout Flow

Mobile logout:

1. Reads the SecureStore refresh token.
2. Calls `POST /auth/logout` with that refresh token.
3. Clears SecureStore even if the network call fails.
4. Clears auth state.
5. Clears the TanStack Query cache.
6. Auth routing returns the user to `/(auth)/login`.

## CSRF Implications

No CSRF middleware or guard was present in `backend/src/main.ts` or the auth module during this phase.

The existing web flow relies on `sameSite: "lax"` auth cookies plus credentialed CORS allow-listing. Mobile bearer requests do not rely on browser cookies and do not add CSRF exposure because the refresh token is sent in a JSON body from native SecureStore, not automatically by a browser.

## Session And Device Behavior

Mobile login and refresh reuse the existing session model:

- Login creates a `UserDeviceSession` through `AuthSessionService.createSession`.
- Refresh validates and rotates the Redis-backed refresh-token `jti` pointer through `AuthSessionService.rotate`.
- Logout invalidates the refresh `jti` and marks the matching session revoked.
- User ban/suspension fast-path checks still happen in the shared JWT strategy.

## Auth Routing

The root mobile layout wraps routes with:

- `AppProviders`
- `AuthBootstrap`
- `AuthGate`

`AuthBootstrap` restores a session by reading SecureStore and calling the real `/auth/me` endpoint. `AuthGate` prevents tab routes from flashing before auth state is resolved.

## Security Considerations

- Refresh tokens are never sent in URLs.
- Passwords and tokens are not logged.
- Access/refresh tokens are not stored in Zustand.
- Expired or revoked sessions clear local credentials.
- A delayed refresh cannot silently restore a session after logout because auth session changes bump an in-memory version marker.
