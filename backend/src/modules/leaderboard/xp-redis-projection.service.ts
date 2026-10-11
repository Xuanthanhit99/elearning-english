import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';
import { LEADERBOARD_REDIS } from './leaderboard.constants';

/**
 * QA-only building block for outbox recovery.
 *
 * Deliberately not registered in LeaderboardModule yet: existing direct Redis
 * writers must be removed before activating a second writer.
 */
@Injectable()
export class XpRedisProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LEADERBOARD_REDIS) private readonly redis: Redis,
  ) {}

  /**
   * Resolve a projection from PostgreSQL, never from an incremental Redis score.
   * A missing leaderboard entry is a zero score, not an invitation to replay XP.
   */
  async absoluteScore(outboxId: string): Promise<{
    redisKey: string;
    userId: string;
    score: number;
    revision: number;
  }> {
    const job = await this.prisma.xpRedisOutbox.findUniqueOrThrow({
      where: { id: outboxId },
    });

    const revisionRow = await this.prisma.xpRedisProjectionRevision.findUnique({
      where: { redisKey_userId: { redisKey: job.redisKey, userId: job.userId } },
      select: { revision: true },
    });
    if (!revisionRow) throw new Error('MISSING_AUTHORITATIVE_PROJECTION_REVISION');
    const revision = revisionRow.revision;

    if (job.projection === 'WEEKLY') {
      if (!job.groupId || !job.seasonId) {
        throw new Error('INVALID_WEEKLY_OUTBOX');
      }
      const entry = await this.prisma.leaderboardEntry.findFirst({
        where: {
          userId: job.userId,
          groupId: job.groupId,
          group: { seasonId: job.seasonId },
        },
        select: { periodXp: true },
      });
      return { redisKey: job.redisKey, userId: job.userId, score: entry?.periodXp ?? 0, revision };
    }

    if (job.projection === 'SKILL') {
      if (!job.skill || !job.periodKey) {
        throw new Error('INVALID_SKILL_OUTBOX');
      }
      // Aggregate only transactions with a committed SKILL projection intent.
      // This matches the legacy behavior of only updating skill Redis when
      // an eligible active-season weekly entry was awarded XP.
      const intents = await this.prisma.xpRedisOutbox.findMany({
        where: {
          userId: job.userId,
          projection: 'SKILL',
          skill: job.skill,
          periodKey: job.periodKey,
        },
        select: { transactionId: true },
      });
      const aggregate = await this.prisma.xpTransaction.aggregate({
        where: { id: { in: intents.map((intent) => intent.transactionId) } },
        _sum: { finalXp: true },
      });
      return {
        redisKey: job.redisKey,
        userId: job.userId,
        score: aggregate._sum.finalXp ?? 0,
        revision,
      };
    }

    throw new Error('UNKNOWN_XP_PROJECTION');
  }

  /**
   * Not safe to call concurrently with legacy direct writers.
   * Worker will supply per-key ordering and lease fencing before this is used.
   */
  async projectUncoordinatedForTestOnly(outboxId: string) {
    const { redisKey, userId, score } = await this.absoluteScore(outboxId);
    await this.redis.zadd(redisKey, score, userId);
    return score;
  }
}
