/**
 * Real LearningPathService.completeLesson integration, disposable PostgreSQL.
 * No HTTP/JWT and no active leaderboard season: those are separate gates.
 */
import { randomUUID } from 'crypto';
import {
  CourseStatus, MissionV2Action, MissionV2Scope, MissionV2Status,
  MissionV2Type, PlacementResultStatus, XpSourceType,
} from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { XpService } from '../src/modules/leaderboard/xp.service';
import { LearningPathService } from '../src/modules/learning-path/learning-path.service';
import { SkillLevelResolverService } from '../src/common/skill-level/skill-level-resolver.service';

function disposableDatabase() {
  if (process.env.BEACONVIE_LOCAL_XP_TEST !== 'YES_I_USE_DISPOSABLE_DATA') return false;
  try {
    const u = new URL(process.env.DATABASE_URL || '');
    return u.hostname === '127.0.0.1' && u.port === '15432' &&
      u.pathname === '/beaconvie_xp_test';
  } catch { return false; }
}

(disposableDatabase() ? describe : describe.skip)(
  'LearningPath completeLesson — concurrent PostgreSQL integration', () => {
    let prisma: PrismaService;
    let learningPath: LearningPathService;
    let userId: string;
    let lessonId: string;
    let courseId: string;
    let templateId: string;
    let missionId: string;

    beforeAll(async () => {
      prisma = new PrismaService();
      await prisma.$connect();
      if (await prisma.leaderboardSeason.count({ where: { isActive: true } })) {
        throw new Error('STOP: active leaderboard season; DB-only test requires no Redis writes');
      }
      const xp = new XpService(prisma, {} as any, { emitGroupUpdated: jest.fn() } as any);
      learningPath = new LearningPathService(
        prisma, xp, new SkillLevelResolverService(prisma),
      );
      const tag = randomUUID();
      const user = await prisma.user.create({
        data: {
          fullname: 'Local Learning Path fixture',
          email: `lp-xp-${tag}@__test-fixture__.invalid`,
          password: 'not-a-real-password-hash',
        },
      });
      userId = user.id;
      const course = await prisma.course.create({
        data: {
          teacherId: userId, title: 'Local LP XP fixture', slug: `lp-xp-${tag}`,
          level: 'A1', status: CourseStatus.APPROVED,
          sections: {
            create: {
              title: 'Fixture section', order: 1,
              lessons: { create: { title: 'Fixture lesson', content: 'Fixture only', order: 1 } },
            },
          },
        },
        include: { sections: { include: { lessons: true } } },
      });
      courseId = course.id;
      lessonId = course.sections[0].lessons[0].id;
      const placement = await prisma.placementTest.create({
        data: {
          userId, mode: 'ADAPTIVE', status: 'COMPLETED', level: 'A1',
          score: 60, total: 10, correct: 6, completedAt: new Date(),
        },
      });
      await prisma.placementResult.create({
        data: {
          userId, testId: placement.id, status: PlacementResultStatus.READY,
          overallScore: 60, overallLevel: 'A1',
          phases: { create: {
            phase: 1, title: 'Fixture', targetLevel: 'A1',
            weeksMin: 1, weeksMax: 2, description: 'Fixture', objectives: ['Fixture'],
          } },
          courses: { create: {
            courseId, title: course.title, slug: course.slug,
            lessonCount: 1, reason: 'Fixture', order: 1,
          } },
        },
      });
      const template = await prisma.missionTemplateV2.create({
        data: {
          code: `lp-xp-${tag}`, title: 'Fixture mission', description: 'Fixture',
          type: MissionV2Type.DAILY, scope: MissionV2Scope.LESSON,
          action: MissionV2Action.COMPLETE_LESSON, defaultTarget: 2,
        },
      });
      templateId = template.id;
      const mission = await prisma.userMissionV2.create({
        data: {
          userId, templateId, periodKey: `fixture-${tag}`,
          title: 'Fixture mission', description: 'Fixture',
          type: MissionV2Type.DAILY, scope: MissionV2Scope.LESSON,
          action: MissionV2Action.COMPLETE_LESSON,
          lessonId, target: 2, startsAt: new Date(),
        },
      });
      missionId = mission.id;
    });

    afterAll(async () => {
      if (prisma) {
        try {
          if (userId) {
            await prisma.userMissionV2.deleteMany({ where: { userId } });
            await prisma.petReward.deleteMany({ where: { userId } });
            await prisma.lessonProgress.deleteMany({ where: { userId } });
            await prisma.petProfile.deleteMany({ where: { userId } });
            await prisma.placementTest.deleteMany({ where: { userId } });
            if (courseId) {
              await prisma.lesson.deleteMany({ where: { section: { courseId } } });
              await prisma.section.deleteMany({ where: { courseId } });
              await prisma.course.delete({ where: { id: courseId } });
            }
            await prisma.user.delete({ where: { id: userId } });
          }
          if (templateId) await prisma.missionTemplateV2.delete({ where: { id: templateId } });
        } finally {
          await prisma.$disconnect();
        }
      }
    });

    it('awards XP, progress, mission and pet exactly once under two concurrent calls', async () => {
      const results = await Promise.allSettled([
        learningPath.completeLesson(userId, lessonId),
        learningPath.completeLesson(userId, lessonId),
      ]);
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);

      const key = `learning:LESSON_COMPLETED:${userId}:${lessonId}`;
      const ledger = await prisma.xpTransaction.findMany({ where: { idempotencyKey: key } });
      expect(ledger).toHaveLength(1);
      expect(ledger[0].sourceType).toBe(XpSourceType.LESSON);
      expect(ledger[0].finalXp).toBe(20);

      const xp = await prisma.userXpProfile.findUniqueOrThrow({ where: { userId } });
      expect(xp.totalXp).toBe(20);
      const progress = await prisma.lessonProgress.findMany({ where: { userId, lessonId } });
      expect(progress).toHaveLength(1);
      expect(progress[0].completed).toBe(true);

      const mission = await prisma.userMissionV2.findUniqueOrThrow({ where: { id: missionId } });
      expect(mission.progress).toBe(1);
      expect(mission.status).toBe(MissionV2Status.ACTIVE);

      const rewards = await prisma.petReward.findMany({ where: { userId, lessonId } });
      expect(rewards).toHaveLength(1);
      expect(rewards[0]).toMatchObject({ xp: 30, coins: 12, food: 1 });
      const pet = await prisma.petProfile.findUniqueOrThrow({ where: { userId } });
      // PetProfile.food defaults to 2; one lesson reward adds 1.
      expect(pet).toMatchObject({ xp: 30, coins: 12, food: 3, completedLessons: 1 });

      const retry = await learningPath.completeLesson(userId, lessonId);
      expect(retry.alreadyCompleted).toBe(true);
      expect(await prisma.xpTransaction.count({ where: { idempotencyKey: key } })).toBe(1);
      expect((await prisma.userMissionV2.findUniqueOrThrow({ where: { id: missionId } })).progress).toBe(1);
      expect(await prisma.petReward.count({ where: { userId, lessonId } })).toBe(1);
    }, 45000);
  },
);
