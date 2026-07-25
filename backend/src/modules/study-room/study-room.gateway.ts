import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { StudyRoomMemberStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PresenceService } from '../../common/realtime/presence.service';
import {
  StudyRoomCookieAuthService,
  StudyRoomSocketUser,
} from './study-room-cookie-auth.service';
import { getAllowedOrigins } from '../../config/cors.config';
import { AuthSessionService } from '../auth/auth-session.service';

type AuthenticatedSocket = Socket & {
  data: {
    user?: StudyRoomSocketUser;
    roomIds: Set<string>;
  };
};

const PRESENCE_NAMESPACE = 'studyroom';
const DISCONNECT_GRACE_MS = 20_000;

// Namespace/room/broadcast structure mirrors community/gateway/
// community.gateway.ts: the gateway owns connection auth + lightweight
// per-event membership checks directly against Prisma (no dependency on
// StudyRoomService, avoiding a Service<->Gateway circular dependency —
// StudyRoomService depends on this gateway one-directionally, to
// broadcast after REST-driven actions like kick/start/end).
@Injectable()
@WebSocketGateway({
  namespace: '/study-room',
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
  },
})
export class StudyRoomGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: StudyRoomCookieAuthService,
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
    private readonly authSession: AuthSessionService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    client.data.roomIds = new Set();
    try {
      const user = this.auth.authenticate(client);

      // A banned user's already-issued access token stays valid until
      // expiry — every gateway only verified the JWT signature, so a ban
      // never reached realtime features until this check was added.
      if (await this.authSession.isBanned(user.id)) {
        client.emit('study-room:unauthorized', { code: 'INVALID_SESSION' });
        client.disconnect(true);
        return;
      }

      client.data.user = user;
    } catch (error: any) {
      // Same TOKEN_EXPIRED/INVALID_SESSION distinction as
      // arena/realtime/arena.gateway.ts — lets the frontend socket client
      // reuse Arena's proven single-flight refresh-then-reconnect handling
      // instead of just dropping the connection on any 401.
      const code = error?.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_SESSION';
      client.emit('study-room:unauthorized', { code });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    if (!user || !client.data.roomIds) return;

    for (const roomId of client.data.roomIds) {
      await this.presence.removeSocket(PRESENCE_NAMESPACE, roomId, user.id, client.id);
      // Grace window before broadcasting "went offline" — a page refresh
      // or brief network blip shouldn't flicker every member's presence
      // dot. Membership itself is never changed on disconnect (unlike
      // Arena's competitive forfeit-on-timeout) — cooperative study rooms
      // have no stakes to forfeit; leaving is only ever explicit.
      this.presence.scheduleGrace(PRESENCE_NAMESPACE, roomId, user.id, DISCONNECT_GRACE_MS, async () => {
        const stillPresent = await this.presence.isPresent(PRESENCE_NAMESPACE, roomId, user.id);
        if (!stillPresent) {
          this.emitPresenceUpdated(roomId, { userId: user.id, online: false });
        }
      });
    }
  }

  @SubscribeMessage('study-room:join')
  async joinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { roomId: string },
  ) {
    if (!client.data.user) return { joined: false };

    const member = await this.prisma.studyRoomMember.findUnique({
      where: { roomId_userId: { roomId: body.roomId, userId: client.data.user.id } },
    });
    if (!member || member.status !== StudyRoomMemberStatus.ACTIVE) {
      return { joined: false };
    }

    client.join(`study-room:${body.roomId}`);
    client.data.roomIds.add(body.roomId);
    await this.presence.registerSocket(PRESENCE_NAMESPACE, body.roomId, client.data.user.id, client.id);
    this.emitPresenceUpdated(body.roomId, { userId: client.data.user.id, online: true });

    return { joined: true, roomId: body.roomId };
  }

  // Reconnect: identical to join, exposed as a distinct event so the
  // client's intent ("I'm resuming after a drop") is explicit in logs/
  // telemetry, matching Arena's `arena:resume` naming convention.
  @SubscribeMessage('study-room:resume')
  resumeRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { roomId: string },
  ) {
    return this.joinRoom(client, body);
  }

  @SubscribeMessage('study-room:leave')
  async leaveSocketRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { roomId: string },
  ) {
    if (!client.data.user) return { left: false };
    client.leave(`study-room:${body.roomId}`);
    client.data.roomIds.delete(body.roomId);
    await this.presence.removeSocket(PRESENCE_NAMESPACE, body.roomId, client.data.user.id, client.id);
    this.emitPresenceUpdated(body.roomId, { userId: client.data.user.id, online: false });
    return { left: true };
  }

  @SubscribeMessage('study-room:ready')
  async setReady(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { roomId: string; ready: boolean },
  ) {
    if (!client.data.user) return { updated: false };

    const updated = await this.prisma.studyRoomMember.updateMany({
      where: {
        roomId: body.roomId,
        userId: client.data.user.id,
        status: StudyRoomMemberStatus.ACTIVE,
      },
      data: { ready: body.ready },
    });
    if (!updated.count) return { updated: false };

    this.server.to(`study-room:${body.roomId}`).emit('study-room:member-ready', {
      userId: client.data.user.id,
      ready: body.ready,
    });
    return { updated: true };
  }

  async isPresent(roomId: string, userId: string) {
    return this.presence.isPresent(PRESENCE_NAMESPACE, roomId, userId);
  }

  async listOnlineUserIds(roomId: string) {
    return this.presence.listPresentUserIds(PRESENCE_NAMESPACE, roomId);
  }

  emitRoomUpdated(roomId: string, payload: unknown) {
    this.server.to(`study-room:${roomId}`).emit('study-room:room-updated', payload);
  }

  emitMemberJoined(roomId: string, payload: unknown) {
    this.server.to(`study-room:${roomId}`).emit('study-room:member-joined', payload);
  }

  emitMemberLeft(roomId: string, payload: unknown) {
    this.server.to(`study-room:${roomId}`).emit('study-room:member-left', payload);
  }

  emitMemberUpdated(roomId: string, payload: unknown) {
    this.server.to(`study-room:${roomId}`).emit('study-room:member-updated', payload);
  }

  emitSessionStarted(roomId: string, payload: unknown) {
    this.server.to(`study-room:${roomId}`).emit('study-room:session-started', payload);
  }

  emitSessionEnded(roomId: string, payload: unknown) {
    this.server.to(`study-room:${roomId}`).emit('study-room:session-ended', payload);
  }

  emitPresenceUpdated(roomId: string, payload: unknown) {
    this.server.to(`study-room:${roomId}`).emit('study-room:presence-updated', payload);
  }

  emitKicked(roomId: string, userId: string, reason: 'KICKED' | 'BANNED') {
    this.server.to(`study-room:${roomId}`).emit('study-room:removed', { userId, reason });
  }
}
