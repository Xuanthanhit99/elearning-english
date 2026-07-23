import { ArenaService } from '../arena.service';
import {
  buildArenaTestApp,
  cleanupArenaTestData,
  closeArenaTestApp,
  createTestUser,
} from '../realtime/arena-realtime-test-utils';
import { ArenaSeasonService } from './arena-season.service';

jest.setTimeout(60000);

describe('Arena season lifecycle (Phase F3 - real Postgres)', () => {
  let harness: Awaited<ReturnType<typeof buildArenaTestApp>>;
  let seasons: ArenaSeasonService;
  let arena: ArenaService;
  let userIds: string[] = [];
  let roomIds: string[] = [];
  let seasonIds: string[] = [];
  let touchedSeasons: Array<{ id: string; status: any; isActive: boolean }> = [];
  const envSnapshot = { ...process.env };

  beforeAll(async () => {
    harness = await buildArenaTestApp();
    seasons = harness.app.get(ArenaSeasonService);
    arena = harness.app.get(ArenaService);
  });

  afterEach(async () => {
    await cleanupArenaTestData(harness.prisma, roomIds, userIds);
    for (const season of touchedSeasons) {
      await harness.prisma.arenaSeason.update({
        where: { id: season.id },
        data: { status: season.status, isActive: season.isActive },
      });
    }
    await harness.prisma.arenaSeasonResult.deleteMany({ where: { seasonId: { in: seasonIds } } });
    await harness.prisma.arenaSeason.deleteMany({ where: { id: { in: seasonIds } } });
    userIds = [];
    roomIds = [];
    seasonIds = [];
    touchedSeasons = [];
    process.env = { ...envSnapshot };
  });

  afterAll(async () => {
    await closeArenaTestApp(harness);
  });

  async function makePastSeason(status: 'ACTIVE' | 'CALCULATING') {
    const startsAt = new Date('2026-01-01T00:00:00.000Z');
    const endsAt = new Date('2026-01-02T00:00:00.000Z');
    const season = await harness.prisma.arenaSeason.create({
      data: {
        name: `F3 Test Season ${Date.now()}`,
        seasonCode: `f3-${Date.now()}-${Math.random()}`,
        seasonNumber: Math.floor(Date.now() % 100000000),
        startsAt,
        endsAt,
        status,
        isActive: status === 'ACTIVE',
        activatedAt: startsAt,
      },
    });
    seasonIds.push(season.id);
    return season;
  }

  it('moves an expired active season to closing and removes waiting ranked queue rows', async () => {
    process.env.ARENA_SEASON_AUTO_CREATE = 'false';
    touchedSeasons = await harness.prisma.arenaSeason.findMany({
      where: { isActive: true },
      select: { id: true, status: true, isActive: true },
    });
    await harness.prisma.arenaSeason.updateMany({ where: { isActive: true }, data: { isActive: false, status: 'UPCOMING' } });
    const season = await makePastSeason('ACTIVE');
    const user = await createTestUser(harness.prisma, 'f3-closing-queue');
    userIds.push(user.id);
    await harness.prisma.arenaQueue.create({
      data: {
        userId: user.id,
        gameMode: 'SOLO_1V1',
        skill: 'Vocabulary',
        difficulty: 'A1',
        topic: 'Animals',
        mmr: 1500,
        searchMinMmr: 1400,
        searchMaxMmr: 1600,
      },
    });

    const summary = await seasons.runLifecycle(new Date('2026-01-02T00:01:00.000Z'));
    const after = await harness.prisma.arenaSeason.findUnique({ where: { id: season.id } });

    expect(summary.closing).toBe(1);
    expect(after?.status).toBe('CALCULATING');
    expect(after?.isActive).toBe(false);
    expect(await harness.prisma.arenaQueue.count({ where: { userId: user.id } })).toBe(0);
  });

  it('blocks new ranked queue entries when no active season is available', async () => {
    process.env.ARENA_SEASON_ENABLED = 'true';
    process.env.ARENA_SEASON_AUTO_CREATE = 'false';
    touchedSeasons = await harness.prisma.arenaSeason.findMany({
      where: { isActive: true },
      select: { id: true, status: true, isActive: true },
    });
    await harness.prisma.arenaSeason.updateMany({ where: { isActive: true }, data: { isActive: false, status: 'CALCULATING' } });
    const user = await createTestUser(harness.prisma, 'f3-no-season');
    userIds.push(user.id);

    await expect(
      arena.enterQueue(user.id, {
        gameMode: 'SOLO_1V1',
        skill: 'Vocabulary',
        difficulty: 'A1',
        topic: 'Animals',
      } as any),
    ).rejects.toThrow(/season/i);
  });

  it('creates deterministic snapshots, grants season reward, soft-resets exactly once, and is idempotent', async () => {
    process.env.ARENA_SEASON_AUTO_CREATE = 'false';
    process.env.ARENA_SEASON_MIN_MATCHES_FOR_REWARD = '1';
    const season = await makePastSeason('CALCULATING');
    const [winner, loser] = await Promise.all([
      createTestUser(harness.prisma, 'f3-season-winner'),
      createTestUser(harness.prisma, 'f3-season-loser'),
    ]);
    userIds.push(winner.id, loser.id);
    await harness.prisma.arenaProfile.create({
      data: { userId: winner.id, mmr: 1810, tier: 'DIAMOND', peakMmr: 1810, peakTier: 'DIAMOND', placementMatchesRemaining: 0 },
    });
    await harness.prisma.arenaProfile.create({
      data: { userId: loser.id, mmr: 1490, tier: 'GOLD', peakMmr: 1500, peakTier: 'GOLD', placementMatchesRemaining: 0 },
    });
    const room = await harness.prisma.arenaRoom.create({
      data: {
        hostId: winner.id,
        name: 'F3 season room',
        visibility: 'PUBLIC',
        gameMode: 'SOLO_1V1',
        mode: 'RANKED',
        teamFormat: 'SOLO_1V1',
        skill: 'Vocabulary',
        winCondition: 'TIME',
        difficulty: 'A1',
        topic: 'Animals',
        participants: { create: [{ userId: winner.id, team: 'A' }, { userId: loser.id, team: 'B' }] },
      },
    });
    roomIds.push(room.id);
    const match = await harness.prisma.arenaMatch.create({
      data: { roomId: room.id, seasonId: season.id, winnerTeam: 'A', finishedAt: new Date('2026-01-01T01:00:00.000Z') },
    });
    await harness.prisma.arenaRatingHistory.createMany({
      data: [
        { matchId: match.id, userId: winner.id, opponentId: loser.id, seasonId: season.id, previousMmr: 1770, nextMmr: 1810, mmrDelta: 40, previousTier: 'PLATINUM', nextTier: 'DIAMOND' },
        { matchId: match.id, userId: loser.id, opponentId: winner.id, seasonId: season.id, previousMmr: 1530, nextMmr: 1490, mmrDelta: -40, previousTier: 'GOLD', nextTier: 'GOLD' },
      ],
    });

    const first = await seasons.finalizeSeason(season.id, new Date('2026-01-02T00:20:00.000Z'));
    const second = await seasons.finalizeSeason(season.id, new Date('2026-01-02T00:25:00.000Z'));
    const results = await harness.prisma.arenaSeasonResult.findMany({ where: { seasonId: season.id }, orderBy: { finalRank: 'asc' } });
    const winnerProfile = await harness.prisma.arenaProfile.findUnique({ where: { userId: winner.id } });

    expect(first.closed).toBe(1);
    expect(first.rewardsGranted).toBe(2);
    expect(first.resetsApplied).toBe(2);
    expect(second).toEqual({ closed: 0, rewardsGranted: 0, rewardsFailed: 0, resetsApplied: 0 });
    expect(results).toHaveLength(2);
    expect(results[0].userId).toBe(winner.id);
    expect(results[0].rewardStatus).toBe('GRANTED');
    expect(winnerProfile?.mmr).toBe(1655);
    expect(winnerProfile?.peakMmr).toBe(1810);
    expect(await harness.prisma.xpTransaction.count({ where: { idempotencyKey: `arena:season:${season.id}:reward:${winner.id}:xp` } })).toBe(1);
  });

  it('recovers season reward partial failures without duplicating successful components', async () => {
    process.env.ARENA_SEASON_AUTO_CREATE = 'false';
    process.env.ARENA_SEASON_MIN_MATCHES_FOR_REWARD = '1';
    const season = await makePastSeason('CALCULATING');
    const user = await createTestUser(harness.prisma, 'f3a-season-partial');
    userIds.push(user.id);
    await harness.prisma.arenaProfile.create({
      data: { userId: user.id, mmr: 1810, tier: 'DIAMOND', peakMmr: 1810, peakTier: 'DIAMOND', placementMatchesRemaining: 0 },
    });
    const room = await harness.prisma.arenaRoom.create({
      data: {
        hostId: user.id,
        name: 'F3A season partial room',
        visibility: 'PUBLIC',
        gameMode: 'SOLO_1V1',
        mode: 'RANKED',
        teamFormat: 'SOLO_1V1',
        skill: 'Vocabulary',
        winCondition: 'TIME',
        difficulty: 'A1',
        topic: 'Animals',
        participants: { create: [{ userId: user.id, team: 'A' }] },
      },
    });
    roomIds.push(room.id);
    const match = await harness.prisma.arenaMatch.create({
      data: { roomId: room.id, seasonId: season.id, winnerTeam: 'A', finishedAt: new Date('2026-01-01T01:00:00.000Z') },
    });
    await harness.prisma.arenaRatingHistory.create({
      data: { matchId: match.id, userId: user.id, seasonId: season.id, previousMmr: 1770, nextMmr: 1810, mmrDelta: 40, previousTier: 'PLATINUM', nextTier: 'DIAMOND' },
    });

    process.env.ARENA_TEST_FAIL_SEASON_REWARD_COMPONENT = 'gold';
    const failedGold = await seasons.finalizeSeason(season.id, new Date('2026-01-02T00:20:00.000Z'));
    let result = await harness.prisma.arenaSeasonResult.findFirstOrThrow({ where: { seasonId: season.id, userId: user.id } });
    let profile = await harness.prisma.arenaProfile.findUniqueOrThrow({ where: { userId: user.id } });
    expect(failedGold.rewardsFailed).toBe(1);
    expect(result.rewardStatus).toBe('FAILED');
    expect(result.rewardXpStatus).toBe('GRANTED');
    expect(result.rewardGoldStatus).toBe('PENDING');
    expect(profile.gold).toBe(0);
    expect(await harness.prisma.xpTransaction.count({ where: { idempotencyKey: `arena:season:${season.id}:reward:${user.id}:xp` } })).toBe(1);

    delete process.env.ARENA_TEST_FAIL_SEASON_REWARD_COMPONENT;
    const recovered = await seasons.finalizeSeason(season.id, new Date('2026-01-02T00:25:00.000Z'));
    result = await harness.prisma.arenaSeasonResult.findFirstOrThrow({ where: { seasonId: season.id, userId: user.id } });
    profile = await harness.prisma.arenaProfile.findUniqueOrThrow({ where: { userId: user.id } });
    expect(recovered.rewardsGranted).toBe(1);
    expect(result.rewardStatus).toBe('GRANTED');
    expect(result.rewardXpStatus).toBe('GRANTED');
    expect(result.rewardGoldStatus).toBe('GRANTED');
    expect(result.rewardArenaPointStatus).toBe('GRANTED');
    expect(profile.gold).toBe(220);
    expect(profile.arenaPoint).toBe(1560);
    expect(await harness.prisma.xpTransaction.count({ where: { idempotencyKey: `arena:season:${season.id}:reward:${user.id}:xp` } })).toBe(1);

    const duplicate = await seasons.finalizeSeason(season.id, new Date('2026-01-02T00:30:00.000Z'));
    profile = await harness.prisma.arenaProfile.findUniqueOrThrow({ where: { userId: user.id } });
    expect(duplicate).toEqual({ closed: 0, rewardsGranted: 0, rewardsFailed: 0, resetsApplied: 0 });
    expect(profile.gold).toBe(220);
    expect(profile.arenaPoint).toBe(1560);
  });
});
