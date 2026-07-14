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
  namespace: '/community',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class CommunitySocialGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const userId =
      (client.handshake.auth?.userId as string | undefined) ||
      (client.handshake.query?.userId as string | undefined);

    if (userId) {
      void client.join(`user:${userId}`);
    }
  }

  @SubscribeMessage('community:join-conversation')
  joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    void client.join(`conversation:${body.conversationId}`);
    return { joined: true };
  }

  @SubscribeMessage('community:leave-conversation')
  leaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    void client.leave(`conversation:${body.conversationId}`);
    return { left: true };
  }

  emitUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitConversation(
    conversationId: string,
    event: string,
    payload: unknown,
  ) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit(event, payload);
  }
}
