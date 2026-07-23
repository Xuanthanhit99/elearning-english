import { Socket as ClientSocket } from 'socket.io-client';
import { ArenaService } from '../arena.service';
import { ArenaQuestionPipelineService } from '../question/arena-question-pipeline.service';
import { ArenaProgressionDispatcherService } from './arena-progression-dispatcher.service';
import { ArenaReconciliationService } from './arena-reconciliation.service';
import { XpService } from '../../leaderboard/xp.service';
import {
  buildArenaTestApp,
  cleanupArenaTestData,
  closeArenaTestApp,
  connectArenaClient,
  createTestUser,
  emitAck,
  signArenaToken,
} from '../realtime/arena-realtime-test-utils';

jest.setTimeout(60000);

const mockCandidates = Array.from({ length: 4 }, (_, index) => ({
  type: 'MULTIPLE_CHOICE' as const,
  skill: 'Vocabulary',
  prompt: `Placement question ${index + 1}`,
  options: ['A', 'B', 'C', 'D'],
  answer: 'A',
  explanation: `Explanation ${index + 1}`,
  points: 10,
}));

/**
 * Phase F2.1 acceptance — real Postgres + Redis (via the same
 * `buildArenaTestApp` harness every other Arena integration spec uses; not
 * `arena-fake-prisma.ts`, per "do not replace real-database acceptance
 * tests with FakePrisma tests"). Covers every scenario in
 * docs/arena-phase-f2-1-placement-implementation-report.md Part 14.
 */
describe('Arena Placement Engine (Phase F2.1 — real Postgres)', () => {
  let harness: Awaited<ReturnType<typeof buildArenaTestApp>>;
  let arenaService: ArenaService;
  let dispatcher: ArenaProgressionDispatcherService;
  let reconciliation: ArenaReconciliationService;
  let xpService: XpService;
  const roomIds: string[] = [];
  const userIds: string[] = [];
  const sockets: ClientSocket[] = [];

  beforeAll(async () => {
    harness = await buildArenaTestApp();
    arenaService = harness.app.get(ArenaService);
    dispatcher = harness.app.get(ArenaProgressionDispatcherService);
    reconciliation = harness.app.get(ArenaReconciliationService);
    xpService = harness.app.get(XpService);
    const pipeline = harness.app.get(ArenaQuestionPipelineService);
    jest.spyOn(pipeline, 'prepareQuestionSet').mockResolvedValue(mockCandidates);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    sockets.forEach((s) => s.close());
    await cleanupArenaTestData(harness.prisma, roomIds, userIds);
    await closeArenaTestApp(harness);
  });

  async function makeUser(tag: string) {
    const user = await createTestUser(harness.prisma, tag);
    userIds.push(user.id);
    return user;
  }

  function track(socket: ClientSocket) {
    sockets.push(socket);
    return socket;
  }

  async function connectAsParticipant(userId: string) {
    const token = signArenaToken(harness.jwt, userId);
    const outcome = await connectArenaClient(harness.port, token);
    if (outcome.status !== 'connected') {
      throw new Error(`expected connected, got ${outcome.status}`);
    }
    return track(outcome.client);
  }

  async function getPlacementRemaining(userId: string) {
    const profile = await harness.prisma.arenaProfile.findUnique({ where: { userId } });
    return profile!.placementMatchesRemaining;
  }

  /**
   * RANKED SOLO_1V1 room, host wins with `hostAnswered` meaningful
   * attempts recorded (default: a real attempt), guest optionally
   * zero-effort. Pushed past its deadline (time-up finish path).
   */
  async function makeFinishableMatch(
    tag: string,
    options: { hostAnswered?: boolean; guestAnswered?: boolean } = {},
  ) {
    const hostAnswered = options.hostAnswered ?? true;
    const guestAnswered = options.guestAnswered ?? true;
    const host = await makeUser(`${tag}-host`);
    const guest = await makeUser(`${tag}-guest`);
    const room = await arenaService.createRoom(host.id, {
      name: `Placement test ${tag}`,
      visibility: 'PUBLIC',
      gameMode: 'SOLO_1V1',
      skill: 'Vocabulary',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    } as any);
    roomIds.push(room!.id);
    await arenaService.joinRoom(guest.id, room!.id, {} as any);

    const match = await harness.prisma.arenaMatch.findFirst({
      where: { roomId: room!.id },
      orderBy: { startedAt: 'desc' },
    });

    await harness.prisma.arenaParticipant.updateMany({
      where: { roomId: room!.id, userId: host.id },
      data: { score: hostAnswered ? 100 : 0, correct: hostAnswered ? 4 : 0, wrong: 0 },
    });
    await harness.prisma.arenaParticipant.updateMany({
      where: { roomId: room!.id, userId: guest.id },
      data: { score: guestAnswered ? 10 : 0, correct: guestAnswered ? 1 : 0, wrong: guestAnswered ? 3 : 0 },
    });
    await harness.prisma.arenaMatch.update({
      where: { id: match!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    return { host, guest, roomId: room!.id, matchId: match!.id };
  }

  // ================================================================
  // Part 14 #1 — five valid matches complete placement exactly once.
  // Also covers Part 14 #12/#13: rating history / reward / XP counts.
  // ================================================================
  it('completes placement exactly on the fifth valid rated match, never before, never again after', async () => {
    const host = await makeUser('five-matches-host');
    // Note: ArenaProfile is created lazily (getOrCreateProfile, first
    // triggered by createRoom below) — no profile row exists for `host`
    // yet at this point, so the "starts at 5" invariant is asserted
    // implicitly by the loop's own results ([false,false,false,false,true,
    // false]) rather than read here.
    const results: boolean[] = [];
    let matchIdOfFifth = '';

    for (let i = 1; i <= 6; i += 1) {
      const guest = await makeUser(`five-matches-guest-${i}`);
      const room = await arenaService.createRoom(host.id, {
        name: `Five matches ${i}`,
        visibility: 'PUBLIC',
        gameMode: 'SOLO_1V1',
        skill: 'Vocabulary',
        winCondition: 'TIME',
        difficulty: 'A1',
        topic: 'Animals',
      } as any);
      roomIds.push(room!.id);
      await arenaService.joinRoom(guest.id, room!.id, {} as any);
      const match = await harness.prisma.arenaMatch.findFirst({
        where: { roomId: room!.id },
        orderBy: { startedAt: 'desc' },
      });
      await harness.prisma.arenaParticipant.updateMany({
        where: { roomId: room!.id, userId: host.id },
        data: { score: 100, correct: 4, wrong: 0 },
      });
      await harness.prisma.arenaParticipant.updateMany({
        where: { roomId: room!.id, userId: guest.id },
        data: { score: 10, correct: 1, wrong: 3 },
      });
      await harness.prisma.arenaMatch.update({
        where: { id: match!.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const result = await arenaService.finishMatch(host.id, room!.id, {} as any);
      results.push(Boolean((result as any).progression?.placementCompleted));
      if (i === 5) matchIdOfFifth = match!.id;
    }

    expect(results).toEqual([false, false, false, false, true, false]);
    expect(await getPlacementRemaining(host.id)).toBe(0);

    // Part 14 #12: exactly one ArenaRatingHistory row per match/host.
    const ratingHistoryCount = await harness.prisma.arenaRatingHistory.count({ where: { userId: host.id } });
    expect(ratingHistoryCount).toBe(6);
    // Part 14 #13: exactly one reward log / XP transaction per match/host.
    const rewardLogCount = await harness.prisma.arenaRewardLog.count({ where: { userId: host.id } });
    expect(rewardLogCount).toBe(6);
    const xpTxCount = await harness.prisma.xpTransaction.count({
      where: { idempotencyKey: `arena:xp:${matchIdOfFifth}:${host.id}` },
    });
    expect(xpTxCount).toBe(1);
  });

  // ================================================================
  // Part 14 #2 — duplicate finish/dispatch does not double-decrement.
  // ================================================================
  it('does not double-decrement on duplicate finish or duplicate direct dispatch', async () => {
    const { host, guest, roomId, matchId } = await makeFinishableMatch('dup-dispatch');
    void guest;

    await arenaService.finishMatch(host.id, roomId, {} as any);
    const afterFirst = await getPlacementRemaining(host.id);
    expect(afterFirst).toBe(4);

    // Duplicate finish (already-finished CAS path) + duplicate direct dispatch.
    await arenaService.finishMatch(host.id, roomId, {} as any);
    await dispatcher.processMatch(matchId);
    await dispatcher.applyMatchRewards(matchId, host.id);

    expect(await getPlacementRemaining(host.id)).toBe(4);
  });

  // ================================================================
  // Part 14 #3/#4 — partial participant failure recovered by
  // reconciliation, decrementing only the missing participant.
  // ================================================================
  it('recovers a failed participant via reconciliation, decrementing only that participant', async () => {
    const { host, guest, roomId, matchId } = await makeFinishableMatch('partial-failure');

    const realAwardXp = xpService.awardXpWithSideEffects.bind(xpService);
    const spy = jest
      .spyOn(xpService, 'awardXpWithSideEffects')
      .mockImplementation(async (input: any, sideEffects: any) => {
        if (input.userId === guest.id) throw new Error('injected failure for guest');
        return realAwardXp(input, sideEffects);
      });

    await arenaService.finishMatch(host.id, roomId, {} as any);
    spy.mockRestore();

    expect(await getPlacementRemaining(host.id)).toBe(4);
    expect(await getPlacementRemaining(guest.id)).toBe(5); // untouched — guest's attempt never committed

    const summary = await reconciliation.reconcile();
    expect(summary.recovered).toBeGreaterThanOrEqual(1);

    expect(await getPlacementRemaining(guest.id)).toBe(4); // now recovered, decremented exactly once
    expect(await getPlacementRemaining(host.id)).toBe(4); // unrelated participant untouched by reconciliation

    void matchId;
  });

  // ================================================================
  // Part 14 #5 — stale PROCESSING lease recovery remains correct.
  // ================================================================
  it('reclaims a stale PROCESSING lease and decrements exactly once', async () => {
    const { host, roomId, matchId } = await makeFinishableMatch('stale-lease');

    jest.spyOn(dispatcher, 'processMatch').mockResolvedValueOnce([]);
    await arenaService.finishMatch(host.id, roomId, {} as any);
    jest.restoreAllMocks();

    expect(await getPlacementRemaining(host.id)).toBe(5); // never processed yet

    await harness.prisma.arenaProgressionRecord.create({
      data: {
        matchId,
        userId: host.id,
        status: 'PROCESSING',
        attempts: 1,
        leaseExpiresAt: new Date(Date.now() - 60000),
      },
    });

    const first = await reconciliation.reconcile();
    expect(first.recovered).toBeGreaterThanOrEqual(1);
    expect(await getPlacementRemaining(host.id)).toBe(4);

    const second = await reconciliation.reconcile();
    expect(second.recovered).toBe(0);
    expect(await getPlacementRemaining(host.id)).toBe(4); // unchanged by the repeat pass
  });

  // ================================================================
  // Part 14 #6 — concurrent reconciliation produces one final decrement.
  // ================================================================
  it('applies exactly one placement decrement when two reconciliation passes race', async () => {
    const { host, roomId } = await makeFinishableMatch('concurrent-reconcile');

    jest.spyOn(dispatcher, 'processMatch').mockResolvedValueOnce([]);
    await arenaService.finishMatch(host.id, roomId, {} as any);
    jest.restoreAllMocks();

    expect(await getPlacementRemaining(host.id)).toBe(5);

    await Promise.all([reconciliation.reconcile(), reconciliation.reconcile()]);

    expect(await getPlacementRemaining(host.id)).toBe(4);

    await reconciliation.reconcile();
    expect(await getPlacementRemaining(host.id)).toBe(4);
  });

  // ================================================================
  // Part 14 #7 — FRIEND_CHALLENGE does not consume placement.
  // ================================================================
  it('never consumes a placement slot for FRIEND_CHALLENGE (affectsElo:false)', async () => {
    const host = await makeUser('friend-no-placement-host');
    const guest = await makeUser('friend-no-placement-guest');
    const room = await arenaService.createRoom(host.id, {
      name: 'Friend no placement',
      visibility: 'PRIVATE',
      password: 'secret123',
      mode: 'FRIEND_CHALLENGE',
      teamFormat: 'SOLO_1V1',
      skill: 'Vocabulary',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    } as any);
    roomIds.push(room!.id);
    await arenaService.joinRoom(guest.id, room!.id, { password: 'secret123' } as any);
    const match = await harness.prisma.arenaMatch.findFirst({
      where: { roomId: room!.id },
      orderBy: { startedAt: 'desc' },
    });
    await harness.prisma.arenaParticipant.updateMany({
      where: { roomId: room!.id, userId: host.id },
      data: { score: 50, correct: 4, wrong: 0 },
    });
    await harness.prisma.arenaMatch.update({
      where: { id: match!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await arenaService.finishMatch(host.id, room!.id, {} as any);

    expect(await getPlacementRemaining(host.id)).toBe(5);
  });

  // ================================================================
  // Part 14 #8 — zero-effort forfeit does not consume placement.
  // ================================================================
  it('does not consume a placement slot on a zero-effort forfeit loss (disconnect before any answer)', async () => {
    const { host, guest, roomId } = await makeFinishableMatch('zero-effort-forfeit', {
      hostAnswered: true,
      guestAnswered: false,
    });
    // Re-open the match for a direct forfeit call (makeFinishableMatch
    // already pushed it past expiresAt for the normal-finish tests — here
    // we want the forfeit path specifically, which only requires
    // room.status === 'PLAYING', already true post-join).
    expect(await getPlacementRemaining(guest.id)).toBe(5);

    await arenaService.forfeitParticipant(roomId, guest.id);

    // Guest lost with zero correct+wrong -> exempted, slot NOT consumed.
    expect(await getPlacementRemaining(guest.id)).toBe(5);
    // Host won by forfeit with real answers recorded -> normal decrement.
    expect(await getPlacementRemaining(host.id)).toBe(4);
  });

  // ================================================================
  // Part 14 #9 — participated forfeit consumes exactly one placement.
  // ================================================================
  it('consumes exactly one placement slot on a forfeit loss after a meaningful attempt', async () => {
    const host2 = await makeUser('participated-forfeit-host');
    const guest2 = await makeUser('participated-forfeit-guest');
    const room = await arenaService.createRoom(host2.id, {
      name: 'Participated forfeit',
      visibility: 'PUBLIC',
      gameMode: 'SOLO_1V1',
      skill: 'Vocabulary',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    } as any);
    roomIds.push(room!.id);
    await arenaService.joinRoom(guest2.id, room!.id, {} as any);
    // Guest answered a few questions before disconnecting.
    await harness.prisma.arenaParticipant.updateMany({
      where: { roomId: room!.id, userId: guest2.id },
      data: { correct: 1, wrong: 2 },
    });

    expect(await getPlacementRemaining(guest2.id)).toBe(5);

    await arenaService.forfeitParticipant(room!.id, guest2.id);

    expect(await getPlacementRemaining(guest2.id)).toBe(4); // real attempt -> consumed normally
  });

  // ================================================================
  // Part 14 #10 / Part 7 #1 — browser reconnect within grace does not
  // prematurely consume placement (real socket, real grace timer).
  // ================================================================
  it('does not touch placement when the player reconnects within the disconnect grace window', async () => {
    const originalGrace = process.env.ARENA_DISCONNECT_GRACE_MS;
    process.env.ARENA_DISCONNECT_GRACE_MS = '500';
    try {
      const host = await makeUser('reconnect-grace-host');
      const guest = await makeUser('reconnect-grace-guest');
      const room = await arenaService.createRoom(host.id, {
        name: 'Reconnect grace',
        visibility: 'PUBLIC',
        gameMode: 'SOLO_1V1',
        skill: 'Vocabulary',
        winCondition: 'TIME',
        difficulty: 'A1',
        topic: 'Animals',
      } as any);
      roomIds.push(room!.id);
      await arenaService.joinRoom(guest.id, room!.id, {} as any);

      expect(await getPlacementRemaining(guest.id)).toBe(5);

      const firstClient = await connectAsParticipant(guest.id);
      await emitAck(firstClient, 'arena:room:join', { roomId: room!.id });
      firstClient.close();

      await new Promise((resolve) => setTimeout(resolve, 150));

      const secondClient = await connectAsParticipant(guest.id);
      const resumeAck = await emitAck<{ joined: boolean }>(secondClient, 'arena:resume', {
        roomId: room!.id,
      });
      expect(resumeAck.joined).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 700));

      const match = await harness.prisma.arenaMatch.findFirst({
        where: { roomId: room!.id },
        orderBy: { startedAt: 'desc' },
      });
      expect(match?.finishedAt).toBeNull(); // no forfeit happened at all
      expect(await getPlacementRemaining(guest.id)).toBe(5); // untouched
    } finally {
      if (originalGrace === undefined) delete process.env.ARENA_DISCONNECT_GRACE_MS;
      else process.env.ARENA_DISCONNECT_GRACE_MS = originalGrace;
    }
  });

  // ================================================================
  // Part 7 #4 — repeated disconnect events: no duplicate finalization,
  // no duplicate placement decrement.
  // ================================================================
  it('does not double-finalize or double-decrement under repeated forfeit calls for the same participant', async () => {
    const { guest, roomId } = await makeFinishableMatch('repeated-forfeit', {
      hostAnswered: true,
      guestAnswered: true,
    });

    const [a, b, c] = await Promise.all([
      arenaService.forfeitParticipant(roomId, guest.id).catch(() => null),
      arenaService.forfeitParticipant(roomId, guest.id).catch(() => null),
      arenaService.forfeitParticipant(roomId, guest.id).catch(() => null),
    ]);
    void a;
    void b;
    void c;

    const remainingAfterRace = await getPlacementRemaining(guest.id);
    expect(remainingAfterRace).toBe(4); // decremented exactly once despite 3 concurrent calls

    // A subsequent call is a pure no-op (match already finished).
    await arenaService.forfeitParticipant(roomId, guest.id);
    expect(await getPlacementRemaining(guest.id)).toBe(4);

    const rewardLogs = await harness.prisma.arenaRewardLog.count({ where: { userId: guest.id } });
    expect(rewardLogs).toBe(1);
  });

  // ================================================================
  // Part 14 #11 — placement completion notification is deduplicated.
  // ================================================================
  it('creates the placement-completed notification exactly once even if the completing match is dispatched twice', async () => {
    // Own, longer timeout — this test drives 5 sequential real matches plus
    // a 1.5s async-notification-settle wait, which occasionally exceeds the
    // file-level 60s default under cumulative test-suite load.
    const host = await makeUser('notif-dedup-host');
    // Drive to exactly 1 remaining, then complete on the 5th real match.
    for (let i = 1; i <= 4; i += 1) {
      const guest = await makeUser(`notif-dedup-guest-${i}`);
      const room = await arenaService.createRoom(host.id, {
        name: `Notif dedup ${i}`,
        visibility: 'PUBLIC',
        gameMode: 'SOLO_1V1',
        skill: 'Vocabulary',
        winCondition: 'TIME',
        difficulty: 'A1',
        topic: 'Animals',
      } as any);
      roomIds.push(room!.id);
      await arenaService.joinRoom(guest.id, room!.id, {} as any);
      const match = await harness.prisma.arenaMatch.findFirst({ where: { roomId: room!.id } });
      await harness.prisma.arenaParticipant.updateMany({
        where: { roomId: room!.id, userId: host.id },
        data: { score: 100, correct: 4, wrong: 0 },
      });
      await harness.prisma.arenaParticipant.updateMany({
        where: { roomId: room!.id, userId: guest.id },
        data: { score: 10, correct: 1, wrong: 3 },
      });
      await harness.prisma.arenaMatch.update({ where: { id: match!.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      await arenaService.finishMatch(host.id, room!.id, {} as any);
    }
    expect(await getPlacementRemaining(host.id)).toBe(1);

    const finalGuest = await makeUser('notif-dedup-final-guest');
    const finalRoom = await arenaService.createRoom(host.id, {
      name: 'Notif dedup final',
      visibility: 'PUBLIC',
      gameMode: 'SOLO_1V1',
      skill: 'Vocabulary',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    } as any);
    roomIds.push(finalRoom!.id);
    await arenaService.joinRoom(finalGuest.id, finalRoom!.id, {} as any);
    const finalMatch = await harness.prisma.arenaMatch.findFirst({ where: { roomId: finalRoom!.id } });
    await harness.prisma.arenaParticipant.updateMany({
      where: { roomId: finalRoom!.id, userId: host.id },
      data: { score: 100, correct: 4, wrong: 0 },
    });
    await harness.prisma.arenaParticipant.updateMany({
      where: { roomId: finalRoom!.id, userId: finalGuest.id },
      data: { score: 10, correct: 1, wrong: 3 },
    });
    await harness.prisma.arenaMatch.update({
      where: { id: finalMatch!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await arenaService.finishMatch(host.id, finalRoom!.id, {} as any);
    expect(await getPlacementRemaining(host.id)).toBe(0);

    // Duplicate dispatch of the exact completing match — must not fire the
    // event/notification a second time.
    await dispatcher.processMatch(finalMatch!.id);

    // Give the async EventEmitter2 listener + BullMQ notification job a
    // moment to land (critical-tier, queued — not synchronous with publish()).
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const notifications = await harness.prisma.notification.findMany({
      where: { recipientUserId: host.id, deduplicationKey: `arena:placement:${host.id}:completed` },
    });
    expect(notifications).toHaveLength(1);
  }, 90000);

  // ================================================================
  // Part 14 #14 — LeaderboardSeason rows remain unchanged.
  // ================================================================
  it('never mutates LeaderboardSeason rows while processing placement matches', async () => {
    const before = await harness.prisma.leaderboardSeason.findMany({ orderBy: { id: 'asc' } });

    const { host, roomId } = await makeFinishableMatch('leaderboard-isolation');
    await arenaService.finishMatch(host.id, roomId, {} as any);

    const after = await harness.prisma.leaderboardSeason.findMany({ orderBy: { id: 'asc' } });
    expect(after).toEqual(before);
  });

  // ================================================================
  // Part 11 — matchmaking soft preference (only if implemented).
  // ================================================================
  describe('Placement matchmaking soft preference', () => {
    it('prefers a same-placement-status opponent among multiple equally-valid candidates', async () => {
      const seeker = await makeUser('mm-pref-seeker');
      const nonPlacementCandidate = await makeUser('mm-pref-established');
      const placementCandidate = await makeUser('mm-pref-placement');

      // Make the "established" candidate look out-of-placement, and
      // explicitly create the "still in placement" candidate's profile too
      // (both via `upsert`, not `update` — ArenaProfile is created lazily,
      // and neither user has interacted with Arena yet, so no row exists
      // for either). Without this, the placement candidate's relation
      // filter (`user.arenaProfile.placementMatchesRemaining`) simply has
      // no row to match, and the query silently falls through.
      await harness.prisma.arenaProfile.upsert({
        where: { userId: nonPlacementCandidate.id },
        create: { userId: nonPlacementCandidate.id, placementMatchesRemaining: 0 },
        update: { placementMatchesRemaining: 0 },
      });
      await harness.prisma.arenaProfile.upsert({
        where: { userId: placementCandidate.id },
        create: { userId: placementCandidate.id, placementMatchesRemaining: 5 },
        update: { placementMatchesRemaining: 5 },
      });

      // Both candidates queue with identical mmr/skill/difficulty/topic so
      // either would be a valid match for `seeker` (who is still in
      // placement, remaining=5 by default).
      await harness.prisma.arenaQueue.create({
        data: {
          userId: nonPlacementCandidate.id,
          gameMode: 'SOLO_1V1',
          skill: 'Vocabulary',
          difficulty: 'A1',
          topic: 'Animals',
          mmr: 1500,
          searchMinMmr: 1450,
          searchMaxMmr: 1550,
        },
      });
      await harness.prisma.arenaQueue.create({
        data: {
          userId: placementCandidate.id,
          gameMode: 'SOLO_1V1',
          skill: 'Vocabulary',
          difficulty: 'A1',
          topic: 'Animals',
          mmr: 1500,
          searchMinMmr: 1450,
          searchMaxMmr: 1550,
        },
      });

      const result = await arenaService.enterQueue(seeker.id, {
        gameMode: 'SOLO_1V1',
        skill: 'Vocabulary',
        difficulty: 'A1',
        topic: 'Animals',
      } as any);

      expect((result as any).matched).toBe(true);
      const room = (result as any).room;
      roomIds.push(room.id);
      const opponentUserId = room.participants.find((p: { userId: string }) => p.userId !== seeker.id)?.userId;
      expect(opponentUserId).toBe(placementCandidate.id); // preferred, not the non-placement one

      // Clean up the untouched queue row (nonPlacementCandidate never matched).
      await harness.prisma.arenaQueue.deleteMany({ where: { userId: nonPlacementCandidate.id } });
    });

    it('still matches immediately with a normal candidate when no same-status candidate is available (never excludes)', async () => {
      const seeker = await makeUser('mm-fallback-seeker');
      const onlyCandidate = await makeUser('mm-fallback-established');
      await harness.prisma.arenaProfile.upsert({
        where: { userId: onlyCandidate.id },
        create: { userId: onlyCandidate.id, placementMatchesRemaining: 0 },
        update: { placementMatchesRemaining: 0 },
      });
      await harness.prisma.arenaQueue.create({
        data: {
          userId: onlyCandidate.id,
          gameMode: 'SOLO_1V1',
          skill: 'Vocabulary',
          difficulty: 'A1',
          topic: 'Animals',
          mmr: 1500,
          searchMinMmr: 1450,
          searchMaxMmr: 1550,
        },
      });

      const result = await arenaService.enterQueue(seeker.id, {
        gameMode: 'SOLO_1V1',
        skill: 'Vocabulary',
        difficulty: 'A1',
        topic: 'Animals',
      } as any);

      expect((result as any).matched).toBe(true); // matched immediately, not excluded
      roomIds.push((result as any).room.id);
    });
  });
});
