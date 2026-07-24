import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeminiService } from '../../gemini/gemini.service';
import { QuestionGenerationLockService } from '../../question-bank/question-generation-lock/question-generation-lock.service';
import { SpeakingJobService } from './speaking-job.service';

describe('SpeakingJobService', () => {
  let service: SpeakingJobService;

  const prismaMock = {
    speakingCategory: { upsert: jest.fn() },
    speakingTopic: { upsert: jest.fn(), update: jest.fn() },
    speakingLesson: { count: jest.fn(), upsert: jest.fn() },
  };
  const geminiServiceMock = { generateJson: jest.fn() };
  const lockServiceMock = {
    withLock: jest.fn((_key: string, cb: () => unknown) => cb()),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    // `resetAllMocks()` wipes any implementation set at declaration time —
    // re-establish the lock's auto-invoking behavior every test needs.
    lockServiceMock.withLock.mockImplementation((_key: string, cb: () => unknown) => cb());

    prismaMock.speakingCategory.upsert.mockImplementation(
      async ({ where }: { where: { slug: string } }) => ({
        id: `cat-${where.slug}`,
        slug: where.slug,
      }),
    );
    prismaMock.speakingTopic.upsert.mockImplementation(
      async ({ where }: { where: { slug: string } }) => ({
        id: `topic-${where.slug}`,
        slug: where.slug,
      }),
    );
    prismaMock.speakingLesson.count.mockResolvedValue(20); // already at threshold

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpeakingJobService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: GeminiService, useValue: geminiServiceMock },
        { provide: QuestionGenerationLockService, useValue: lockServiceMock },
      ],
    }).compile();

    service = module.get<SpeakingJobService>(SpeakingJobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('covers all 8 seeded categories per run (was previously limited to 3)', async () => {
    await service.generateDailySpeakingData();

    const upsertedSlugs = prismaMock.speakingCategory.upsert.mock.calls.map(
      (call) => call[0].where.slug,
    );

    expect(upsertedSlugs).toEqual([
      'daily-life',
      'work-career',
      'education',
      'travel-places',
      'technology',
      'culture',
      'health-fitness',
      'food-drinks',
    ]);
  });

  it('one config failing does not abort the remaining configs (try/catch around the loop)', async () => {
    prismaMock.speakingTopic.upsert.mockImplementation(
      async ({ where }: { where: { slug: string } }) => {
        if (where.slug === 'daily-life') {
          throw new Error('boom');
        }
        return { id: `topic-${where.slug}`, slug: where.slug };
      },
    );

    await expect(service.generateDailySpeakingData()).resolves.toBeUndefined();

    // All 8 categories were still attempted despite the first one throwing.
    expect(prismaMock.speakingCategory.upsert).toHaveBeenCalledTimes(8);
  });

  it('acquires the Postgres advisory lock (via QuestionGenerationLockService) when a topic is below threshold', async () => {
    prismaMock.speakingLesson.count.mockResolvedValue(0);
    geminiServiceMock.generateJson.mockResolvedValue([]);

    await service.generateDailySpeakingData();

    expect(lockServiceMock.withLock).toHaveBeenCalled();
    const [lockKey] = lockServiceMock.withLock.mock.calls[0];
    expect(lockKey).toMatch(/^speaking-lesson:/);
    // Proves the lock callback actually ran (not just that withLock was
    // invoked) — Gemini is only reachable from inside it.
    expect(geminiServiceMock.generateJson).toHaveBeenCalled();
  });
});
