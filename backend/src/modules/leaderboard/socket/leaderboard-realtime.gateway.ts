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

type AuthenticatedSocket = Socket & {
  data: {
    user?: LeaderboardSocketUser;
  };
};

@WebSocketGateway({
  namespace: '/leaderboard',
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class LeaderboardRealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly auth: LeaderboardCookieAuthService) {}

  handleConnection(client: AuthenticatedSocket) {
    try {
      const user = this.auth.authenticate(client);

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
  joinGroup(
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
