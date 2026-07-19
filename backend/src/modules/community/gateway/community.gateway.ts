import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../../prisma/prisma.service';
import { getAllowedOrigins } from '../../../config/cors.config';
import { getJwtAccessSecret } from '../../auth/auth-secrets.util';

type CommunitySocketUser = {
  id: string;
  role?: string;
};

type AuthenticatedCommunitySocket = Socket & {
  data: {
    user?: CommunitySocketUser;
  };
};

@WebSocketGateway({
  namespace: '/community',
  cors: { origin: getAllowedOrigins(), credentials: true },
})
export class CommunityGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: AuthenticatedCommunitySocket) {
    const user = this.authenticate(client);

    if (!user) {
      client.emit('community:unauthorized', {
        message: 'Invalid community session.',
      });
      client.disconnect(true);
      return;
    }

    client.data.user = user;
    client.join(`user:${user.id}`);
  }

  handleDisconnect(_client: AuthenticatedCommunitySocket) {}

  @SubscribeMessage('community:join-post')
  joinPost(
    @ConnectedSocket() client: AuthenticatedCommunitySocket,
    @MessageBody() body: { postId: string },
  ) {
    if (body?.postId) client.join(`post:${body.postId}`);
  }

  @SubscribeMessage('community:leave-post')
  leavePost(
    @ConnectedSocket() client: AuthenticatedCommunitySocket,
    @MessageBody() body: { postId: string },
  ) {
    if (body?.postId) client.leave(`post:${body.postId}`);
  }

  @SubscribeMessage('community:join-conversation')
  async joinConversation(
    @ConnectedSocket() client: AuthenticatedCommunitySocket,
    @MessageBody() body: { conversationId: string },
  ) {
    if (!client.data.user || !body?.conversationId) {
      return { joined: false };
    }

    const canJoin = await this.isConversationMember(
      client.data.user.id,
      body.conversationId,
    );

    if (!canJoin) {
      return { joined: false };
    }

    await client.join(`conversation:${body.conversationId}`);
    return { joined: true };
  }

  @SubscribeMessage('community:leave-conversation')
  leaveConversation(
    @ConnectedSocket() client: AuthenticatedCommunitySocket,
    @MessageBody() body: { conversationId: string },
  ) {
    if (body?.conversationId) {
      void client.leave(`conversation:${body.conversationId}`);
    }

    return { left: true };
  }

  @SubscribeMessage('community:club-join-room')
  async joinClubRoom(
    @ConnectedSocket() client: AuthenticatedCommunitySocket,
    @MessageBody() body: { clubId: string },
  ) {
    if (!client.data.user || !body?.clubId) {
      return { joined: false };
    }

    const canJoin = await this.isClubMember(client.data.user.id, body.clubId);

    if (!canJoin) {
      return { joined: false };
    }

    await client.join(`club:${body.clubId}`);
    return { joined: true };
  }

  @SubscribeMessage('community:club-leave-room')
  leaveClubRoom(
    @ConnectedSocket() client: AuthenticatedCommunitySocket,
    @MessageBody() body: { clubId: string },
  ) {
    if (body?.clubId) {
      void client.leave(`club:${body.clubId}`);
    }

    return { left: true };
  }

  @SubscribeMessage('community:club-typing')
  async clubTyping(
    @ConnectedSocket() client: AuthenticatedCommunitySocket,
    @MessageBody()
    body: {
      clubId: string;
      userId: string;
      fullname: string;
      typing: boolean;
    },
  ) {
    if (!client.data.user || !body?.clubId) {
      return;
    }

    const canJoin = await this.isClubMember(client.data.user.id, body.clubId);

    if (!canJoin) {
      return;
    }

    client.to(`club:${body.clubId}`).emit('community:club-typing', {
      ...body,
      userId: client.data.user.id,
    });
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

  private authenticate(client: Socket): CommunitySocketUser | null {
    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) return null;

    const token = this.parseCookies(cookieHeader).access_token;
    if (!token) return null;

    try {
      const payload = this.jwtService.verify<{
        sub?: string;
        id?: string;
        userId?: string;
        role?: string;
      }>(token, {
        secret: getJwtAccessSecret(),
      });
      const userId = payload.sub ?? payload.id ?? payload.userId;
      return userId ? { id: userId, role: payload.role } : null;
    } catch {
      return null;
    }
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

  private async isConversationMember(userId: string, conversationId: string) {
    const membershipCount = await this.prisma.communityConversationMember.count(
      {
        where: {
          userId,
          conversationId,
        },
      },
    );

    return membershipCount > 0;
  }

  private async isClubMember(userId: string, clubId: string) {
    const membershipCount = await this.prisma.communityClubMember.count({
      where: {
        userId,
        clubId,
      },
    });

    return membershipCount > 0;
  }
}
