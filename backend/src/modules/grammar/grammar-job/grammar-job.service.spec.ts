import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeminiService } from 'src/modules/gemini/gemini.service';
import { QuestionGenerationLockService } from '../../question-bank/question-generation-lock/question-generation-lock.service';
import { GrammarJobService } from './grammar-job.service';

describe('GrammarJobService', () => {
  let service: GrammarJobService;

  const prismaMock = {
    grammarCategory: { upsert: jest.fn() },
    grammarTopic: { count: jest.fn(), upsert: jest.fn() },
    grammarLesson: { count: jest.fn(), upsert: jest.fn() },
    grammarQuestion: { create: jest.fn() },
  };
  const geminiServiceMock = { generateJson: jest.fn() };
  const lockServiceMock = {
    withLock: jest.fn((_key: string, cb: () => unknown) => cb()),
  };

  async function buildModule() {
    return Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        GrammarJobService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: GeminiService, useValue: geminiServiceMock },
        { provide: QuestionGenerationLockService, useValue: lockServiceMock },
      ],
    }).compile();
  }

  beforeEach(() => {
    jest.resetAllMocks();
    // `resetAllMocks()` wipes any implementation set at declaration time —
    // re-establish the lock's auto-invoking behavior every test needs.
    lockServiceMock.withLock.mockImplementation((_key: string, cb: () => unknown) => cb());
    prismaMock.grammarCategory.upsert.mockImplementation(
      async ({ where }: { where: { slug: string } }) => ({
        id: `cat-${where.slug}`,
        slug: where.slug,
        title: where.slug,
      }),
    );
    prismaMock.grammarTopic.count.mockResolvedValue(10); // already at threshold — no generation needed
  });

  it('should be defined', async () => {
    const module: TestingModule = await buildModule();
    service = module.get<GrammarJobService>(GrammarJobService);
    expect(service).toBeDefined();
  });

  /** The real job sleeps 5s between every category/level combo — stub it so tests run in milliseconds, not ~100s. */
  function stubSleep(instance: GrammarJobService) {
    jest.spyOn(instance as any, 'sleep').mockResolvedValue(undefined);
  }

  describe('cron registration (Task 2 — proves the fix, not just DI)', () => {
    it('registers a live, running cron job for the Grammar generation method (the decorator is no longer commented out)', async () => {
      const module: TestingModule = await buildModule();
      module.get<GrammarJobService>(GrammarJobService);
      await module.init();

      const registry = module.get(SchedulerRegistry);
      const jobs = [...registry.getCronJobs().values()];

      expect(jobs.length).toBeGreaterThan(0);
      // `cron`'s CronJob exposes `.running` once started; Nest starts all
      // registered cron jobs on module init unless explicitly disabled.
      expect(jobs.some((job) => (job as any).running !== false)).toBe(true);

      await module.close();
    });
  });

  describe('generateDailyGrammarData — readiness execution + lock behaviour', () => {
    it('runs safely end-to-end when content already meets the threshold (no Gemini call needed)', async () => {
      const module: TestingModule = await buildModule();
      service = module.get<GrammarJobService>(GrammarJobService);
      stubSleep(service);

      await expect(service.generateDailyGrammarData()).resolves.toBeUndefined();

      expect(geminiServiceMock.generateJson).not.toHaveBeenCalled();
      await module.close();
    });

    it('blocks overlapping execution via the isRunning guard — a concurrent call is a no-op, not a duplicate run', async () => {
      const module: TestingModule = await buildModule();
      service = module.get<GrammarJobService>(GrammarJobService);
      stubSleep(service);

      // Setting `isRunning = true` happens synchronously before the first
      // `await` inside generateDailyGrammarData, so calling it twice back
      // to back (no `await` in between here) deterministically exercises
      // the guard rather than racing on timing.
      const first = service.generateDailyGrammarData();
      const second = service.generateDailyGrammarData();

      await Promise.all([first, second]);

      // seedCategories() upserts exactly 5 hardcoded categories — if the
      // guard failed, this would be 10 (both runs executing seedCategories).
      expect(prismaMock.grammarCategory.upsert).toHaveBeenCalledTimes(5);

      await module.close();
    });

    it('acquires the Postgres advisory lock (via QuestionGenerationLockService) when content is below threshold', async () => {
      const module: TestingModule = await buildModule();
      service = module.get<GrammarJobService>(GrammarJobService);
      stubSleep(service);

      prismaMock.grammarTopic.count.mockResolvedValue(0); // below threshold — must lock + generate
      geminiServiceMock.generateJson.mockResolvedValue([]);

      await service.generateDailyGrammarData();

      expect(lockServiceMock.withLock).toHaveBeenCalled();
      const [lockKey] = lockServiceMock.withLock.mock.calls[0];
      expect(lockKey).toMatch(/^grammar-topic:/);
      // Proves the lock callback actually ran (not just that withLock was
      // invoked) — Gemini is only reachable from inside it.
      expect(geminiServiceMock.generateJson).toHaveBeenCalled();

      await module.close();
    }, 15000);
  });
});
