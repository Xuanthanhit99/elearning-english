/** Real LearningPathService + PostgreSQL + Redis QA. NOT Recovery B cutover E2E. Run alone. */
/**
 * Real LearningPathService.completeLesson integration, disposable PostgreSQL.
 * No HTTP/JWT. Creates one isolated active QA season; no global outbox claim.
 */
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { weeklyRedisKey } from '../src/modules/leaderboard/leaderboard.constants';
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
    const rd = new URL(process.env.REDIS_URL || '');
    return u.hostname === '127.0.0.1' && u.port === '15432' &&
      u.pathname === '/beaconvie_xp_test' && rd.hostname === '127.0.0.1' &&
      rd.port === '16379' && (rd.pathname === '' || rd.pathname === '/0');
  } catch { return false; }
}

(disposableDatabase() ? describe : describe.skip)(
  'LearningPath XP — real commit/publication barrier (NOT Recovery B cutover)', () => {
    let prisma: PrismaService;
    let redis: Redis | undefined;
    let seasonId: string | undefined;
    const touchedKeys = new Set<string>();
    let releasePublish: (() => void) | undefined;
    let enterPublish: (() => void) | undefined;
    let publicationReached: Promise<void>;
    let inFlight: Promise<unknown> | undefined;
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
        throw new Error('STOP: active season exists; this fixture must run alone');
      }
      redis = new Redis(process.env.REDIS_URL!, { lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null });
      await redis.connect();
      const gate = new Promise<void>((resolve) => { releasePublish = resolve; });
      const entered = new Promise<void>((resolve) => { enterPublish = resolve; });
      publicationReached = entered;
      const adapter = Object.create(redis) as Redis;
      adapter.zadd = jest.fn(async (...args: string[]) => {
        enterPublish?.();
        await gate;
        return (redis as Redis).zadd(...(args as [string, string, string]));
      }) as any;
      const xp = new XpService(prisma, adapter, { emitGroupUpdated: jest.fn() } as any);
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
      const season = await prisma.leaderboardSeason.create({ data: {
        name: `Local LP XP ${tag}`, periodType: 'WEEKLY', status: 'ACTIVE', isActive: true,
        startsAt: new Date(Date.now() - 3600000), endsAt: new Date(Date.now() + 3600000),
      } });
      seasonId = season.id;
    });

    afterAll(async () => {
      releasePublish?.();
      if (inFlight) await inFlight.catch(() => undefined);
      try {
        if (!prisma) return;
        if (seasonId) {
          const groups = await prisma.leaderboardGroup.findMany({
            where: { seasonId }, select: { id: true },
          });
          for (const group of groups) touchedKeys.add(weeklyRedisKey(seasonId, group.id));
        }
        if (redis) {
          for (const key of touchedKeys) await redis.del(key);
        }
        if (userId) {
          await prisma.xpRedisOutbox.deleteMany({ where: { userId } });
          await prisma.xpRedisProjectionRevision.deleteMany({ where: { userId } });
        }
        if (seasonId) await prisma.leaderboardSeason.delete({ where: { id: seasonId } });
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
        if (redis) redis.disconnect();
        if (prisma) await prisma.$disconnect();
      }
    });

    it('commits Learning Path rewards and outbox before Redis publication; claim is not publication', async () => {
      const key = `learning:LESSON_COMPLETED:${userId}:${lessonId}`;
      const pending = learningPath.completeLesson(userId, lessonId);
      inFlight = pending;
      try {
        // Race this barrier against a bounded timer: never hang forever if publication is not reached.
        await Promise.race([
          publicationReached,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('QA_PUBLICATION_BARRIER_TIMEOUT')), 12000)),
        ]);
        expect(await prisma.xpTransaction.count({ where: { idempotencyKey: key } })).toBe(1);
        const entry = await prisma.leaderboardEntry.findFirstOrThrow({ where: { userId, group: { seasonId } } });
        const redisKey = weeklyRedisKey(seasonId!, entry.groupId);
        touchedKeys.add(redisKey);
        expect(entry.periodXp).toBe(20);
        expect(await redis!.zscore(redisKey, userId)).toBeNull();
        expect((await prisma.xpRedisProjectionRevision.findUniqueOrThrow({
          where: { redisKey_userId: { redisKey, userId } },
        })).revision).toBe(1);
        const outbox = await prisma.xpRedisOutbox.findMany({ where: { userId, redisKey, projection: 'WEEKLY' } });
        expect(outbox).toHaveLength(1);
        expect(outbox[0].status).toBe('PENDING');
        // Do not invoke the global claim() API here: it cannot scope to this fixture.
        // A separate isolated claim test is required before claiming Recovery B coverage.
        expect(await redis!.zscore(redisKey, userId)).toBeNull();
      } finally {
        releasePublish?.();
        await pending.catch(() => undefined); // drain the real service before cleanup, even on assertion failure
        inFlight = undefined;
      }
      await pending;
      const entry = await prisma.leaderboardEntry.findFirstOrThrow({ where: { userId, group: { seasonId } } });
      const redisKey = weeklyRedisKey(seasonId!, entry.groupId);
      expect(await redis!.zscore(redisKey, userId)).toBe('20');
      expect((await learningPath.completeLesson(userId, lessonId)).alreadyCompleted).toBe(true);
      expect(await prisma.xpTransaction.count({ where: { idempotencyKey: key } })).toBe(1);
      expect((await prisma.userXpProfile.findUniqueOrThrow({ where: { userId } })).totalXp).toBe(20);
      expect(await prisma.lessonProgress.count({ where: { userId, lessonId, completed: true } })).toBe(1);
      expect((await prisma.userMissionV2.findUniqueOrThrow({ where: { id: missionId } })).progress).toBe(1);
      expect(await prisma.petReward.count({ where: { userId, lessonId } })).toBe(1);
      expect((await prisma.petProfile.findUniqueOrThrow({ where: { userId } })).completedLessons).toBe(1);
      expect(await prisma.xpRedisOutbox.count({ where: { userId, projection: 'WEEKLY' } })).toBe(1);
    }, 45000);
  },
);
