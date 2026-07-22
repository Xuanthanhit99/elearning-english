import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

const getHistoryWindowDays = () => envInt('ARENA_QUESTION_HISTORY_WINDOW_DAYS', 14);

/**
 * Per-user recently-seen-question ledger. Only ever written for questions
 * that were actually persisted into a match (never rejected candidates,
 * never on a failed preparation) — see `ArenaQuestionPipelineService`.
 */
@Injectable()
export class ArenaQuestionHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recently-seen content hashes across all given users, within a bounded
   * window. `windowDaysOverride` lets the pipeline widen the exclusion
   * window's *complement* (i.e. narrow how far back it looks) when the
   * available pool is too small to fill a match without reusing content —
   * a smaller window means fewer hashes excluded.
   */
  async getRecentHashes(userIds: string[], windowDaysOverride?: number): Promise<Set<string>> {
    if (!userIds.length) return new Set();

    const windowDays = windowDaysOverride ?? getHistoryWindowDays();
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.arenaUserQuestionHistory.findMany({
      where: { userId: { in: userIds }, seenAt: { gte: since } },
      select: { contentHash: true },
    });

    return new Set(rows.map((row) => row.contentHash));
  }

  async recordSeen(
    tx: Prisma.TransactionClient,
    entries: Array<{
      userId: string;
      contentHash: string;
      matchId: string;
      mode?: string;
      skill: string;
      topic?: string;
    }>,
  ) {
    if (!entries.length) return;
    await tx.arenaUserQuestionHistory.createMany({
      data: entries.map((entry) => ({
        userId: entry.userId,
        contentHash: entry.contentHash,
        matchId: entry.matchId,
        mode: entry.mode ?? null,
        skill: entry.skill,
        topic: entry.topic ?? null,
      })),
    });
  }
}
