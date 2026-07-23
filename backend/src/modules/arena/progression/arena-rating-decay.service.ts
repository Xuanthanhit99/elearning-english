import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArenaEventPublisher } from '../realtime/arena-event-publisher';
import { ARENA_DECAY_APPLIED } from '../realtime/arena-domain-event';
import {
  ARENA_TIER_THRESHOLDS,
  applyArenaRatingDecay,
  arenaTierRank,
  getArenaDecayAmount,
  getArenaDecayEnabled,
  getArenaDecayInactivityDays,
  getArenaDecayMinTier,
} from './arena-rating-engine';

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

const getArenaDecayBatchSize = () => envInt('ARENA_DECAY_BATCH_SIZE', 100);

export type ArenaRatingDecaySummary = {
  scanned: number;
  applied: number;
  skippedByCas: number;
  disabled: boolean;
};

@Injectable()
export class ArenaRatingDecayService {
  private readonly logger = new Logger(ArenaRatingDecayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: ArenaEventPublisher,
  ) {}

  async runDecay(now = new Date()): Promise<ArenaRatingDecaySummary> {
    if (!getArenaDecayEnabled()) {
      return { scanned: 0, applied: 0, skippedByCas: 0, disabled: true };
    }

    const inactivityDays = getArenaDecayInactivityDays();
    const cutoff = new Date(now.getTime() - inactivityDays * 24 * 60 * 60 * 1000);
    const minTier = getArenaDecayMinTier();
    const eligibleTiers = ARENA_TIER_THRESHOLDS.filter(
      (entry) => arenaTierRank(entry.tier) >= arenaTierRank(minTier),
    ).map((entry) => entry.tier);

    const profiles = await this.prisma.arenaProfile.findMany({
      where: {
        placementMatchesRemaining: { lte: 0 },
        tier: { in: eligibleTiers },
        lastMatchAt: { not: null, lte: cutoff },
        OR: [{ lastRatingDecayAt: null }, { lastRatingDecayAt: { lte: cutoff } }],
      },
      orderBy: { lastMatchAt: 'asc' },
      take: getArenaDecayBatchSize(),
    });

    let applied = 0;
    let skippedByCas = 0;
    for (const profile of profiles) {
      const result = applyArenaRatingDecay({
        currentMmr: profile.mmr,
        currentTier: profile.tier,
        amount: getArenaDecayAmount(),
      });
      const updated = await this.prisma.arenaProfile.updateMany({
        where: {
          id: profile.id,
          mmr: profile.mmr,
          tier: profile.tier,
          placementMatchesRemaining: profile.placementMatchesRemaining,
          lastMatchAt: profile.lastMatchAt,
          lastRatingDecayAt: profile.lastRatingDecayAt,
        },
        data: {
          mmr: result.nextMmr,
          tier: result.nextTier,
          level: Math.floor(result.nextMmr / 250),
          lastRatingDecayAt: now,
        },
      });

      if (updated.count === 0) {
        skippedByCas += 1;
        continue;
      }

      applied += 1;
      this.eventPublisher.publish({
        type: ARENA_DECAY_APPLIED,
        roomId: '',
        userId: profile.userId,
        previousMmr: profile.mmr,
        nextMmr: result.nextMmr,
        mmrDelta: result.mmrDelta,
        previousTier: profile.tier,
        nextTier: result.nextTier,
        demoted: arenaTierRank(result.nextTier) < arenaTierRank(profile.tier),
        occurredAt: now.toISOString(),
      });
    }

    if (applied || skippedByCas) {
      this.logger.log(`Arena rating decay scanned=${profiles.length} applied=${applied} skippedByCas=${skippedByCas}`);
    }

    return { scanned: profiles.length, applied, skippedByCas, disabled: false };
  }
}
