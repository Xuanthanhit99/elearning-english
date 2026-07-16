import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class LeaderboardSocketAuthService {
  constructor(private readonly jwt: JwtService) {}

  authenticate(client: Socket) {
    const token = this.extract(client);
    if (!token) throw new UnauthorizedException('Thiếu access token Socket.');
    const payload = this.jwt.verify<{ sub?: string; id?: string; userId?: string; role?: string }>(token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });
    const id = payload.sub ?? payload.id ?? payload.userId;
    if (!id) throw new UnauthorizedException('Token không có user id.');
    return { id, role: payload.role };
  }

  private extract(client: Socket) {
    const auth = client.handshake.auth?.token;
    if (typeof auth === 'string' && auth.trim()) return auth.replace(/^Bearer\s+/i, '');
    const header = client.handshake.headers.authorization;
    if (typeof header === 'string') return header.replace(/^Bearer\s+/i, '');
    const cookie = client.handshake.headers.cookie;
    if (!cookie) return null;
    const map = Object.fromEntries(cookie.split(';').map((x) => {
      const [key, ...rest] = x.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    }));
    return map.accessToken ?? map.access_token ?? map.jwt ?? null;
  }
}
