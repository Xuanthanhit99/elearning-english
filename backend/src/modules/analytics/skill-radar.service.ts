import { Injectable } from '@nestjs/common';
import { LearningSkill } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisCacheService } from 'src/common/cache/redis-cache.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { AnalyticsCacheKeys, AnalyticsCacheTtl } from './analytics-cache.constants';

/** Only samples within this window count toward the recency-weighted score. */
const RECENCY_WINDOW_DAYS = 60;
/** Exponential-decay half-life: a sample from 14 days ago counts half as much as today's. */
const HALF_LIFE_DAYS = 14;
const MAX_SAMPLES_PER_SKILL = 40;

const SKILL_ORDER: LearningSkill[] = [
  LearningSkill.VOCABULARY,
  LearningSkill.GRAMMAR,
  LearningSkill.LISTENING,
  LearningSkill.SPEAKING,
  LearningSkill.READING,
  LearningSkill.WRITING,
];

type Sample = { score: number; occurredAt: Date };

export type SkillRadarPoint = {
  skill: LearningSkill;
  label: string;
  score: number;
  basis: 'RECENT_PERFORMANCE' | 'LIFETIME_AVERAGE' | 'INSUFFICIENT_DATA';
  sampleSize: number;
};

export type SkillRadarResult = {
  generatedAt: Date;
  windowDays: number;
  overall: number;
  skills: SkillRadarPoint[];
};

/**
 * Dashboard's `buildSkillProgress` is a lifetime flat average — fine for the
 * profile page, but a radar meant to answer "how am I doing *lately*" needs
 * recent sessions to dominate. This recomputes each skill from timestamped
 * samples in the last `RECENCY_WINDOW_DAYS` with exponential recency
 * weighting, falling back to Dashboard's lifetime percent only when a skill
 * has no recent samples at all (new/inactive skill), so the radar is never
 * empty.
 */
@Injectable()
export class SkillRadarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardService: DashboardService,
    private readonly redisCache: RedisCacheService,
  ) {}

  async getRadar(userId: string): Promise<SkillRadarResult> {
    const cacheKey = AnalyticsCacheKeys.radar(userId);
    const cached = await this.redisCache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as SkillRadarResult;
      } catch {
        // corrupted entry — fall through and recompute
      }
    }

    const result = await this.computeRadar(userId);
    await this.redisCache.set(
      cacheKey,
      JSON.stringify(result),
      AnalyticsCacheTtl.RADAR_SECONDS,
    );
    return result;
  }

  private async computeRadar(userId: string): Promise<SkillRadarResult> {
    const windowStart = new Date(
      Date.now() - RECENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const [dashboard, samplesBySkill] = await Promise.all([
      this.dashboardService.getDashboard(userId),
      this.collectRecentSamples(userId, windowStart),
    ]);

    const baseline = new Map(
      dashboard.skillProgress.map((item) => [item.key, item]),
    );

    const skills: SkillRadarPoint[] = SKILL_ORDER.map((skill) => {
      const base = baseline.get(skill);
      const samples = samplesBySkill[skill];
      const recencyScore = samples.length
        ? this.weightedAverage(samples)
        : null;

      const hasLifetimeData = !!base && base.percent > 0;
      const score = recencyScore ?? (hasLifetimeData ? base!.percent : 0);

      return {
        skill,
        label: base?.label ?? skill,
        score: Math.round(score),
        basis:
          recencyScore !== null
            ? 'RECENT_PERFORMANCE'
            : hasLifetimeData
              ? 'LIFETIME_AVERAGE'
              : 'INSUFFICIENT_DATA',
        sampleSize: samples.length,
      };
    });

    const overall =
      skills.reduce((sum, item) => sum + item.score, 0) / skills.length;

    return {
      generatedAt: new Date(),
      windowDays: RECENCY_WINDOW_DAYS,
      overall: Math.round(overall),
      skills,
    };
  }

  private weightedAverage(samples: Sample[]) {
    const now = Date.now();
    let weightedSum = 0;
    let weightTotal = 0;
    for (const sample of samples) {
      const ageDays = Math.max(
        0,
        (now - sample.occurredAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      const weight = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
      weightedSum += weight * sample.score;
      weightTotal += weight;
    }
    return weightTotal > 0 ? weightedSum / weightTotal : 0;
  }

  private async collectRecentSamples(
    userId: string,
    windowStart: Date,
  ): Promise<Record<LearningSkill, Sample[]>> {
    const [vocabulary, grammar, reading, listening, speaking, writing] =
      await Promise.all([
        this.prisma.userWordProgress.findMany({
          where: { userId, updatedAt: { gte: windowStart } },
          select: {
            correctCount: true,
            wrongCount: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: MAX_SAMPLES_PER_SKILL,
        }),
        this.prisma.grammarLessonProgress.findMany({
          where: {
            userId,
            completed: true,
            completedAt: { gte: windowStart },
          },
          select: { score: true, completedAt: true },
          orderBy: { completedAt: 'desc' },
          take: MAX_SAMPLES_PER_SKILL,
        }),
        this.prisma.readingSession.findMany({
          where: {
            userId,
            isCompleted: true,
            completedAt: { gte: windowStart },
          },
          select: { accuracy: true, completedAt: true },
          orderBy: { completedAt: 'desc' },
          take: MAX_SAMPLES_PER_SKILL,
        }),
        this.prisma.listeningSession.findMany({
          where: { userId, completedAt: { gte: windowStart } },
          select: { score: true, completedAt: true },
          orderBy: { completedAt: 'desc' },
          take: MAX_SAMPLES_PER_SKILL,
        }),
        this.prisma.speakingSession.findMany({
          where: { userId, finishedAt: { gte: windowStart } },
          select: { overallScore: true, finishedAt: true },
          orderBy: { finishedAt: 'desc' },
          take: MAX_SAMPLES_PER_SKILL,
        }),
        this.prisma.writingSession.findMany({
          where: {
            userId,
            isSubmitted: true,
            submittedAt: { gte: windowStart },
          },
          select: { overallScore: true, submittedAt: true },
          orderBy: { submittedAt: 'desc' },
          take: MAX_SAMPLES_PER_SKILL,
        }),
      ]);

    return {
      VOCABULARY: vocabulary
        .filter((item) => item.correctCount + item.wrongCount > 0)
        .map((item) => ({
          score:
            (item.correctCount / (item.correctCount + item.wrongCount)) * 100,
          occurredAt: item.updatedAt,
        })),
      GRAMMAR: grammar
        .filter((item) => item.completedAt)
        .map((item) => ({ score: item.score, occurredAt: item.completedAt! })),
      READING: reading
        .filter((item) => item.completedAt)
        .map((item) => ({
          score: item.accuracy,
          occurredAt: item.completedAt!,
        })),
      LISTENING: listening
        .filter((item) => item.completedAt)
        .map((item) => ({ score: item.score, occurredAt: item.completedAt! })),
      SPEAKING: speaking
        .filter((item) => item.finishedAt)
        .map((item) => ({
          score: item.overallScore,
          occurredAt: item.finishedAt!,
        })),
      WRITING: writing
        .filter((item) => item.submittedAt && item.overallScore !== null)
        .map((item) => ({
          score: item.overallScore!,
          occurredAt: item.submittedAt!,
        })),
    };
  }
}
