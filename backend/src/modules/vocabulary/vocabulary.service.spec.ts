import { Test, TestingModule } from '@nestjs/testing';
import { VocabularyService } from './vocabulary.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { VocabularyJobService } from '../vocabulary-job/vocabulary-job.service';
import { MissionV2ProgressService } from '../missions-v2/services/mission-v2-progress.service';
import { LearningXpPublisher } from '../learning-xp/learning-xp.publisher';
import { QuestionGenerationLockService } from '../question-bank/question-generation-lock/question-generation-lock.service';
import { ContentCacheService } from '../../common/cache/content-cache.service';
import { CacheMetricsService } from '../../common/cache/cache-metrics.service';
import { SkillLevelResolverService } from '../../common/skill-level/skill-level-resolver.service';

describe('VocabularyService', () => {
  let service: VocabularyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VocabularyService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: GeminiService,
          useValue: {},
        },
        {
          provide: VocabularyJobService,
          useValue: {},
        },
        {
          provide: MissionV2ProgressService,
          useValue: {},
        },
        {
          provide: LearningXpPublisher,
          useValue: {},
        },
        {
          provide: QuestionGenerationLockService,
          useValue: { withLock: jest.fn((_key: string, cb: () => unknown) => cb()) },
        },
        {
          provide: ContentCacheService,
          useValue: { getJson: jest.fn(), setJson: jest.fn(), invalidate: jest.fn() },
        },
        {
          provide: CacheMetricsService,
          useValue: { record: jest.fn(), recordDuration: jest.fn() },
        },
        {
          provide: SkillLevelResolverService,
          useValue: { resolveSkillLevel: jest.fn(), resolveAllSkillLevels: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<VocabularyService>(VocabularyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
