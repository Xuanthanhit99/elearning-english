import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeminiService } from 'src/modules/gemini/gemini.service';
import { QuestionGenerationLockService } from '../../question-bank/question-generation-lock/question-generation-lock.service';
import { ReadingJobService } from './reading-job.service';

describe('ReadingJobService', () => {
  let service: ReadingJobService;

  const prismaMock = {
    readingCategory: { upsert: jest.fn() },
    readingArticle: { count: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
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

    prismaMock.readingCategory.upsert.mockImplementation(
      async ({ where }: { where: { slug: string } }) => ({
        id: `cat-${where.slug}`,
        slug: where.slug,
        name: where.slug,
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadingJobService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: GeminiService, useValue: geminiServiceMock },
        { provide: QuestionGenerationLockService, useValue: lockServiceMock },
      ],
    }).compile();

    service = module.get<ReadingJobService>(ReadingJobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not acquire the lock or call Gemini for a category+level already at threshold', async () => {
    prismaMock.readingArticle.count.mockResolvedValue(10);

    await service.generateDailyReadingData();

    expect(lockServiceMock.withLock).not.toHaveBeenCalled();
    expect(geminiServiceMock.generateJson).not.toHaveBeenCalled();
  });

  it('acquires the Postgres advisory lock (via QuestionGenerationLockService) when a category+level is below threshold', async () => {
    // The real job sleeps 6s after every non-skipped category/level combo —
    // stub it so a below-threshold run (6 categories x 4 levels here) takes
    // milliseconds instead of ~144s.
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

    prismaMock.readingArticle.count.mockResolvedValue(0);
    prismaMock.readingArticle.findFirst.mockResolvedValue(null);
    geminiServiceMock.generateJson.mockResolvedValue({});

    await service.generateDailyReadingData();

    expect(lockServiceMock.withLock).toHaveBeenCalled();
    const [lockKey] = lockServiceMock.withLock.mock.calls[0];
    expect(lockKey).toMatch(/^reading-article:/);
    // Proves the lock callback actually ran (not just that withLock was
    // invoked) — Gemini is only reachable from inside it.
    expect(geminiServiceMock.generateJson).toHaveBeenCalled();
  }, 15000);
});
