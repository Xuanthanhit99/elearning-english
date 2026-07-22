import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { HttpException, Logger } from '@nestjs/common';
import { ArenaPowerUpType } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';
import { getAllowedOrigins } from '../../../config/cors.config';
import { ArenaCookieAuthService, ArenaSocketUser } from './arena-cookie-auth.service';
import { ArenaPresenceService } from './arena-presence.service';
import { arenaRoomChannel, arenaUserChannel, getArenaDisconnectGraceMs } from './arena-realtime.constants';
import { ArenaService } from '../arena.service';
import { ArenaPowerUpService } from '../battle/arena-power-up.service';

type AuthenticatedArenaSocket = Socket & {
  data: {
    user?: ArenaSocketUser;
    roomIds: Set<string>;
  };
};

@WebSocketGateway({
  namespace: '/arena',
  cors: { origin: getAllowedOrigins(), credentials: true },
})
export class ArenaGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ArenaGateway.name);

  constructor(
    private readonly auth: ArenaCookieAuthService,
    private readonly prisma: PrismaService,
    private readonly presence: ArenaPresenceService,
    private readonly arenaService: ArenaService,
    private readonly powerUps: ArenaPowerUpService,
  ) {}

  handleConnection(client: AuthenticatedArenaSocket) {
    client.data.roomIds = new Set();

    try {
      const user = this.auth.authenticate(client);
      client.data.user = user;
      void client.join(arenaUserChannel(user.id));
      client.emit('arena:connected', { ok: true });
    } catch (error: any) {
      const code = error?.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_SESSION';
      client.emit('arena:unauthorized', { code });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedArenaSocket) {
    const user = client.data.user;
    if (!user) return;

    for (const roomId of client.data.roomIds ?? []) {
      await this.presence.removeSocket(roomId, user.id, client.id);
      const stillPresent = await this.presence.isPresent(roomId, user.id);
      if (!stillPresent) {
        this.scheduleDisconnectGrace(roomId, user.id);
      }
    }
  }

  @SubscribeMessage('arena:room:join')
  async joinRoom(
    @ConnectedSocket() client: AuthenticatedArenaSocket,
    @MessageBody() body: { roomId: string },
  ) {
    return this.joinRoomChannel(client, body?.roomId);
  }

  @SubscribeMessage('arena:room:leave')
  async leaveRoom(
    @ConnectedSocket() client: AuthenticatedArenaSocket,
    @MessageBody() body: { roomId: string },
  ) {
    if (!body?.roomId || !client.data.user) return { left: false };
    await client.leave(arenaRoomChannel(body.roomId));
    client.data.roomIds.delete(body.roomId);
    await this.presence.removeSocket(body.roomId, client.data.user.id, client.id);
    return { left: true };
  }

  @SubscribeMessage('arena:resume')
  async resume(
    @ConnectedSocket() client: AuthenticatedArenaSocket,
    @MessageBody() body: { roomId: string },
  ) {
    return this.joinRoomChannel(client, body?.roomId);
  }

  @SubscribeMessage('arena:power-up:use')
  async usePowerUp(
    @ConnectedSocket() client: AuthenticatedArenaSocket,
    @MessageBody()
    body: { roomId: string; type: ArenaPowerUpType; clientRequestId: string },
  ) {
    if (!client.data.user) {
      return { error: 'INVALID_SESSION' };
    }
    if (!body?.roomId || !body?.type || !body?.clientRequestId) {
      return { error: 'ARENA_POWER_UP_NOT_SUPPORTED' };
    }
    if (!client.data.roomIds.has(body.roomId)) {
      return { error: 'ARENA_POWER_UP_INVALID_TARGET' };
    }

    try {
      const result = await this.powerUps.usePowerUp(client.data.user.id, body.roomId, {
        type: body.type,
        clientRequestId: body.clientRequestId,
      });
      const event = result.status === 'BLOCKED' ? 'arena:power-up:blocked' : 'arena:power-up:applied';
      this.emitRoomEvent(body.roomId, event, {
        type: result.type,
        targetUserId: result.targetUserId,
        actorUserId: client.data.user.id,
      });
      return { ok: true, ...result };
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        const code =
          typeof response === 'string'
            ? response
            : ((response as Record<string, unknown>)?.message ?? 'ARENA_POWER_UP_NOT_SUPPORTED');
        return { error: Array.isArray(code) ? code[0] : code };
      }
      this.logger.warn(`Power-up use failed for ${body.roomId}/${client.data.user.id}: ${error}`);
      return { error: 'ARENA_POWER_UP_NOT_SUPPORTED' };
    }
  }

  private async joinRoomChannel(client: AuthenticatedArenaSocket, roomId?: string) {
    if (!roomId || !client.data.user) {
      return { joined: false };
    }

    const participant = await this.prisma.arenaParticipant.findUnique({
      where: { roomId_userId: { roomId, userId: client.data.user.id } },
    });
    if (!participant) {
      return { joined: false };
    }

    await client.join(arenaRoomChannel(roomId));
    client.data.roomIds.add(roomId);
    await this.presence.registerSocket(roomId, client.data.user.id, client.id);

    try {
      const snapshot = await this.arenaService.getRoom(client.data.user.id, roomId);
      client.emit('arena:room:snapshot', snapshot);
    } catch (error) {
      this.logger.warn(`Failed to build resume snapshot for room ${roomId}: ${error}`);
    }

    return { joined: true, roomId };
  }

  private scheduleDisconnectGrace(roomId: string, userId: string) {
    this.presence.scheduleGrace(roomId, userId, getArenaDisconnectGraceMs(), async () => {
      const stillPresent = await this.presence.isPresent(roomId, userId);
      if (stillPresent) return;

      try {
        await this.arenaService.forfeitParticipant(roomId, userId);
      } catch (error) {
        this.logger.warn(`Disconnect-grace forfeit failed for room ${roomId}/${userId}: ${error}`);
      }
    });
  }

  emitUserSnapshot(userId: string, payload: unknown) {
    this.server.to(arenaUserChannel(userId)).emit('arena:room:snapshot', payload);
  }

  emitRoomEvent(roomId: string, event: string, payload: unknown) {
    this.server.to(arenaRoomChannel(roomId)).emit(event, payload);
  }
}
