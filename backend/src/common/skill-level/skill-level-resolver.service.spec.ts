import { Test, TestingModule } from '@nestjs/testing';
import { CefrLevel, EnglishLevel, LearningSkill, PlacementMethod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SkillLevelResolverService } from './skill-level-resolver.service';

describe('SkillLevelResolverService', () => {
  let service: SkillLevelResolverService;

  const prismaMock = {
    userSkillLevel: { findUnique: jest.fn() },
    userSettings: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillLevelResolverService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<SkillLevelResolverService>(SkillLevelResolverService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveSkillLevel priority order', () => {
    it('uses UserSkillLevel (source=TEST -> PLACEMENT) when a row exists, regardless of Settings', async () => {
      prismaMock.userSkillLevel.findUnique.mockResolvedValue({
        level: CefrLevel.B1,
        source: PlacementMethod.TEST,
      });

      const result = await service.resolveSkillLevel('user-1', LearningSkill.READING);

      expect(result).toEqual({
        skill: LearningSkill.READING,
        level: CefrLevel.B1,
        source: 'PLACEMENT',
        assessedLevel: CefrLevel.B1,
      });
      expect(prismaMock.userSettings.findUnique).not.toHaveBeenCalled();
    });

    it('tags a manually-selected UserSkillLevel as MANUAL_LEVEL', async () => {
      prismaMock.userSkillLevel.findUnique.mockResolvedValue({
        level: CefrLevel.A2,
        source: PlacementMethod.MANUAL,
      });

      const result = await service.resolveSkillLevel('user-1', LearningSkill.GRAMMAR);

      expect(result.source).toBe('MANUAL_LEVEL');
      expect(result.level).toBe(CefrLevel.A2);
    });

    it('falls back to Settings.currentLevel when no UserSkillLevel exists and settings were touched', async () => {
      prismaMock.userSkillLevel.findUnique.mockResolvedValue(null);
      prismaMock.userSettings.findUnique.mockResolvedValue({
        currentLevel: EnglishLevel.B2,
        autoDetectLevel: false,
      });

      const result = await service.resolveSkillLevel('user-1', LearningSkill.WRITING);

      expect(result).toEqual({
        skill: LearningSkill.WRITING,
        level: CefrLevel.B2,
        source: 'MANUAL_LEVEL',
        assessedLevel: null,
      });
    });

    it('treats an untouched default Settings row (A1, autoDetect on) as DEFAULT_FOUNDATION, not MANUAL_LEVEL', async () => {
      prismaMock.userSkillLevel.findUnique.mockResolvedValue(null);
      prismaMock.userSettings.findUnique.mockResolvedValue({
        currentLevel: EnglishLevel.A1,
        autoDetectLevel: true,
      });

      const result = await service.resolveSkillLevel('user-1', LearningSkill.LISTENING);

      expect(result.source).toBe('DEFAULT_FOUNDATION');
      expect(result.level).toBe(CefrLevel.A1);
    });

    it('falls back to A1 foundation when neither UserSkillLevel nor Settings exist', async () => {
      prismaMock.userSkillLevel.findUnique.mockResolvedValue(null);
      prismaMock.userSettings.findUnique.mockResolvedValue(null);

      const result = await service.resolveSkillLevel('user-1', LearningSkill.SPEAKING);

      expect(result).toEqual({
        skill: LearningSkill.SPEAKING,
        level: CefrLevel.A1,
        source: 'DEFAULT_FOUNDATION',
        assessedLevel: null,
      });
    });
  });

  describe('resolveAllSkillLevels', () => {
    it('resolves each of the 6 skills independently (mixed placement levels, never collapsed to one global level)', async () => {
      const perSkillLevel: Partial<Record<LearningSkill, CefrLevel>> = {
        [LearningSkill.VOCABULARY]: CefrLevel.B1,
        [LearningSkill.GRAMMAR]: CefrLevel.A1,
        [LearningSkill.READING]: CefrLevel.A2,
        [LearningSkill.LISTENING]: CefrLevel.B1,
        [LearningSkill.SPEAKING]: CefrLevel.A1,
        [LearningSkill.WRITING]: CefrLevel.A2,
      };

      prismaMock.userSkillLevel.findUnique.mockImplementation(
        async ({ where }: { where: { userId_skill: { skill: LearningSkill } } }) => ({
          level: perSkillLevel[where.userId_skill.skill],
          source: PlacementMethod.TEST,
        }),
      );

      const results = await service.resolveAllSkillLevels('user-1');
      const bySkill = Object.fromEntries(results.map((r) => [r.skill, r.level]));

      expect(bySkill).toEqual({
        VOCABULARY: CefrLevel.B1,
        GRAMMAR: CefrLevel.A1,
        READING: CefrLevel.A2,
        LISTENING: CefrLevel.B1,
        SPEAKING: CefrLevel.A1,
        WRITING: CefrLevel.A2,
      });
    });
  });

  describe('pickHigherLevel', () => {
    it('returns the higher of two levels regardless of argument order', () => {
      expect(service.pickHigherLevel(CefrLevel.A1, CefrLevel.B1)).toBe(CefrLevel.B1);
      expect(service.pickHigherLevel(CefrLevel.B1, CefrLevel.A1)).toBe(CefrLevel.B1);
      expect(service.pickHigherLevel(CefrLevel.B2, CefrLevel.B2)).toBe(CefrLevel.B2);
    });
  });
});
