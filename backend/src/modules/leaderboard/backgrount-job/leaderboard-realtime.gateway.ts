import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/leaderboard',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class LeaderboardRealtimeGateway
  implements OnGatewayConnection
{
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    /*
     * Đây là fallback để chạy ngay.
     * Production nên đọc userId từ JWT socket,
     * không tin userId do client tự gửi.
     */
    const userId = String(
      client.handshake.auth?.userId ??
        client.handshake.query?.userId ??
        '',
    );

    if (userId) {
      client.join(`leaderboard:user:${userId}`);
    }
  }

  @SubscribeMessage('leaderboard:join-group')
  joinGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { groupId: string },
  ) {
    client.join(
      `leaderboard:group:${body.groupId}`,
    );

    return {
      joined: true,
      groupId: body.groupId,
    };
  }

  @SubscribeMessage('leaderboard:leave-group')
  leaveGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { groupId: string },
  ) {
    client.leave(
      `leaderboard:group:${body.groupId}`,
    );

    return {
      left: true,
      groupId: body.groupId,
    };
  }

  emitGroupUpdated(
    groupId: string,
    payload: {
      userId: string;
      periodXp: number;
      rank?: number;
    },
  ) {
    this.server
      .to(`leaderboard:group:${groupId}`)
      .emit(
        'leaderboard:group-updated',
        payload,
      );
  }

  emitWeeklyResult(
    userId: string,
    payload: unknown,
  ) {
    this.server
      .to(`leaderboard:user:${userId}`)
      .emit(
        'leaderboard:weekly-result',
        payload,
      );
  }

  emitSeasonStarted(payload: unknown) {
    this.server.emit(
      'leaderboard:season-started',
      payload,
    );
  }
}
