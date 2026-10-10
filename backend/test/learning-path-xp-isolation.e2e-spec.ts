/** Real PostgreSQL XP identity-isolation regression.
 * Only runs with explicit opt-in and loopback DATABASE_URL.
 * Fails against current LearningPath key design if lesson IDs are shared.
 */
import { randomUUID } from 'crypto';
import { XpSourceType } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { XpService } from '../src/modules/leaderboard/xp.service';

function safeLocalDb() {
  if (process.env.BEACONVIE_LOCAL_XP_TEST !== 'YES_I_USE_DISPOSABLE_DATA') return false;
  try { return ['localhost','127.0.0.1','[::1]','::1'].includes(new URL(process.env.DATABASE_URL || '').hostname); }
  catch { return false; }
}
(safeLocalDb() ? describe : describe.skip)('XP cross-user isolation — local database', () => {
  let prisma: PrismaService;
  let xp: XpService;
  const users: string[] = [];
  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    xp = new XpService(prisma, {} as any, { emitGroupUpdated: jest.fn() } as any);
  });
  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
  });
  async function user() {
    const u = await prisma.user.create({ data: {
      fullname: 'Local isolation fixture',
      email: `xp-isolation-${randomUUID()}@__test-fixture__.invalid`,
      password: 'not-a-real-hash',
    } });
    users.push(u.id);
    await prisma.userXpProfile.create({ data: { userId: u.id } });
    return u;
  }
  it('must award two different users independently for the same lesson', async () => {
    const a = await user(), b = await user();
    const lessonId = `fixture-lesson-${randomUUID()}`;
    const award = (userId: string) => xp.awardXpWithSideEffects({
      userId, sourceType: XpSourceType.LESSON, sourceId: lessonId,
      baseXp: 20, bonusXp: 0, idempotencyKey: `learning:LESSON_COMPLETED:${userId}:${lessonId}`,
    }, async () => null);
    const first = await award(a.id);
    const second = await award(b.id);
    expect(first.duplicated).toBe(false);
    expect(second.duplicated).toBe(false);
    expect(await prisma.xpTransaction.count({
      where: { sourceType: XpSourceType.LESSON, sourceId: lessonId },
    })).toBe(2);
    expect((await prisma.userXpProfile.findUniqueOrThrow({ where: { userId: a.id } })).totalXp).toBe(20);
    expect((await prisma.userXpProfile.findUniqueOrThrow({ where: { userId: b.id } })).totalXp).toBe(20);
  });
});
