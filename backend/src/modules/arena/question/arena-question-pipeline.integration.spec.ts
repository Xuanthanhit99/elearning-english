import { ArenaService } from '../arena.service';
import { ArenaAiQuestionSource } from './arena-ai-question-source';
import { ArenaQuestionPipelineService } from './arena-question-pipeline.service';
import { createQuestionContentHash } from './arena-question-hash.util';
import { getArenaPreparationTimeoutMs } from '../mode/arena-capacity.util';
import {
  buildArenaTestApp,
  cleanupArenaTestData,
  closeArenaTestApp,
  createTestUser,
} from '../realtime/arena-realtime-test-utils';

jest.setTimeout(30000);

/**
 * Phase C.1 — real Postgres, no mocks of the pipeline/parser/validator/hash
 * code itself. The only thing stubbed is `ArenaAiQuestionSource.
 * generateCandidates` — the network boundary that talks to Gemini — which
 * mirrors how `generateCandidates` already behaves on total AI failure (it
 * catches and returns `[]` rather than throwing; see arena-ai-question-
 * source.ts). Everything downstream (parse/validate would already have run
 * *inside* the mocked candidates' construction in production, but here we
 * hand back already-"validated-shape" candidates directly since parser/
 * validator have their own dedicated unit-test files) — hash, dedup,
 * history, reusable-question lookup, static fallback, and the room
 * preparation state machine all run for real against real Postgres.
 */
function candidate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    type: 'MULTIPLE_CHOICE' as const,
    skill: 'Vocabulary',
    prompt: 'Prompt',
    options: ['A', 'B', 'C', 'D'],
    answer: 'A',
    explanation: 'Explanation',
    points: 10,
    ...overrides,
  };
}

function distinctAiCandidates(count: number, tag: string) {
  return Array.from({ length: count }, (_, index) =>
    candidate({ prompt: `[${tag}] AI question ${index + 1}`, skill: 'Vocabulary' }),
  );
}

describe('Arena question pipeline — integration (real Postgres)', () => {
  let harness: Awaited<ReturnType<typeof buildArenaTestApp>>;
  let arenaService: ArenaService;
  let aiSource: ArenaAiQuestionSource;
  let pipeline: ArenaQuestionPipelineService;
  const roomIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    harness = await buildArenaTestApp();
    arenaService = harness.app.get(ArenaService);
    aiSource = harness.app.get(ArenaAiQuestionSource);
    pipeline = harness.app.get(ArenaQuestionPipelineService);
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

  async function createRankedSoloRoom(hostId: string, tag: string, skill = 'Vocabulary') {
    const room = await arenaService.createRoom(hostId, {
      name: `Pipeline test ${tag}`,
      visibility: 'PUBLIC',
      gameMode: 'SOLO_1V1',
      skill,
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    } as any);
    roomIds.push(room!.id);
    return room!;
  }

  // ---------------------------------------------------------------------
  // Section 4: pipeline integration — AI success -> persist -> history -> match start
  // ---------------------------------------------------------------------
  it('on AI success: persists 8 hashed questions, records history for both participants, and starts the match', async () => {
    jest
      .spyOn(aiSource, 'generateCandidates')
      .mockResolvedValue(distinctAiCandidates(8, 'success'));

    const host = await makeUser('pipe-success-host');
    const guest = await makeUser('pipe-success-guest');
    const room = await createRankedSoloRoom(host.id, 'success');
    await arenaService.joinRoom(guest.id, room.id, {} as any);

    const finalRoom = await harness.prisma.arenaRoom.findUnique({ where: { id: room.id } });
    expect(finalRoom?.status).toBe('PLAYING');
    expect(finalRoom?.preparationError).toBeNull();

    const match = await harness.prisma.arenaMatch.findFirst({ where: { roomId: room.id } });
    expect(match).not.toBeNull();

    const questions = await harness.prisma.arenaQuestion.findMany({
      where: { matchId: match!.id },
      orderBy: { order: 'asc' },
    });
    expect(questions).toHaveLength(8);
    for (const q of questions) {
      expect(q.contentHash).toMatch(/^[0-9a-f]{64}$/);
    }

    const history = await harness.prisma.arenaUserQuestionHistory.findMany({
      where: { matchId: match!.id },
    });
    expect(history).toHaveLength(16); // 8 questions x 2 participants
    expect(new Set(history.map((h) => h.userId))).toEqual(new Set([host.id, guest.id]));
  });

  // ---------------------------------------------------------------------
  // Section 5: failure path — AI failure -> fallback insufficient -> FAILED -> retry -> success
  // ---------------------------------------------------------------------
  it('sets the room FAILED (with a preparationError, no questions/history persisted) when AI fails and the fallback pool is too small, then a retry with AI recovered succeeds', async () => {
    jest.spyOn(aiSource, 'generateCandidates').mockResolvedValueOnce([]); // simulates exhausted-retry AI failure

    // Uses "Grammar" (not "Vocabulary", the default used by other tests in
    // this file) so no other test's already-persisted questions can be
    // pulled in as reusable candidates and mask the failure this test means
    // to prove — Grammar's static fallback pool (3 Grammar + 2 Mixed = 5)
    // is, like Vocabulary's, below the hardcoded count of 8.
    const host = await makeUser('pipe-fail-host');
    const guest = await makeUser('pipe-fail-guest');
    const room = await createRankedSoloRoom(host.id, 'fail', 'Grammar');
    await arenaService.joinRoom(guest.id, room.id, {} as any);

    const failedRoom = await harness.prisma.arenaRoom.findUnique({ where: { id: room.id } });
    expect(failedRoom?.status).toBe('FAILED');
    expect(failedRoom?.preparationError).toEqual(expect.any(String));
    expect(failedRoom?.preparationError!.length).toBeGreaterThan(0);

    const matchBeforeRetry = await harness.prisma.arenaMatch.findFirst({ where: { roomId: room.id } });
    const questionsBeforeRetry = matchBeforeRetry
      ? await harness.prisma.arenaQuestion.findMany({ where: { matchId: matchBeforeRetry.id } })
      : [];
    expect(questionsBeforeRetry).toHaveLength(0);
    const historyBeforeRetry = await harness.prisma.arenaUserQuestionHistory.findMany({
      where: { userId: { in: [host.id, guest.id] } },
    });
    expect(historyBeforeRetry).toHaveLength(0);

    // AI recovers on the next call (default mock resolves for all subsequent calls).
    jest.spyOn(aiSource, 'generateCandidates').mockResolvedValue(distinctAiCandidates(8, 'retry'));

    const retried = await arenaService.retryPreparation(host.id, room.id);
    expect(retried?.status).toBe('PLAYING');
    expect(retried?.preparationError).toBeNull();

    const match = await harness.prisma.arenaMatch.findFirst({ where: { roomId: room.id } });
    const questions = await harness.prisma.arenaQuestion.findMany({ where: { matchId: match!.id } });
    expect(questions).toHaveLength(8);
  });

  // ---------------------------------------------------------------------
  // Section 6: concurrency — only one of two concurrent preparers claims the room; stale PREPARING is reclaimed
  // ---------------------------------------------------------------------
  it('lets only one of two concurrent ready-triggers prepare the match (CAS claim) — no duplicate match/questions', async () => {
    jest
      .spyOn(aiSource, 'generateCandidates')
      .mockResolvedValue(distinctAiCandidates(8, 'race'));

    const host = await makeUser('pipe-race-host');
    const guest = await makeUser('pipe-race-guest');
    const room = await createRankedSoloRoom(host.id, 'race');
    // Insert the guest directly (bypassing joinRoom's own auto-trigger) so
    // the room is left WAITING with both participants ready, and the
    // ready-triggered CAS race can be provoked deliberately below.
    await harness.prisma.arenaParticipant.create({
      data: { roomId: room.id, userId: guest.id, team: 'B', ready: true },
    });

    const results = await Promise.allSettled([
      arenaService.setReady(host.id, room.id, { ready: true } as any),
      arenaService.setReady(guest.id, room.id, { ready: true } as any),
    ]);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);

    const finalRoom = await harness.prisma.arenaRoom.findUnique({ where: { id: room.id } });
    expect(finalRoom?.status).toBe('PLAYING');

    const matches = await harness.prisma.arenaMatch.findMany({ where: { roomId: room.id } });
    expect(matches).toHaveLength(1);

    const questions = await harness.prisma.arenaQuestion.findMany({ where: { matchId: matches[0].id } });
    expect(questions).toHaveLength(8);
  });

  it('reclaims a stale PREPARING room (past the preparation timeout) instead of leaving it stuck forever', async () => {
    jest
      .spyOn(aiSource, 'generateCandidates')
      .mockResolvedValue(distinctAiCandidates(8, 'stale'));

    const host = await makeUser('pipe-stale-host');
    const guest = await makeUser('pipe-stale-guest');
    const room = await createRankedSoloRoom(host.id, 'stale');
    await harness.prisma.arenaParticipant.create({
      data: { roomId: room.id, userId: guest.id, team: 'B', ready: true },
    });

    const staleStartedAt = new Date(Date.now() - getArenaPreparationTimeoutMs() - 5000);
    await harness.prisma.arenaRoom.update({
      where: { id: room.id },
      data: { status: 'PREPARING', preparationStartedAt: staleStartedAt },
    });

    await arenaService.setReady(host.id, room.id, { ready: true } as any);

    const finalRoom = await harness.prisma.arenaRoom.findUnique({ where: { id: room.id } });
    expect(finalRoom?.status).toBe('PLAYING');

    const matches = await harness.prisma.arenaMatch.findMany({ where: { roomId: room.id } });
    expect(matches).toHaveLength(1);
  });

  it('leaves a fresh (non-stale) PREPARING room alone — a second ready-trigger is a no-op, not a duplicate preparer', async () => {
    jest
      .spyOn(aiSource, 'generateCandidates')
      .mockResolvedValue(distinctAiCandidates(8, 'fresh-preparing'));

    const host = await makeUser('pipe-fresh-host');
    const guest = await makeUser('pipe-fresh-guest');
    const room = await createRankedSoloRoom(host.id, 'fresh-preparing');
    await harness.prisma.arenaParticipant.create({
      data: { roomId: room.id, userId: guest.id, team: 'B', ready: true },
    });

    await harness.prisma.arenaRoom.update({
      where: { id: room.id },
      data: { status: 'PREPARING', preparationStartedAt: new Date() }, // fresh, not stale
    });

    // A second ready-trigger while genuinely still PREPARING (not stale) is
    // rejected outright — only a stale-PREPARING room accepts one.
    await expect(
      arenaService.setReady(host.id, room.id, { ready: true } as any),
    ).rejects.toThrow('Chỉ có thể sẵn sàng khi phòng đang chờ');

    const stillPreparing = await harness.prisma.arenaRoom.findUnique({ where: { id: room.id } });
    expect(stillPreparing?.status).toBe('PREPARING');
    const matches = await harness.prisma.arenaMatch.findMany({ where: { roomId: room.id } });
    expect(matches).toHaveLength(0);
  });

  // ---------------------------------------------------------------------
  // Section 7: history — recent exclusion, narrowed-window widening, reusable questions
  // ---------------------------------------------------------------------
  it('excludes a question the user has recently seen from a fresh AI batch containing it', async () => {
    const host = await makeUser('pipe-history-host');
    const seenCandidate = candidate({ prompt: '[history] previously seen question' });
    const seenHash = createQuestionContentHash(seenCandidate);

    await harness.prisma.arenaUserQuestionHistory.create({
      data: {
        userId: host.id,
        contentHash: seenHash,
        matchId: (
          await harness.prisma.arenaMatch.create({
            data: { roomId: (await createRankedSoloRoom(host.id, 'history-seed')).id },
          })
        ).id,
        skill: 'Vocabulary',
      },
    });

    jest.spyOn(aiSource, 'generateCandidates').mockResolvedValue([
      seenCandidate,
      ...distinctAiCandidates(8, 'history-fresh'),
    ]);

    const accepted = await pipeline.prepareQuestionSet({
      skill: 'Vocabulary',
      topic: 'Animals',
      difficulty: 'A1',
      mode: 'RANKED',
      userIds: [host.id],
      count: 8,
    });

    expect(accepted).toHaveLength(8);
    expect(accepted.some((c) => c.prompt === seenCandidate.prompt)).toBe(false);
  });

  it('narrows the history exclusion window when the pool is too small to fill a match otherwise', async () => {
    const NARROW_SKILL = 'Vocabulary-Narrow-Test'; // isolated from other tests' persisted rows
    const host = await makeUser('pipe-narrow-host');

    // Seed 3 already-persisted questions (as if from a prior real match) for
    // this isolated skill, and mark all 3 as "seen" by this user 2 days ago
    // — inside the normal 14-day exclusion window (so a plain lookup
    // excludes them) but outside the narrowed 1-day window (so narrowing
    // must be what lets the pipeline recover and reuse them).
    const seedRoom = await createRankedSoloRoom(host.id, 'narrow-seed', NARROW_SKILL);
    const seedMatch = await harness.prisma.arenaMatch.create({ data: { roomId: seedRoom.id } });
    const pool = distinctAiCandidates(3, 'narrow-pool').map((c) => ({ ...c, skill: NARROW_SKILL }));
    await harness.prisma.arenaQuestion.createMany({
      data: pool.map((c, index) => ({
        matchId: seedMatch.id,
        order: index + 1,
        type: c.type,
        skill: c.skill,
        prompt: c.prompt,
        options: c.options,
        answer: c.answer,
        explanation: c.explanation,
        points: c.points,
        contentHash: createQuestionContentHash(c),
      })),
    });
    const seenAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await harness.prisma.arenaUserQuestionHistory.createMany({
      data: pool.map((c) => ({
        userId: host.id,
        contentHash: createQuestionContentHash(c),
        matchId: seedMatch.id,
        skill: NARROW_SKILL,
        seenAt,
      })),
    });

    jest.spyOn(aiSource, 'generateCandidates').mockResolvedValueOnce([]); // AI contributes nothing this time

    const accepted = await pipeline.prepareQuestionSet({
      skill: NARROW_SKILL,
      topic: 'Animals',
      difficulty: 'A1',
      mode: 'RANKED',
      userIds: [host.id],
      count: 3,
    });

    // The plain (non-narrowed) 14-day lookup would exclude all 3 seeded
    // hashes and leave the pool empty; only the narrowed 1-day lookup lets
    // them back in, which is what proves narrowing actually ran.
    expect(accepted).toHaveLength(3);
    expect(accepted.every((c) => c.prompt.startsWith('[narrow-pool]'))).toBe(true);
  });

  it('reuses previously-persisted questions (matching contentHash) from another match of the same skill when AI returns nothing', async () => {
    jest
      .spyOn(aiSource, 'generateCandidates')
      .mockResolvedValueOnce(distinctAiCandidates(8, 'reusable-source'));

    const firstHost = await makeUser('pipe-reuse-source-host');
    const firstGuest = await makeUser('pipe-reuse-source-guest');
    const firstRoom = await createRankedSoloRoom(firstHost.id, 'reuse-source');
    await arenaService.joinRoom(firstGuest.id, firstRoom.id, {} as any);

    const firstMatch = await harness.prisma.arenaMatch.findFirst({ where: { roomId: firstRoom.id } });
    const firstQuestions = await harness.prisma.arenaQuestion.findMany({
      where: { matchId: firstMatch!.id },
    });
    expect(firstQuestions).toHaveLength(8);
    const firstHashes = new Set(firstQuestions.map((q) => q.contentHash));

    // Second match: different users (no history conflict), AI empty, no
    // static-fallback need — the 8 rows just persisted for the same skill
    // must be enough on their own via `loadReusableCandidates`.
    jest.spyOn(aiSource, 'generateCandidates').mockResolvedValueOnce([]);

    const secondHost = await makeUser('pipe-reuse-target-host');
    const secondGuest = await makeUser('pipe-reuse-target-guest');
    const secondRoom = await createRankedSoloRoom(secondHost.id, 'reuse-target');
    await arenaService.joinRoom(secondGuest.id, secondRoom.id, {} as any);

    const secondRoomRow = await harness.prisma.arenaRoom.findUnique({ where: { id: secondRoom.id } });
    expect(secondRoomRow?.status).toBe('PLAYING');

    const secondMatch = await harness.prisma.arenaMatch.findFirst({ where: { roomId: secondRoom.id } });
    const secondQuestions = await harness.prisma.arenaQuestion.findMany({
      where: { matchId: secondMatch!.id },
    });
    expect(secondQuestions).toHaveLength(8);
    const secondHashes = new Set(secondQuestions.map((q) => q.contentHash));
    const overlap = [...secondHashes].filter((h) => firstHashes.has(h));
    expect(overlap.length).toBeGreaterThan(0); // proves reuse, not a coincidence of fresh fallback content
  });
});
