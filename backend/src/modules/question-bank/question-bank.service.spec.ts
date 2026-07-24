import { Test, TestingModule } from '@nestjs/testing';
import { LearningSkill, CefrLevel, PlacementQuestionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PlacementAiService } from '../placement/placement-ai/placement-ai.service';
import { QuestionGenerationLockService } from './question-generation-lock/question-generation-lock.service';
import { PlacementTtsService } from '../placement/placement-tts.service';
import { ContentCacheService } from '../../common/cache/content-cache.service';
import { CacheMetricsService } from '../../common/cache/cache-metrics.service';
import { QuestionBankService } from './question-bank.service';

describe('QuestionBankService', () => {
  let service: QuestionBankService;

  const prismaMock = {
    placementQuestion: { findMany: jest.fn(), create: jest.fn() },
  };
  const placementAiServiceMock = { generateQuestions: jest.fn() };
  const lockServiceMock = {
    withLock: jest.fn((_key: string, cb: () => unknown) => cb()),
  };
  const placementTtsServiceMock = { createAudioFromScript: jest.fn() };
  const contentCacheMock = { getJson: jest.fn(), setJson: jest.fn() };
  const cacheMetricsMock = { record: jest.fn(), recordDuration: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    // `resetAllMocks()` wipes any implementation set at declaration time
    // (including the one on the `const lockServiceMock = {...}` above) —
    // re-establish the auto-invoking behavior every test actually needs.
    lockServiceMock.withLock.mockImplementation((_key: string, cb: () => unknown) => cb());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionBankService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PlacementAiService, useValue: placementAiServiceMock },
        { provide: QuestionGenerationLockService, useValue: lockServiceMock },
        { provide: PlacementTtsService, useValue: placementTtsServiceMock },
        { provide: ContentCacheService, useValue: contentCacheMock },
        { provide: CacheMetricsService, useValue: cacheMetricsMock },
      ],
    }).compile();

    service = module.get<QuestionBankService>(QuestionBankService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const input = {
    skill: LearningSkill.GRAMMAR,
    level: CefrLevel.A1,
    type: PlacementQuestionType.MULTIPLE_CHOICE,
    requiredCount: 5,
  };

  it('skips the Postgres advisory lock entirely on a warm cache hit', async () => {
    contentCacheMock.getJson.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({ id: `q-${i}`, question: `Q${i}` })),
    );

    const result = await service.ensurePlacementQuestions(input);

    expect(result).toHaveLength(5);
    expect(lockServiceMock.withLock).not.toHaveBeenCalled();
    expect(placementAiServiceMock.generateQuestions).not.toHaveBeenCalled();
  });

  it('acquires the lock and only calls Gemini for the missing deficit on a cache miss with insufficient DB rows', async () => {
    contentCacheMock.getJson.mockResolvedValue(null);

    // ensurePlacementQuestions queries `findAvailableQuestions` exactly
    // twice inside the lock: once before generation (the deficit check)
    // and once after (to return the freshly-persisted rows). Keyed off
    // call count instead of a fragile `mockResolvedValueOnce` chain so the
    // intent is unambiguous.
    prismaMock.placementQuestion.findMany.mockImplementation(async () => {
      const callNumber = prismaMock.placementQuestion.findMany.mock.calls.length;
      if (callNumber === 1) {
        return [{ id: 'q-1', question: 'Q1', usageCount: 0 }]; // only 1 of 5 required
      }
      return [
        { id: 'q-1', question: 'Q1', usageCount: 0 },
        { id: 'q-2', question: 'Q2', usageCount: 0 },
        { id: 'q-3', question: 'Q3', usageCount: 0 },
        { id: 'q-4', question: 'Q4', usageCount: 0 },
        { id: 'q-5', question: 'Q5', usageCount: 0 },
      ]; // after generation, deficit filled
    });
    placementAiServiceMock.generateQuestions.mockResolvedValue([
      { skill: input.skill, level: input.level, type: input.type, question: 'Q2', correctAnswer: 'A', explanation: 'x', options: [] },
    ]);

    const result = await service.ensurePlacementQuestions(input);

    expect(lockServiceMock.withLock).toHaveBeenCalled();
    expect(placementAiServiceMock.generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ count: 4 }),
    );
    expect(result).toHaveLength(5);
    expect(contentCacheMock.setJson).toHaveBeenCalled();
  });
});
