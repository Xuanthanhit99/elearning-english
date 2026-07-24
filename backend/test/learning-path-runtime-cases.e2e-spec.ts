/**
 * Runtime validation for the Learning Job & Learning Path remediation
 * (Cases A-D from the task). Runs against the REAL local Postgres instance
 * configured in `.env` (no mocked PrismaService) — this is deliberately an
 * e2e-tier spec (`npm run test:e2e`), not part of the default `npm test`
 * unit-test run, since it requires a live DB connection.
 *
 * Only PlacementResultAiService/GeminiService-adjacent paths are avoided
 * entirely (Cases A/B/D never touch them; Case C exercises the exact
 * UserSkillLevel-upsert reconciliation invariant directly via Prisma rather
 * than driving a full paid Gemini placement-result generation).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { CefrLevel, LearningSkill, PlacementMethod } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { SkillLevelResolverService } from '../src/common/skill-level/skill-level-resolver.service';
import { LearningPathService } from '../src/modules/learning-path/learning-path.service';
import { XpService } from '../src/modules/leaderboard/xp.service';
import { QuestionGenerationLockService } from '../src/modules/question-bank/question-generation-lock/question-generation-lock.service';

describe('Learning Path & Placement runtime validation (Cases A-D)', () => {
  let prisma: PrismaService;
  let resolver: SkillLevelResolverService;
  let learningPathService: LearningPathService;
  let lockService: QuestionGenerationLockService;

  const fixtureUserIds: string[] = [];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        SkillLevelResolverService,
        LearningPathService,
        QuestionGenerationLockService,
        { provide: XpService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    prisma = module.get(PrismaService);
    resolver = module.get(SkillLevelResolverService);
    learningPathService = module.get(LearningPathService);
    lockService = module.get(QuestionGenerationLockService);
  });

  afterAll(async () => {
    if (fixtureUserIds.length) {
      // User.onDelete: Cascade covers UserSkillLevel/UserSettings/progress
      // rows created against these fixture users.
      await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
    }
    await prisma.$disconnect();
  });

  async function createFixtureUser(tag: string) {
    const user = await prisma.user.create({
      data: {
        fullname: `Runtime Fixture ${tag}`,
        email: `runtime-${tag}-${randomUUID()}@__test-fixture__.invalid`,
        password: 'not-a-real-hash-runtime-fixture',
      },
    });
    fixtureUserIds.push(user.id);
    return user;
  }

  describe('CASE A — No Placement', () => {
    it('resolves all 6 skills to A1 foundation independently and Learning Path is never empty', async () => {
      const user = await createFixtureUser('case-a');

      const resolved = await resolver.resolveAllSkillLevels(user.id);
      expect(resolved).toHaveLength(6);
      expect(resolved.every((r) => r.level === CefrLevel.A1)).toBe(true);
      expect(resolved.every((r) => r.source === 'DEFAULT_FOUNDATION')).toBe(true);
      expect(new Set(resolved.map((r) => r.skill)).size).toBe(6);

      const path = await learningPathService.getLearningPath(user.id);

      expect(path.source).toBe('DEFAULT_FOUNDATION');
      expect(path.skills).toHaveLength(6);
      expect(path).not.toBeNull();

      // Real DB content check (informational — depends on what's actually
      // seeded in this environment right now, not asserted as a hard
      // failure so this test doesn't become a proxy for "did the Grammar
      // cron already run"). Any skill that DOES have real A1 content must
      // return a well-formed startingLesson pointer, not a malformed one.
      const withContent = path.skills.filter((s) => s.startingLesson);
      for (const skill of withContent) {
        expect(skill.startingLesson).toEqual(
          expect.objectContaining({
            skill: skill.skill,
            title: expect.any(String),
            href: expect.any(String),
          }),
        );
      }
      // eslint-disable-next-line no-console
      console.log(
        `[Case A] skills with real starting content in this DB: ${
          withContent.map((s) => s.skill).join(', ') || '(none yet)'
        }`,
      );
    }, 30000);
  });

  describe('CASE B — Mixed skill levels', () => {
    it('persists distinct UserSkillLevel rows per skill and Learning Path reflects each independently', async () => {
      const user = await createFixtureUser('case-b');

      const levels: Array<{ skill: LearningSkill; level: CefrLevel }> = [
        { skill: LearningSkill.VOCABULARY, level: CefrLevel.B1 },
        { skill: LearningSkill.GRAMMAR, level: CefrLevel.A1 },
        { skill: LearningSkill.READING, level: CefrLevel.A2 },
        { skill: LearningSkill.LISTENING, level: CefrLevel.B1 },
        { skill: LearningSkill.SPEAKING, level: CefrLevel.A1 },
        { skill: LearningSkill.WRITING, level: CefrLevel.A2 },
      ];

      for (const { skill, level } of levels) {
        await prisma.userSkillLevel.create({
          data: { userId: user.id, skill, level, score: 70, source: PlacementMethod.TEST },
        });
      }

      // Verify the DB rows directly first.
      const dbRows = await prisma.userSkillLevel.findMany({ where: { userId: user.id } });
      expect(dbRows).toHaveLength(6);

      // Then verify Learning Path (the actual consumer) reflects the same values.
      const path = await learningPathService.getLearningPath(user.id);
      const bySkill = Object.fromEntries(path.skills.map((s) => [s.skill, s.level]));

      expect(bySkill).toEqual(
        Object.fromEntries(levels.map(({ skill, level }) => [skill, level])),
      );

      // And the resolver (used by Dashboard/skill pages) agrees independently.
      for (const { skill, level } of levels) {
        const resolved = await resolver.resolveSkillLevel(user.id, skill);
        expect(resolved.level).toBe(level);
        expect(resolved.source).toBe('PLACEMENT');
      }
    }, 30000);
  });

  describe('CASE C — Placement retake preserves progress and history', () => {
    it('upserts UserSkillLevel to the new level without deleting completed-lesson progress or duplicating rows', async () => {
      const user = await createFixtureUser('case-c');

      await prisma.userSkillLevel.create({
        data: {
          userId: user.id,
          skill: LearningSkill.GRAMMAR,
          level: CefrLevel.A1,
          score: 40,
          source: PlacementMethod.TEST,
        },
      });

      // Simulate "completed a lesson before retaking Placement" against
      // real Grammar content if this DB has any.
      const anyLesson = await prisma.grammarLesson.findFirst();
      if (anyLesson) {
        await prisma.grammarLessonProgress.create({
          data: {
            userId: user.id,
            lessonId: anyLesson.id,
            completed: true,
            score: 90,
            completedAt: new Date(),
          },
        });
      }

      // Simulate a retake result: PlacementResultService.generate() upserts
      // (never delete+recreate) UserSkillLevel per skill — replicate that
      // exact operation directly against the real DB.
      await prisma.userSkillLevel.upsert({
        where: { userId_skill: { userId: user.id, skill: LearningSkill.GRAMMAR } },
        create: {
          userId: user.id,
          skill: LearningSkill.GRAMMAR,
          level: CefrLevel.B1,
          score: 80,
          source: PlacementMethod.TEST,
        },
        update: { level: CefrLevel.B1, score: 80, source: PlacementMethod.TEST },
      });

      const updated = await prisma.userSkillLevel.findUnique({
        where: { userId_skill: { userId: user.id, skill: LearningSkill.GRAMMAR } },
      });
      expect(updated?.level).toBe(CefrLevel.B1);

      // No duplicate row was created for the same (user, skill).
      const allRows = await prisma.userSkillLevel.findMany({
        where: { userId: user.id, skill: LearningSkill.GRAMMAR },
      });
      expect(allRows).toHaveLength(1);

      // Completed-lesson progress from before the retake must still exist,
      // untouched and not relocked/reset.
      if (anyLesson) {
        const progress = await prisma.grammarLessonProgress.findUnique({
          where: { userId_lessonId: { userId: user.id, lessonId: anyLesson.id } },
        });
        expect(progress?.completed).toBe(true);
        expect(progress?.score).toBe(90);
      }

      // Learning Path now reflects the NEW (retake) level, not the old one.
      const resolvedAfterRetake = await resolver.resolveSkillLevel(
        user.id,
        LearningSkill.GRAMMAR,
      );
      expect(resolvedAfterRetake.level).toBe(CefrLevel.B1);
    }, 30000);
  });

  describe('CASE D — Concurrent generation dedup', () => {
    it('the real Postgres advisory lock lets exactly one concurrent caller perform the generation for the same missing-content condition', async () => {
      const lockKey = `runtime-case-d-${randomUUID()}`;
      let contentGenerated = false;
      let generationCount = 0;

      const simulateJobRun = () =>
        lockService.withLock(lockKey, async () => {
          // Mirrors the real check-after-acquiring-lock pattern used by
          // Grammar/Reading/Speaking/Writing jobs: only generate if the
          // condition is still missing once this caller actually holds
          // the lock (a prior concurrent caller may have just filled it).
          if (contentGenerated) return;
          await new Promise((resolve) => setTimeout(resolve, 150));
          generationCount += 1;
          contentGenerated = true;
        });

      await Promise.all([simulateJobRun(), simulateJobRun(), simulateJobRun()]);

      expect(generationCount).toBe(1);
    }, 30000);

    it('a lock held by one key does not block a concurrent caller using a different key', async () => {
      const keyA = `runtime-case-d-a-${randomUUID()}`;
      const keyB = `runtime-case-d-b-${randomUUID()}`;
      const order: string[] = [];

      await Promise.all([
        lockService.withLock(keyA, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          order.push('A');
        }),
        lockService.withLock(keyB, async () => {
          order.push('B');
        }),
      ]);

      // B (no artificial delay, different key) should not have been forced
      // to wait behind A's lock.
      expect(order[0]).toBe('B');
    }, 30000);
  });
});
