import { Test, TestingModule } from '@nestjs/testing';
import { CefrLevel, LearningSkill, PlacementResultStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { XpService } from '../leaderboard/xp.service';
import { SkillLevelResolverService } from '../../common/skill-level/skill-level-resolver.service';
import { LearningPathService } from './learning-path.service';

describe('LearningPathService', () => {
  let service: LearningPathService;

  const prismaMock = {
    placementResult: { findFirst: jest.fn() },
    grammarTopic: { findFirst: jest.fn() },
    readingArticle: { findFirst: jest.fn() },
    speakingTopic: { findMany: jest.fn() },
    writingLesson: { findFirst: jest.fn() },
    wordTopic: { findFirst: jest.fn() },
    listeningQuestion: { count: jest.fn() },
    course: { findMany: jest.fn() },
  };

  const skillLevelResolverMock = {
    resolveAllSkillLevels: jest.fn(),
    resolveSkillLevel: jest.fn(),
    pickHigherLevel: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningPathService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: XpService, useValue: {} },
        { provide: SkillLevelResolverService, useValue: skillLevelResolverMock },
      ],
    }).compile();

    service = module.get<LearningPathService>(LearningPathService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLearningPath — no completed Placement (Task 2 fallback)', () => {
    it('never returns an empty path — resolves every skill independently and returns DEFAULT_FOUNDATION', async () => {
      prismaMock.placementResult.findFirst.mockResolvedValue(null);

      skillLevelResolverMock.resolveAllSkillLevels.mockResolvedValue([
        { skill: LearningSkill.VOCABULARY, level: CefrLevel.B1, source: 'PLACEMENT', assessedLevel: CefrLevel.B1 },
        { skill: LearningSkill.GRAMMAR, level: CefrLevel.A1, source: 'DEFAULT_FOUNDATION', assessedLevel: null },
        { skill: LearningSkill.READING, level: CefrLevel.A2, source: 'PLACEMENT', assessedLevel: CefrLevel.A2 },
        { skill: LearningSkill.LISTENING, level: CefrLevel.B1, source: 'PLACEMENT', assessedLevel: CefrLevel.B1 },
        { skill: LearningSkill.SPEAKING, level: CefrLevel.A1, source: 'DEFAULT_FOUNDATION', assessedLevel: null },
        { skill: LearningSkill.WRITING, level: CefrLevel.A2, source: 'PLACEMENT', assessedLevel: CefrLevel.A2 },
      ]);

      prismaMock.grammarTopic.findFirst.mockResolvedValue({
        title: 'Present Simple',
        lessons: [{ title: 'Lesson 1', slug: 'lesson-1' }],
      });
      prismaMock.readingArticle.findFirst.mockResolvedValue({
        title: 'My Family',
        slug: 'my-family',
      });
      prismaMock.speakingTopic.findMany.mockResolvedValue([
        {
          slug: 'daily-life',
          title: 'Daily Life',
          minLevel: 'A1',
          maxLevel: 'B1',
          order: 1,
          lessons: [{ title: 'Greetings' }],
        },
      ]);
      prismaMock.writingLesson.findFirst.mockResolvedValue({
        title: 'Write about yourself',
        topic: { slug: 'about-me', title: 'About Me' },
      });
      prismaMock.wordTopic.findFirst.mockResolvedValue({
        id: 'topic-1',
        name: 'Food',
      });
      prismaMock.listeningQuestion.count.mockResolvedValue(3);

      const result = await service.getLearningPath('user-1');

      expect(result.source).toBe('DEFAULT_FOUNDATION');
      expect(result.courses).toEqual([]);
      expect(result.skills).toHaveLength(6);

      // Every skill resolves independently — not collapsed to one global level.
      const bySkill = Object.fromEntries(result.skills.map((s) => [s.skill, s.level]));
      expect(bySkill).toEqual({
        VOCABULARY: CefrLevel.B1,
        GRAMMAR: CefrLevel.A1,
        READING: CefrLevel.A2,
        LISTENING: CefrLevel.B1,
        SPEAKING: CefrLevel.A1,
        WRITING: CefrLevel.A2,
      });

      const grammarSkill = result.skills.find((s) => s.skill === LearningSkill.GRAMMAR);
      expect(grammarSkill?.startingLesson).toEqual({
        skill: LearningSkill.GRAMMAR,
        title: 'Lesson 1',
        href: '/grammar/lesson/lesson-1',
        topicTitle: 'Present Simple',
      });

      const listeningSkill = result.skills.find((s) => s.skill === LearningSkill.LISTENING);
      expect(listeningSkill?.startingLesson).not.toBeNull();
    });

    it('returns a null startingLesson (not a crash) for a skill with genuinely no content at its resolved level', async () => {
      prismaMock.placementResult.findFirst.mockResolvedValue(null);
      skillLevelResolverMock.resolveAllSkillLevels.mockResolvedValue([
        { skill: LearningSkill.VOCABULARY, level: CefrLevel.A1, source: 'DEFAULT_FOUNDATION', assessedLevel: null },
        { skill: LearningSkill.GRAMMAR, level: CefrLevel.A1, source: 'DEFAULT_FOUNDATION', assessedLevel: null },
        { skill: LearningSkill.READING, level: CefrLevel.A1, source: 'DEFAULT_FOUNDATION', assessedLevel: null },
        { skill: LearningSkill.LISTENING, level: CefrLevel.A1, source: 'DEFAULT_FOUNDATION', assessedLevel: null },
        { skill: LearningSkill.SPEAKING, level: CefrLevel.A1, source: 'DEFAULT_FOUNDATION', assessedLevel: null },
        { skill: LearningSkill.WRITING, level: CefrLevel.A1, source: 'DEFAULT_FOUNDATION', assessedLevel: null },
      ]);

      prismaMock.grammarTopic.findFirst.mockResolvedValue(null);
      prismaMock.readingArticle.findFirst.mockResolvedValue(null);
      prismaMock.speakingTopic.findMany.mockResolvedValue([]);
      prismaMock.writingLesson.findFirst.mockResolvedValue(null);
      prismaMock.wordTopic.findFirst.mockResolvedValue(null);
      prismaMock.listeningQuestion.count.mockResolvedValue(0);

      const result = await service.getLearningPath('user-1');

      expect(result.source).toBe('DEFAULT_FOUNDATION');
      expect(result.skills.every((s) => s.startingLesson === null)).toBe(true);
      expect(result.nextLesson).toBeNull();
    });
  });

  describe('getLearningPath — completed Placement exists', () => {
    it('returns the PLACEMENT-sourced path unchanged (no regression from the fallback addition)', async () => {
      prismaMock.placementResult.findFirst.mockResolvedValue({
        id: 'result-1',
        testId: 'test-1',
        overallLevel: CefrLevel.B1,
        overallScore: 72,
        generatedAt: new Date('2026-01-01'),
        status: PlacementResultStatus.READY,
        phases: [],
        priorities: [],
        courses: [],
        skills: [
          { skill: LearningSkill.VOCABULARY, score: 72, level: CefrLevel.B1, status: 'COMPLETED' },
        ],
      });

      const result = await service.getLearningPath('user-1');

      expect(result.source).toBe('PLACEMENT');
      expect(result.overallLevel).toBe(CefrLevel.B1);
      expect(result.courses).toEqual([]);
      expect(skillLevelResolverMock.resolveAllSkillLevels).not.toHaveBeenCalled();
    });
  });
});
