import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArenaGateway } from './arena.gateway';
import { ArenaService } from '../arena.service';
import {
  ARENA_ANSWER_SUBMITTED,
  ARENA_MATCH_FINISHED,
  ARENA_MATCH_STARTED,
  ARENA_ROOM_UPDATED,
} from './arena-domain-event';
import type { ArenaDomainEvent } from './arena-domain-event';

/*
 * Bridges ArenaService's domain events to the gateway: on any room/match
 * mutation, re-fetch the room per participant (reusing
 * ArenaService.getRoom's existing per-user redaction — `sanitizeMatchForUser`
 * — so realtime payloads have exactly the same shape/security guarantees as
 * the REST response) and push it only to that participant's private
 * channel.
 */
@Injectable()
export class ArenaRealtimeListener {
  private readonly logger = new Logger(ArenaRealtimeListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ArenaGateway,
    private readonly arenaService: ArenaService,
  ) {}

  // Stacked decorators, NOT a single `@OnEvent([a, b, c])` call — this
  // version of `@nestjs/event-emitter` treats an array argument as one
  // opaque (string-coerced) event key rather than "subscribe to each of
  // these", so a single array-argument call silently registers a listener
  // for the literal string "a,b,c" instead of three real subscriptions.
  // Each stacked `@OnEvent(x)` call appends its own metadata entry, and the
  // loader registers one real `eventEmitter.on(x, ...)` per entry.
  @OnEvent(ARENA_ROOM_UPDATED)
  @OnEvent(ARENA_MATCH_STARTED)
  @OnEvent(ARENA_ANSWER_SUBMITTED)
  @OnEvent(ARENA_MATCH_FINISHED)
  async handleRoomChanged(event: ArenaDomainEvent) {
    const participants = await this.prisma.arenaParticipant.findMany({
      where: { roomId: event.roomId },
      select: { userId: true },
    });

    await Promise.all(
      participants.map(async (participant) => {
        try {
          const snapshot = await this.arenaService.getRoom(
            participant.userId,
            event.roomId,
          );
          this.gateway.emitUserSnapshot(participant.userId, snapshot);
        } catch (error) {
          this.logger.warn(
            `Failed to push snapshot for room ${event.roomId}/${participant.userId}: ${error}`,
          );
        }
      }),
    );
  }
}
