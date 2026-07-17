import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsQueryService } from './settings-query.service';

const MIN_SESSIONS_FOR_DNA = 5;
const LOOKBACK_DAYS = 30;

type SkillSample = {
  skill: string;
  score: number;
  minutes: number;
  hour: number;
  day: string;
};

export type LearningDnaResult =
  | { status: 'DISABLED' }
  | { status: 'ANALYTICS_CONSENT_REQUIRED' }
  | { status: 'INSUFFICIENT_DATA' }
  | {
      status: 'READY';
      strongestSkill: string | null;
      weakestSkill: string | null;
      bestStudyHour: number | null;
      averageSessionMinutes: number | null;
      retentionScore: number | null;
      consistencyScore: number | null;
      recommendedFocus: string[];
      generatedAt: Date;
    };

@Injectable()
export class LearningDnaService {
  private readonly logger = new Logger(LearningDnaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsQuery: SettingsQueryService,
  ) {}

  async getLatest(userId: string): Promise<LearningDnaResult> {
    const settings = await this.settingsQuery.getSettings(userId);

    if (!settings.learningDnaEnabled) {
      return { status: 'DISABLED' };
    }

    if (!settings.analyticsConsent) {
      return { status: 'ANALYTICS_CONSENT_REQUIRED' };
    }

    const snapshot = await this.prisma.learningDnaSnapshot.findFirst({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
    });

    if (!snapshot) {
      return this.recalculate(userId);
    }

    return {
      status: 'READY',
      strongestSkill: snapshot.strongestSkill,
      weakestSkill: snapshot.weakestSkill,
      bestStudyHour: snapshot.bestStudyHour,
      averageSessionMinutes: snapshot.averageSessionMin,
      retentionScore: snapshot.retentionScore,
      consistencyScore: snapshot.consistencyScore,
      recommendedFocus: snapshot.recommendedFocus,
      generatedAt: snapshot.generatedAt,
    };
  }

  async recalculate(userId: string): Promise<LearningDnaResult> {
    const settings = await this.settingsQuery.getSettings(userId);

    if (!settings.learningDnaEnabled) {
      return { status: 'DISABLED' };
    }

    if (!settings.analyticsConsent) {
      return { status: 'ANALYTICS_CONSENT_REQUIRED' };
    }

    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const [speaking, reading, listening, writing, wordProgress] =
      await Promise.all([
        this.prisma.speakingSession.findMany({
          where: {
            userId,
            startedAt: { gte: since },
            finishedAt: { not: null },
          },
          select: { overallScore: true, duration: true, startedAt: true },
        }),
        this.prisma.readingSession.findMany({
          where: { userId, startedAt: { gte: since }, isCompleted: true },
          select: { accuracy: true, spentTime: true, startedAt: true },
        }),
        this.prisma.listeningSession.findMany({
          where: {
            userId,
            startedAt: { gte: since },
            completedAt: { not: null },
          },
          select: { score: true, startedAt: true, completedAt: true },
        }),
        this.prisma.writingSession.findMany({
          where: { userId, startedAt: { gte: since }, isSubmitted: true },
          select: {
            overallScore: true,
            timeSpentSeconds: true,
            startedAt: true,
          },
        }),
        this.prisma.userWordProgress.findMany({
          where: { userId, updatedAt: { gte: since } },
          select: {
            correctCount: true,
            wrongCount: true,
            status: true,
            updatedAt: true,
          },
        }),
      ]);

    const samples: SkillSample[] = [];

    for (const item of speaking) {
      samples.push(
        this.toSample(
          'SPEAKING',
          item.overallScore,
          item.duration / 60,
          item.startedAt,
        ),
      );
    }
    for (const item of reading) {
      samples.push(
        this.toSample(
          'READING',
          item.accuracy,
          item.spentTime / 60,
          item.startedAt,
        ),
      );
    }
    for (const item of listening) {
      const minutes = item.completedAt
        ? (item.completedAt.getTime() - item.startedAt.getTime()) / 60000
        : 0;
      samples.push(
        this.toSample('LISTENING', item.score, minutes, item.startedAt),
      );
    }
    for (const item of writing) {
      samples.push(
        this.toSample(
          'WRITING',
          item.overallScore ?? 0,
          item.timeSpentSeconds / 60,
          item.startedAt,
        ),
      );
    }

    const totalWordAttempts = wordProgress.reduce(
      (sum, item) => sum + item.correctCount + item.wrongCount,
      0,
    );
    const totalWordCorrect = wordProgress.reduce(
      (sum, item) => sum + item.correctCount,
      0,
    );

    if (wordProgress.length > 0) {
      const vocabScore =
        totalWordAttempts > 0
          ? (totalWordCorrect / totalWordAttempts) * 100
          : 0;
      for (const item of wordProgress) {
        samples.push(
          this.toSample('VOCABULARY', vocabScore, 0, item.updatedAt),
        );
      }
    }

    const totalSessions =
      speaking.length +
      reading.length +
      listening.length +
      writing.length +
      (wordProgress.length > 0 ? 1 : 0);

    if (totalSessions < MIN_SESSIONS_FOR_DNA) {
      return { status: 'INSUFFICIENT_DATA' };
    }

    const bySkill = new Map<string, { totalScore: number; count: number }>();
    for (const sample of samples) {
      const bucket = bySkill.get(sample.skill) ?? { totalScore: 0, count: 0 };
      bucket.totalScore += sample.score;
      bucket.count += 1;
      bySkill.set(sample.skill, bucket);
    }

    let strongestSkill: string | null = null;
    let weakestSkill: string | null = null;
    let bestAvg = -Infinity;
    let worstAvg = Infinity;

    for (const [skill, bucket] of bySkill.entries()) {
      const avg = bucket.count > 0 ? bucket.totalScore / bucket.count : 0;
      if (avg > bestAvg) {
        bestAvg = avg;
        strongestSkill = skill;
      }
      if (avg < worstAvg) {
        worstAvg = avg;
        weakestSkill = skill;
      }
    }

    const hourCounts = new Map<number, number>();
    for (const sample of samples) {
      hourCounts.set(sample.hour, (hourCounts.get(sample.hour) ?? 0) + 1);
    }
    let bestStudyHour: number | null = null;
    let bestHourCount = 0;
    for (const [hour, count] of hourCounts.entries()) {
      if (count > bestHourCount) {
        bestHourCount = count;
        bestStudyHour = hour;
      }
    }

    const minuteSamples = samples.filter((s) => s.minutes > 0);
    const averageSessionMin =
      minuteSamples.length > 0
        ? Math.round(
            minuteSamples.reduce((sum, s) => sum + s.minutes, 0) /
              minuteSamples.length,
          )
        : null;

    const retentionScore =
      totalWordAttempts > 0
        ? Math.round((totalWordCorrect / totalWordAttempts) * 100) / 100
        : null;

    const distinctDays = new Set(samples.map((s) => s.day));
    const consistencyScore =
      Math.round((distinctDays.size / LOOKBACK_DAYS) * 100) / 100;

    const recommendedFocus = weakestSkill ? [weakestSkill] : [];

    const snapshot = await this.prisma.learningDnaSnapshot.create({
      data: {
        userId,
        strongestSkill,
        weakestSkill,
        bestStudyHour,
        averageSessionMin,
        retentionScore,
        consistencyScore,
        recommendedFocus,
      },
    });

    this.logger.log(`Learning DNA recalculated for userId=${userId}`);

    return {
      status: 'READY',
      strongestSkill: snapshot.strongestSkill,
      weakestSkill: snapshot.weakestSkill,
      bestStudyHour: snapshot.bestStudyHour,
      averageSessionMinutes: snapshot.averageSessionMin,
      retentionScore: snapshot.retentionScore,
      consistencyScore: snapshot.consistencyScore,
      recommendedFocus: snapshot.recommendedFocus,
      generatedAt: snapshot.generatedAt,
    };
  }

  private toSample(
    skill: string,
    score: number,
    minutes: number,
    date: Date,
  ): SkillSample {
    return {
      skill,
      score: score ?? 0,
      minutes: Number.isFinite(minutes) ? minutes : 0,
      hour: date.getHours(),
      day: date.toISOString().slice(0, 10),
    };
  }
}
