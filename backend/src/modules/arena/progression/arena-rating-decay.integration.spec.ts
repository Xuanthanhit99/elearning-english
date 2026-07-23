import { ArenaRatingDecayService } from './arena-rating-decay.service';
import {
  buildArenaTestApp,
  cleanupArenaTestData,
  closeArenaTestApp,
  createTestUser,
} from '../realtime/arena-realtime-test-utils';

jest.setTimeout(60000);

describe('Arena rating decay (Phase F2.4 - real Postgres)', () => {
  let harness: Awaited<ReturnType<typeof buildArenaTestApp>>;
  let decay: ArenaRatingDecayService;
  let userIds: string[] = [];
  let roomIds: string[] = [];
  const originalEnabled = process.env.ARENA_DECAY_ENABLED;

  beforeAll(async () => {
    harness = await buildArenaTestApp();
    decay = harness.app.get(ArenaRatingDecayService);
  });

  afterEach(async () => {
    await cleanupArenaTestData(harness.prisma, roomIds, userIds);
    userIds = [];
    roomIds = [];
    if (originalEnabled === undefined) delete process.env.ARENA_DECAY_ENABLED;
    else process.env.ARENA_DECAY_ENABLED = originalEnabled;
  });

  afterAll(async () => {
    await cleanupArenaTestData(harness.prisma, roomIds, userIds);
    await closeArenaTestApp(harness);
  });

  async function makeProfile(tag: string, overrides: Record<string, unknown> = {}) {
    const user = await createTestUser(harness.prisma, tag);
    userIds.push(user.id);
    return harness.prisma.arenaProfile.create({
      data: {
        userId: user.id,
        mmr: 1810,
        tier: 'DIAMOND',
        peakMmr: 1810,
        peakTier: 'DIAMOND',
        placementMatchesRemaining: 0,
        lastMatchAt: new Date('2026-07-01T00:00:00.000Z'),
        ...overrides,
      },
    });
  }

  it('does nothing while disabled', async () => {
    process.env.ARENA_DECAY_ENABLED = 'false';
    const profile = await makeProfile('decay-disabled');

    const summary = await decay.runDecay(new Date('2026-07-23T00:00:00.000Z'));
    const after = await harness.prisma.arenaProfile.findUnique({ where: { userId: profile.userId } });

    expect(summary).toEqual({ scanned: 0, applied: 0, skippedByCas: 0, disabled: true });
    expect(after!.mmr).toBe(1810);
    expect(after!.lastRatingDecayAt).toBeNull();
  });

  it('decays an eligible high-tier profile exactly once per inactivity window without reward/history writes', async () => {
    process.env.ARENA_DECAY_ENABLED = 'true';
    const profile = await makeProfile('decay-once');
    const now = new Date('2026-07-23T00:00:00.000Z');

    expect(await decay.runDecay(now)).toMatchObject({ scanned: 1, applied: 1, disabled: false });
    expect(await decay.runDecay(now)).toMatchObject({ scanned: 0, applied: 0, disabled: false });

    const after = await harness.prisma.arenaProfile.findUnique({ where: { userId: profile.userId } });
    expect(after!.mmr).toBe(1795);
    expect(after!.tier).toBe('DIAMOND');
    expect(after!.peakMmr).toBe(1810);
    expect(after!.lastMatchAt).toEqual(profile.lastMatchAt);
    expect(await harness.prisma.arenaRatingHistory.count({ where: { userId: profile.userId } })).toBe(0);
    expect(await harness.prisma.arenaRewardLog.count({ where: { userId: profile.userId } })).toBe(0);
  });

  it('protects placement and lower-tier profiles', async () => {
    process.env.ARENA_DECAY_ENABLED = 'true';
    await makeProfile('decay-placement', { placementMatchesRemaining: 1 });
    await makeProfile('decay-low-tier', { mmr: 1700, tier: 'PLATINUM', peakMmr: 1810 });

    const summary = await decay.runDecay(new Date('2026-07-23T00:00:00.000Z'));

    expect(summary.applied).toBe(0);
  });
});
