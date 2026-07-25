import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AiUsageService } from './ai-usage.service';

describe('AiUsageService', () => {
  let service: AiUsageService;

  const prismaMock = {
    aiUsageLog: {
      create: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiUsageService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AiUsageService>(AiUsageService);
  });

  describe('record', () => {
    it('never stores prompt/response content — only the fields it was given', async () => {
      prismaMock.aiUsageLog.create.mockResolvedValue({});

      await service.record({
        module: 'vocabulary_words',
        success: true,
        durationMs: 1200,
        promptTokens: 50,
        completionTokens: 200,
      });

      const data = prismaMock.aiUsageLog.create.mock.calls[0][0].data;
      expect(data).toEqual({
        module: 'vocabulary_words',
        success: true,
        timedOut: false,
        durationMs: 1200,
        promptTokens: 50,
        completionTokens: 200,
        errorType: null,
        userId: null,
      });
    });

    it('swallows a write failure instead of throwing (must never break the Gemini call it instruments)', async () => {
      prismaMock.aiUsageLog.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.record({
          module: 'writing_job',
          success: false,
          durationMs: 500,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('getSummary', () => {
    it('aggregates totals, per-module breakdown, and daily trend', async () => {
      prismaMock.aiUsageLog.aggregate.mockResolvedValue({
        _count: { _all: 10 },
        _avg: { durationMs: 850 },
      });
      prismaMock.aiUsageLog.groupBy.mockResolvedValue([
        {
          module: 'vocabulary_words',
          _count: { _all: 6 },
          _avg: { durationMs: 800 },
        },
        {
          module: 'writing_job',
          _count: { _all: 4 },
          _avg: { durationMs: 950 },
        },
      ]);
      prismaMock.$queryRaw.mockResolvedValue([
        { day: new Date('2026-07-24'), count: 10n },
      ]);
      prismaMock.aiUsageLog.count
        .mockResolvedValueOnce(8) // success
        .mockResolvedValueOnce(2) // failure
        .mockResolvedValueOnce(1); // timeout

      const summary = await service.getSummary({ fromDays: 7 });

      expect(summary.totalRequests).toBe(10);
      expect(summary.successCount).toBe(8);
      expect(summary.failureCount).toBe(2);
      expect(summary.timeoutCount).toBe(1);
      expect(summary.byModule).toHaveLength(2);
      expect(summary.dailyTrend[0].count).toBe(10);
      expect(summary.note).toMatch(/no prompt\/response content/i);
    });
  });
});
