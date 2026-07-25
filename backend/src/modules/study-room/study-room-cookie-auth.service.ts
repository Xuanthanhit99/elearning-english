import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { getJwtAccessSecret } from '../auth/auth-secrets.util';

export type StudyRoomSocketUser = {
  id: string;
};

// Mirrors arena/realtime/arena-cookie-auth.service.ts exactly (cookie
// parse + JwtService.verify) — every gateway in this codebase hand-rolls
// its own copy of this rather than sharing one; kept consistent with that
// existing pattern rather than introducing a new shared base class this
// pass doesn't need to touch every other gateway to adopt.
@Injectable()
export class StudyRoomCookieAuthService {
  constructor(private readonly jwtService: JwtService) {}

  authenticate(client: Socket): StudyRoomSocketUser {
    const cookieHeader = client.handshake.headers.cookie;

    if (!cookieHeader) {
      throw new UnauthorizedException('Missing authentication cookie.');
    }

    const token = this.parseCookies(cookieHeader).access_token;

    if (!token) {
      throw new UnauthorizedException('Missing access token cookie.');
    }

    const payload = this.jwtService.verify<{
      sub?: string;
      id?: string;
      userId?: string;
    }>(token, {
      secret: getJwtAccessSecret(),
    });

    const userId = payload.sub ?? payload.id ?? payload.userId;

    if (!userId) {
      throw new UnauthorizedException('Access token does not contain user id.');
    }

    return { id: userId };
  }

  private parseCookies(cookieHeader: string) {
    return Object.fromEntries(
      cookieHeader
        .split(';')
        .map((item) => {
          const [key, ...rest] = item.trim().split('=');
          return [key, decodeURIComponent(rest.join('='))];
        })
        .filter(([key]) => Boolean(key)),
    );
  }
}
