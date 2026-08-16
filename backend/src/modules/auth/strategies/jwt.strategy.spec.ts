import type { Request } from 'express';
import { extractJwtFromRequest } from './jwt.strategy';

describe('extractJwtFromRequest', () => {
  it('prefers an Authorization bearer token over the access cookie', () => {
    const req = {
      headers: { authorization: 'Bearer bearer-access' },
      cookies: { access_token: 'cookie-access' },
    } as Request;

    expect(extractJwtFromRequest(req)).toBe('bearer-access');
  });

  it('falls back to the existing access_token cookie', () => {
    const req = {
      headers: {},
      cookies: { access_token: 'cookie-access' },
    } as Request;

    expect(extractJwtFromRequest(req)).toBe('cookie-access');
  });

  it('returns null when neither supported transport is present', () => {
    const req = { headers: {}, cookies: {} } as Request;

    expect(extractJwtFromRequest(req)).toBeNull();
  });
});
