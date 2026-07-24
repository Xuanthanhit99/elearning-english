import { Injectable } from '@nestjs/common';
import { CefrLevel, EnglishLevel, LearningSkill, PlacementMethod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ALL_LEARNING_SKILLS, FOUNDATION_LEVEL, ResolvedSkillLevel } from './skill-level.types';

/**
 * `EnglishLevel` and `CefrLevel` are two Prisma enums with identical string
 * keys (A1..C2) — `Settings.currentLevel` predates `UserSkillLevel` and uses
 * the former. Explicit map instead of a cast so a future divergence between
 * the two enums fails to compile instead of silently mismapping.
 */
const ENGLISH_TO_CEFR: Record<EnglishLevel, CefrLevel> = {
  A1: CefrLevel.A1,
  A2: CefrLevel.A2,
  B1: CefrLevel.B1,
  B2: CefrLevel.B2,
  C1: CefrLevel.C1,
  C2: CefrLevel.C2,
};

/**
 * The single source of truth for "what CEFR level should skill X start/
 * recommend content at for user Y" — every skill module (Vocabulary,
 * Grammar, Reading, Listening, Speaking, Writing) and the Learning Path
 * fallback consult this instead of each hardcoding its own default.
 *
 * Priority order (per skill, independently — never collapses six skills
 * into one global value):
 *   1. UserSkillLevel row for (userId, skill) — real assessed/manually-set
 *      per-skill level, kept up to date by PlacementResultService and
 *      manual level selection.
 *   2. Settings.currentLevel — a backward-compatible, single global
 *      fallback for users who existed before UserSkillLevel was populated
 *      per-skill by the placement flow.
 *   3. FOUNDATION_LEVEL (A1) — nothing assessed, nothing set, brand new user.
 */
@Injectable()
export class SkillLevelResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveSkillLevel(
    userId: string,
    skill: LearningSkill,
  ): Promise<ResolvedSkillLevel> {
    const skillLevel = await this.prisma.userSkillLevel.findUnique({
      where: { userId_skill: { userId, skill } },
    });

    if (skillLevel) {
      return {
        skill,
        level: skillLevel.level,
        source: skillLevel.source === PlacementMethod.MANUAL ? 'MANUAL_LEVEL' : 'PLACEMENT',
        assessedLevel: skillLevel.level,
      };
    }

    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      select: { currentLevel: true, autoDetectLevel: true },
    });

    if (settings) {
      // A user who never touched their level (still the schema default,
      // auto-detect still on) hasn't actually been assessed or made a
      // choice — that's the foundation case, not a "manual level" claim.
      const isUntouchedDefault =
        settings.currentLevel === EnglishLevel.A1 && settings.autoDetectLevel;

      return {
        skill,
        level: ENGLISH_TO_CEFR[settings.currentLevel],
        source: isUntouchedDefault ? 'DEFAULT_FOUNDATION' : 'MANUAL_LEVEL',
        assessedLevel: null,
      };
    }

    return {
      skill,
      level: FOUNDATION_LEVEL,
      source: 'DEFAULT_FOUNDATION',
      assessedLevel: null,
    };
  }

  async resolveAllSkillLevels(userId: string): Promise<ResolvedSkillLevel[]> {
    return Promise.all(
      ALL_LEARNING_SKILLS.map((skill) => this.resolveSkillLevel(userId, skill)),
    );
  }

  /**
   * Combines the resolved starting level with a skill's own persistent
   * progress-level field (Vocabulary/Reading/Listening each track one) so a
   * user who has already progressed past their placement/default level is
   * never handed content below where they actually are — "preserve higher
   * demonstrated progress", never silently downgrade or relock.
   */
  pickHigherLevel(a: CefrLevel, b: CefrLevel): CefrLevel {
    const order = [
      CefrLevel.A1,
      CefrLevel.A2,
      CefrLevel.B1,
      CefrLevel.B2,
      CefrLevel.C1,
      CefrLevel.C2,
    ];
    return order.indexOf(b) > order.indexOf(a) ? b : a;
  }
}
