import type { CookieOptions, Response } from 'express';

export const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

function withDomain(options: CookieOptions): CookieOptions {
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();

  return domain ? { ...options, domain } : options;
}

export const authCookieOptions = (maxAge: number): CookieOptions =>
  withDomain({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
    expires: new Date(Date.now() + maxAge),
  });

export const visibleCookieOptions = (maxAge: number): CookieOptions =>
  withDomain({
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
    expires: new Date(Date.now() + maxAge),
  });

const AUTH_COOKIE_NAMES = ['refresh_token', 'access_token', 'logged_in'] as const;

/**
 * Clears every current auth cookie, plus the legacy host-only variant (no
 * `Domain` attribute) of each name. Browsers key cookies by name+domain+path,
 * so if `AUTH_COOKIE_DOMAIN` is ever set/changed (e.g. migrating to
 * `.beaconvie.com`), a `clearCookie` built only from the *current* options
 * would leave a pre-migration host-only cookie of the same name un-cleared —
 * the browser would still send both to the server. Clearing both variants on
 * every logout is a safe no-op today (no legacy cookies exist yet) and closes
 * that gap in advance.
 */
export function clearAllAuthCookies(res: Response): void {
  const secure = process.env.NODE_ENV === 'production';

  for (const name of AUTH_COOKIE_NAMES) {
    const httpOnly = name !== 'logged_in';

    res.clearCookie(name, {
      httpOnly,
      secure,
      sameSite: 'lax',
      path: '/',
      ...(process.env.AUTH_COOKIE_DOMAIN?.trim()
        ? { domain: process.env.AUTH_COOKIE_DOMAIN.trim() }
        : {}),
    });

    // Legacy host-only variant (no Domain attribute), cleared unconditionally.
    res.clearCookie(name, { httpOnly, secure, sameSite: 'lax', path: '/' });
  }
}
