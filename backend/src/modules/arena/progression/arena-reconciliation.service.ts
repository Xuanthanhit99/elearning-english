import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArenaProgressionDispatcherService } from './arena-progression-dispatcher.service';

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

const getArenaReconciliationBatchSize = () => envInt('ARENA_RECONCILIATION_BATCH_SIZE', 50);
/** Bounds the "missing participant" scan to recently-finished matches — a permanent gap older than this is a signal for manual investigation, not silent infinite retry. */
const getArenaReconciliationLookbackHours = () => envInt('ARENA_RECONCILIATION_LOOKBACK_HOURS', 72);

export type ArenaReconciliationSummary = {
  scanned: number;
  recovered: number;
  stillProcessing: number;
  failed: number;
};

/**
 * Finds and completes Arena match progression that never finished — see
 * docs/arena-progression-sequence.md §7. Two independent gap classes,
 * both bounded to a single batch per pass:
 *
 * 1. "Missing participant": a finished match where a participant has no
 *    `ArenaProgressionRecord` row at all (e.g. the original per-participant
 *    loop crashed before even attempting them).
 * 2. "Retryable/stale": an `ArenaProgressionRecord` in PENDING, FAILED, or
 *    PROCESSING-with-an-expired-lease (a crash mid-application).
 *
 * Every recovery call goes through `ArenaProgressionDispatcherService
 * .applyMatchRewards()` — the exact same idempotent entry point normal
 * dispatch uses — so this can never duplicate a reward: the dispatcher's
 * own idempotency pre-check (`ArenaRewardLog` existence) and CAS claim are
 * what make repeated reconciliation passes safe, not anything reconciliation
 * itself does.
 */
@Injectable()
export class ArenaReconciliationService {
  private readonly logger = new Logger(ArenaReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: ArenaProgressionDispatcherService,
  ) {}

  async reconcile(): Promise<ArenaReconciliationSummary> {
    const batchSize = getArenaReconciliationBatchSize();
    const now = new Date();

    const missing = await this.findMissingParticipants(batchSize);
    const retryable = await this.prisma.arenaProgressionRecord.findMany({
      where: {
        OR: [
          { status: { in: ['PENDING', 'FAILED'] } },
          { status: 'PROCESSING', leaseExpiresAt: { lt: now } },
        ],
      },
      take: batchSize,
      select: { matchId: true, userId: true },
    });

    // De-dupe (a row could theoretically satisfy both queries) and cap at
    // the batch size overall, not per-query.
    const targets = new Map<string, { matchId: string; userId: string }>();
    for (const item of [...missing, ...retryable]) {
      targets.set(`${item.matchId}:${item.userId}`, item);
      if (targets.size >= batchSize) break;
    }

    let recovered = 0;
    let stillProcessing = 0;
    let failed = 0;

    for (const { matchId, userId } of targets.values()) {
      try {
        const result = await this.dispatcher.applyMatchRewards(matchId, userId);
        if (result.status === 'COMPLETED') recovered++;
        else if (result.status === 'PROCESSING') stillProcessing++;
      } catch (error) {
        failed++;
        this.logger.error(
          `Arena reconciliation failed matchId=${matchId} userId=${userId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const summary: ArenaReconciliationSummary = {
      scanned: targets.size,
      recovered,
      stillProcessing,
      failed,
    };
    this.logger.log(
      `Arena reconciliation pass: scanned=${summary.scanned} recovered=${summary.recovered} stillProcessing=${summary.stillProcessing} failed=${summary.failed}`,
    );
    return summary;
  }

  private async findMissingParticipants(
    limit: number,
  ): Promise<Array<{ matchId: string; userId: string }>> {
    const since = new Date(Date.now() - getArenaReconciliationLookbackHours() * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<Array<{ matchId: string; userId: string }>>`
      SELECT p."userId" AS "userId", m.id AS "matchId"
      FROM "ArenaParticipant" p
      JOIN "ArenaRoom" r ON r.id = p."roomId"
      JOIN "ArenaMatch" m ON m."roomId" = r.id
      WHERE m."finishedAt" IS NOT NULL
        AND m."finishedAt" > ${since}
        AND NOT EXISTS (
          SELECT 1 FROM "ArenaProgressionRecord" pr
          WHERE pr."matchId" = m.id AND pr."userId" = p."userId"
        )
      LIMIT ${limit}
    `;
    return rows;
  }
}
