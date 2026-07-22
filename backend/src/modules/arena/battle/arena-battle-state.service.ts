import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { comboMultiplierBasisPoints } from './arena-battle.constants';

type Client = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ArenaBattleStateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Concurrency-safe check-then-create: two racing callers (e.g. the same
   * user's answer submitted twice at once) can both see "missing" and both
   * attempt `.create()` — only one wins the unique constraint on
   * `(matchId, participantId)`, so the loser falls back to re-reading
   * instead of throwing. Same idempotent create-catch-P2002-reread pattern
   * `ArenaService.submitAnswer` already uses for `ArenaAnswer`.
   */
  async getOrCreate(matchId: string, participantId: string, client: Client = this.prisma) {
    const existing = await client.arenaParticipantBattleState.findUnique({
      where: { matchId_participantId: { matchId, participantId } },
    });
    if (existing) return existing;

    try {
      return await client.arenaParticipantBattleState.create({
        data: { matchId, participantId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await client.arenaParticipantBattleState.findUnique({
          where: { matchId_participantId: { matchId, participantId } },
        });
        if (raced) return raced;
      }
      throw error;
    }
  }

  /** Applies one answered-question outcome to the participant's battle state. Must run inside the caller's transaction. */
  async applyAnswerOutcome(
    tx: Prisma.TransactionClient,
    params: {
      matchId: string;
      participantId: string;
      awarded: boolean; // correct AND not late
      comboAfter: number;
      scoreDelta: number;
    },
  ) {
    const state = await this.getOrCreate(params.matchId, params.participantId, tx);
    const combo = params.awarded ? params.comboAfter : 0;

    return tx.arenaParticipantBattleState.update({
      where: { id: state.id },
      data: {
        score: { increment: params.scoreDelta },
        combo,
        maxCombo: Math.max(state.maxCombo, combo),
        correctStreak: params.awarded ? state.correctStreak + 1 : 0,
        wrongStreak: params.awarded ? 0 : state.wrongStreak + 1,
        multiplierBasisPoints: comboMultiplierBasisPoints(combo),
      },
    });
  }
}
