import type { CookieOptions } from 'express';

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

export const clearAuthCookieOptions: CookieOptions = withDomain({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  expires: new Date(0),
});
