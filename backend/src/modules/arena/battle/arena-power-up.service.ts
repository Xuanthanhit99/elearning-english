import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ArenaPowerUpType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  getArenaFreezeMinResponseMs,
  getArenaMaxTimeBoostMs,
  getArenaTimeBoostMs,
  isArenaPowerUpsEnabled,
} from './arena-battle.constants';
import { ARENA_DEFAULT_LOADOUT, ARENA_POWER_UP_DEFINITIONS } from './arena-power-up.registry';
import { resolveArenaMode } from '../mode/arena-mode-resolver.util';
import { getModeCapability } from '../mode/arena-mode.registry';
import { ArenaBattleStateService } from './arena-battle-state.service';
import { ArenaBattleEventService } from './arena-battle-event.service';
import { ArenaEventPublisher } from '../realtime/arena-event-publisher';
import { ARENA_ROOM_UPDATED } from '../realtime/arena-domain-event';
import {
  ARENA_MATCH_NOT_PLAYING,
  ARENA_POWER_UP_INVALID_QUESTION,
  ARENA_POWER_UP_INVALID_TARGET,
  ARENA_POWER_UP_NOT_SUPPORTED,
  ARENA_POWER_UP_ON_COOLDOWN,
  ARENA_POWER_UP_OUT_OF_USES,
  ARENA_POWER_UP_REQUEST_CONFLICT,
} from './arena-error-codes';

export type UsePowerUpDto = {
  type: ArenaPowerUpType;
  clientRequestId: string;
};

@Injectable()
export class ArenaPowerUpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly battleState: ArenaBattleStateService,
    private readonly battleEvents: ArenaBattleEventService,
    private readonly eventPublisher: ArenaEventPublisher,
  ) {}

  /**
   * Idempotently creates the default power-up loadout for every participant
   * of a SOLO_1V1 match — identical for both players, sourced only from
   * ARENA_DEFAULT_LOADOUT (never from ArenaProfile/gold). Safe to call
   * repeatedly (reconnect/retry) — `createMany` + `skipDuplicates` on the
   * `(matchId, userId, type)` unique constraint means a second call is a
   * no-op.
   */
  async initializeLoadout(matchId: string, participantUserIds: string[]) {
    const data = participantUserIds.flatMap((userId) =>
      ARENA_DEFAULT_LOADOUT.map((type) => ({
        matchId,
        userId,
        type,
        remainingUses: ARENA_POWER_UP_DEFINITIONS[type].maxUsesPerMatch,
      })),
    );
    if (!data.length) return;
    await this.prisma.arenaMatchPowerUp.createMany({ data, skipDuplicates: true });
  }

  async usePowerUp(userId: string, roomId: string, dto: UsePowerUpDto) {
    if (!isArenaPowerUpsEnabled()) {
      throw new BadRequestException(ARENA_POWER_UP_NOT_SUPPORTED);
    }

    const definition = ARENA_POWER_UP_DEFINITIONS[dto.type];
    if (!definition || !definition.enabled) {
      throw new BadRequestException(ARENA_POWER_UP_NOT_SUPPORTED);
    }

    const room = await this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng Arena');
    const resolved = resolveArenaMode(room);
    const capability = getModeCapability(resolved.mode);
    if (!capability.supportsPowerUps || !definition.allowedTeamFormats.includes(resolved.teamFormat)) {
      throw new BadRequestException(ARENA_POWER_UP_NOT_SUPPORTED);
    }
    if (room.status !== 'PLAYING') {
      throw new BadRequestException(ARENA_MATCH_NOT_PLAYING);
    }

    const caster = room.participants.find((p) => p.userId === userId);
    if (!caster) throw new ForbiddenException('Bạn chưa ở trong phòng này');

    // Target is always derived server-side from the match's own
    // participants, never from client input — a caster cannot name an
    // arbitrary target.
    const opponent = room.participants.find((p) => p.userId !== userId);
    if (!opponent) throw new BadRequestException(ARENA_POWER_UP_INVALID_TARGET);

    const targetUserId = definition.targetType === 'SELF' ? userId : opponent.userId;
    const targetParticipant = definition.targetType === 'SELF' ? caster : opponent;

    const match = await this.prisma.arenaMatch.findFirst({
      where: { roomId, finishedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (!match) throw new BadRequestException(ARENA_MATCH_NOT_PLAYING);

    // The idempotency-guard row is created OUTSIDE the transaction below on
    // purpose: Postgres aborts an entire transaction on the first error
    // inside it (25P02, "current transaction is aborted"), so catching a
    // P2002 from `.create()` and then issuing a follow-up read on the SAME
    // `tx` would itself fail. Creating it via `this.prisma` first (its own
    // implicit transaction, same pattern `ArenaService.submitAnswer` already
    // uses for `ArenaAnswer`) means a duplicate request fails fast, cleanly,
    // before any of the actual consume/effect logic ever opens a transaction.
    let usage: { id: string };
    try {
      usage = await this.prisma.arenaPowerUpUsage.create({
        data: {
          matchId: match.id,
          userId,
          type: dto.type,
          targetUserId,
          clientRequestId: dto.clientRequestId,
          result: 'PENDING',
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.arenaPowerUpUsage.findUnique({
          where: {
            matchId_userId_clientRequestId: {
              matchId: match.id,
              userId,
              clientRequestId: dto.clientRequestId,
            },
          },
        });
        if (!existing) throw error;
        if (existing.type !== dto.type || existing.targetUserId !== targetUserId) {
          throw new ConflictException(ARENA_POWER_UP_REQUEST_CONFLICT);
        }
        return { type: dto.type, idempotentReplay: true, status: existing.result, targetUserId };
      }
      throw error;
    }

    const outcome = await this.prisma.$transaction(async (tx) => {
      const markUsage = (result: string) =>
        tx.arenaPowerUpUsage.update({ where: { id: usage.id }, data: { result } });

      const loadout = await tx.arenaMatchPowerUp.findUnique({
        where: { matchId_userId_type: { matchId: match.id, userId, type: dto.type } },
      });
      if (!loadout || loadout.remainingUses <= 0) {
        await markUsage('OUT_OF_USES');
        throw new BadRequestException(ARENA_POWER_UP_OUT_OF_USES);
      }
      if (loadout.cooldownUntil && loadout.cooldownUntil.getTime() > Date.now()) {
        await markUsage('ON_COOLDOWN');
        throw new BadRequestException(ARENA_POWER_UP_ON_COOLDOWN);
      }

      const claimed = await tx.arenaMatchPowerUp.updateMany({
        where: { id: loadout.id, remainingUses: { gt: 0 } },
        data: {
          remainingUses: { decrement: 1 },
          usedCount: { increment: 1 },
          cooldownUntil:
            definition.cooldownMs() > 0
              ? new Date(Date.now() + definition.cooldownMs())
              : loadout.cooldownUntil,
        },
      });
      if (claimed.count === 0) {
        await markUsage('OUT_OF_USES');
        throw new BadRequestException(ARENA_POWER_UP_OUT_OF_USES);
      }

      const status = await this.applyEffect(tx, {
        matchId: match.id,
        activeQuestionOrder: match.activeQuestionOrder,
        questionDeadlineAt: match.questionDeadlineAt,
        type: dto.type,
        userId,
        targetUserId,
        targetParticipantId: targetParticipant.id,
      });

      await markUsage(status);
      await this.battleEvents.append(tx, {
        matchId: match.id,
        type: status === 'BLOCKED' ? 'POWER_UP_BLOCKED' : 'POWER_UP_APPLIED',
        actorUserId: userId,
        targetUserId,
        payload: { powerUpType: dto.type, status },
      });
      await tx.arenaMatch.update({
        where: { id: match.id },
        data: { revision: { increment: 1 } },
      });

      return { idempotentReplay: false, status, targetUserId };
    });

    this.eventPublisher.publish({
      type: ARENA_ROOM_UPDATED,
      roomId,
      matchId: match.id,
      actorUserId: userId,
    });

    return { type: dto.type, ...outcome };
  }

  private async applyEffect(
    tx: Prisma.TransactionClient,
    ctx: {
      matchId: string;
      activeQuestionOrder: number | null;
      questionDeadlineAt: Date | null;
      type: ArenaPowerUpType;
      userId: string;
      targetUserId: string;
      targetParticipantId: string;
    },
  ): Promise<'APPLIED' | 'BLOCKED'> {
    switch (ctx.type) {
      case 'SHIELD': {
        const state = await this.battleState.getOrCreate(ctx.matchId, ctx.targetParticipantId, tx);
        await tx.arenaParticipantBattleState.update({
          where: { id: state.id },
          data: { shieldCharges: { increment: 1 } },
        });
        await tx.arenaPowerUpEffect.create({
          data: {
            matchId: ctx.matchId,
            sourceUserId: ctx.userId,
            targetUserId: ctx.targetUserId,
            type: 'SHIELD',
            status: 'ACTIVE',
            remainingTriggers: 1,
          },
        });
        return 'APPLIED';
      }

      case 'DOUBLE_SCORE': {
        await tx.arenaPowerUpEffect.create({
          data: {
            matchId: ctx.matchId,
            sourceUserId: ctx.userId,
            targetUserId: ctx.targetUserId,
            type: 'DOUBLE_SCORE',
            status: 'ACTIVE',
            appliesFromQuestionOrder: ctx.activeQuestionOrder ?? 1,
            remainingTriggers: 1,
          },
        });
        return 'APPLIED';
      }

      case 'TIME_BOOST': {
        const state = await this.battleState.getOrCreate(ctx.matchId, ctx.targetParticipantId, tx);
        const referenceDeadline = ctx.questionDeadlineAt ?? new Date();
        const hardCap = new Date(referenceDeadline.getTime() + getArenaMaxTimeBoostMs());
        const base = state.deadlineOverrideAt ?? referenceDeadline;
        const proposed = new Date(
          Math.max(base.getTime(), Date.now()) + getArenaTimeBoostMs(),
        );
        const capped = proposed.getTime() > hardCap.getTime() ? hardCap : proposed;

        await tx.arenaParticipantBattleState.update({
          where: { id: state.id },
          data: { deadlineOverrideAt: capped },
        });
        await tx.arenaPowerUpEffect.create({
          data: {
            matchId: ctx.matchId,
            sourceUserId: ctx.userId,
            targetUserId: ctx.targetUserId,
            type: 'TIME_BOOST',
            status: 'CONSUMED',
            consumedAt: new Date(),
            remainingTriggers: 0,
          },
        });
        return 'APPLIED';
      }

      case 'FREEZE': {
        if (!ctx.activeQuestionOrder) {
          throw new BadRequestException(ARENA_POWER_UP_INVALID_QUESTION);
        }
        const activeQuestion = await tx.arenaQuestion.findFirst({
          where: { matchId: ctx.matchId, order: ctx.activeQuestionOrder },
        });
        if (!activeQuestion) {
          throw new BadRequestException(ARENA_POWER_UP_INVALID_QUESTION);
        }
        const alreadyAnswered = await tx.arenaAnswer.findUnique({
          where: {
            questionId_userId: { questionId: activeQuestion.id, userId: ctx.targetUserId },
          },
        });
        if (alreadyAnswered) {
          throw new BadRequestException(ARENA_POWER_UP_INVALID_QUESTION);
        }

        const targetState = await this.battleState.getOrCreate(
          ctx.matchId,
          ctx.targetParticipantId,
          tx,
        );
        if (targetState.shieldCharges > 0) {
          await tx.arenaParticipantBattleState.update({
            where: { id: targetState.id },
            data: { shieldCharges: { decrement: 1 } },
          });
          await tx.arenaPowerUpEffect.create({
            data: {
              matchId: ctx.matchId,
              sourceUserId: ctx.userId,
              targetUserId: ctx.targetUserId,
              type: 'FREEZE',
              status: 'BLOCKED',
              consumedAt: new Date(),
            },
          });
          return 'BLOCKED';
        }

        // Shorten the target's remaining time, never below the configured
        // minimum response window (§10.3 — no locking input entirely, no
        // sub-minimum deadlines, never applied after they've answered).
        const minDeadline = new Date(Date.now() + getArenaFreezeMinResponseMs());
        const current = targetState.deadlineOverrideAt ?? ctx.questionDeadlineAt;
        const nextDeadline =
          current && current.getTime() < minDeadline.getTime() ? current : minDeadline;

        await tx.arenaParticipantBattleState.update({
          where: { id: targetState.id },
          data: { deadlineOverrideAt: nextDeadline },
        });
        await tx.arenaPowerUpEffect.create({
          data: {
            matchId: ctx.matchId,
            sourceUserId: ctx.userId,
            targetUserId: ctx.targetUserId,
            type: 'FREEZE',
            status: 'CONSUMED',
            consumedAt: new Date(),
          },
        });
        return 'APPLIED';
      }

      default:
        throw new BadRequestException(ARENA_POWER_UP_NOT_SUPPORTED);
    }
  }

  /** Active DOUBLE_SCORE effect for this participant that applies to `questionOrder`, if any — used by ArenaService when scoring an answer. */
  async consumeDoubleScoreIfArmed(
    tx: Prisma.TransactionClient,
    matchId: string,
    userId: string,
    questionOrder: number,
  ): Promise<boolean> {
    const effect = await tx.arenaPowerUpEffect.findFirst({
      where: {
        matchId,
        targetUserId: userId,
        type: 'DOUBLE_SCORE',
        status: 'ACTIVE',
      },
    });
    if (!effect) return false;
    if ((effect.appliesFromQuestionOrder ?? 0) > questionOrder) return false;

    await tx.arenaPowerUpEffect.updateMany({
      where: { id: effect.id, status: 'ACTIVE' },
      data: { status: 'CONSUMED', consumedAt: new Date(), remainingTriggers: 0 },
    });
    return true;
  }
}
