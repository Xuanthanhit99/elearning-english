import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { getJwtAccessSecret } from '../auth/auth-secrets.util';

export type NotificationSocketUser = {
  id: string;
  role?: string;
};

@Injectable()
export class NotificationCookieAuthService {
  constructor(private readonly jwtService: JwtService) {}

  authenticate(client: Socket): NotificationSocketUser {
    const token = this.extractSocketAccessToken(client);
    if (!token) {
      throw new UnauthorizedException('Missing socket access token.');
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

  extractSocketAccessToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) {
      return null;
    }

    return this.parseCookies(cookieHeader).access_token || null;
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
