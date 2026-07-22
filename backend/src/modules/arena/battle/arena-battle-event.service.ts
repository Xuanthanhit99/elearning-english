import { Injectable } from '@nestjs/common';
import { Prisma, ArenaBattleEventType } from '@prisma/client';

/**
 * Appends one row to the append-only ArenaBattleEvent log with a
 * monotonic, gap-free-per-match `sequence`. Must be called inside the same
 * transaction as the mutation it's logging — the atomic
 * `UPDATE ... RETURNING` on `ArenaMatch.eventSequence` is what makes
 * concurrent appends for the same match safe (same CAS-in-transaction style
 * as `ArenaService.finalizeMatch`, not a new locking primitive).
 */
@Injectable()
export class ArenaBattleEventService {
  async append(
    tx: Prisma.TransactionClient,
    input: {
      matchId: string;
      type: ArenaBattleEventType;
      actorUserId?: string | null;
      targetUserId?: string | null;
      questionId?: string | null;
      payload: Record<string, unknown>;
    },
  ) {
    const [{ eventSequence }] = await tx.$queryRaw<Array<{ eventSequence: number }>>`
      UPDATE "ArenaMatch"
      SET "eventSequence" = "eventSequence" + 1
      WHERE id = ${input.matchId}
      RETURNING "eventSequence"
    `;

    return tx.arenaBattleEvent.create({
      data: {
        matchId: input.matchId,
        sequence: eventSequence,
        type: input.type,
        actorUserId: input.actorUserId ?? null,
        targetUserId: input.targetUserId ?? null,
        questionId: input.questionId ?? null,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
  }
}
