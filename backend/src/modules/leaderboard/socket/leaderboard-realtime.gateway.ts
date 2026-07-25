import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  LeaderboardCookieAuthService,
  LeaderboardSocketUser,
} from './leaderboard-cookie-auth.service';
import { getAllowedOrigins } from '../../../config/cors.config';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthSessionService } from '../../auth/auth-session.service';

type AuthenticatedSocket = Socket & {
  data: {
    user?: LeaderboardSocketUser;
  };
};

@WebSocketGateway({
  namespace: '/leaderboard',
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
  },
})
export class LeaderboardRealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: LeaderboardCookieAuthService,
    private readonly prisma: PrismaService,
    private readonly authSession: AuthSessionService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const user = this.auth.authenticate(client);

      // A banned user's already-issued access token stays valid until
      // expiry — every gateway only verified the JWT signature, so a ban
      // never reached realtime features until this check was added.
      if (await this.authSession.isBanned(user.id)) {
        client.emit('leaderboard:unauthorized', {
          message: 'Phiên đăng nhập không hợp lệ.',
        });
        client.disconnect(true);
        return;
      }

      client.data.user = user;

      client.join(`leaderboard:user:${user.id}`);
    } catch {
      client.emit('leaderboard:unauthorized', {
        message: 'Phiên đăng nhập không hợp lệ.',
      });

      client.disconnect(true);
    }
  }

  @SubscribeMessage('leaderboard:join-group')
  async joinGroup(
    @ConnectedSocket()
    client: AuthenticatedSocket,
    @MessageBody()
    body: {
      groupId: string;
    },
  ) {
    if (!client.data.user) {
      return {
        joined: false,
      };
    }

    // A user only belongs to groups they have a real LeaderboardEntry in
    // (global/club/skill groups are all populated the same way by the
    // season job) — without this check, any authenticated user could join
    // any group's realtime room and observe another cohort's live updates.
    const entry = await this.prisma.leaderboardEntry.findFirst({
      where: { groupId: body.groupId, userId: client.data.user.id },
      select: { id: true },
    });
    if (!entry) {
      return { joined: false };
    }

    client.join(`leaderboard:group:${body.groupId}`);

    return {
      joined: true,
      groupId: body.groupId,
    };
  }

  @SubscribeMessage('leaderboard:leave-group')
  leaveGroup(
    @ConnectedSocket()
    client: AuthenticatedSocket,
    @MessageBody()
    body: {
      groupId: string;
    },
  ) {
    client.leave(`leaderboard:group:${body.groupId}`);

    return {
      left: true,
      groupId: body.groupId,
    };
  }

  emitGroupUpdated(groupId: string, payload: unknown) {
    this.server
      .to(`leaderboard:group:${groupId}`)
      .emit('leaderboard:group-updated', payload);
  }

  emitWeeklyResult(userId: string, payload: unknown) {
    this.server
      .to(`leaderboard:user:${userId}`)
      .emit('leaderboard:weekly-result', payload);
  }

  emitRewardAvailable(userId: string, payload: unknown) {
    this.server
      .to(`leaderboard:user:${userId}`)
      .emit('leaderboard:reward-available', payload);
  }

  emitSeasonStarted(payload: unknown) {
    this.server.emit('leaderboard:season-started', payload);
  }
}
