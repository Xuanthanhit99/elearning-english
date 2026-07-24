import { BadRequestException, Injectable } from '@nestjs/common';
import {
  LearningSkill,
  SpeakingSessionStatus,
  XpSourceType,
} from '@prisma/client';
import {
  addUserDays,
  dateKeyInTimezone,
  getUserDaySeries,
  normalizeUserTimezone,
  startOfUserDay,
} from 'src/common/time/user-timezone.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisCacheService } from 'src/common/cache/redis-cache.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { SettingsQueryService } from '../settings/settings-query.service';
import {
  AnalyticsQueryDto,
  AnalyticsRange,
  ReportQueryDto,
  TimelineQueryDto,
} from './dto/analytics-query.dto';
import { AnalyticsCacheKeys, AnalyticsCacheTtl } from './analytics-cache.constants';

type DashboardSnapshot = Awaited<ReturnType<DashboardService['getDashboard']>>;
type SessionRows = Awaited<
  ReturnType<AnalyticsService['collectSessionRows']>
>;

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  [AnalyticsRange.TODAY]: 1,
  [AnalyticsRange.SEVEN_DAYS]: 7,
  [AnalyticsRange.THIRTY_DAYS]: 30,
  [AnalyticsRange.NINETY_DAYS]: 90,
  [AnalyticsRange.CUSTOM]: 30,
};

/** Custom timeline ranges are capped the same way Progress's unified history is. */
const MAX_CUSTOM_RANGE_DAYS = 91;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardService: DashboardService,
    private readonly settingsQuery: SettingsQueryService,
    private readonly redisCache: RedisCacheService,
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
        to: dateKeyInTimezone(
          addUserDays(range.end, -1, range.timezone),
          range.timezone,
        ),
        timezone: range.timezone,
      },
      summary: {
        xp: totals.xp,
        studyMinutes: totals.studyMinutes,
        completedActivities: totals.completedActivities,
        activeDays: series.filter(
          (item) =>
            item.xp > 0 ||
            item.studyMinutes > 0 ||
            item.completedActivities > 0,
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
        [...overview.skills].sort(
          (left, right) => right.percent - left.percent,
        )[0] ?? null,
      focus:
        [...overview.skills].sort(
          (left, right) => left.percent - right.percent,
        )[0] ?? null,
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
        nextCursor:
          rows.length > limit && last
            ? this.encodeCursor(last.occurredAt, last.id)
            : null,
      },
    };
  }

  async getReport(userId: string, query: ReportQueryDto) {
    const rangeKey = query.range ?? AnalyticsRange.THIRTY_DAYS;
    const overview = await this.getOverview(userId, {
      range: rangeKey,
      limit: 8,
    });
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

  /**
   * The extra metrics Learning Analytics needs beyond `getOverview`
   * (accuracy, completion rate, session duration, practice frequency,
   * missed days, goal completion, XP growth, per-skill growth). Kept as a
   * separate call (not folded into `getOverview`) so pages that don't need
   * these heavier per-skill breakdowns don't pay for them.
   */
  async getMetrics(userId: string, query: AnalyticsQueryDto) {
    const rangeKey = query.range ?? AnalyticsRange.SEVEN_DAYS;
    const cacheKey = AnalyticsCacheKeys.metrics(userId, rangeKey);
    const cached = await this.redisCache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // corrupted entry — fall through and recompute
      }
    }

    const result = await this.computeMetrics(userId, query);
    await this.redisCache.set(
      cacheKey,
      JSON.stringify(result),
      AnalyticsCacheTtl.METRICS_SECONDS,
    );
    return result;
  }

  private async computeMetrics(userId: string, query: AnalyticsQueryDto) {
    const range = await this.resolveRange(userId, query.range);
    const [settings, sessionRows] = await Promise.all([
      this.settingsQuery.getSettings(userId),
      this.collectSessionRows(userId, range.start, range.end),
    ]);

    const accuracy = this.computeAccuracy(sessionRows);
    const completionRate = this.computeCompletionRate(sessionRows);
    const durations = this.computeDurations(sessionRows);
    const perSkillGrowth = this.computePerSkillGrowth(sessionRows, range);

    const activeDaySet = new Set(
      sessionRows.all.map((row) => dateKeyInTimezone(row.occurredAt, range.timezone)),
    );
    const missedDays = Math.max(0, range.days - activeDaySet.size);

    const dailySeries = await this.buildDailySeries(
      userId,
      range.start,
      range.days,
      range.timezone,
    );
    const goalMinutes = settings.dailyStudyMinutes;
    const daysMeetingGoal =
      goalMinutes > 0
        ? dailySeries.filter((day) => day.studyMinutes >= goalMinutes).length
        : 0;
    const goalCompletionPercent =
      goalMinutes > 0 ? Math.round((daysMeetingGoal / range.days) * 100) : null;

    const totals = this.sumSeries(dailySeries);
    const trend = this.buildTrend(dailySeries);

    return {
      range: {
        key: query.range ?? AnalyticsRange.SEVEN_DAYS,
        from: dateKeyInTimezone(range.start, range.timezone),
        to: dateKeyInTimezone(
          addUserDays(range.end, -1, range.timezone),
          range.timezone,
        ),
        timezone: range.timezone,
      },
      accuracy,
      completionRate,
      durations,
      practiceFrequency: {
        sessionsPerDay:
          range.days > 0
            ? Math.round((sessionRows.all.length / range.days) * 100) / 100
            : 0,
        totalSessions: sessionRows.all.length,
      },
      missedDays,
      activeDays: activeDaySet.size,
      goalCompletion: {
        targetMinutesPerDay: goalMinutes,
        daysMeetingGoal,
        percent: goalCompletionPercent,
      },
      xpGrowth: {
        currentPeriodXp: trend.currentValue,
        previousPeriodXp: trend.previousValue,
        percentageChange: trend.percentageChange,
        direction: trend.direction,
      },
      perSkillGrowth,
      totals,
      generatedAt: new Date(),
    };
  }

  /**
   * Progress Timeline: a per-day breakdown enriched beyond `buildDailySeries`
   * (adds accuracy, which skills had activity, and achievements unlocked
   * that day), supporting a `custom` from/to range in addition to the fixed
   * today/7d/30d/90d windows.
   */
  async getTimeline(userId: string, query: TimelineQueryDto) {
    const range = await this.resolveTimelineRange(userId, query);
    const [series, achievements] = await Promise.all([
      this.buildTimelineSeries(userId, range.start, range.days, range.timezone),
      this.prisma.userAchievement.findMany({
        where: {
          userId,
          unlockedAt: { gte: range.start, lt: range.end },
        },
        select: { unlockedAt: true },
      }),
    ]);

    const achievementsByDay = new Map<string, number>();
    for (const row of achievements) {
      if (!row.unlockedAt) continue;
      const key = dateKeyInTimezone(row.unlockedAt, range.timezone);
      achievementsByDay.set(key, (achievementsByDay.get(key) ?? 0) + 1);
    }

    const days = series.map((day) => ({
      ...day,
      achievementsUnlocked: achievementsByDay.get(day.date) ?? 0,
    }));

    return {
      range: {
        key: query.range ?? AnalyticsRange.SEVEN_DAYS,
        from: dateKeyInTimezone(range.start, range.timezone),
        to: dateKeyInTimezone(
          addUserDays(range.end, -1, range.timezone),
          range.timezone,
        ),
        timezone: range.timezone,
      },
      days,
      generatedAt: new Date(),
    };
  }

  private async resolveTimelineRange(userId: string, query: TimelineQueryDto) {
    if (query.range === AnalyticsRange.CUSTOM) {
      const settings = await this.settingsQuery.getSettings(userId);
      const timezone = normalizeUserTimezone(settings.timezone);
      if (!query.from || !query.to) {
        throw new BadRequestException(
          'Custom range requires both from and to dates.',
        );
      }
      const from = startOfUserDay(new Date(query.from), timezone);
      const toRaw = startOfUserDay(new Date(query.to), timezone);
      if (Number.isNaN(from.getTime()) || Number.isNaN(toRaw.getTime())) {
        throw new BadRequestException('Invalid custom range dates.');
      }
      if (toRaw < from) {
        throw new BadRequestException('`to` must not be before `from`.');
      }
      const to = addUserDays(toRaw, 1, timezone);
      const days = Math.round(
        (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (days > MAX_CUSTOM_RANGE_DAYS) {
        throw new BadRequestException(
          `Custom range cannot exceed ${MAX_CUSTOM_RANGE_DAYS} days.`,
        );
      }
      return { start: from, end: to, days, timezone };
    }
    return this.resolveRange(userId, query.range);
  }

  private async collectSessionRows(userId: string, start: Date, end: Date) {
    const [reading, listening, speaking, writing, grammar] = await Promise.all([
      this.prisma.readingSession.findMany({
        where: { userId, startedAt: { gte: start, lt: end } },
        select: {
          isCompleted: true,
          completedAt: true,
          startedAt: true,
          spentTime: true,
          accuracy: true,
        },
      }),
      this.prisma.listeningSession.findMany({
        where: { userId, startedAt: { gte: start, lt: end } },
        select: {
          status: true,
          completedAt: true,
          startedAt: true,
          total: true,
          correct: true,
          score: true,
        },
      }),
      this.prisma.speakingSession.findMany({
        where: { userId, startedAt: { gte: start, lt: end } },
        select: {
          status: true,
          finishedAt: true,
          startedAt: true,
          duration: true,
          overallScore: true,
        },
      }),
      this.prisma.writingSession.findMany({
        where: { userId, startedAt: { gte: start, lt: end } },
        select: {
          isSubmitted: true,
          submittedAt: true,
          startedAt: true,
          timeSpentSeconds: true,
          overallScore: true,
        },
      }),
      this.prisma.grammarLessonProgress.findMany({
        where: { userId, createdAt: { gte: start, lt: end } },
        select: {
          completed: true,
          completedAt: true,
          createdAt: true,
          score: true,
        },
      }),
    ]);

    const all: Array<{
      skill: LearningSkill;
      occurredAt: Date;
      completed: boolean;
      accuracy: number | null;
      durationSeconds: number;
    }> = [
      ...reading.map((item) => ({
        skill: LearningSkill.READING,
        occurredAt: item.completedAt ?? item.startedAt,
        completed: item.isCompleted,
        accuracy: item.isCompleted ? item.accuracy : null,
        durationSeconds: item.spentTime,
      })),
      ...listening.map((item) => ({
        skill: LearningSkill.LISTENING,
        occurredAt: item.completedAt ?? item.startedAt,
        completed: item.status === 'COMPLETED' || !!item.completedAt,
        accuracy:
          item.completedAt && item.total > 0
            ? Math.round((item.correct / item.total) * 100)
            : null,
        durationSeconds: 0,
      })),
      ...speaking.map((item) => ({
        skill: LearningSkill.SPEAKING,
        occurredAt: item.finishedAt ?? item.startedAt,
        completed:
          item.status === SpeakingSessionStatus.COMPLETED || !!item.finishedAt,
        accuracy: item.finishedAt ? item.overallScore : null,
        durationSeconds: item.duration,
      })),
      ...writing.map((item) => ({
        skill: LearningSkill.WRITING,
        occurredAt: item.submittedAt ?? item.startedAt,
        completed: item.isSubmitted,
        accuracy: item.isSubmitted ? (item.overallScore ?? null) : null,
        durationSeconds: item.timeSpentSeconds,
      })),
      ...grammar.map((item) => ({
        skill: LearningSkill.GRAMMAR,
        occurredAt: item.completedAt ?? item.createdAt,
        completed: item.completed,
        accuracy: item.completed ? item.score : null,
        durationSeconds: 0,
      })),
    ];

    return { all, reading, listening, speaking, writing, grammar };
  }

  private computeAccuracy(rows: SessionRows) {
    const withAccuracy = rows.all.filter((row) => row.accuracy !== null) as Array<
      SessionRows['all'][number] & { accuracy: number }
    >;
    const overall = this.average(withAccuracy.map((row) => row.accuracy));

    const bySkill: Partial<Record<LearningSkill, number | null>> = {};
    for (const skill of Object.values(LearningSkill)) {
      const values = withAccuracy
        .filter((row) => row.skill === skill)
        .map((row) => row.accuracy);
      bySkill[skill] = values.length ? this.average(values) : null;
    }

    return { overall: withAccuracy.length ? overall : null, bySkill };
  }

  private computeCompletionRate(rows: SessionRows) {
    const started = rows.all.length;
    const completed = rows.all.filter((row) => row.completed).length;
    return {
      started,
      completed,
      percent: started > 0 ? Math.round((completed / started) * 100) : null,
    };
  }

  private computeDurations(rows: SessionRows) {
    const completedWithDuration = rows.all.filter(
      (row) => row.completed && row.durationSeconds > 0,
    );
    const avgSessionSeconds = completedWithDuration.length
      ? completedWithDuration.reduce((sum, row) => sum + row.durationSeconds, 0) /
        completedWithDuration.length
      : 0;

    return {
      avgSessionMinutes:
        Math.round((avgSessionSeconds / 60) * 10) / 10,
      completedSessionsCounted: completedWithDuration.length,
    };
  }

  private computePerSkillGrowth(
    rows: SessionRows,
    range: { start: Date; end: Date },
  ) {
    const midpoint = new Date(
      (range.start.getTime() + range.end.getTime()) / 2,
    );

    const result: Partial<
      Record<LearningSkill, { previous: number | null; current: number | null; direction: 'UP' | 'DOWN' | 'FLAT' }>
    > = {};

    for (const skill of Object.values(LearningSkill)) {
      const skillRows = rows.all.filter(
        (row) => row.skill === skill && row.accuracy !== null,
      );
      const previous = this.average(
        skillRows
          .filter((row) => row.occurredAt < midpoint)
          .map((row) => row.accuracy as number),
      );
      const current = this.average(
        skillRows
          .filter((row) => row.occurredAt >= midpoint)
          .map((row) => row.accuracy as number),
      );
      const hasPrevious = skillRows.some((row) => row.occurredAt < midpoint);
      const hasCurrent = skillRows.some((row) => row.occurredAt >= midpoint);

      result[skill] = {
        previous: hasPrevious ? previous : null,
        current: hasCurrent ? current : null,
        direction:
          hasPrevious && hasCurrent
            ? current > previous
              ? 'UP'
              : current < previous
                ? 'DOWN'
                : 'FLAT'
            : 'FLAT',
      };
    }

    return result;
  }

  private average(values: number[]) {
    if (!values.length) return 0;
    return Math.round(
      (values.reduce((sum, value) => sum + value, 0) / values.length) * 10,
    ) / 10;
  }

  private async buildTimelineSeries(
    userId: string,
    start: Date,
    days: number,
    timezone: string,
  ) {
    const end = addUserDays(start, days, timezone);
    const rows = await this.collectSessionRows(userId, start, end);
    const baseSeries = await this.buildDailySeries(userId, start, days, timezone);

    return baseSeries.map((day) => {
      const dayRows = rows.all.filter(
        (row) => dateKeyInTimezone(row.occurredAt, timezone) === day.date,
      );
      const accuracyValues = dayRows
        .filter((row): row is typeof row & { accuracy: number } => row.accuracy !== null)
        .map((row) => row.accuracy);
      const completedSkills = [
        ...new Set(dayRows.filter((row) => row.completed).map((row) => row.skill)),
      ];

      return {
        date: day.date,
        xp: day.xp,
        studyMinutes: day.studyMinutes,
        completedActivities: day.completedActivities,
        accuracyPercent: accuracyValues.length
          ? this.average(accuracyValues)
          : null,
        completedSkills,
      };
    });
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
        where: {
          userId,
          isCompleted: true,
          completedAt: { gte: start, lt: end },
        },
        select: { completedAt: true, spentTime: true },
      }),
      this.prisma.writingSession.findMany({
        where: {
          userId,
          isSubmitted: true,
          submittedAt: { gte: start, lt: end },
        },
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
        (item) =>
          item.completedAt &&
          dateKeyInTimezone(item.completedAt, timezone) === key,
      );
      const writings = writingSessions.filter(
        (item) =>
          item.submittedAt &&
          dateKeyInTimezone(item.submittedAt, timezone) === key,
      );
      const speakings = speakingSessions.filter(
        (item) =>
          item.finishedAt &&
          dateKeyInTimezone(item.finishedAt, timezone) === key,
      );
      const listenings = listeningSessions.filter(
        (item) =>
          item.completedAt &&
          dateKeyInTimezone(item.completedAt, timezone) === key,
      );
      const lessons = lessonProgress.filter(
        (item) =>
          item.completedAt &&
          dateKeyInTimezone(item.completedAt, timezone) === key,
      );

      return {
        date: key,
        xp,
        studyMinutes:
          readings.reduce(
            (sum, item) => sum + Math.round(item.spentTime / 60),
            0,
          ) +
          writings.reduce(
            (sum, item) => sum + Math.round(item.timeSpentSeconds / 60),
            0,
          ) +
          speakings.reduce(
            (sum, item) => sum + Math.round(item.duration / 60),
            0,
          ) +
          lessons.reduce((sum, item) => sum + (item.lesson.duration ?? 0), 0),
        completedActivities:
          readings.length +
          writings.length +
          speakings.length +
          listenings.length +
          lessons.length,
      };
    });
  }

  private sumSeries(
    series: Array<{
      xp: number;
      studyMinutes: number;
      completedActivities: number;
    }>,
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
    series: Array<{
      xp: number;
      studyMinutes: number;
      completedActivities: number;
    }>,
  ) {
    const midpoint = Math.floor(series.length / 2);
    const previous = this.sumSeries(series.slice(0, midpoint));
    const current = this.sumSeries(series.slice(midpoint));
    const percentageChange =
      previous.xp > 0
        ? Math.round(((current.xp - previous.xp) / previous.xp) * 100)
        : null;

    return {
      currentValue: current.xp,
      previousValue: previous.xp,
      absoluteChange: current.xp - previous.xp,
      percentageChange,
      direction:
        current.xp > previous.xp
          ? 'UP'
          : current.xp < previous.xp
            ? 'DOWN'
            : 'FLAT',
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

  private actionUrlForSource(
    sourceType: XpSourceType,
    sourceId: string | null,
  ) {
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
