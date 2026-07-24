import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { ContentCacheService } from '../../common/cache/content-cache.service';
import { CacheMetricsService } from '../../common/cache/cache-metrics.service';
import { CacheKeys } from '../../common/cache/cache-keys';
import { VocabularyJobService } from './vocabulary-job.service';

describe('VocabularyJobService', () => {
  let service: VocabularyJobService;

  const prismaMock = {
    wordTopic: { findUnique: jest.fn() },
    word: { findMany: jest.fn(), createMany: jest.fn() },
  };
  const geminiServiceMock = { generateJson: jest.fn() };
  const contentCacheMock = { invalidate: jest.fn() };
  const cacheMetricsMock = { record: jest.fn(), recordDuration: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VocabularyJobService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: GeminiService, useValue: geminiServiceMock },
        { provide: ContentCacheService, useValue: contentCacheMock },
        { provide: CacheMetricsService, useValue: cacheMetricsMock },
      ],
    }).compile();

    service = module.get<VocabularyJobService>(VocabularyJobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ensureWordsForTopic (private) — cache invalidation on write', () => {
    it('invalidates the shared vocab word-pool cache after creating new words', async () => {
      prismaMock.wordTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        name: 'Food',
      });
      prismaMock.word.findMany.mockResolvedValue([]);
      geminiServiceMock.generateJson.mockResolvedValue([
        { word: 'apple', meaningVi: 'quả táo', difficulty: 1 },
      ]);
      prismaMock.word.createMany.mockResolvedValue({ count: 1 });

      await (service as any).ensureWordsForTopic('A1', 'topic-1', 10);

      expect(prismaMock.word.createMany).toHaveBeenCalled();
      expect(contentCacheMock.invalidate).toHaveBeenCalledWith(
        CacheKeys.vocabWordPool('topic-1', 'A1'),
      );
    });

    it('does not call Gemini when enough words already exist (DB-first)', async () => {
      prismaMock.wordTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        name: 'Food',
      });
      prismaMock.word.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({ word: `word-${i}` })),
      );

      await (service as any).ensureWordsForTopic('A1', 'topic-1', 10);

      expect(geminiServiceMock.generateJson).not.toHaveBeenCalled();
      expect(prismaMock.word.createMany).not.toHaveBeenCalled();
    });
  });
});
