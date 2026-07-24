import { Test, TestingModule } from '@nestjs/testing';
import { RedisCacheService } from 'src/common/cache/redis-cache.service';
import { GeminiService } from '../gemini/gemini.service';
import { SettingsQueryService } from '../settings/settings-query.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { AnalyticsService } from './analytics.service';
import { SkillRadarService } from './skill-radar.service';
import { WeaknessDetectionService } from './weakness-detection.service';
import { AiCoachService } from './ai-coach.service';

describe('AiCoachService', () => {
  let service: AiCoachService;

  const geminiMock = { generateJson: jest.fn() };
  const redisCacheMock = { get: jest.fn(), set: jest.fn() };
  const settingsQueryMock = { getSettings: jest.fn() };
  const analyticsServiceMock = { getOverview: jest.fn() };
  const skillRadarServiceMock = { getRadar: jest.fn() };
  const weaknessDetectionServiceMock = { getWeaknesses: jest.fn() };
  const dashboardServiceMock = { getDashboard: jest.fn() };

  const baseOverview = {
    summary: { xp: 120, activeDays: 4 },
  };
  const baseRadar = {
    skills: [
      { skill: 'GRAMMAR', label: 'Grammar', score: 40 },
      { skill: 'SPEAKING', label: 'Speaking', score: 80 },
    ],
  };
  const baseWeaknesses = {
    overallWeakest: [
      {
        skill: 'GRAMMAR',
        topic: 'Present Perfect',
        accuracy: 42,
        reason: 'Grammar → Present Perfect → Accuracy 42% → Recommend Lesson: X',
      },
    ],
  };
  const baseDashboard = {
    currentStreak: 5,
    today: { dailyGoalProgress: 60 },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    redisCacheMock.get.mockResolvedValue(null);
    redisCacheMock.set.mockResolvedValue(true);
    settingsQueryMock.getSettings.mockResolvedValue({
      learningGoal: 'IELTS',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    analyticsServiceMock.getOverview.mockResolvedValue(baseOverview);
    skillRadarServiceMock.getRadar.mockResolvedValue(baseRadar);
    weaknessDetectionServiceMock.getWeaknesses.mockResolvedValue(baseWeaknesses);
    dashboardServiceMock.getDashboard.mockResolvedValue(baseDashboard);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiCoachService,
        { provide: GeminiService, useValue: geminiMock },
        { provide: RedisCacheService, useValue: redisCacheMock },
        { provide: SettingsQueryService, useValue: settingsQueryMock },
        { provide: AnalyticsService, useValue: analyticsServiceMock },
        { provide: SkillRadarService, useValue: skillRadarServiceMock },
        {
          provide: WeaknessDetectionService,
          useValue: weaknessDetectionServiceMock,
        },
        { provide: DashboardService, useValue: dashboardServiceMock },
      ],
    }).compile();

    service = module.get<AiCoachService>(AiCoachService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('grounds the Gemini prompt in the real metrics just computed (no invented numbers)', async () => {
    geminiMock.generateJson.mockResolvedValue({
      headline: 'ok',
      whyThisLesson: 'because',
      recommendedFocus: { skill: 'GRAMMAR', topic: 'Present Perfect', reason: 'weak' },
      whatsNext: ['do X'],
      weeklyPlan: ['plan'],
      examPrepTip: 'tip',
      dailyHabitTip: 'habit',
    });

    const advice = await service.getCoachAdvice('user-1');

    expect(geminiMock.generateJson).toHaveBeenCalledTimes(1);
    const [prompt] = geminiMock.generateJson.mock.calls[0];
    expect(prompt).toContain('120'); // xp
    expect(prompt).toContain('Present Perfect');
    expect(prompt).toContain('42%');
    expect(advice.source).toBe('GEMINI');
    expect(advice.metrics.xpLast7Days).toBe(120);
    expect(advice.metrics.topWeaknesses[0].topic).toBe('Present Perfect');
  });

  it('falls back to a deterministic, metrics-grounded template when Gemini fails', async () => {
    geminiMock.generateJson.mockRejectedValue(new Error('boom'));

    const advice = await service.getCoachAdvice('user-1');

    expect(advice.source).toBe('FALLBACK_TEMPLATE');
    expect(advice.recommendedFocus).toEqual({
      skill: 'GRAMMAR',
      topic: 'Present Perfect',
      reason: baseWeaknesses.overallWeakest[0].reason,
    });
    expect(advice.headline).toContain('Present Perfect');
  });

  it('caches the result and does not call Gemini again on a subsequent call', async () => {
    geminiMock.generateJson.mockResolvedValue({ headline: 'ok' });
    const first = await service.getCoachAdvice('user-1');

    redisCacheMock.get.mockResolvedValue(JSON.stringify(first));
    const second = await service.getCoachAdvice('user-1');

    expect(geminiMock.generateJson).toHaveBeenCalledTimes(1);
    // Round-trip `first` through JSON too — the cached path returns a
    // JSON.parse'd object, so Date fields come back as strings.
    expect(second).toEqual(JSON.parse(JSON.stringify(first)));
  });

  it('bypasses the cache when forceRefresh is true', async () => {
    geminiMock.generateJson.mockResolvedValue({ headline: 'ok' });
    redisCacheMock.get.mockResolvedValue(JSON.stringify({ headline: 'stale' }));

    await service.getCoachAdvice('user-1', { forceRefresh: true });

    expect(geminiMock.generateJson).toHaveBeenCalledTimes(1);
  });

  it('adapts the prompt to the user’s study goal', async () => {
    settingsQueryMock.getSettings.mockResolvedValue({
      learningGoal: 'TOEIC',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    geminiMock.generateJson.mockResolvedValue({ headline: 'ok' });

    await service.getCoachAdvice('user-1');

    const [prompt] = geminiMock.generateJson.mock.calls[0];
    expect(prompt).toContain('TOEIC');
  });
});
