import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisCacheService } from 'src/common/cache/redis-cache.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { SettingsQueryService } from '../settings/settings-query.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRange } from './dto/analytics-query.dto';

describe('AnalyticsService (Learning Analytics extensions)', () => {
  let service: AnalyticsService;

  const prismaMock = {
    xpTransaction: { findMany: jest.fn() },
    readingSession: { findMany: jest.fn() },
    writingSession: { findMany: jest.fn() },
    speakingSession: { findMany: jest.fn() },
    listeningSession: { findMany: jest.fn() },
    lessonProgress: { findMany: jest.fn() },
    grammarLessonProgress: { findMany: jest.fn() },
    userAchievement: { findMany: jest.fn(), count: jest.fn() },
  };

  const dashboardServiceMock = { getDashboard: jest.fn() };
  const settingsQueryMock = { getSettings: jest.fn() };
  const redisCacheMock = { get: jest.fn(), set: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    redisCacheMock.get.mockResolvedValue(null);
    redisCacheMock.set.mockResolvedValue(true);
    settingsQueryMock.getSettings.mockResolvedValue({
      timezone: 'Asia/Ho_Chi_Minh',
      dailyStudyMinutes: 0,
    });
    dashboardServiceMock.getDashboard.mockResolvedValue({
      currentStreak: 0,
      skillProgress: [],
      recommendations: [],
      analytics: { aiReport: null },
    });

    prismaMock.xpTransaction.findMany.mockResolvedValue([]);
    prismaMock.readingSession.findMany.mockResolvedValue([]);
    prismaMock.writingSession.findMany.mockResolvedValue([]);
    prismaMock.speakingSession.findMany.mockResolvedValue([]);
    prismaMock.listeningSession.findMany.mockResolvedValue([]);
    prismaMock.lessonProgress.findMany.mockResolvedValue([]);
    prismaMock.grammarLessonProgress.findMany.mockResolvedValue([]);
    prismaMock.userAchievement.findMany.mockResolvedValue([]);
    prismaMock.userAchievement.count.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: SettingsQueryService, useValue: settingsQueryMock },
        { provide: RedisCacheService, useValue: redisCacheMock },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMetrics', () => {
    it('computes overall accuracy from completed sessions across skills', async () => {
      const now = new Date();
      prismaMock.readingSession.findMany.mockResolvedValue([
        { isCompleted: true, completedAt: now, startedAt: now, spentTime: 60, accuracy: 80 },
      ]);
      prismaMock.speakingSession.findMany.mockResolvedValue([
        { status: 'COMPLETED', finishedAt: now, startedAt: now, duration: 30, overallScore: 60 },
      ]);

      const result = await service.getMetrics('user-1', {
        range: AnalyticsRange.SEVEN_DAYS,
        limit: 20,
      });

      expect(result.accuracy.overall).toBe(70);
      expect(result.accuracy.bySkill.READING).toBe(80);
      expect(result.accuracy.bySkill.SPEAKING).toBe(60);
      expect(result.accuracy.bySkill.GRAMMAR).toBeNull();
    });

    it('computes completion rate as completed / started sessions', async () => {
      const now = new Date();
      prismaMock.readingSession.findMany.mockResolvedValue([
        { isCompleted: true, completedAt: now, startedAt: now, spentTime: 60, accuracy: 80 },
        { isCompleted: false, completedAt: null, startedAt: now, spentTime: 0, accuracy: 0 },
      ]);

      const result = await service.getMetrics('user-1', {
        range: AnalyticsRange.SEVEN_DAYS,
        limit: 20,
      });

      expect(result.completionRate).toEqual({
        started: 2,
        completed: 1,
        percent: 50,
      });
    });

    it('reports goal completion based on dailyStudyMinutes vs actual daily study minutes', async () => {
      settingsQueryMock.getSettings.mockResolvedValue({
        timezone: 'Asia/Ho_Chi_Minh',
        dailyStudyMinutes: 30,
      });

      const result = await service.getMetrics('user-1', {
        range: AnalyticsRange.SEVEN_DAYS,
        limit: 20,
      });

      expect(result.goalCompletion.targetMinutesPerDay).toBe(30);
      expect(result.goalCompletion.percent).toBe(0); // no study minutes logged
    });

    it('reuses a cached result and does not touch Prisma again', async () => {
      const cached = { accuracy: { overall: 99, bySkill: {} } };
      redisCacheMock.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getMetrics('user-1', {
        range: AnalyticsRange.SEVEN_DAYS,
        limit: 20,
      });

      expect(result).toEqual(cached);
      expect(prismaMock.readingSession.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getTimeline', () => {
    it('supports the fixed today/7d/30d/90d ranges', async () => {
      const timeline = await service.getTimeline('user-1', {
        range: AnalyticsRange.TODAY,
      });

      expect(timeline.days).toHaveLength(1);
    });

    it('rejects a custom range missing from/to', async () => {
      await expect(
        service.getTimeline('user-1', { range: AnalyticsRange.CUSTOM }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a custom range spanning more than 91 days', async () => {
      await expect(
        service.getTimeline('user-1', {
          range: AnalyticsRange.CUSTOM,
          from: '2025-01-01',
          to: '2025-12-31',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a valid custom range and counts achievements per day', async () => {
      const day1 = new Date('2025-06-01T10:00:00Z');
      prismaMock.userAchievement.findMany.mockResolvedValue([
        { unlockedAt: day1 },
        { unlockedAt: day1 },
      ]);

      const timeline = await service.getTimeline('user-1', {
        range: AnalyticsRange.CUSTOM,
        from: '2025-06-01',
        to: '2025-06-03',
      });

      const dayWithAchievements = timeline.days.find(
        (day) => day.achievementsUnlocked > 0,
      );
      expect(dayWithAchievements?.achievementsUnlocked).toBe(2);
    });

    it('marks which skills had completed activity each day', async () => {
      const now = new Date();
      prismaMock.grammarLessonProgress.findMany.mockResolvedValue([
        { completed: true, completedAt: now, createdAt: now, score: 90 },
      ]);

      const timeline = await service.getTimeline('user-1', {
        range: AnalyticsRange.SEVEN_DAYS,
      });

      const today = timeline.days.at(-1);
      expect(today?.completedSkills).toContain('GRAMMAR');
    });
  });
});
