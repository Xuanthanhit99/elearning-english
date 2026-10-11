import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { LEADERBOARD_REDIS } from './leaderboard.constants';
import { XpRedisProjectionService } from './xp-redis-projection.service';
import { writeVersionedXpScore } from './xp-redis-version-fence';

/**
 * QA-only coordinated write. Not registered in a module or scheduled.
 * A PostgreSQL row lock is held across the Redis command so another worker
 * cannot reclaim this outbox row before the command finishes.
 * Never call this while another transaction holds a lock on the same row.
 */
@Injectable()
export class XpRedisCoordinatedWriteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projection: XpRedisProjectionService,
    @Inject(LEADERBOARD_REDIS) private readonly redis: Redis,
  ) {}

  async apply(outboxId: string, generation: number): Promise<'APPLIED' | 'SUPERSEDED' | 'STALE'> {
    if (!Number.isSafeInteger(generation) || generation < 1) return 'STALE';

    // Read a consistent PostgreSQL snapshot outside the locking transaction.
    // The revision comparison inside the lock ensures the snapshot is current.
    const snapshot = await this.projection.absoluteScore(outboxId);

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "XpRedisOutbox"
        WHERE "id" = ${outboxId}
          AND "status" = 'PROCESSING'
          AND "attempts" = ${generation}
          AND "lockedUntil" > clock_timestamp()
        FOR UPDATE
      `;
      if (rows.length !== 1) return 'STALE';

      // Lock the projection revision row as well: XP awards incrementing this
      // revision cannot commit while this Redis write is in flight.
      const revisions = await tx.$queryRaw<Array<{ revision: number }>>`
        SELECT "revision" FROM "XpRedisProjectionRevision"
        WHERE "redisKey" = ${snapshot.redisKey} AND "userId" = ${snapshot.userId}
        FOR UPDATE
      `;
      if (revisions.length !== 1) throw new Error('MISSING_AUTHORITATIVE_PROJECTION_REVISION');
      if (revisions[0].revision !== snapshot.revision) {
        await tx.xpRedisOutbox.update({ where: { id: outboxId }, data: {
          status: 'DONE', lockedUntil: null,
        } });
        return 'SUPERSEDED';
      }

      // Check lease again immediately before the Redis command. PostgreSQL
      // row lock prevents another claimer from acquiring this row meanwhile.
      const valid = await tx.$queryRaw<Array<{ valid: boolean }>>`
        SELECT ("lockedUntil" > clock_timestamp()) AS valid
        FROM "XpRedisOutbox" WHERE "id" = ${outboxId}
      `;
      if (!valid[0]?.valid) return 'STALE';

      await writeVersionedXpScore(
        this.redis, snapshot.redisKey, snapshot.userId,
        snapshot.score, snapshot.revision,
      );

      // A lease may expire while Redis is executing. This worker still owns
      // the row lock, so no replacement worker can overtake its write.
      // A failed PostgreSQL commit leaves a retryable idempotent Redis write.
      await tx.xpRedisOutbox.update({ where: { id: outboxId }, data: {
        status: 'DONE', lockedUntil: null, lastError: null,
      } });
      return 'APPLIED';
    }, { timeout: 15000 });
  }
}
