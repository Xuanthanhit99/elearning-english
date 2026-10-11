import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * QA-only claim primitive. Not registered or scheduled.
 * PostgreSQL SKIP LOCKED prevents simultaneous claims of the same row.
 * An expired lease can be reclaimed after a crashed worker.
 */
@Injectable()
export class XpRedisOutboxClaimService {
  constructor(private readonly prisma: PrismaService) {}

  async claim(batchSize = 10, leaseSeconds = 60) {
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
      throw new Error('INVALID_OUTBOX_BATCH_SIZE');
    }
    if (!Number.isInteger(leaseSeconds) || leaseSeconds < 5 || leaseSeconds > 3600) {
      throw new Error('INVALID_OUTBOX_LEASE_SECONDS');
    }

    return this.prisma.$transaction(async (tx) => {
      const candidates = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "XpRedisOutbox"
        WHERE (
          ("status" = 'PENDING' AND "nextAttemptAt" <= NOW())
          OR ("status" = 'PROCESSING' AND "lockedUntil" < NOW())
        )
        ORDER BY "createdAt" ASC, "id" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${batchSize}
      `;
      if (!candidates.length) return [];
      const ids = candidates.map((row) => row.id);
      await tx.xpRedisOutbox.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
          lockedUntil: new Date(Date.now() + leaseSeconds * 1000),
        },
      });
      return tx.xpRedisOutbox.findMany({
        where: { id: { in: ids } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
    });
  }
}
