import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/community',
  cors: { origin: true, credentials: true },
})
export class CommunityGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId as string | undefined;
    if (userId) client.join(`user:${userId}`);
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('community:join-post')
  joinPost(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { postId: string },
  ) {
    if (body?.postId) client.join(`post:${body.postId}`);
  }

  @SubscribeMessage('community:leave-post')
  leavePost(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { postId: string },
  ) {
    if (body?.postId) client.leave(`post:${body.postId}`);
  }

  @SubscribeMessage('community:join-conversation')
  joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    if (body?.conversationId) {
      void client.join(`conversation:${body.conversationId}`);
    }

    return { joined: true };
  }

  @SubscribeMessage('community:leave-conversation')
  leaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    if (body?.conversationId) {
      void client.leave(`conversation:${body.conversationId}`);
    }

    return { left: true };
  }

  @SubscribeMessage('community:club-join-room')
  joinClubRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { clubId: string },
  ) {
    if (body?.clubId) {
      void client.join(`club:${body.clubId}`);
    }

    return { joined: true };
  }

  @SubscribeMessage('community:club-leave-room')
  leaveClubRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { clubId: string },
  ) {
    if (body?.clubId) {
      void client.leave(`club:${body.clubId}`);
    }

    return { left: true };
  }

  @SubscribeMessage('community:club-typing')
  clubTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      clubId: string;
      userId: string;
      fullname: string;
      typing: boolean;
    },
  ) {
    if (body?.clubId) {
      client.to(`club:${body.clubId}`).emit('community:club-typing', body);
    }
  }

  emitPostCreated(post: unknown) {
    this.server.emit('community:post-created', post);
  }

  emitPostUpdated(post: unknown) {
    this.server.emit('community:post-updated', post);
  }

  emitPostDeleted(postId: string) {
    this.server.emit('community:post-deleted', { postId });
  }

  emitCommentCreated(postId: string, comment: unknown) {
    this.server.to(`post:${postId}`).emit('community:comment-created', comment);
  }

  emitReactionUpdated(postId: string, payload: unknown) {
    this.server
      .to(`post:${postId}`)
      .emit('community:reaction-updated', payload);
  }

  emitNotification(userId: string, notification: unknown) {
    this.server
      .to(`user:${userId}`)
      .emit('community:notification', notification);
  }

  emitUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitConversation(conversationId: string, event: string, payload: unknown) {
    this.server.to(`conversation:${conversationId}`).emit(event, payload);
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
