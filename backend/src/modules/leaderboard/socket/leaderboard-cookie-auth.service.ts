import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { getJwtAccessSecret } from '../../auth/auth-secrets.util';

export type LeaderboardSocketUser = {
  id: string;
  role?: string;
};

@Injectable()
export class LeaderboardCookieAuthService {
  constructor(private readonly jwtService: JwtService) {}

  authenticate(client: Socket): LeaderboardSocketUser {
    const cookieHeader = client.handshake.headers.cookie;

    if (!cookieHeader) {
      throw new UnauthorizedException('Không tìm thấy cookie xác thực.');
    }

    const cookies = this.parseCookies(cookieHeader);

    const token = cookies.access_token;

    if (!token) {
      throw new UnauthorizedException(
        'Không tìm thấy access token trong cookie.',
      );
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
      throw new UnauthorizedException('Token không chứa user id.');
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
