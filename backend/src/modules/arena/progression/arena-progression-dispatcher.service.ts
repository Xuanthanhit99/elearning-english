import { Injectable, Logger } from '@nestjs/common';
import { Prisma, XpSourceType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { XpService } from 'src/modules/leaderboard/xp.service';
import { getModeCapability } from '../mode/arena-mode.registry';
import { resolveArenaMode } from '../mode/arena-mode-resolver.util';
import { ArenaEventPublisher } from '../realtime/arena-event-publisher';
import { ARENA_MATCH_COMPLETED, ARENA_RATING_CHANGED } from '../realtime/arena-domain-event';
import { ArenaSeasonService } from './arena-season.service';
import {
  ArenaMatchOutcome,
  applyEloDelta,
  calculateEloDelta,
  getArenaKFactor,
  resolveArenaTier,
} from './arena-rating-engine';
import { calculateArenaMatchReward } from './arena-reward-calculator';
import { calculateArenaPetReward } from './arena-pet-reward.util';

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** How long a PROCESSING claim is honored before the reconciliation job (or another dispatch attempt) may reclaim it — same stale-lease idiom as Phase BC-Reconciliation's room-preparation state machine. */
export const getArenaProgressionLeaseMs = () => envInt('ARENA_PROGRESSION_LEASE_MS', 60000);

export type ArenaProgressionOutcome = {
  status: 'COMPLETED' | 'PENDING' | 'PROCESSING' | 'FAILED' | 'SKIPPED';
  outcome?: ArenaMatchOutcome;
  seasonId?: string | null;
  previousMmr?: number;
  nextMmr?: number;
  mmrDelta?: number;
  previousTier?: string;
  nextTier?: string;
  promoted?: boolean;
  demoted?: boolean;
  xpAwarded?: number;
  goldAwarded?: number;
  arenaPointsAwarded?: number;
  rewardBreakdown?: Record<string, unknown>;
};

function isP2002(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function isSameCalendarDay(a: Date | null, b: Date): boolean {
  if (!a) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Post-match-commit progression dispatcher — see
 * docs/arena-progression-sequence.md §§2-8 for the full design this
 * implements. `finalizeMatch()`'s own transaction (winner computation,
 * `FINISHED` flip) is unmodified and already committed by the time this
 * runs; every write here happens in its OWN transaction, one per
 * participant — never nested inside `finalizeMatch`'s transaction, and
 * never sharing a transaction across participants (Phase F0.5 finding
 * F0.5-1: `XpService.awardXpWithSideEffects()` cannot be nested).
 */
@Injectable()
export class ArenaProgressionDispatcherService {
  private readonly logger = new Logger(ArenaProgressionDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: XpService,
    private readonly seasonService: ArenaSeasonService,
    private readonly eventPublisher: ArenaEventPublisher,
  ) {}

  /**
   * Entry point called once by `finalizeMatch` right after its transaction
   * commits. Loops participants sequentially; one participant's failure is
   * logged and does NOT stop the rest of the loop, and does NOT touch
   * anything already committed for a prior participant — reconciliation
   * (see `ArenaReconciliationService`) finishes whatever this loop
   * couldn't.
   */
  async processMatch(matchId: string): Promise<ArenaProgressionOutcome[]> {
    const match = await this.prisma.arenaMatch.findUnique({
      where: { id: matchId },
      include: { room: { include: { participants: true } } },
    });
    if (!match || !match.finishedAt) return [];

    const results: ArenaProgressionOutcome[] = [];
    for (const participant of match.room.participants) {
      try {
        results.push(await this.applyMatchRewards(matchId, participant.userId));
      } catch (error) {
        this.logger.error(
          `Arena progression failed matchId=${matchId} userId=${participant.userId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        results.push({ status: 'SKIPPED' });
      }
    }
    return results;
  }

  /**
   * Read-only summary for API responses (Part 9) — never mutates
   * anything, safe to call as many times as a client polls. Returns
   * `null` if no progression was ever attempted for this participant
   * (e.g. a mode that doesn't grant any reward at all reached this
   * match — rare, but not an error).
   */
  async getProgressionSummary(matchId: string, userId: string): Promise<ArenaProgressionOutcome | null> {
    const record = await this.prisma.arenaProgressionRecord.findUnique({
      where: { matchId_userId: { matchId, userId } },
    });
    if (!record) return null;
    if (record.status === 'COMPLETED') return this.loadCompletedOutcome(record);
    return { status: record.status as 'PENDING' | 'PROCESSING' | 'FAILED' };
  }

  /**
   * Idempotent, safe to call standalone (used directly by both
   * `processMatch` and the reconciliation job) — always re-derives
   * everything from persisted state rather than trusting any caller-held
   * in-memory data, since it may run long after the original match-finish
   * request.
   */
  async applyMatchRewards(matchId: string, userId: string): Promise<ArenaProgressionOutcome> {
    const existingRecord = await this.prisma.arenaProgressionRecord.findUnique({
      where: { matchId_userId: { matchId, userId } },
    });
    if (existingRecord?.status === 'COMPLETED') {
      // Idempotent replay — never recompute rating/reward twice for the
      // same participant/match.
      return this.loadCompletedOutcome(existingRecord);
    }

    const claimed = await this.claimProgression(matchId, userId, existingRecord);
    if (!claimed) {
      return { status: 'PROCESSING' };
    }

    try {
      const outcome = await this.computeAndApply(matchId, userId);
      return outcome;
    } catch (error) {
      await this.prisma.arenaProgressionRecord
        .update({
          where: { matchId_userId: { matchId, userId } },
          data: {
            status: 'FAILED',
            lastError: (error instanceof Error ? error.message : String(error)).slice(0, 500),
          },
        })
        .catch(() => undefined); // best-effort — never let the failure-marker itself crash the caller
      throw error;
    }
  }

  private async claimProgression(
    matchId: string,
    userId: string,
    existingRecord: { status: string } | null,
  ): Promise<boolean> {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + getArenaProgressionLeaseMs());

    if (!existingRecord) {
      try {
        await this.prisma.arenaProgressionRecord.create({
          data: { matchId, userId, status: 'PROCESSING', attempts: 1, leaseExpiresAt },
        });
        return true;
      } catch (error) {
        if (!isP2002(error)) throw error;
        // Lost a create race — fall through to the claim-by-update path below.
      }
    }

    const claim = await this.prisma.arenaProgressionRecord.updateMany({
      where: {
        matchId,
        userId,
        OR: [
          { status: { in: ['PENDING', 'FAILED'] } },
          { status: 'PROCESSING', leaseExpiresAt: { lt: now } },
        ],
      },
      data: { status: 'PROCESSING', attempts: { increment: 1 }, leaseExpiresAt, lastError: null },
    });
    return claim.count > 0;
  }

  private async computeAndApply(matchId: string, userId: string): Promise<ArenaProgressionOutcome> {
    const match = await this.prisma.arenaMatch.findUnique({
      where: { id: matchId },
      include: { room: { include: { participants: true } } },
    });
    if (!match) throw new Error(`ArenaMatch ${matchId} not found`);
    const room = match.room;
    const participant = room.participants.find((p) => p.userId === userId);
    if (!participant) throw new Error(`Participant ${userId} not found in room ${room.id}`);

    // Idempotency pre-check (closes a real gap: the profile mutation and
    // the `ArenaProgressionRecord` COMPLETED update are in DIFFERENT
    // transactions — see the class docblock — so a crash between them
    // would otherwise let a retry re-derive a *new* delta from an
    // already-mutated profile and double-apply it, especially on the
    // no-XP path which has no idempotency-key guard of its own).
    // `ArenaRewardLog`'s pre-existing `@@unique([matchId,userId])` (Phase
    // A) is the canonical "was this participant's reward already applied"
    // signal — if it exists, a prior attempt already fully committed the
    // profile mutation; recover and finish bookkeeping only, never
    // recompute.
    const existingRewardLog = await this.prisma.arenaRewardLog.findUnique({
      where: { matchId_userId: { matchId, userId } },
    });
    if (existingRewardLog) {
      return this.recoverFromExistingRewardLog(matchId, userId, existingRewardLog);
    }

    const resolved = resolveArenaMode(room);
    const capability = getModeCapability(resolved.mode);

    const won = participant.team === match.winnerTeam;
    const outcome: ArenaMatchOutcome = won ? 'WIN' : 'LOSS';

    const profiles = new Map<string, { mmr: number }>();
    for (const p of room.participants) {
      const profile = await this.getOrCreateProfile(p.userId);
      profiles.set(p.userId, profile);
    }
    const teamA = room.participants.filter((p) => p.team === 'A');
    const teamB = room.participants.filter((p) => p.team === 'B');
    const avgMmr = (team: typeof teamA) =>
      Math.round(
        team.reduce((sum, p) => sum + (profiles.get(p.userId)?.mmr ?? 1500), 0) /
          Math.max(1, team.length),
      );
    const avgA = avgMmr(teamA);
    const avgB = avgMmr(teamB);
    const opponentAvg = participant.team === 'A' ? avgB : avgA;
    const opponentId =
      resolved.teamFormat === 'SOLO_1V1'
        ? room.participants.find((p) => p.userId !== userId)?.userId
        : undefined;

    const profile = await this.getOrCreateProfile(userId);

    const mmrDelta = capability.affectsElo
      ? calculateEloDelta(profile.mmr, opponentAvg, outcome, getArenaKFactor())
      : 0;
    const nextMmr = capability.affectsElo ? applyEloDelta(profile.mmr, mmrDelta) : profile.mmr;
    const previousTier = resolveArenaTier(profile.mmr);
    const nextTier = resolveArenaTier(nextMmr);

    const battleState = await this.prisma.arenaParticipantBattleState.findUnique({
      where: { matchId_participantId: { matchId, participantId: participant.id } },
    });

    const now = new Date();
    const isFirstMatchToday = !isSameCalendarDay(profile.lastDailyBonusAt, now);
    const isFirstWinToday = won && !isSameCalendarDay(profile.lastFirstWinBonusAt, now);
    const nextWinStreak = won ? profile.winStreak + 1 : 0;

    const season = capability.participatesInSeason ? await this.seasonService.getActiveSeason() : null;

    const reward = calculateArenaMatchReward({
      outcome,
      correct: participant.correct,
      wrong: participant.wrong,
      maxCombo: battleState?.maxCombo ?? 0,
      winStreakAfter: nextWinStreak,
      isFirstWinToday,
      isFirstMatchToday,
      mmrDelta,
      capability: {
        grantsXp: capability.grantsXp,
        grantsGold: capability.grantsGold,
        grantsArenaPoints: capability.grantsArenaPoints,
      },
    });

    // Pre-existing pet/food reward (unrelated to the new XP/gold/Arena
    // Points calculator) — preserved unchanged so this behavior stays
    // stable now that reward application has moved out of
    // `finalizeMatch`'s transaction.
    const petReward = calculateArenaPetReward({ won, winStreakAfter: nextWinStreak });

    const applyProfileWrites = async (tx: Prisma.TransactionClient) => {
      await tx.arenaProfile.update({
        where: { userId },
        data: {
          mmr: nextMmr,
          tier: nextTier,
          arenaPoint: Math.max(0, profile.arenaPoint + reward.arenaPoints),
          gold: profile.gold + reward.gold,
          arenaFood: profile.arenaFood + petReward.foodDelta,
          trophy: profile.trophy + (won ? 1 : 0),
          winCount: profile.winCount + (won ? 1 : 0),
          loseCount: profile.loseCount + (won ? 0 : 1),
          seasonWinCount: profile.seasonWinCount + (won ? 1 : 0),
          seasonLoseCount: profile.seasonLoseCount + (won ? 0 : 1),
          winStreak: nextWinStreak,
          bestWinStreak: Math.max(profile.bestWinStreak, nextWinStreak),
          level: Math.floor(nextMmr / 250),
          lastMatchAt: now,
          lastDailyBonusAt: isFirstMatchToday ? now : profile.lastDailyBonusAt,
          lastFirstWinBonusAt: isFirstWinToday ? now : profile.lastFirstWinBonusAt,
        },
      });

      await tx.petProfile.updateMany({
        where: { userId },
        data: {
          food: { increment: petReward.foodDelta },
          coins: { increment: reward.gold },
          xp: { increment: petReward.petXp },
        },
      });

      let ratingHistoryId: string | null = null;
      if (capability.affectsElo || previousTier !== nextTier) {
        try {
          const ratingHistory = await tx.arenaRatingHistory.create({
            data: {
              matchId,
              userId,
              seasonId: season?.id ?? null,
              previousMmr: profile.mmr,
              nextMmr,
              mmrDelta,
              previousTier,
              nextTier,
              opponentId,
            },
          });
          ratingHistoryId = ratingHistory.id;
        } catch (error) {
          if (!isP2002(error)) throw error;
          const existing = await tx.arenaRatingHistory.findUnique({
            where: { matchId_userId: { matchId, userId } },
          });
          ratingHistoryId = existing?.id ?? null;
        }
      }

      let rewardLogId: string | null = null;
      try {
        const rewardLog = await tx.arenaRewardLog.create({
          data: {
            matchId,
            userId,
            isWinner: won,
            mmrBefore: profile.mmr,
            mmrAfter: nextMmr,
            arenaDelta: reward.arenaPoints,
            foodDelta: petReward.foodDelta,
            goldDelta: reward.gold,
            trophyDelta: won ? 1 : 0,
          },
        });
        rewardLogId = rewardLog.id;
      } catch (error) {
        if (!isP2002(error)) throw error;
        const existing = await tx.arenaRewardLog.findUnique({
          where: { matchId_userId: { matchId, userId } },
        });
        rewardLogId = existing?.id ?? null;
      }

      return { ratingHistoryId, rewardLogId };
    };

    let xpTransactionId: string | null = null;
    let ratingHistoryId: string | null = null;
    let rewardLogId: string | null = null;

    if (reward.totalXp > 0) {
      const result = await this.xpService.awardXpWithSideEffects(
        {
          userId,
          sourceType: XpSourceType.ARENA,
          sourceId: matchId,
          baseXp: reward.totalXp,
          idempotencyKey: `arena:xp:${matchId}:${userId}`,
          reason: reward.reasonBreakdown.join(', '),
          metadata: { ...reward },
        },
        async (tx) => applyProfileWrites(tx),
      );
      xpTransactionId = result.transaction?.id ?? null;
      if (result.duplicated) {
        // The idempotency key already existed — a prior attempt's
        // transaction committed (profile mutation included, via
        // `sideEffects`), but crashed before this method reached its own
        // `ArenaProgressionRecord` COMPLETED update. `sideEffects` does NOT
        // re-run on a duplicate (XpService short-circuits before calling
        // it), so `sideEffectResult` is null here — recover the linked ids
        // by lookup instead of trusting it.
        const [ratingHistory, rewardLog] = await Promise.all([
          this.prisma.arenaRatingHistory.findUnique({ where: { matchId_userId: { matchId, userId } } }),
          this.prisma.arenaRewardLog.findUnique({ where: { matchId_userId: { matchId, userId } } }),
        ]);
        ratingHistoryId = ratingHistory?.id ?? null;
        rewardLogId = rewardLog?.id ?? null;
      } else {
        ratingHistoryId = (result as any).sideEffectResult?.ratingHistoryId ?? null;
        rewardLogId = (result as any).sideEffectResult?.rewardLogId ?? null;
      }
    } else {
      const written = await this.prisma.$transaction((tx) => applyProfileWrites(tx));
      ratingHistoryId = written.ratingHistoryId;
      rewardLogId = written.rewardLogId;
    }

    return this.finalizeCompletedProgression({
      matchId,
      userId,
      roomId: room.id,
      seasonId: season?.id ?? null,
      xpTransactionId,
      ratingHistoryId,
      rewardLogId,
      outcome,
      previousMmr: profile.mmr,
      nextMmr,
      mmrDelta,
      previousTier,
      nextTier,
      xpAwarded: reward.totalXp,
      goldAwarded: reward.gold,
      arenaPointsAwarded: reward.arenaPoints,
      rewardBreakdown: { ...reward },
    });
  }

  /**
   * Shared tail for both the normal-completion path and the crash-recovery
   * path (`recoverFromExistingRewardLog`): marks the `ArenaProgressionRecord`
   * COMPLETED, publishes the progression events (after the record commits —
   * "publish after commit" discipline, same as `ArenaEventPublisher`'s
   * existing convention), and returns the outcome payload.
   */
  private async finalizeCompletedProgression(input: {
    matchId: string;
    userId: string;
    roomId: string;
    seasonId: string | null;
    xpTransactionId: string | null;
    ratingHistoryId: string | null;
    rewardLogId: string | null;
    outcome: ArenaMatchOutcome;
    previousMmr: number;
    nextMmr: number;
    mmrDelta: number;
    previousTier: string;
    nextTier: string;
    xpAwarded: number;
    goldAwarded: number;
    arenaPointsAwarded: number;
    rewardBreakdown?: Record<string, unknown>;
  }): Promise<ArenaProgressionOutcome> {
    await this.prisma.arenaProgressionRecord.update({
      where: { matchId_userId: { matchId: input.matchId, userId: input.userId } },
      data: {
        status: 'COMPLETED',
        seasonId: input.seasonId,
        xpTransactionId: input.xpTransactionId,
        ratingHistoryId: input.ratingHistoryId,
        rewardLogId: input.rewardLogId,
        completedAt: new Date(),
        lastError: null,
      },
    });

    const promoted =
      input.nextTier !== input.previousTier && this.tierRank(input.nextTier) > this.tierRank(input.previousTier);
    const demoted =
      input.nextTier !== input.previousTier && this.tierRank(input.nextTier) < this.tierRank(input.previousTier);
    const occurredAt = new Date().toISOString();

    this.eventPublisher.publish({
      type: ARENA_MATCH_COMPLETED,
      roomId: input.roomId,
      matchId: input.matchId,
      userId: input.userId,
      outcome: input.outcome,
      occurredAt,
    });
    if (input.previousTier !== input.nextTier) {
      this.eventPublisher.publish({
        type: ARENA_RATING_CHANGED,
        roomId: input.roomId,
        matchId: input.matchId,
        userId: input.userId,
        seasonId: input.seasonId,
        outcome: input.outcome,
        previousMmr: input.previousMmr,
        nextMmr: input.nextMmr,
        mmrDelta: input.mmrDelta,
        previousTier: input.previousTier,
        nextTier: input.nextTier,
        promoted,
        demoted,
        occurredAt,
      });
    }

    return {
      status: 'COMPLETED',
      outcome: input.outcome,
      seasonId: input.seasonId,
      previousMmr: input.previousMmr,
      nextMmr: input.nextMmr,
      mmrDelta: input.mmrDelta,
      previousTier: input.previousTier,
      nextTier: input.nextTier,
      promoted,
      demoted,
      xpAwarded: input.xpAwarded,
      goldAwarded: input.goldAwarded,
      arenaPointsAwarded: input.arenaPointsAwarded,
      rewardBreakdown: input.rewardBreakdown,
    };
  }

  /**
   * Crash-recovery path: `ArenaRewardLog` already exists for this
   * participant/match (a prior attempt's mutation fully committed) but
   * `ArenaProgressionRecord` never reached COMPLETED. Recovers the linked
   * rows by lookup and finishes bookkeeping — never recomputes or
   * re-applies mmr/gold/XP.
   */
  private async recoverFromExistingRewardLog(
    matchId: string,
    userId: string,
    rewardLog: { id: string; isWinner: boolean; mmrBefore: number; mmrAfter: number; arenaDelta: number; goldDelta: number },
  ): Promise<ArenaProgressionOutcome> {
    const [ratingHistory, xpTransaction, participant] = await Promise.all([
      this.prisma.arenaRatingHistory.findUnique({ where: { matchId_userId: { matchId, userId } } }),
      this.prisma.xpTransaction.findUnique({ where: { idempotencyKey: `arena:xp:${matchId}:${userId}` } }),
      this.prisma.arenaParticipant.findFirst({ where: { userId, room: { matches: { some: { id: matchId } } } } }),
    ]);

    return this.finalizeCompletedProgression({
      matchId,
      userId,
      roomId: participant?.roomId ?? '',
      seasonId: ratingHistory?.seasonId ?? null,
      xpTransactionId: xpTransaction?.id ?? null,
      ratingHistoryId: ratingHistory?.id ?? null,
      rewardLogId: rewardLog.id,
      outcome: rewardLog.isWinner ? 'WIN' : 'LOSS',
      previousMmr: ratingHistory?.previousMmr ?? rewardLog.mmrBefore,
      nextMmr: ratingHistory?.nextMmr ?? rewardLog.mmrAfter,
      mmrDelta: ratingHistory?.mmrDelta ?? rewardLog.arenaDelta,
      previousTier: ratingHistory?.previousTier ?? 'BRONZE',
      nextTier: ratingHistory?.nextTier ?? 'BRONZE',
      xpAwarded: xpTransaction?.finalXp ?? 0,
      goldAwarded: rewardLog.goldDelta,
      arenaPointsAwarded: rewardLog.arenaDelta,
      rewardBreakdown: (xpTransaction?.metadata as Record<string, unknown>) ?? undefined,
    });
  }

  private tierRank(tier: string): number {
    const order = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'LEGEND'];
    return order.indexOf(tier);
  }

  private async getOrCreateProfile(userId: string) {
    const existing = await this.prisma.arenaProfile.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.arenaProfile.create({ data: { userId } });
  }

  private async loadCompletedOutcome(record: {
    matchId: string;
    userId: string;
    seasonId: string | null;
    xpTransactionId: string | null;
    ratingHistoryId: string | null;
    rewardLogId: string | null;
  }): Promise<ArenaProgressionOutcome> {
    const [ratingHistory, rewardLog, xpTransaction] = await Promise.all([
      record.ratingHistoryId
        ? this.prisma.arenaRatingHistory.findUnique({ where: { id: record.ratingHistoryId } })
        : null,
      record.rewardLogId
        ? this.prisma.arenaRewardLog.findUnique({ where: { id: record.rewardLogId } })
        : null,
      record.xpTransactionId
        ? this.prisma.xpTransaction.findUnique({ where: { id: record.xpTransactionId } })
        : null,
    ]);

    return {
      status: 'COMPLETED',
      outcome: rewardLog ? (rewardLog.isWinner ? 'WIN' : 'LOSS') : undefined,
      seasonId: record.seasonId,
      previousMmr: ratingHistory?.previousMmr,
      nextMmr: ratingHistory?.nextMmr,
      mmrDelta: ratingHistory?.mmrDelta,
      previousTier: ratingHistory?.previousTier,
      nextTier: ratingHistory?.nextTier,
      xpAwarded: xpTransaction?.finalXp ?? 0,
      goldAwarded: rewardLog?.goldDelta ?? 0,
      arenaPointsAwarded: rewardLog?.arenaDelta ?? 0,
      rewardBreakdown: (xpTransaction?.metadata as Record<string, unknown>) ?? undefined,
    };
  }
}
