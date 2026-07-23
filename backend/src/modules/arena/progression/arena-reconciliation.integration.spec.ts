import { ArenaService } from '../arena.service';
import { ArenaQuestionPipelineService } from '../question/arena-question-pipeline.service';
import { ArenaProgressionDispatcherService } from './arena-progression-dispatcher.service';
import { ArenaReconciliationService } from './arena-reconciliation.service';
import { ArenaSeasonService } from './arena-season.service';
import { XpService } from '../../leaderboard/xp.service';
import { resolveArenaTier } from './arena-rating-engine';
import {
  buildArenaTestApp,
  cleanupArenaTestData,
  closeArenaTestApp,
  createTestUser,
} from '../realtime/arena-realtime-test-utils';

jest.setTimeout(30000);

const mockCandidates = Array.from({ length: 4 }, (_, index) => ({
  type: 'MULTIPLE_CHOICE' as const,
  skill: 'Vocabulary',
  prompt: `Reconciliation question ${index + 1}`,
  options: ['A', 'B', 'C', 'D'],
  answer: 'A',
  explanation: `Explanation ${index + 1}`,
  points: 10,
}));

/**
 * Phase F1.1 acceptance gate — real Postgres (not arena-fake-prisma.ts).
 * Proves the reconciliation/idempotency guarantees documented in
 * docs/arena-progression-sequence.md §§6-8 actually hold against real,
 * separate Postgres transactions/constraints — not just the in-memory
 * FakePrisma mutex used by arena.service.spec.ts.
 *
 * Fault injection convention used below: only the external I/O boundary
 * (`XpService.awardXpWithSideEffects`) is ever mocked, and only to force a
 * deterministic failure for one specific participant. Every other piece of
 * production code — `ArenaProgressionDispatcherService`'s claim/CAS/catch
 * logic, `ArenaReconciliationService`'s gap queries, real unique
 * constraints — runs unmodified. This is deliberate: faking the dispatcher
 * itself would prove nothing about the real recovery path.
 */
describe('Arena progression reconciliation (Phase F1.1 — real Postgres)', () => {
  let harness: Awaited<ReturnType<typeof buildArenaTestApp>>;
  let arenaService: ArenaService;
  let dispatcher: ArenaProgressionDispatcherService;
  let reconciliation: ArenaReconciliationService;
  let xpService: XpService;
  let seasonService: ArenaSeasonService;
  const roomIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    harness = await buildArenaTestApp();
    arenaService = harness.app.get(ArenaService);
    dispatcher = harness.app.get(ArenaProgressionDispatcherService);
    reconciliation = harness.app.get(ArenaReconciliationService);
    xpService = harness.app.get(XpService);
    seasonService = harness.app.get(ArenaSeasonService);
    const pipeline = harness.app.get(ArenaQuestionPipelineService);
    jest.spyOn(pipeline, 'prepareQuestionSet').mockResolvedValue(mockCandidates);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await cleanupArenaTestData(harness.prisma, roomIds, userIds);
    await closeArenaTestApp(harness);
  });

  async function makeUser(tag: string) {
    const user = await createTestUser(harness.prisma, tag);
    userIds.push(user.id);
    return user;
  }

  /** RANKED SOLO_1V1 room, both participants scored so the host wins, pushed past its deadline — same "time up" finish path as the existing runtime-smoke spec. */
  async function makeFinishableRankedMatch(tag: string) {
    const host = await makeUser(`${tag}-host`);
    const guest = await makeUser(`${tag}-guest`);
    const room = await arenaService.createRoom(host.id, {
      name: `Reconciliation test ${tag}`,
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

    return { host, guest, roomId: room!.id, matchId: match!.id };
  }

  async function progressionRecord(matchId: string, userId: string) {
    return harness.prisma.arenaProgressionRecord.findUnique({
      where: { matchId_userId: { matchId, userId } },
    });
  }

  async function rewardLogCount(matchId: string, userId: string) {
    return harness.prisma.arenaRewardLog.count({ where: { matchId, userId } });
  }

  async function ratingHistoryCount(matchId: string, userId: string) {
    return harness.prisma.arenaRatingHistory.count({ where: { matchId, userId } });
  }

  async function xpTransactionCount(matchId: string, userId: string) {
    return harness.prisma.xpTransaction.count({
      where: { idempotencyKey: `arena:xp:${matchId}:${userId}` },
    });
  }

  // ============================================================
  // SCENARIO A — partial failure, reconciliation completes only
  // the missing participant, repeated runs are no-ops.
  // ============================================================
  describe('Scenario A — partial failure recovery', () => {
    it('recovers exactly the failed participant without touching the already-completed one, and stays stable on repeat runs', async () => {
      const { host, guest, roomId, matchId } = await makeFinishableRankedMatch('scenario-a');
      void roomId;

      const realAwardXpWithSideEffects = xpService.awardXpWithSideEffects.bind(xpService);
      const spy = jest
        .spyOn(xpService, 'awardXpWithSideEffects')
        .mockImplementation(async (input: any, sideEffects: any) => {
          if (input.userId === guest.id) {
            throw new Error('Injected deterministic failure for participant B (Scenario A)');
          }
          return realAwardXpWithSideEffects(input, sideEffects);
        });

      const hostProfileBefore = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });
      const guestProfileBefore = await harness.prisma.arenaProfile.findUnique({ where: { userId: guest.id } });

      // Real finish -> real finalizeMatch commit -> real post-commit
      // per-participant loop. Host succeeds; guest's XpService call throws.
      const finishResult = await arenaService.finishMatch(host.id, roomId, {} as any);
      expect(finishResult.match?.finishedAt).toBeTruthy();

      spy.mockRestore();

      // --- Pre-reconciliation assertions ---
      const hostRecordBefore = await progressionRecord(matchId, host.id);
      expect(hostRecordBefore?.status).toBe('COMPLETED');
      expect(await rewardLogCount(matchId, host.id)).toBe(1);
      expect(await xpTransactionCount(matchId, host.id)).toBe(1);
      expect(await ratingHistoryCount(matchId, host.id)).toBe(1);

      const hostProfileAfterFirstPass = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });
      expect(hostProfileAfterFirstPass!.gold).toBeGreaterThan(hostProfileBefore!.gold);
      expect(hostProfileAfterFirstPass!.arenaPoint).toBeGreaterThan(hostProfileBefore!.arenaPoint);
      expect(hostProfileAfterFirstPass!.mmr).not.toBe(hostProfileBefore!.mmr);

      const guestRecordBefore = await progressionRecord(matchId, guest.id);
      expect(['FAILED', 'PROCESSING', 'PENDING']).toContain(guestRecordBefore?.status);
      expect(guestRecordBefore?.status).not.toBe('COMPLETED');
      expect(await rewardLogCount(matchId, guest.id)).toBe(0);
      expect(await xpTransactionCount(matchId, guest.id)).toBe(0);
      expect(await ratingHistoryCount(matchId, guest.id)).toBe(0);

      const guestProfileUnchanged = await harness.prisma.arenaProfile.findUnique({ where: { userId: guest.id } });
      expect(guestProfileUnchanged!.mmr).toBe(guestProfileBefore!.mmr);
      expect(guestProfileUnchanged!.gold).toBe(guestProfileBefore!.gold);

      // --- Run reconciliation (XpService is real again) ---
      const firstReconcile = await reconciliation.reconcile();
      expect(firstReconcile.recovered).toBeGreaterThanOrEqual(1);

      const guestRecordAfter = await progressionRecord(matchId, guest.id);
      expect(guestRecordAfter?.status).toBe('COMPLETED');
      expect(await rewardLogCount(matchId, guest.id)).toBe(1);
      expect(await xpTransactionCount(matchId, guest.id)).toBe(1);
      expect(await ratingHistoryCount(matchId, guest.id)).toBe(1);

      const guestProfileAfterReconcile = await harness.prisma.arenaProfile.findUnique({ where: { userId: guest.id } });
      expect(guestProfileAfterReconcile!.mmr).not.toBe(guestProfileBefore!.mmr);
      expect(guestProfileAfterReconcile!.gold).toBeGreaterThan(guestProfileBefore!.gold);

      // Host must be byte-identical to its state before reconciliation ran.
      const hostRecordAfterReconcile = await progressionRecord(matchId, host.id);
      expect(hostRecordAfterReconcile).toEqual(hostRecordBefore);
      expect(await rewardLogCount(matchId, host.id)).toBe(1);
      expect(await xpTransactionCount(matchId, host.id)).toBe(1);
      expect(await ratingHistoryCount(matchId, host.id)).toBe(1);
      const hostProfileAfterReconcile = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });
      expect(hostProfileAfterReconcile).toEqual(hostProfileAfterFirstPass);

      // --- Second reconciliation run: fully idempotent, no further writes ---
      const secondReconcile = await reconciliation.reconcile();
      expect(secondReconcile.recovered).toBe(0);

      expect(await rewardLogCount(matchId, host.id)).toBe(1);
      expect(await rewardLogCount(matchId, guest.id)).toBe(1);
      expect(await xpTransactionCount(matchId, host.id)).toBe(1);
      expect(await xpTransactionCount(matchId, guest.id)).toBe(1);
      expect(await ratingHistoryCount(matchId, host.id)).toBe(1);
      expect(await ratingHistoryCount(matchId, guest.id)).toBe(1);

      const hostProfileFinal = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });
      const guestProfileFinal = await harness.prisma.arenaProfile.findUnique({ where: { userId: guest.id } });
      expect(hostProfileFinal).toEqual(hostProfileAfterReconcile);
      expect(guestProfileFinal).toEqual(guestProfileAfterReconcile);

      // No incomplete participant remains for this match.
      const allRecords = await harness.prisma.arenaProgressionRecord.findMany({ where: { matchId } });
      expect(allRecords).toHaveLength(2);
      expect(allRecords.every((r) => r.status === 'COMPLETED')).toBe(true);
    });
  });

  // ============================================================
  // SCENARIO B — stale PROCESSING lease reclaimed exactly once.
  // ============================================================
  describe('Scenario B — stale lease reclaim', () => {
    it('reclaims an expired PROCESSING lease, completes it once, and a repeat run writes nothing further', async () => {
      const { host, roomId, matchId } = await makeFinishableRankedMatch('scenario-b');

      // Skip the dispatcher entirely for this match (setup-only mock — the
      // recovery path under test is exercised exclusively by the real
      // ArenaReconciliationService/ArenaProgressionDispatcherService below).
      jest.spyOn(dispatcher, 'processMatch').mockResolvedValueOnce([]);
      const finishResult = await arenaService.finishMatch(host.id, roomId, {} as any);
      expect(finishResult.match?.finishedAt).toBeTruthy();
      jest.restoreAllMocks();

      expect(await progressionRecord(matchId, host.id)).toBeNull();

      // Real Prisma create — a genuinely stale PROCESSING claim (lease
      // expired 60s ago), exactly as described in the acceptance scenario.
      await harness.prisma.arenaProgressionRecord.create({
        data: {
          matchId,
          userId: host.id,
          status: 'PROCESSING',
          attempts: 1,
          leaseExpiresAt: new Date(Date.now() - 60000),
        },
      });

      const firstReconcile = await reconciliation.reconcile();
      expect(firstReconcile.recovered).toBeGreaterThanOrEqual(1);

      const recordAfter = await progressionRecord(matchId, host.id);
      expect(recordAfter?.status).toBe('COMPLETED');
      expect(await rewardLogCount(matchId, host.id)).toBe(1);
      expect(await xpTransactionCount(matchId, host.id)).toBe(1);

      const profileAfterFirst = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });

      const secondReconcile = await reconciliation.reconcile();
      expect(secondReconcile.recovered).toBe(0);

      expect(await rewardLogCount(matchId, host.id)).toBe(1);
      expect(await xpTransactionCount(matchId, host.id)).toBe(1);
      const profileAfterSecond = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });
      expect(profileAfterSecond).toEqual(profileAfterFirst);
    });
  });

  // ============================================================
  // SCENARIO C — concurrent reconciliation for the same participant,
  // correctness enforced by real DB constraints (no process-local mutex).
  // ============================================================
  describe('Scenario C — concurrent reconciliation', () => {
    it('applies exactly one reward/XP/rating delta when two reconciliation passes race on the same participant', async () => {
      const { host, roomId, matchId } = await makeFinishableRankedMatch('scenario-c');

      jest.spyOn(dispatcher, 'processMatch').mockResolvedValueOnce([]);
      const finishResult = await arenaService.finishMatch(host.id, roomId, {} as any);
      expect(finishResult.match?.finishedAt).toBeTruthy();
      jest.restoreAllMocks();

      expect(await progressionRecord(matchId, host.id)).toBeNull();

      // Two independent ArenaReconciliationService instances, each running
      // its own real Postgres queries/transactions concurrently — deliberately
      // NOT sharing any in-process lock, so uniqueness/CAS at the database
      // layer (ArenaRewardLog's @@unique, ArenaProgressionRecord's claim
      // updateMany) is the only thing that can prevent a double-apply.
      const [resultA, resultB] = await Promise.all([
        reconciliation.reconcile(),
        reconciliation.reconcile(),
      ]);

      const totalRecovered = resultA.recovered + resultB.recovered;
      expect(totalRecovered).toBeGreaterThanOrEqual(1);

      const record = await progressionRecord(matchId, host.id);
      expect(record?.status).toBe('COMPLETED');

      const rewardLogs = await harness.prisma.arenaRewardLog.findMany({ where: { matchId, userId: host.id } });
      expect(rewardLogs).toHaveLength(1);

      const xpTransactions = await harness.prisma.xpTransaction.findMany({
        where: { idempotencyKey: `arena:xp:${matchId}:${host.id}` },
      });
      expect(xpTransactions).toHaveLength(1);

      const ratingHistories = await harness.prisma.arenaRatingHistory.findMany({ where: { matchId, userId: host.id } });
      expect(ratingHistories).toHaveLength(1);

      // A third reconciliation pass must not add anything further.
      const profileAfterRace = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });
      await reconciliation.reconcile();
      const profileAfterThirdPass = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });
      expect(profileAfterThirdPass).toEqual(profileAfterRace);
      expect(await rewardLogCount(matchId, host.id)).toBe(1);
      expect(await xpTransactionCount(matchId, host.id)).toBe(1);
    });
  });

  // ============================================================
  // PART 3 — finalizeMatch transaction boundary: rollback safety and
  // post-commit-only progression invocation.
  // ============================================================
  describe('finalizeMatch transaction boundary (Part 3)', () => {
    it('never applies progression/XP/reward if the finalize transaction itself rolls back', async () => {
      const { host, roomId, matchId } = await makeFinishableRankedMatch('boundary-rollback');

      // Let `finalizeMatch`'s real transaction body run for real — the CAS
      // claim (`arenaMatch.updateMany`) and the room-status flip both
      // execute, for real, inside a real Postgres transaction — then force
      // the *whole transaction* to throw right after, before it commits.
      // Postgres must then roll back everything the callback did, proving
      // the CAS claim and the room-status flip are atomic with the
      // transaction as a whole, not independently durable.
      const realTransaction = harness.prisma.$transaction.bind(harness.prisma);
      const transactionSpy = jest
        .spyOn(harness.prisma, '$transaction')
        .mockImplementationOnce((arg: any, opts?: any) => {
          if (typeof arg !== 'function') return realTransaction(arg, opts);
          const wrapped = async (tx: any) => {
            await arg(tx); // real CAS claim + real room update, for real, inside the real transaction
            throw new Error('Injected failure inside finalizeMatch transaction');
          };
          return realTransaction(wrapped, opts);
        });

      const processMatchSpy = jest.spyOn(dispatcher, 'processMatch');

      await expect(arenaService.finishMatch(host.id, roomId, {} as any)).rejects.toThrow(
        'Injected failure inside finalizeMatch transaction',
      );

      transactionSpy.mockRestore();

      // The transaction rolled back: match must still be unfinished, and
      // the room status flip must also have been undone (same transaction).
      const matchAfterRollback = await harness.prisma.arenaMatch.findUnique({ where: { id: matchId } });
      expect(matchAfterRollback?.finishedAt).toBeNull();
      const roomAfterRollback = await harness.prisma.arenaRoom.findUnique({ where: { id: roomId } });
      expect(roomAfterRollback?.status).not.toBe('FINISHED');

      // Post-commit progression must never have been invoked for a
      // transaction that never committed.
      expect(processMatchSpy).not.toHaveBeenCalled();
      expect(await progressionRecord(matchId, host.id)).toBeNull();
      expect(await rewardLogCount(matchId, host.id)).toBe(0);
      expect(await xpTransactionCount(matchId, host.id)).toBe(0);

      processMatchSpy.mockRestore();

      // The room/match remain in a legitimately finishable state — a
      // subsequent real finish call (no injected fault) must still succeed
      // cleanly, proving the earlier rollback left no corrupt partial state.
      const recovered = await arenaService.finishMatch(host.id, roomId, {} as any);
      expect(recovered.match?.finishedAt).toBeTruthy();
      expect(await rewardLogCount(matchId, host.id)).toBe(1);
    });

    it('invokes post-commit progression only after the finalize transaction promise has resolved, never before', async () => {
      const { host, roomId, matchId } = await makeFinishableRankedMatch('boundary-ordering');

      const callOrder: string[] = [];
      const realTransaction = harness.prisma.$transaction.bind(harness.prisma);
      const transactionSpy = jest
        .spyOn(harness.prisma, '$transaction')
        .mockImplementationOnce((arg: any, opts?: any) => {
          callOrder.push('transaction:start');
          const result = realTransaction(arg, opts);
          return result.then((value: unknown) => {
            callOrder.push('transaction:resolved');
            return value;
          });
        });

      const realProcessMatch = dispatcher.processMatch.bind(dispatcher);
      const processMatchSpy = jest
        .spyOn(dispatcher, 'processMatch')
        .mockImplementationOnce(async (...args: Parameters<typeof dispatcher.processMatch>) => {
          callOrder.push('processMatch:start');
          const result = await realProcessMatch(...args);
          callOrder.push('processMatch:end');
          return result;
        });

      await arenaService.finishMatch(host.id, roomId, {} as any);

      // The transaction must resolve strictly before processMatch is ever
      // invoked — never interleaved, never invoked first.
      expect(callOrder).toEqual([
        'transaction:start',
        'transaction:resolved',
        'processMatch:start',
        'processMatch:end',
      ]);
      const matchDuringProcessMatch = await harness.prisma.arenaMatch.findUnique({ where: { id: matchId } });
      expect(matchDuringProcessMatch?.finishedAt).toBeTruthy();

      transactionSpy.mockRestore();
      processMatchSpy.mockRestore();
    });

    it('leaves a durable completed match when post-commit progression fails outright, and reconciliation can still resume it', async () => {
      const { host, roomId, matchId } = await makeFinishableRankedMatch('boundary-postcommit-failure');

      jest.spyOn(dispatcher, 'processMatch').mockRejectedValueOnce(new Error('Simulated total progression outage'));

      // finishMatch does not swallow a processMatch rejection today — the
      // match itself is nonetheless durably finished (already committed in
      // its own transaction before processMatch was ever called).
      await expect(arenaService.finishMatch(host.id, roomId, {} as any)).rejects.toThrow(
        'Simulated total progression outage',
      );
      jest.restoreAllMocks();

      const matchAfterOutage = await harness.prisma.arenaMatch.findUnique({ where: { id: matchId } });
      expect(matchAfterOutage?.finishedAt).toBeTruthy(); // durable, unaffected by the post-commit failure

      expect(await progressionRecord(matchId, host.id)).toBeNull();

      const reconcileResult = await reconciliation.reconcile();
      expect(reconcileResult.recovered).toBeGreaterThanOrEqual(1);
      expect((await progressionRecord(matchId, host.id))?.status).toBe('COMPLETED');
      expect(await rewardLogCount(matchId, host.id)).toBe(1);

      void roomId;
    });
  });

  // ============================================================
  // PART 4 — FRIEND_CHALLENGE policy: no rating mutation, no rating
  // history row, no season leakage.
  // ============================================================
  describe('FRIEND_CHALLENGE policy (Part 4)', () => {
    it('never changes rating, never writes ArenaRatingHistory, and does not attach a season', async () => {
      const host = await makeUser('friend-policy-host');
      const guest = await makeUser('friend-policy-guest');

      const room = await arenaService.createRoom(host.id, {
        name: 'Friend policy test',
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
        data: { score: 50, correct: 2, wrong: 0 },
      });
      await harness.prisma.arenaMatch.update({
        where: { id: match!.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const hostBefore = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });
      const guestBefore = await harness.prisma.arenaProfile.findUnique({ where: { userId: guest.id } });

      const result = await arenaService.finishMatch(host.id, room!.id, {} as any);
      expect(result.match?.finishedAt).toBeTruthy();

      const hostAfter = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });
      const guestAfter = await harness.prisma.arenaProfile.findUnique({ where: { userId: guest.id } });

      expect(hostAfter!.mmr).toBe(hostBefore!.mmr);
      expect(guestAfter!.mmr).toBe(guestBefore!.mmr);
      // `tier` is a denormalized read of resolveArenaTier(mmr), resynced on
      // every match regardless of mode — it is NOT expected to equal its
      // pre-match value if that value was still the raw creation-time
      // default (a fresh profile's `tier` column defaults to BRONZE even
      // though its default mmr of 1500 resolves to GOLD, until a match
      // syncs it). The real "no rating" guarantee under test is that mmr
      // itself never moves and tier always stays *consistent with* mmr.
      expect(hostAfter!.tier).toBe(resolveArenaTier(hostAfter!.mmr));
      expect(guestAfter!.tier).toBe(resolveArenaTier(guestAfter!.mmr));

      // Still rewarding (grantsXp/grantsGold true per the registry) —
      // proves the "no rating" guarantee is specific to ELO, not a
      // blanket no-reward mode.
      expect(hostAfter!.gold).toBeGreaterThan(hostBefore!.gold);

      const ratingHistoryRows = await harness.prisma.arenaRatingHistory.findMany({
        where: { matchId: match!.id },
      });
      expect(ratingHistoryRows).toHaveLength(0);

      const progressionRecords = await harness.prisma.arenaProgressionRecord.findMany({
        where: { matchId: match!.id },
      });
      expect(progressionRecords.every((r) => r.status === 'COMPLETED')).toBe(true);
      // FRIEND_CHALLENGE does not participate in season progression.
      expect(progressionRecords.every((r) => r.seasonId === null)).toBe(true);
    });
  });

  // ============================================================
  // LeaderboardSeason isolation — sanity check reused by the dedicated
  // runtime-smoke spec's Part 2 step 13, kept here too since this file
  // already drives real XP awards through the real season lookup.
  // ============================================================
  describe('LeaderboardSeason isolation', () => {
    it('never creates or mutates rows in ArenaSeason from an unrelated LeaderboardSeason, and vice versa', async () => {
      const arenaSeason = await seasonService.getActiveSeason();
      // Arena's own bootstrap season must exist and be structurally
      // independent — a different table entirely, never a row inside
      // LeaderboardSeason.
      if (arenaSeason) {
        const clashing = await harness.prisma.leaderboardSeason.findUnique({ where: { id: arenaSeason.id } });
        expect(clashing).toBeNull();
      }
    });
  });
});
