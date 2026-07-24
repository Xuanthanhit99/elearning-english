import { Test, TestingModule } from '@nestjs/testing';
import { CefrLevel, LearningSkill } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { LearningXpPublisher } from '../learning-xp/learning-xp.publisher';
import { SettingsQueryService } from '../settings/settings-query.service';
import { ContentCacheService } from '../../common/cache/content-cache.service';
import { GeminiService } from '../gemini/gemini.service';
import { SkillLevelResolverService } from '../../common/skill-level/skill-level-resolver.service';
import { SpeakingService } from './speaking.service';

describe('SpeakingService', () => {
  let service: SpeakingService;

  const prismaMock = {
    speakingCategory: { findMany: jest.fn() },
    speakingTopic: { findMany: jest.fn() },
    speakingSession: { count: jest.fn(), findMany: jest.fn() },
    speakingLesson: { count: jest.fn() },
  };
  const skillLevelResolverMock = { resolveSkillLevel: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpeakingService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: LearningXpPublisher, useValue: {} },
        { provide: SettingsQueryService, useValue: {} },
        {
          provide: ContentCacheService,
          useValue: { getJson: jest.fn(), setJson: jest.fn(), invalidate: jest.fn() },
        },
        { provide: GeminiService, useValue: { generateJson: jest.fn() } },
        { provide: SkillLevelResolverService, useValue: skillLevelResolverMock },
      ],
    }).compile();

    service = module.get<SpeakingService>(SpeakingService);

    prismaMock.speakingCategory.findMany.mockResolvedValue([]);
    prismaMock.speakingSession.count.mockResolvedValue(0);
    prismaMock.speakingSession.findMany.mockResolvedValue([]);
    prismaMock.speakingLesson.count.mockResolvedValue(0);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHome — level-aware recommendedTopics (Task 1 fix)', () => {
    const topics = [
      { id: 't-a1', title: 'Daily Life', slug: 'daily-life', minLevel: 'A1', maxLevel: 'B1', difficulty: 'BEGINNER', order: 1, imageUrl: null, estimatedMinutes: 10 },
      { id: 't-b2', title: 'Business', slug: 'business', minLevel: 'B2', maxLevel: 'C1', difficulty: 'ADVANCED', order: 2, imageUrl: null, estimatedMinutes: 10 },
    ];

    it('prioritizes topics whose [minLevel, maxLevel] brackets the resolved level', async () => {
      skillLevelResolverMock.resolveSkillLevel.mockResolvedValue({
        skill: LearningSkill.SPEAKING,
        level: CefrLevel.A1,
        source: 'DEFAULT_FOUNDATION',
        assessedLevel: null,
      });
      prismaMock.speakingTopic.findMany.mockResolvedValue(topics);

      const result = await service.getHome('user-1');

      expect(result.recommendedTopics.map((t) => t.id)).toEqual(['t-a1']);
    });

    it('falls back to the unfiltered set when nothing matches the resolved level (never empty)', async () => {
      skillLevelResolverMock.resolveSkillLevel.mockResolvedValue({
        skill: LearningSkill.SPEAKING,
        level: CefrLevel.C2,
        source: 'PLACEMENT',
        assessedLevel: CefrLevel.C2,
      });
      prismaMock.speakingTopic.findMany.mockResolvedValue(topics);

      const result = await service.getHome('user-1');

      expect(result.recommendedTopics.length).toBeGreaterThan(0);
    });
  });
});
