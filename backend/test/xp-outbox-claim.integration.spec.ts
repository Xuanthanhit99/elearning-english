import { randomUUID } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { XpRedisOutboxClaimService } from '../src/modules/leaderboard/xp-redis-outbox-claim.service';

const safe = (() => {
  if (process.env.BEACONVIE_LOCAL_XP_TEST !== 'YES_I_USE_DISPOSABLE_DATA') return false;
  try {
    const db = new URL(process.env.DATABASE_URL || '');
    return db.hostname === '127.0.0.1' && db.port === '15432' &&
      db.pathname === '/beaconvie_xp_test';
  } catch { return false; }
})();

(safe ? describe : describe.skip)('XP outbox claim — local PostgreSQL', () => {
  let prisma: PrismaService;
  let claim: XpRedisOutboxClaimService;
  const tag = randomUUID();
  const ids: string[] = [];
  const userId = `qa-claim-${tag}`;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    claim = new XpRedisOutboxClaimService(prisma);
  });

  afterAll(async () => {
    if (prisma) {
      if (ids.length) await prisma.xpRedisOutbox.deleteMany({ where: { id: { in: ids } } });
      await prisma.$disconnect();
    }
  });

  async function fixture(status = 'PENDING', lockedUntil?: Date) {
    const row = await prisma.xpRedisOutbox.create({
      data: {
        transactionId: randomUUID(), projection: 'WEEKLY',
        redisKey: `qa:claim:${tag}`, userId,
        status, lockedUntil,
      },
    });
    ids.push(row.id);
    return row;
  }

  it('does not claim the same row twice across concurrent claimers', async () => {
    const row = await fixture();
    // Other pending outbox rows may exist from previous local tests;
    // only inspect our own row, never assume the queue is empty.
    const [a, b] = await Promise.all([claim.claim(100), claim.claim(100)]);
    const occurrences = [...a, ...b].filter((x) => x.id === row.id);
    expect(occurrences).toHaveLength(1);
    expect((await prisma.xpRedisOutbox.findUniqueOrThrow({ where: { id: row.id } })).status)
      .toBe('PROCESSING');
  });

  it('reclaims expired lease but not an unexpired lease', async () => {
    const expired = await fixture('PROCESSING', new Date(Date.now() - 120000));
    const live = await fixture('PROCESSING', new Date(Date.now() + 120000));
    const claimed = await claim.claim(100);
    expect(claimed.some((x) => x.id === expired.id)).toBe(true);
    expect(claimed.some((x) => x.id === live.id)).toBe(false);
  });
});
