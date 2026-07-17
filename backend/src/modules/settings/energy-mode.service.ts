import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsQueryService } from './settings-query.service';

const LOOKBACK_HOURS = 24;
const MIN_ATTEMPTS_FOR_SIGNAL = 5;
const LOW_ACCURACY_THRESHOLD = 0.5;

export type EnergyModeAssessment = {
  reduceLoad: boolean;
  reason: 'LOW_RECENT_ACCURACY' | null;
};

/**
 * Energy Mode only ever produces *temporary, session-level* adjustments
 * (fewer new items, smaller targets). It must never touch the user's
 * official level or be applied during Placement Test / official exams —
 * callers are responsible for not invoking this in those flows.
 */
@Injectable()
export class EnergyModeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsQuery: SettingsQueryService,
  ) {}

  async assess(userId: string): Promise<EnergyModeAssessment> {
    const settings = await this.settingsQuery.getSettings(userId);

    if (!settings.energyMode) {
      return { reduceLoad: false, reason: null };
    }

    const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);

    const recentAttempts = await this.prisma.userWordProgress.findMany({
      where: { userId, updatedAt: { gte: since } },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      select: { correctCount: true, wrongCount: true },
    });

    if (recentAttempts.length < MIN_ATTEMPTS_FOR_SIGNAL) {
      return { reduceLoad: false, reason: null };
    }

    const totalCorrect = recentAttempts.reduce(
      (sum, item) => sum + item.correctCount,
      0,
    );
    const totalWrong = recentAttempts.reduce(
      (sum, item) => sum + item.wrongCount,
      0,
    );
    const totalAttempts = totalCorrect + totalWrong;
    const accuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 1;

    if (accuracy < LOW_ACCURACY_THRESHOLD) {
      return { reduceLoad: true, reason: 'LOW_RECENT_ACCURACY' };
    }

    return { reduceLoad: false, reason: null };
  }

  /** Convenience helper: scales a target down (never below 1) when fatigued. */
  applyToTarget(target: number, assessment: EnergyModeAssessment): number {
    if (!assessment.reduceLoad) return target;
    return Math.max(1, Math.round(target * 0.7));
  }
}
