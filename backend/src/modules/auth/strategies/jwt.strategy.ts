import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { getJwtAccessSecret } from '../auth-secrets.util';
import { AuthSessionService } from '../auth-session.service';

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
  constructor(private readonly authSessionService: AuthSessionService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      secretOrKey: getJwtAccessSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    // Immediate-revocation fast path for banned users — see
    // AuthSessionService.banUser(). Cheap Redis GET, fails open (allows the
    // request through) on Redis error so an outage never breaks auth
    // entirely; Postgres `User.status` remains the actual source of truth
    // and is still enforced at login/refresh regardless of this check.
    if (await this.authSessionService.isBanned(payload.sub)) {
      throw new UnauthorizedException('Tài khoản đã bị khóa.');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
