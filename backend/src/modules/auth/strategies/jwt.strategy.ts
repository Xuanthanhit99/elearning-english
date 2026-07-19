import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { getJwtAccessSecret } from '../auth-secrets.util';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

const cookieExtractor = (req: Request): string | null => {
  if (!req || !req.cookies) {
    return null;
  }

  return req.cookies['access_token'] || null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      secretOrKey: getJwtAccessSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
