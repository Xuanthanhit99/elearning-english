import { ArenaService } from '../arena.service';
import { ArenaQuestionPipelineService } from '../question/arena-question-pipeline.service';
import { ArenaProgressionDispatcherService } from './arena-progression-dispatcher.service';
import { ArenaReconciliationService } from './arena-reconciliation.service';
import { XpService } from '../../leaderboard/xp.service';
import {
  buildArenaTestApp,
  cleanupArenaTestData,
  closeArenaTestApp,
  createTestUser,
} from '../realtime/arena-realtime-test-utils';

jest.setTimeout(60000);

const mockCandidates = Array.from({ length: 4 }, (_, index) => ({
  type: 'MULTIPLE_CHOICE' as const,
  skill: 'Vocabulary',
  prompt: `Smoke question ${index + 1}`,
  options: ['A', 'B', 'C', 'D'],
  answer: 'A',
  explanation: `Explanation ${index + 1}`,
  points: 10,
}));

/**
 * Phase F1.1 acceptance gate, Part 2 — the explicit 14-step runtime smoke
 * checklist, run for real against local Postgres + Redis (via
 * `buildArenaTestApp`, the same harness every other Arena integration spec
 * uses). Each step is its own `it()` so the step number and its outcome
 * appear directly in the jest report as reproducible evidence, and each
 * step logs the concrete values it observed.
 *
 * Steps share state via the `ctx` object below (populated progressively) —
 * the same "several it()s sharing outer-scope state, run in file order"
 * idiom jest uses natively (no custom runner needed); `it()` blocks in a
 * single `describe` always run in declaration order.
 */
describe('Arena progression — explicit 14-step runtime smoke (Phase F1.1 Part 2)', () => {
  let harness: Awaited<ReturnType<typeof buildArenaTestApp>>;
  let arenaService: ArenaService;
  let dispatcher: ArenaProgressionDispatcherService;
  let reconciliation: ArenaReconciliationService;
  let xpService: XpService;
  const roomIds: string[] = [];
  const userIds: string[] = [];

  const ctx: {
    leaderboardSeasonBefore?: unknown;
    ranked?: { hostId: string; guestId: string; roomId: string; matchId: string };
    rankedHostMmrBefore?: number;
    rankedHostMmrAfterStep6?: number;
    rankedHostSnapshotAfterStep6?: unknown;
    rankedGuestSnapshotAfterStep6?: unknown;
    friend?: { hostId: string; guestId: string; roomId: string; matchId: string };
    friendHostMmrBefore?: number;
    reconcileMatch?: { hostId: string; guestId: string; roomId: string; matchId: string };
  } = {};

  beforeAll(async () => {
    harness = await buildArenaTestApp();
    arenaService = harness.app.get(ArenaService);
    dispatcher = harness.app.get(ArenaProgressionDispatcherService);
    reconciliation = harness.app.get(ArenaReconciliationService);
    xpService = harness.app.get(XpService);
    const pipeline = harness.app.get(ArenaQuestionPipelineService);
    jest.spyOn(pipeline, 'prepareQuestionSet').mockResolvedValue(mockCandidates);
  });

  afterAll(async () => {
    // STEP 14 — clean all smoke-test data. cleanupArenaTestData deletes
    // ArenaRewardLog/ArenaProgressionRecord/ArenaRatingHistory/matches/
    // rooms/participants/queue/profile/pet rows explicitly, then the User
    // rows themselves — UserXpProfile/XpTransaction/LeaderboardEntry all
    // cascade-delete on User deletion (schema: onDelete: Cascade), so no
    // separate leaderboard/XP cleanup step is needed.
    await cleanupArenaTestData(harness.prisma, roomIds, userIds);
    await closeArenaTestApp(harness);
  });

  async function makeUser(tag: string) {
    const user = await createTestUser(harness.prisma, tag);
    userIds.push(user.id);
    return user;
  }

  async function createRankedMatch(tag: string, hostScore: number, guestScore: number) {
    const host = await makeUser(`${tag}-host`);
    const guest = await makeUser(`${tag}-guest`);
    const room = await arenaService.createRoom(host.id, {
      name: `Smoke ${tag}`,
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
      data: { score: hostScore, correct: 3, wrong: 1 },
    });
    await harness.prisma.arenaParticipant.updateMany({
      where: { roomId: room!.id, userId: guest.id },
      data: { score: guestScore, correct: 1, wrong: 3 },
    });
    await harness.prisma.arenaMatch.update({
      where: { id: match!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    return { hostId: host.id, guestId: guest.id, roomId: room!.id, matchId: match!.id };
  }

  // ================================================================
  // STEP 13 (captured first, compared last) — LeaderboardSeason snapshot.
  // ================================================================
  it('STEP 13a: snapshots LeaderboardSeason rows before any Arena progression runs', async () => {
    const seasons = await harness.prisma.leaderboardSeason.findMany({
      orderBy: { id: 'asc' },
    });
    ctx.leaderboardSeasonBefore = seasons;
    // eslint-disable-next-line no-console
    console.log(
      `[STEP 13a evidence] LeaderboardSeason rows before: ${JSON.stringify(
        seasons.map((s) => ({ id: s.id, status: s.status, isActive: s.isActive, startsAt: s.startsAt, endsAt: s.endsAt })),
      )}`,
    );
    expect(Array.isArray(seasons)).toBe(true);
  });

  // ================================================================
  // STEP 1 — complete one RANKED SOLO_1V1 match.
  // ================================================================
  it('STEP 1: completes one RANKED SOLO_1V1 match', async () => {
    const before = await createRankedMatch('step1', 100, 10);
    ctx.ranked = before;

    const profileBefore = await harness.prisma.arenaProfile.findUnique({ where: { userId: before.hostId } });
    ctx.rankedHostMmrBefore = profileBefore!.mmr;

    const result = await arenaService.finishMatch(before.hostId, before.roomId, {} as any);

    // eslint-disable-next-line no-console
    console.log(
      `[STEP 1 evidence] finishMatch result: matchId=${result.match?.id} finishedAt=${result.match?.finishedAt} winnerTeam=${result.match?.winnerTeam}`,
    );
    expect(result.match?.id).toBe(before.matchId);
    expect(result.match?.finishedAt).toBeTruthy();
    expect(result.match?.winnerTeam).toBe('A'); // host is team A, higher score
  });

  // ================================================================
  // STEP 2 — match finalization commits before progression begins.
  // ================================================================
  it('STEP 2: match finalization is durably committed and progression records exist by the time finishMatch resolves', async () => {
    const { matchId } = ctx.ranked!;
    const match = await harness.prisma.arenaMatch.findUnique({ where: { id: matchId } });
    const records = await harness.prisma.arenaProgressionRecord.findMany({ where: { matchId } });

    // eslint-disable-next-line no-console
    console.log(
      `[STEP 2 evidence] match.finishedAt=${match?.finishedAt} progressionRecords=${JSON.stringify(
        records.map((r) => ({ userId: r.userId, status: r.status })),
      )}`,
    );
    expect(match?.finishedAt).toBeTruthy();
    // Both already COMPLETED by the time finishMatch's promise resolved —
    // proves processMatch is awaited synchronously after commit, not
    // fired-and-forgotten. The strict before/after transaction-ordering
    // proof (spy-instrumented call order) lives in
    // arena-reconciliation.integration.spec.ts's "finalizeMatch transaction
    // boundary" suite; this step re-confirms the observable outcome here.
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.status === 'COMPLETED')).toBe(true);
  });

  // ================================================================
  // STEP 3 — both participants receive exactly one progression result.
  // ================================================================
  it('STEP 3: both participants have exactly one ArenaProgressionRecord and one ArenaRewardLog', async () => {
    const { matchId, hostId, guestId } = ctx.ranked!;
    const records = await harness.prisma.arenaProgressionRecord.findMany({ where: { matchId } });
    const rewardLogs = await harness.prisma.arenaRewardLog.findMany({ where: { matchId } });

    // eslint-disable-next-line no-console
    console.log(`[STEP 3 evidence] progressionRecords=${records.length} rewardLogs=${rewardLogs.length}`);
    expect(records).toHaveLength(2);
    expect(rewardLogs).toHaveLength(2);
    expect(rewardLogs.filter((r) => r.userId === hostId)).toHaveLength(1);
    expect(rewardLogs.filter((r) => r.userId === guestId)).toHaveLength(1);
  });

  // ================================================================
  // STEP 4 — deterministic unique XP idempotency keys.
  // ================================================================
  it('STEP 4: XP transactions use the deterministic arena:xp:<matchId>:<userId> idempotency key', async () => {
    const { matchId, hostId, guestId } = ctx.ranked!;
    const hostTx = await harness.prisma.xpTransaction.findUnique({
      where: { idempotencyKey: `arena:xp:${matchId}:${hostId}` },
    });
    const guestTx = await harness.prisma.xpTransaction.findUnique({
      where: { idempotencyKey: `arena:xp:${matchId}:${guestId}` },
    });

    // eslint-disable-next-line no-console
    console.log(
      `[STEP 4 evidence] hostTx.idempotencyKey=${hostTx?.idempotencyKey} guestTx.idempotencyKey=${guestTx?.idempotencyKey}`,
    );
    expect(hostTx).toBeTruthy();
    expect(guestTx).toBeTruthy();
    expect(hostTx!.idempotencyKey).toBe(`arena:xp:${matchId}:${hostId}`);
    expect(guestTx!.idempotencyKey).toBe(`arena:xp:${matchId}:${guestId}`);
  });

  // ================================================================
  // STEP 5 — rating history contains before/after/delta.
  // ================================================================
  it('STEP 5: ArenaRatingHistory rows contain previousMmr/nextMmr/mmrDelta that reconcile arithmetically', async () => {
    const { matchId, hostId } = ctx.ranked!;
    const history = await harness.prisma.arenaRatingHistory.findUnique({
      where: { matchId_userId: { matchId, userId: hostId } },
    });

    // eslint-disable-next-line no-console
    console.log(
      `[STEP 5 evidence] previousMmr=${history?.previousMmr} nextMmr=${history?.nextMmr} mmrDelta=${history?.mmrDelta}`,
    );
    expect(history).toBeTruthy();
    expect(history!.nextMmr - history!.previousMmr).toBe(history!.mmrDelta);
    expect(history!.previousMmr).toBe(ctx.rankedHostMmrBefore);
  });

  // ================================================================
  // STEP 6 — ArenaProfile/current rating updated exactly once.
  // ================================================================
  it('STEP 6: ArenaProfile.mmr reflects exactly one applied delta', async () => {
    const { hostId, guestId } = ctx.ranked!;
    const hostProfile = await harness.prisma.arenaProfile.findUnique({ where: { userId: hostId } });
    const guestProfile = await harness.prisma.arenaProfile.findUnique({ where: { userId: guestId } });
    const history = await harness.prisma.arenaRatingHistory.findUnique({
      where: { matchId_userId: { matchId: ctx.ranked!.matchId, userId: hostId } },
    });

    // eslint-disable-next-line no-console
    console.log(`[STEP 6 evidence] hostProfile.mmr=${hostProfile?.mmr} expected(previousMmr+delta)=${history!.previousMmr + history!.mmrDelta}`);
    expect(hostProfile!.mmr).toBe(history!.previousMmr + history!.mmrDelta);
    ctx.rankedHostMmrAfterStep6 = hostProfile!.mmr;
    ctx.rankedHostSnapshotAfterStep6 = hostProfile;
    ctx.rankedGuestSnapshotAfterStep6 = guestProfile;
  });

  // ================================================================
  // STEP 7 — complete one FRIEND_CHALLENGE match.
  // ================================================================
  it('STEP 7: completes one FRIEND_CHALLENGE match', async () => {
    const host = await makeUser('step7-host');
    const guest = await makeUser('step7-guest');
    const room = await arenaService.createRoom(host.id, {
      name: 'Smoke friend',
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

    const profileBefore = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });
    ctx.friendHostMmrBefore = profileBefore!.mmr;

    const result = await arenaService.finishMatch(host.id, room!.id, {} as any);
    ctx.friend = { hostId: host.id, guestId: guest.id, roomId: room!.id, matchId: match!.id };

    // eslint-disable-next-line no-console
    console.log(`[STEP 7 evidence] FRIEND_CHALLENGE finishMatch result: matchId=${result.match?.id} finishedAt=${result.match?.finishedAt}`);
    expect(result.match?.finishedAt).toBeTruthy();
  });

  // ================================================================
  // STEP 8 — no ELO change, no rating-history record.
  // ================================================================
  it('STEP 8: FRIEND_CHALLENGE produces no ELO change and no ArenaRatingHistory row', async () => {
    const { hostId, matchId } = ctx.friend!;
    const profileAfter = await harness.prisma.arenaProfile.findUnique({ where: { userId: hostId } });
    const historyRows = await harness.prisma.arenaRatingHistory.findMany({ where: { matchId } });

    // eslint-disable-next-line no-console
    console.log(
      `[STEP 8 evidence] mmrBefore=${ctx.friendHostMmrBefore} mmrAfter=${profileAfter?.mmr} ratingHistoryRows=${historyRows.length}`,
    );
    expect(profileAfter!.mmr).toBe(ctx.friendHostMmrBefore);
    expect(historyRows).toHaveLength(0);
  });

  // ================================================================
  // STEP 9 — trigger duplicate finish and duplicate dispatcher processing.
  // ================================================================
  it('STEP 9: duplicate finish and duplicate direct dispatcher processing both run without error', async () => {
    const { hostId, guestId, roomId, matchId } = ctx.ranked!;

    const duplicateFinish = await arenaService.finishMatch(hostId, roomId, {} as any);
    const duplicateDispatch = await dispatcher.processMatch(matchId);

    // eslint-disable-next-line no-console
    console.log(
      `[STEP 9 evidence] duplicateFinish.match.id=${duplicateFinish.match?.id} duplicateDispatch=${JSON.stringify(
        duplicateDispatch.map((r) => r.status),
      )}`,
    );
    expect(duplicateFinish.match?.id).toBe(matchId);
    expect(duplicateDispatch.every((r) => r.status === 'COMPLETED')).toBe(true);
    void guestId;
  });

  // ================================================================
  // STEP 10 — no duplicate XP, Gold, Arena Points or rating from step 9.
  // ================================================================
  it('STEP 10: no duplicate XP/gold/arenaPoints/rating after the duplicate dispatch in step 9', async () => {
    const { hostId, guestId, matchId } = ctx.ranked!;

    const hostProfile = await harness.prisma.arenaProfile.findUnique({ where: { userId: hostId } });
    const guestProfile = await harness.prisma.arenaProfile.findUnique({ where: { userId: guestId } });
    const hostRewardLogs = await harness.prisma.arenaRewardLog.count({ where: { matchId, userId: hostId } });
    const guestRewardLogs = await harness.prisma.arenaRewardLog.count({ where: { matchId, userId: guestId } });
    const hostXpTx = await harness.prisma.xpTransaction.count({
      where: { idempotencyKey: `arena:xp:${matchId}:${hostId}` },
    });
    const hostRatingHistory = await harness.prisma.arenaRatingHistory.count({ where: { matchId, userId: hostId } });

    // eslint-disable-next-line no-console
    console.log(
      `[STEP 10 evidence] hostRewardLogs=${hostRewardLogs} guestRewardLogs=${guestRewardLogs} hostXpTx=${hostXpTx} hostRatingHistory=${hostRatingHistory} hostProfile=${JSON.stringify(
        hostProfile,
      )}`,
    );
    expect(hostRewardLogs).toBe(1);
    expect(guestRewardLogs).toBe(1);
    expect(hostXpTx).toBe(1);
    expect(hostRatingHistory).toBe(1);
    expect(hostProfile).toEqual(ctx.rankedHostSnapshotAfterStep6);
    expect(guestProfile).toEqual(ctx.rankedGuestSnapshotAfterStep6);
  });

  // ================================================================
  // STEP 11 — simulate one participant progression failure.
  // ================================================================
  it('STEP 11: simulates a deterministic single-participant progression failure', async () => {
    const match = await createRankedMatch('step11', 80, 5);
    ctx.reconcileMatch = match;

    const realAwardXpWithSideEffects = xpService.awardXpWithSideEffects.bind(xpService);
    const spy = jest
      .spyOn(xpService, 'awardXpWithSideEffects')
      .mockImplementation(async (input: any, sideEffects: any) => {
        if (input.userId === match.guestId) {
          throw new Error('[STEP 11] injected deterministic failure for guest participant');
        }
        return realAwardXpWithSideEffects(input, sideEffects);
      });

    await arenaService.finishMatch(match.hostId, match.roomId, {} as any);
    spy.mockRestore();

    const hostRecord = await harness.prisma.arenaProgressionRecord.findUnique({
      where: { matchId_userId: { matchId: match.matchId, userId: match.hostId } },
    });
    const guestRecord = await harness.prisma.arenaProgressionRecord.findUnique({
      where: { matchId_userId: { matchId: match.matchId, userId: match.guestId } },
    });

    // eslint-disable-next-line no-console
    console.log(`[STEP 11 evidence] hostRecord.status=${hostRecord?.status} guestRecord.status=${guestRecord?.status}`);
    expect(hostRecord?.status).toBe('COMPLETED');
    expect(guestRecord?.status).not.toBe('COMPLETED');
  });

  // ================================================================
  // STEP 12 — reconciliation completes only the missing participant.
  // ================================================================
  it('STEP 12: reconciliation completes only the missing participant, leaving unrelated already-completed matches untouched', async () => {
    const { hostId, guestId, matchId } = ctx.reconcileMatch!;

    // Snapshot the *already-completed* Step 1 match's state before running
    // reconciliation, to prove reconciliation only acts on the genuinely
    // incomplete gap and never re-touches unrelated finished work.
    const unrelatedHostBefore = await harness.prisma.arenaProfile.findUnique({
      where: { userId: ctx.ranked!.hostId },
    });

    const summary = await reconciliation.reconcile();

    const guestRecordAfter = await harness.prisma.arenaProgressionRecord.findUnique({
      where: { matchId_userId: { matchId, userId: guestId } },
    });
    const hostRecordAfter = await harness.prisma.arenaProgressionRecord.findUnique({
      where: { matchId_userId: { matchId, userId: hostId } },
    });
    const unrelatedHostAfter = await harness.prisma.arenaProfile.findUnique({
      where: { userId: ctx.ranked!.hostId },
    });

    // eslint-disable-next-line no-console
    console.log(
      `[STEP 12 evidence] reconcile summary=${JSON.stringify(summary)} guestRecordAfter.status=${guestRecordAfter?.status} hostRecordAfter.status=${hostRecordAfter?.status}`,
    );
    expect(summary.recovered).toBeGreaterThanOrEqual(1);
    expect(guestRecordAfter?.status).toBe('COMPLETED');
    expect(hostRecordAfter?.status).toBe('COMPLETED'); // was already complete, untouched
    expect(unrelatedHostAfter).toEqual(unrelatedHostBefore); // unrelated match's data unchanged

    const allRecordsForThisMatch = await harness.prisma.arenaProgressionRecord.findMany({ where: { matchId } });
    expect(allRecordsForThisMatch.every((r) => r.status === 'COMPLETED')).toBe(true);
  });

  // ================================================================
  // STEP 13b — LeaderboardSeason snapshot after all Arena processing.
  // ================================================================
  it('STEP 13b: LeaderboardSeason rows are byte-identical before and after all Arena progression/reconciliation work', async () => {
    const seasonsAfter = await harness.prisma.leaderboardSeason.findMany({ orderBy: { id: 'asc' } });

    // eslint-disable-next-line no-console
    console.log(
      `[STEP 13b evidence] LeaderboardSeason rows after: ${JSON.stringify(
        seasonsAfter.map((s) => ({ id: s.id, status: s.status, isActive: s.isActive, startsAt: s.startsAt, endsAt: s.endsAt })),
      )}`,
    );
    expect(seasonsAfter).toEqual(ctx.leaderboardSeasonBefore);

    // Documented, expected, DESIGNED cross-feature side effect (not a
    // violation): if an active weekly LeaderboardSeason exists, XpService's
    // own awardXpWithSideEffects bumps that user's LeaderboardEntry.periodXp
    // for ARENA-sourced XP too — see docs/arena-phase-f-design.md Part 1's
    // "This is correct and desired" note. This step only proves the SEASON
    // ROW ITSELF (status/isActive/dates — i.e. anything that would
    // constitute Arena closing, opening, or reconfiguring the weekly
    // league) is never mutated by Arena code.
    const activeSeason = (ctx.leaderboardSeasonBefore as any[]).find((s) => s.isActive);
    if (activeSeason) {
      const hostEntry = await harness.prisma.leaderboardEntry.findFirst({
        where: { userId: ctx.ranked!.hostId, group: { seasonId: activeSeason.id } },
      });
      // eslint-disable-next-line no-console
      console.log(
        `[STEP 13b evidence] Expected side effect (not a violation): host's weekly LeaderboardEntry.periodXp=${hostEntry?.periodXp ?? 'none created'}`,
      );
    }
  });
});
