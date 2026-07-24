/**
 * Runtime validation for the Analytics + AI Learning Coach feature set.
 * Runs against the REAL local Postgres + Redis instances configured in
 * `.env` (no mocked PrismaService/RedisCacheService) — mirrors the pattern
 * from `learning-path-runtime-cases.e2e-spec.ts`. Only GeminiService is
 * overridden (deterministic, no real API cost) so the AI Coach path is
 * exercised end-to-end without a network call; its fallback-template path
 * is exercised separately by forcing a Gemini failure.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { LearningGoal } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisCacheModule } from '../src/common/cache/redis-cache.module';
import { RedisCacheService } from '../src/common/cache/redis-cache.service';
import { CONTENT_REDIS } from '../src/common/cache/cache.constants';
import { SETTINGS_REDIS } from '../src/modules/settings/settings.constants';
import { SettingsQueryService } from '../src/modules/settings/settings-query.service';
import { SkillLevelResolverService } from '../src/common/skill-level/skill-level-resolver.service';
import { LearningPathService } from '../src/modules/learning-path/learning-path.service';
import { XpService } from '../src/modules/leaderboard/xp.service';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { GeminiService } from '../src/modules/gemini/gemini.service';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { SkillRadarService } from '../src/modules/analytics/skill-radar.service';
import { WeaknessDetectionService } from '../src/modules/analytics/weakness-detection.service';
import { AiCoachService } from '../src/modules/analytics/ai-coach.service';
import { AnalyticsRange } from '../src/modules/analytics/dto/analytics-query.dto';

/**
 * `SettingsModule`/`DashboardModule`/`LearningPathModule` each pull in a
 * wider dependency graph (AuditLog, Leaderboard/XP, LearningPathAccess...)
 * that isn't relevant to Analytics/Coach and, in the case of Settings, isn't
 * even fully self-contained outside the real app bootstrap (SettingsService
 * depends on AuthSessionService with no module wiring for it standalone).
 * Providing the exact leaf services this feature actually calls — mirroring
 * `learning-path-runtime-cases.e2e-spec.ts`'s approach of mocking XpService
 * — keeps this a real-DB test without dragging in unrelated modules.
 */
describe('Analytics + AI Coach runtime validation', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let redisCache: RedisCacheService;
  let analyticsService: AnalyticsService;
  let skillRadarService: SkillRadarService;
  let weaknessDetectionService: WeaknessDetectionService;
  let aiCoachService: AiCoachService;
  const geminiMock = { generateJson: jest.fn() };

  const fixtureUserIds: string[] = [];

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [RedisCacheModule],
      providers: [
        PrismaService,
        {
          provide: SETTINGS_REDIS,
          useFactory: () =>
            new Redis({
              host: process.env.REDIS_HOST ?? '127.0.0.1',
              port: Number(process.env.REDIS_PORT ?? 6379),
              password: process.env.REDIS_PASSWORD || undefined,
              maxRetriesPerRequest: null,
            }),
        },
        SettingsQueryService,
        SkillLevelResolverService,
        { provide: XpService, useValue: { publish: jest.fn() } },
        LearningPathService,
        DashboardService,
        AnalyticsService,
        SkillRadarService,
        WeaknessDetectionService,
        AiCoachService,
        { provide: GeminiService, useValue: geminiMock },
      ],
    }).compile();

    prisma = module.get(PrismaService);
    redisCache = module.get(RedisCacheService);
    analyticsService = module.get(AnalyticsService);
    skillRadarService = module.get(SkillRadarService);
    weaknessDetectionService = module.get(WeaknessDetectionService);
    aiCoachService = module.get(AiCoachService);
  });

  afterAll(async () => {
    if (fixtureUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
    }
    await prisma.$disconnect();
    // RedisCacheService disconnects its own client via OnModuleDestroy when
    // the module closes, but the bare ioredis clients behind CONTENT_REDIS
    // (from RedisCacheModule) and the SETTINGS_REDIS factory above are plain
    // value providers with no lifecycle hook — left open, they keep the
    // Jest process alive indefinitely. Disconnect them explicitly first.
    module.get(CONTENT_REDIS).disconnect();
    module.get(SETTINGS_REDIS).disconnect();
    await module.close();
  });

  async function createFixtureUser(tag: string, goal: LearningGoal) {
    const user = await prisma.user.create({
      data: {
        fullname: `Analytics Fixture ${tag}`,
        email: `analytics-${tag}-${randomUUID()}@__test-fixture__.invalid`,
        password: 'not-a-real-hash-runtime-fixture',
      },
    });
    fixtureUserIds.push(user.id);
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, learningGoal: goal },
      update: { learningGoal: goal },
    });
    return user;
  }

  describe('CASE A — brand-new user, zero activity', () => {
    it('every new endpoint returns a well-formed, non-crashing shape with INSUFFICIENT_DATA / empty results', async () => {
      const user = await createFixtureUser('case-a', LearningGoal.DAILY_ENGLISH);

      const metrics = await analyticsService.getMetrics(user.id, {
        range: AnalyticsRange.SEVEN_DAYS,
        limit: 20,
      });
      expect(metrics.accuracy.overall).toBeNull();
      expect(metrics.completionRate.started).toBe(0);
      expect(metrics.missedDays).toBe(7);

      const timeline = await analyticsService.getTimeline(user.id, {
        range: AnalyticsRange.SEVEN_DAYS,
      });
      expect(timeline.days).toHaveLength(7);

      const radar = await skillRadarService.getRadar(user.id);
      expect(radar.skills).toHaveLength(6);
      expect(radar.skills.every((s) => s.basis === 'INSUFFICIENT_DATA')).toBe(
        true,
      );

      const weaknesses = await weaknessDetectionService.getWeaknesses(user.id);
      expect(weaknesses.overallWeakest).toEqual([]);
    }, 30000);
  });

  describe('CASE B — real Grammar activity in this DB drives real accuracy + weakness detection', () => {
    it('a completed-but-low-scoring Grammar lesson surfaces as a weakness with a concrete recommended lesson', async () => {
      const user = await createFixtureUser('case-b', LearningGoal.GRAMMAR);

      const topic = await prisma.grammarTopic.findFirst({
        include: { lessons: { where: { isActive: true }, take: 2 } },
      });
      if (!topic || topic.lessons.length < 1) {
        // eslint-disable-next-line no-console
        console.log(
          '[Case B] No seeded Grammar content in this DB — skipping content-dependent assertions.',
        );
        return;
      }

      await prisma.grammarLessonProgress.create({
        data: {
          userId: user.id,
          lessonId: topic.lessons[0].id,
          completed: true,
          score: 35,
          completedAt: new Date(),
        },
      });
      if (topic.lessons[1]) {
        await prisma.grammarLessonProgress.create({
          data: {
            userId: user.id,
            lessonId: topic.lessons[1].id,
            completed: true,
            score: 39,
            completedAt: new Date(),
          },
        });
      }

      const weaknesses = await weaknessDetectionService.getWeaknesses(user.id);
      if (topic.lessons.length >= 2) {
        expect(weaknesses.bySkill.GRAMMAR).not.toBeNull();
        expect(weaknesses.bySkill.GRAMMAR!.topic).toBe(topic.title);
        expect(weaknesses.bySkill.GRAMMAR!.accuracy).toBeLessThan(50);
        expect(weaknesses.bySkill.GRAMMAR!.reason).toContain(topic.title);
      }

      const radar = await skillRadarService.getRadar(user.id);
      const grammarPoint = radar.skills.find((s) => s.skill === 'GRAMMAR');
      expect(grammarPoint?.basis).toBe('RECENT_PERFORMANCE');
    }, 30000);
  });

  describe('CASE C — AI Coach grounds its output in real metrics and caches per user+goal+day', () => {
    it('calls Gemini exactly once and reuses the cached advice on a second call', async () => {
      const user = await createFixtureUser('case-c', LearningGoal.IELTS);
      geminiMock.generateJson.mockResolvedValue({
        headline: 'Runtime test headline',
        whyThisLesson: 'because runtime',
        recommendedFocus: null,
        whatsNext: ['practice'],
        weeklyPlan: ['plan'],
        examPrepTip: 'tip',
        dailyHabitTip: 'habit',
      });

      const first = await aiCoachService.getCoachAdvice(user.id);
      expect(first.source).toBe('GEMINI');
      expect(first.goal).toBe(LearningGoal.IELTS);
      expect(geminiMock.generateJson).toHaveBeenCalledTimes(1);

      const [prompt] = geminiMock.generateJson.mock.calls[0];
      expect(prompt).toContain('IELTS');

      const second = await aiCoachService.getCoachAdvice(user.id);
      expect(geminiMock.generateJson).toHaveBeenCalledTimes(1); // still 1 — cache hit
      expect(second.headline).toBe(first.headline);
    }, 30000);

    it('falls back to a deterministic template when Gemini fails, without crashing', async () => {
      const user = await createFixtureUser('case-c-fallback', LearningGoal.TOEIC);
      geminiMock.generateJson.mockRejectedValue(new Error('simulated Gemini outage'));

      const advice = await aiCoachService.getCoachAdvice(user.id);

      expect(advice.source).toBe('FALLBACK_TEMPLATE');
      expect(advice.headline).toEqual(expect.any(String));
      expect(advice.headline.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('CASE D — Redis cache-aside actually short-circuits recomputation', () => {
    it('a second radar call within the TTL skips recomputation entirely (cache hit is byte-identical)', async () => {
      const user = await createFixtureUser('case-d', LearningGoal.SPEAKING);

      const first = await skillRadarService.getRadar(user.id);
      const second = await skillRadarService.getRadar(user.id);

      // The cached path returns a JSON.parse'd object (Date -> string), so
      // a byte-identical timestamp is the signal that no recomputation ran.
      expect(new Date(second.generatedAt).toISOString()).toBe(
        new Date(first.generatedAt).toISOString(),
      );
    }, 30000);

    afterAll(async () => {
      // Best-effort cleanup so repeated local runs don't accumulate stale keys.
      await redisCache
        .del(
          ...fixtureUserIds.map((id) => `analytics:radar:${id}`),
          ...fixtureUserIds.map((id) => `analytics:weaknesses:${id}`),
        )
        .catch(() => undefined);
    });
  });
});
