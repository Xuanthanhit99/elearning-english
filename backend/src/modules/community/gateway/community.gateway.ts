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
}
