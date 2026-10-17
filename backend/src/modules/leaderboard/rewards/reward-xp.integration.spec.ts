import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient, LeaderboardRewardStatus } from '@prisma/client';
import { LeaderboardService } from '../leaderboard.service';
import { LeaderboardRewardService } from './leaderboard-reward.service';
import { AdminDashboardService } from '../../admin-dashboard/admin-dashboard.service';

/** Real PostgreSQL QA only. Never run against production. */
describe('D1 reward claim and XP reset — PostgreSQL integration', () => {
  const prisma = new PrismaClient();
  const prefix = `d1-${randomUUID()}`;
  const users: string[] = [];
  const rewards: string[] = [];
  let legacy: LeaderboardService;
  let modern: LeaderboardRewardService;
  let admin: AdminDashboardService;

  beforeAll(async () => {
    const url = process.env.DATABASE_URL ?? '';
    const parsed = new URL(url);
    if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || parsed.port !== '5434' ||
        parsed.pathname !== '/beaconvie_english_qa' || parsed.username !== 'beaconvie_qa') {
      throw new Error('Refusing D1 integration tests: DATABASE_URL must target local PostgreSQL QA at port 5434');
    }
    await prisma.$connect();
    legacy = new LeaderboardService(prisma as any, {} as any);
    modern = new LeaderboardRewardService(prisma as any, { createFromPayload: jest.fn() } as any);
    admin = new AdminDashboardService(prisma as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any, {} as any, {} as any);
    jest.spyOn(admin as any, 'record').mockResolvedValue(undefined);
    jest.spyOn(admin, 'getUserProfile').mockImplementation(async (id: string) => ({ id } as any));
  });

  afterAll(async () => {
    try {
      for (const id of users) await prisma.user.delete({ where: { id } });
      for (const id of rewards) await prisma.leaderboardReward.delete({ where: { id } });
    } finally { await prisma.$disconnect(); }
  });

  async function fixture(xp = 120) {
    const token = `${prefix}-${users.length}`;
    const user = await prisma.user.create({ data: {
      fullname: 'D1 QA fixture', email: `${token}@example.invalid`, password: 'not-a-login', xp: 0,
    } });
    users.push(user.id);
    const profile = await prisma.userXpProfile.create({ data: { userId: user.id } });
    const reward = await prisma.leaderboardReward.create({ data: {
      minRank: 1, maxRank: 1, rewardType: 'XP', rewardValue: { xp }, title: 'D1 QA reward',
    } });
    rewards.push(reward.id);
    const assignment = await prisma.userLeaderboardReward.create({ data: {
      userId: user.id, xpProfileId: profile.id, rewardId: reward.id, payload: { xp },
    } });
    return { user, profile, reward, assignment, xp };
  }

  async function verify(f: Awaited<ReturnType<typeof fixture>>, expected: number, count: number) {
    const [user, profile, ledger, assignment] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: f.user.id } }),
      prisma.userXpProfile.findUniqueOrThrow({ where: { userId: f.user.id } }),
      prisma.xpTransaction.findMany({ where: { idempotencyKey: `leaderboard-reward:${f.assignment.id}` } }),
      prisma.userLeaderboardReward.findUniqueOrThrow({ where: { id: f.assignment.id } }),
    ]);
    expect(user.xp).toBe(expected);
    expect(profile.totalXp).toBe(expected);
    expect(ledger).toHaveLength(count);
    expect(ledger.reduce((sum, row) => sum + row.finalXp, 0)).toBe(expected);
    expect(assignment.status).toBe(count ? LeaderboardRewardStatus.CLAIMED : LeaderboardRewardStatus.AVAILABLE);
  }

  it('legacy claim creates one ledger and consistent balances', async () => {
    const f = await fixture();
    await legacy.claimReward(f.user.id, f.assignment.id);
    await verify(f, f.xp, 1);
    await expect(legacy.claimReward(f.user.id, f.assignment.id)).rejects.toThrow();
    await verify(f, f.xp, 1);
  });

  it('modern claim retry returns alreadyClaimed without double credit', async () => {
    const f = await fixture();
    const first = await modern.claim(f.user.id, f.assignment.id);
    expect(first.alreadyClaimed).toBe(false);
    const again = await modern.claim(f.user.id, f.assignment.id);
    expect(again.alreadyClaimed).toBe(true);
    await verify(f, f.xp, 1);
  });

  it('cross-service simultaneous claims never double credit', async () => {
    const f = await fixture();
    const outcomes = await Promise.allSettled([
      legacy.claimReward(f.user.id, f.assignment.id),
      modern.claim(f.user.id, f.assignment.id),
    ]);
    expect(outcomes.some((o) => o.status === 'fulfilled')).toBe(true);
    await verify(f, f.xp, 1);
  });

  it('ledger write failure rolls back claim and balances', async () => {
    const f = await fixture();
    const injected = new Error('D1 forced ledger failure');
    const proxy = new Proxy(prisma, {
      get(target, key) {
        if (key !== '$transaction') return (target as any)[key];
        return (callback: (tx: any) => Promise<unknown>, options: unknown) =>
          prisma.$transaction((tx) => callback(new Proxy(tx, {
            get(t, property) {
              if (property === 'xpTransaction') return {
                ...t.xpTransaction,
                findUnique: t.xpTransaction.findUnique.bind(t.xpTransaction),
                create: async () => { throw injected; },
              };
              return (t as any)[property];
            },
          })), options as any);
      },
    });
    const failing = new LeaderboardService(proxy as any, {} as any);
    await expect(failing.claimReward(f.user.id, f.assignment.id)).rejects.toThrow('D1 forced ledger failure');
    await verify(f, 0, 0);
    await legacy.claimReward(f.user.id, f.assignment.id);
    await verify(f, f.xp, 1);
  });

  it.each(['legacy', 'modern'] as const)('%s claim retries a single P2034 without double credit', async (kind) => {
    const f = await fixture();
    let attempts = 0;
    const proxy = new Proxy(prisma, {
      get(target, key) {
        if (key === '$transaction') {
          return (callback: (tx: any) => Promise<unknown>, options: unknown) => {
            attempts++;
            if (attempts === 1) {
              const conflict = new Prisma.PrismaClientKnownRequestError('D1 forced serialization conflict', { code: 'P2034', clientVersion: Prisma.prismaVersion.client });
              throw conflict;
            }
            return prisma.$transaction(callback, options as any);
          };
        }
        return (target as any)[key];
      },
    });
    if (kind === 'legacy') {
      await new LeaderboardService(proxy as any, {} as any).claimReward(f.user.id, f.assignment.id);
    } else {
      const service = new LeaderboardRewardService(proxy as any, { createFromPayload: jest.fn() } as any);
      const result = await service.claim(f.user.id, f.assignment.id);
      expect(result.alreadyClaimed).toBe(false);
    }
    expect(attempts).toBe(2);
    await verify(f, f.xp, 1);
  });

  it('notification failure after commit does not roll back reward XP', async () => {
    const f = await fixture();
    const notification = jest.fn().mockRejectedValue(new Error('D1 simulated notification outage'));
    const service = new LeaderboardRewardService(prisma as any, { createFromPayload: notification } as any);
    const result = await service.claim(f.user.id, f.assignment.id);
    expect(result.alreadyClaimed).toBe(false);
    expect(notification).toHaveBeenCalledTimes(1);
    await verify(f, f.xp, 1);
    const again = await service.claim(f.user.id, f.assignment.id);
    expect(again.alreadyClaimed).toBe(true);
    expect(notification).toHaveBeenCalledTimes(1);
    await verify(f, f.xp, 1);
  });

  it('concurrent claim and RESET_XP preserve ledger and balances', async () => {
    const f = await fixture();
    const actor = { id: f.user.id };
    const results = await Promise.allSettled([
      modern.claim(f.user.id, f.assignment.id),
      admin.applyUserAction(f.user.id, { action: 'RESET_XP', reason: 'D1 concurrent QA' } as any, actor),
    ]);
    // A serialization conflict may exhaust retries; successful claims must never double-credit.
    const [user, profile, ledger, assignment] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: f.user.id } }),
      prisma.userXpProfile.findUniqueOrThrow({ where: { userId: f.user.id } }),
      prisma.xpTransaction.findMany({ where: { userId: f.user.id } }),
      prisma.userLeaderboardReward.findUniqueOrThrow({ where: { id: f.assignment.id } }),
    ]);
    const ledgerTotal = ledger.reduce((sum, row) => sum + row.finalXp, 0);
    expect(user.xp).toBe(profile.totalXp);
    expect(user.xp).toBe(ledgerTotal);
    expect(ledger.filter((row) => row.idempotencyKey === `leaderboard-reward:${f.assignment.id}`)).toHaveLength(
      assignment.status === LeaderboardRewardStatus.CLAIMED ? 1 : 0,
    );
    expect(results.some((result) => result.status === 'fulfilled')).toBe(true);
  });

  it('RESET_XP compensates exactly once and keeps ledger history', async () => {
    const f = await fixture();
    await modern.claim(f.user.id, f.assignment.id);
    const actor = { id: f.user.id };
    await admin.applyUserAction(f.user.id, { action: 'RESET_XP', reason: 'D1 QA' } as any, actor);
    await admin.applyUserAction(f.user.id, { action: 'RESET_XP', reason: 'D1 QA repeat' } as any, actor);
    const [user, profile, ledger] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: f.user.id } }),
      prisma.userXpProfile.findUniqueOrThrow({ where: { userId: f.user.id } }),
      prisma.xpTransaction.findMany({ where: { userId: f.user.id } }),
    ]);
    expect(user.xp).toBe(0);
    expect(profile.totalXp).toBe(0);
    expect(ledger.filter((row) => row.finalXp < 0)).toHaveLength(1);
    expect(ledger.reduce((sum, row) => sum + row.finalXp, 0)).toBe(0);
  });
});
