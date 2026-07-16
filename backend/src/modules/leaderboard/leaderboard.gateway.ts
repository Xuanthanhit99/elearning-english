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
  cors: { origin: true, credentials: true },
})
export class LeaderboardGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    // Nên xác thực JWT trong adapter/guard socket của dự án.
    client.emit('leaderboard:connected', { connected: true });
  }

  @SubscribeMessage('leaderboard:join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { groupId: string },
  ) {
    await client.join(`leaderboard:${body.groupId}`);
    return { joined: true, groupId: body.groupId };
  }

  @SubscribeMessage('leaderboard:leave')
  async leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { groupId: string },
  ) {
    await client.leave(`leaderboard:${body.groupId}`);
    return { left: true, groupId: body.groupId };
  }

  emitLeaderboardUpdated(
    groupId: string,
    payload: {
      userId: string;
      periodXp: number;
      rank?: number;
    },
  ) {
    this.server
      .to(`leaderboard:${groupId}`)
      .emit('leaderboard:updated', payload);
  }

  emitSeasonEnded(groupId: string, payload: unknown) {
    this.server
      .to(`leaderboard:${groupId}`)
      .emit('leaderboard:season-ended', payload);
  }
}
