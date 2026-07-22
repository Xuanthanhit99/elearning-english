import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { getJwtAccessSecret } from '../../auth/auth-secrets.util';

export type ArenaSocketUser = {
  id: string;
  role?: string;
};

@Injectable()
export class ArenaCookieAuthService {
  constructor(private readonly jwtService: JwtService) {}

  authenticate(client: Socket): ArenaSocketUser {
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
      role?: string;
    }>(token, {
      secret: getJwtAccessSecret(),
    });

    const userId = payload.sub ?? payload.id ?? payload.userId;

    if (!userId) {
      throw new UnauthorizedException('Access token does not contain user id.');
    }

    return {
      id: userId,
      role: payload.role,
    };
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
