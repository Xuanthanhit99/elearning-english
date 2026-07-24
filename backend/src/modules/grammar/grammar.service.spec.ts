import { Test, TestingModule } from '@nestjs/testing';
import { GrammarService } from './grammar.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MissionV2ProgressService } from '../missions-v2/services/mission-v2-progress.service';
import { LearningXpPublisher } from '../learning-xp/learning-xp.publisher';
import { ContentCacheService } from '../../common/cache/content-cache.service';
import { SkillLevelResolverService } from '../../common/skill-level/skill-level-resolver.service';

describe('GrammarService', () => {
  let service: GrammarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrammarService,
        { provide: PrismaService, useValue: {} },
        { provide: MissionV2ProgressService, useValue: {} },
        { provide: LearningXpPublisher, useValue: {} },
        {
          provide: ContentCacheService,
          useValue: { getJson: jest.fn(), setJson: jest.fn(), invalidate: jest.fn() },
        },
        {
          provide: SkillLevelResolverService,
          useValue: { resolveSkillLevel: jest.fn(), resolveAllSkillLevels: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<GrammarService>(GrammarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
