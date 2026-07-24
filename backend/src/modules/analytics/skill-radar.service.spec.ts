import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisCacheService } from 'src/common/cache/redis-cache.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { SkillRadarService } from './skill-radar.service';

describe('SkillRadarService', () => {
  let service: SkillRadarService;

  const prismaMock = {
    userWordProgress: { findMany: jest.fn() },
    grammarLessonProgress: { findMany: jest.fn() },
    readingSession: { findMany: jest.fn() },
    listeningSession: { findMany: jest.fn() },
    speakingSession: { findMany: jest.fn() },
    writingSession: { findMany: jest.fn() },
  };

  const dashboardServiceMock = { getDashboard: jest.fn() };
  const redisCacheMock = { get: jest.fn(), set: jest.fn() };

  const emptyDashboard = () => ({
    skillProgress: [
      { key: 'VOCABULARY', label: 'Vocabulary', percent: 10, href: '/vocabulary' },
      { key: 'GRAMMAR', label: 'Grammar', percent: 0, href: '/grammar' },
      { key: 'LISTENING', label: 'Listening', percent: 0, href: '/listening' },
      { key: 'SPEAKING', label: 'Speaking', percent: 0, href: '/speaking' },
      { key: 'READING', label: 'Reading', percent: 0, href: '/reading' },
      { key: 'WRITING', label: 'Writing', percent: 0, href: '/writing' },
    ],
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    redisCacheMock.get.mockResolvedValue(null);
    redisCacheMock.set.mockResolvedValue(true);
    dashboardServiceMock.getDashboard.mockResolvedValue(emptyDashboard());

    prismaMock.userWordProgress.findMany.mockResolvedValue([]);
    prismaMock.grammarLessonProgress.findMany.mockResolvedValue([]);
    prismaMock.readingSession.findMany.mockResolvedValue([]);
    prismaMock.listeningSession.findMany.mockResolvedValue([]);
    prismaMock.speakingSession.findMany.mockResolvedValue([]);
    prismaMock.writingSession.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillRadarService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: RedisCacheService, useValue: redisCacheMock },
      ],
    }).compile();

    service = module.get<SkillRadarService>(SkillRadarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns all 6 skills, falling back to Dashboard lifetime percent when there are no recent samples', async () => {
    const radar = await service.getRadar('user-1');

    expect(radar.skills).toHaveLength(6);
    const vocabulary = radar.skills.find((item) => item.skill === 'VOCABULARY');
    expect(vocabulary).toEqual(
      expect.objectContaining({ score: 10, basis: 'LIFETIME_AVERAGE', sampleSize: 0 }),
    );
    const grammar = radar.skills.find((item) => item.skill === 'GRAMMAR');
    expect(grammar).toEqual(
      expect.objectContaining({ score: 0, basis: 'INSUFFICIENT_DATA', sampleSize: 0 }),
    );
  });

  it('weights recent Grammar samples more heavily than older ones (recency, not lifetime average)', async () => {
    const now = Date.now();
    const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

    prismaMock.grammarLessonProgress.findMany.mockResolvedValue([
      { score: 95, completedAt: daysAgo(1) },
      { score: 20, completedAt: daysAgo(55) },
    ]);

    const radar = await service.getRadar('user-1');
    const grammar = radar.skills.find((item) => item.skill === 'GRAMMAR')!;

    expect(grammar.basis).toBe('RECENT_PERFORMANCE');
    // Recency weighting must pull the score much closer to the recent 95
    // than a flat average (which would be 57.5).
    expect(grammar.score).toBeGreaterThan(70);
  });

  it('ignores samples older than the recency window entirely', async () => {
    const now = Date.now();
    const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

    // 90 days ago is outside the 60-day window's Prisma `gte` filter — the
    // mock still returns it (mocks don't filter), so this only proves the
    // service is passing a `gte` bound to Prisma, not re-filtering in JS.
    // The real guarantee is the `updatedAt`/`completedAt` where clause.
    prismaMock.grammarLessonProgress.findMany.mockResolvedValue([
      { score: 50, completedAt: daysAgo(5) },
    ]);

    await service.getRadar('user-1');

    const call = prismaMock.grammarLessonProgress.findMany.mock.calls[0][0];
    expect(call.where.completedAt.gte).toBeInstanceOf(Date);
    expect(call.where.completed).toBe(true);
  });

  it('reuses a cached radar instead of recomputing when present', async () => {
    const cached = {
      generatedAt: new Date().toISOString(),
      windowDays: 60,
      overall: 42,
      skills: [],
    };
    redisCacheMock.get.mockResolvedValue(JSON.stringify(cached));

    const radar = await service.getRadar('user-1');

    expect(radar).toEqual(cached);
    expect(dashboardServiceMock.getDashboard).not.toHaveBeenCalled();
  });
});
