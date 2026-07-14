import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/community',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class CommunityClubGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('community:club-join-room')
  joinClubRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { clubId: string },
  ) {
    void client.join(`club:${body.clubId}`);
    return { joined: true };
  }

  @SubscribeMessage('community:club-leave-room')
  leaveClubRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { clubId: string },
  ) {
    void client.leave(`club:${body.clubId}`);
    return { left: true };
  }

  @SubscribeMessage('community:club-typing')
  typing(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      clubId: string;
      userId: string;
      fullname: string;
      typing: boolean;
    },
  ) {
    client.to(`club:${body.clubId}`).emit('community:club-typing', body);
  }

  emitClubMessage(clubId: string, message: unknown) {
    this.server
      .to(`club:${clubId}`)
      .emit('community:club-message-created', message);
  }

  emitClubMemberUpdated(clubId: string, payload: unknown) {
    this.server
      .to(`club:${clubId}`)
      .emit('community:club-member-updated', payload);
  }
}
