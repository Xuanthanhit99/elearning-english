import { BadRequestException, Injectable } from '@nestjs/common';
import { LearningSkill, XpSourceType } from '@prisma/client';
import {
  addUserDays,
  dateKeyInTimezone,
  getUserDaySeries,
  normalizeUserTimezone,
  startOfUserDay,
} from 'src/common/time/user-timezone.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { SettingsQueryService } from '../settings/settings-query.service';
import { AnalyticsQueryDto, AnalyticsRange, ReportQueryDto } from './dto/analytics-query.dto';

type DashboardSnapshot = Awaited<ReturnType<DashboardService['getDashboard']>>;

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  [AnalyticsRange.SEVEN_DAYS]: 7,
  [AnalyticsRange.THIRTY_DAYS]: 30,
  [AnalyticsRange.NINETY_DAYS]: 90,
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardService: DashboardService,
    private readonly settingsQuery: SettingsQueryService,
  ) {}

  async getOverview(userId: string, query: AnalyticsQueryDto) {
    const range = await this.resolveRange(userId, query.range);
    const [dashboard, series, activity] = await Promise.all([
      this.dashboardService.getDashboard(userId),
      this.buildDailySeries(userId, range.start, range.days, range.timezone),
      this.getActivity(userId, { ...query, limit: 8 }),
    ]);

    const totals = this.sumSeries(series);

    return {
      range: {
        key: query.range ?? AnalyticsRange.SEVEN_DAYS,
        from: dateKeyInTimezone(range.start, range.timezone),
        to: dateKeyInTimezone(addUserDays(range.end, -1, range.timezone), range.timezone),
        timezone: range.timezone,
      },
      summary: {
        xp: totals.xp,
        studyMinutes: totals.studyMinutes,
        completedActivities: totals.completedActivities,
        activeDays: series.filter(
          (item) => item.xp > 0 || item.studyMinutes > 0 || item.completedActivities > 0,
        ).length,
        currentStreak: dashboard.currentStreak,
      },
      trend: this.buildTrend(series),
      skills: dashboard.skillProgress.map((skill) => ({
        ...skill,
        sampleStatus: skill.percent > 0 ? 'READY' : 'INSUFFICIENT_DATA',
      })),
      activityTrend: series,
      recommendations: dashboard.recommendations,
      recentActivities: activity.items,
      aiReport: dashboard.analytics.aiReport,
      generatedAt: new Date(),
    };
  }

  async getSkills(userId: string, query: AnalyticsQueryDto) {
    const overview = await this.getOverview(userId, query);
    return {
      range: overview.range,
      items: overview.skills,
      strongest:
        [...overview.skills].sort((left, right) => right.percent - left.percent)[0] ??
        null,
      focus:
        [...overview.skills].sort((left, right) => left.percent - right.percent)[0] ??
        null,
    };
  }

  async getSkillDetail(userId: string, query: AnalyticsQueryDto) {
    const skill = this.parseSkill(query.skill);
    const overview = await this.getOverview(userId, query);
    const selected = overview.skills.find((item) => item.key === skill);
    const activities = await this.getActivity(userId, {
      ...query,
      skill,
      limit: query.limit ?? 20,
    });

    return {
      range: overview.range,
      skill,
      summary: selected ?? null,
      recentSessions: activities.items,
      trend: overview.activityTrend,
      sampleStatus:
        selected && selected.percent > 0 ? 'READY' : 'INSUFFICIENT_DATA',
    };
  }

  async getActivity(userId: string, query: AnalyticsQueryDto) {
    const range = await this.resolveRange(userId, query.range);
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 50);
    const cursor = this.decodeCursor(query.cursor);
    const skill = query.skill ? this.parseSkill(query.skill) : undefined;

    const rows = await this.prisma.xpTransaction.findMany({
      where: {
        userId,
        reversedAt: null,
        earnedAt: { gte: range.start, lt: range.end },
        ...(skill ? { skill } : {}),
        ...(cursor
          ? {
              OR: [
                { earnedAt: { lt: cursor.earnedAt } },
                { earnedAt: cursor.earnedAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        skill: true,
        finalXp: true,
        reason: true,
        earnedAt: true,
      },
      orderBy: [{ earnedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const items = rows.slice(0, limit).map((item) => ({
      id: item.id,
      type: item.sourceType,
      title: item.reason ?? this.titleForSource(item.sourceType),
      description: item.skill ? `${item.skill} activity` : 'Learning activity',
      skill: item.skill,
      xp: item.finalXp,
      score: null,
      duration: null,
      entityType: item.sourceType,
      entityId: item.sourceId,
      occurredAt: item.earnedAt,
      actionUrl: this.actionUrlForSource(item.sourceType, item.sourceId),
    }));

    const last = items.at(-1);
    return {
      items,
      pagination: {
        limit,
        hasMore: rows.length > limit,
        nextCursor: rows.length > limit && last ? this.encodeCursor(last.occurredAt, last.id) : null,
      },
    };
  }

  async getReport(userId: string, query: ReportQueryDto) {
    const rangeKey = query.range ?? AnalyticsRange.THIRTY_DAYS;
    const overview = await this.getOverview(userId, { range: rangeKey, limit: 8 });
    const achievements = await this.prisma.userAchievement.count({
      where: {
        userId,
        unlockedAt: { gte: new Date(overview.range.from), lt: new Date() },
      },
    });

    return {
      range: overview.range,
      highlights: [
        `You earned ${overview.summary.xp} XP in this period.`,
        `You were active on ${overview.summary.activeDays} day(s).`,
        achievements > 0
          ? `You unlocked ${achievements} achievement(s).`
          : 'No achievement unlocked in this period yet.',
      ],
      summary: {
        ...overview.summary,
        achievementsUnlocked: achievements,
      },
      skillBreakdown: overview.skills,
      activityTrend: overview.activityTrend,
      recommendations: overview.recommendations,
      generatedAt: new Date(),
    };
  }

  private async resolveRange(userId: string, range?: AnalyticsRange) {
    const settings = await this.settingsQuery.getSettings(userId);
    const timezone = normalizeUserTimezone(settings.timezone);
    const days = RANGE_DAYS[range ?? AnalyticsRange.SEVEN_DAYS] ?? 7;
    const todayStart = startOfUserDay(new Date(), timezone);
    const start = addUserDays(todayStart, -(days - 1), timezone);
    const end = addUserDays(todayStart, 1, timezone);
    return { start, end, days, timezone };
  }

  private async buildDailySeries(
    userId: string,
    start: Date,
    days: number,
    timezone: string,
  ) {
    const end = addUserDays(start, days, timezone);
    const [
      xpTransactions,
      readingSessions,
      writingSessions,
      speakingSessions,
      listeningSessions,
      lessonProgress,
    ] = await Promise.all([
      this.prisma.xpTransaction.findMany({
        where: { userId, reversedAt: null, earnedAt: { gte: start, lt: end } },
        select: { finalXp: true, earnedAt: true },
      }),
      this.prisma.readingSession.findMany({
        where: { userId, isCompleted: true, completedAt: { gte: start, lt: end } },
        select: { completedAt: true, spentTime: true },
      }),
      this.prisma.writingSession.findMany({
        where: { userId, isSubmitted: true, submittedAt: { gte: start, lt: end } },
        select: { submittedAt: true, timeSpentSeconds: true },
      }),
      this.prisma.speakingSession.findMany({
        where: { userId, finishedAt: { gte: start, lt: end } },
        select: { finishedAt: true, duration: true },
      }),
      this.prisma.listeningSession.findMany({
        where: { userId, completedAt: { gte: start, lt: end } },
        select: { completedAt: true },
      }),
      this.prisma.lessonProgress.findMany({
        where: { userId, completedAt: { gte: start, lt: end } },
        select: { completedAt: true, lesson: { select: { duration: true } } },
      }),
    ]);

    return getUserDaySeries(start, days, timezone).map((day) => {
      const key = dateKeyInTimezone(day, timezone);
      const xp = xpTransactions
        .filter((item) => dateKeyInTimezone(item.earnedAt, timezone) === key)
        .reduce((sum, item) => sum + item.finalXp, 0);
      const readings = readingSessions.filter(
        (item) => item.completedAt && dateKeyInTimezone(item.completedAt, timezone) === key,
      );
      const writings = writingSessions.filter(
        (item) => item.submittedAt && dateKeyInTimezone(item.submittedAt, timezone) === key,
      );
      const speakings = speakingSessions.filter(
        (item) => item.finishedAt && dateKeyInTimezone(item.finishedAt, timezone) === key,
      );
      const listenings = listeningSessions.filter(
        (item) => item.completedAt && dateKeyInTimezone(item.completedAt, timezone) === key,
      );
      const lessons = lessonProgress.filter(
        (item) => item.completedAt && dateKeyInTimezone(item.completedAt, timezone) === key,
      );

      return {
        date: key,
        xp,
        studyMinutes:
          readings.reduce((sum, item) => sum + Math.round(item.spentTime / 60), 0) +
          writings.reduce((sum, item) => sum + Math.round(item.timeSpentSeconds / 60), 0) +
          speakings.reduce((sum, item) => sum + Math.round(item.duration / 60), 0) +
          lessons.reduce((sum, item) => sum + (item.lesson.duration ?? 0), 0),
        completedActivities:
          readings.length + writings.length + speakings.length + listenings.length + lessons.length,
      };
    });
  }

  private sumSeries(
    series: Array<{ xp: number; studyMinutes: number; completedActivities: number }>,
  ) {
    return series.reduce(
      (sum, item) => ({
        xp: sum.xp + item.xp,
        studyMinutes: sum.studyMinutes + item.studyMinutes,
        completedActivities: sum.completedActivities + item.completedActivities,
      }),
      { xp: 0, studyMinutes: 0, completedActivities: 0 },
    );
  }

  private buildTrend(
    series: Array<{ xp: number; studyMinutes: number; completedActivities: number }>,
  ) {
    const midpoint = Math.floor(series.length / 2);
    const previous = this.sumSeries(series.slice(0, midpoint));
    const current = this.sumSeries(series.slice(midpoint));
    const percentageChange =
      previous.xp > 0 ? Math.round(((current.xp - previous.xp) / previous.xp) * 100) : null;

    return {
      currentValue: current.xp,
      previousValue: previous.xp,
      absoluteChange: current.xp - previous.xp,
      percentageChange,
      direction:
        current.xp > previous.xp ? 'UP' : current.xp < previous.xp ? 'DOWN' : 'FLAT',
    };
  }

  private parseSkill(skill?: LearningSkill) {
    if (!skill || !Object.values(LearningSkill).includes(skill)) {
      throw new BadRequestException('Invalid skill.');
    }
    return skill;
  }

  private encodeCursor(earnedAt: Date, id: string) {
    return Buffer.from(`${earnedAt.toISOString()}|${id}`).toString('base64url');
  }

  private decodeCursor(cursor?: string) {
    if (!cursor) return null;
    try {
      const [date, id] = Buffer.from(cursor, 'base64url').toString().split('|');
      if (!date || !id) return null;
      return { earnedAt: new Date(date), id };
    } catch {
      throw new BadRequestException('Invalid cursor.');
    }
  }

  private titleForSource(sourceType: XpSourceType) {
    return `${sourceType} completed`;
  }

  private actionUrlForSource(sourceType: XpSourceType, sourceId: string | null) {
    const allowlist: Partial<Record<XpSourceType, string>> = {
      VOCABULARY: '/vocabulary',
      GRAMMAR: '/grammar',
      READING: '/reading',
      LISTENING: '/listening',
      SPEAKING: '/speaking',
      WRITING: '/writing',
      MISSION: '/missions',
      ACHIEVEMENT: '/achievements',
    };
    const base = allowlist[sourceType] ?? '/dashboard';
    return sourceId ? `${base}?source=${encodeURIComponent(sourceId)}` : base;
  }
}
