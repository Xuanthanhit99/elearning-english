import { ArenaAiQuestionSource } from './arena-ai-question-source';
import { getArenaQuestionWindowMs } from '../battle/arena-battle.constants';
import {
  arenaHttpRequest,
  buildArenaTestApp,
  cleanupArenaTestData,
  closeArenaTestApp,
  createTestUser,
  signArenaToken,
} from '../realtime/arena-realtime-test-utils';

jest.setTimeout(30000);

/**
 * Phase C.1, section 8 — runtime smoke test. Unlike the other Phase C.1
 * specs (which call `ArenaService`/`ArenaQuestionPipelineService` directly),
 * this one drives everything through real HTTP requests against a real,
 * listening NestJS server (`app.listen(0)`), going through the actual
 * `ArenaController` routes, the real `JwtAuthGuard`/cookie auth, and the real
 * whitelist `ValidationPipe` — plus real Postgres and real Redis (the
 * gateway's `RedisIoAdapter` is still wired up, matching production). Only
 * the Gemini network boundary (`ArenaAiQuestionSource.generateCandidates`)
 * is stubbed per test, exactly as in the other Phase C.1 integration specs.
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

function distinctAiCandidates(count: number, tag: string, skill = 'Vocabulary') {
  return Array.from({ length: count }, (_, index) =>
    candidate({ prompt: `[${tag}] AI question ${index + 1}`, skill }),
  );
}

describe('Arena runtime smoke — real HTTP API + Postgres + Redis', () => {
  let harness: Awaited<ReturnType<typeof buildArenaTestApp>>;
  let aiSource: ArenaAiQuestionSource;
  const roomIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    harness = await buildArenaTestApp();
    aiSource = harness.app.get(ArenaAiQuestionSource);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await cleanupArenaTestData(harness.prisma, roomIds, userIds);
    await closeArenaTestApp(harness);
  });

  async function makeAuthedUser(tag: string) {
    const user = await createTestUser(harness.prisma, tag);
    userIds.push(user.id);
    const token = signArenaToken(harness.jwt, user.id);
    return { user, token };
  }

  function req(token: string, method: string, path: string, body?: unknown) {
    return arenaHttpRequest(harness.port, token, method, path, body);
  }

  /** Same technique as `arena-power-up.integration.spec.ts` — pushes a freshly-started match's countdown/question-window into the past so `submitAnswer`'s "still counting down" guard doesn't block the smoke test. */
  async function fastForwardPastCountdown(roomId: string, matchId: string) {
    await harness.prisma.arenaRoom.update({
      where: { id: roomId },
      data: { countdownEndsAt: new Date(Date.now() - 1000) },
    });
    const windowMs = getArenaQuestionWindowMs();
    const questionActivatedAt = new Date(Date.now() - windowMs * 0.5);
    await harness.prisma.arenaMatch.update({
      where: { id: matchId },
      data: {
        questionActivatedAt,
        questionDeadlineAt: new Date(questionActivatedAt.getTime() + windowMs),
      },
    });
  }

  it('GET /arena/me bootstraps a profile over real HTTP with real cookie auth', async () => {
    const { token } = await makeAuthedUser('smoke-me');
    const res = await req(token, 'GET', '/me');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ winCount: 0, loseCount: 0 });
  });

  it('rejects a request with no auth cookie', async () => {
    const res = await fetch(`http://127.0.0.1:${harness.port}/arena/me`);
    expect(res.status).toBe(401);
  });

  it('RANKED SOLO_1V1: create -> join -> AI-prepared match starts -> battle-scored answer -> finish updates ELO', async () => {
    jest.spyOn(aiSource, 'generateCandidates').mockResolvedValue(distinctAiCandidates(8, 'ranked'));

    const { user: host, token: hostToken } = await makeAuthedUser('smoke-ranked-host');
    const { user: guest, token: guestToken } = await makeAuthedUser('smoke-ranked-guest');

    const created = await req(hostToken, 'POST', '/rooms', {
      name: 'Smoke ranked',
      visibility: 'PUBLIC',
      gameMode: 'SOLO_1V1',
      skill: 'Vocabulary',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    });
    expect(created.status).toBe(201);
    const roomId = created.body.id;
    roomIds.push(roomId);

    const joined = await req(guestToken, 'POST', `/rooms/${roomId}/join`, {});
    expect(joined.status).toBe(201);
    expect(joined.body.status).toBe('PLAYING');
    expect(joined.body.matches[0].questions).toHaveLength(8);

    const questionId = joined.body.matches[0].questions[0].id;
    await fastForwardPastCountdown(roomId, joined.body.matches[0].id);
    const answerRes = await req(hostToken, 'POST', `/rooms/${roomId}/questions/${questionId}/answer`, {
      answer: 'A',
    });
    expect(answerRes.status).toBe(201);
    expect(answerRes.body.answer.isCorrect).toBe(true);
    expect(answerRes.body.answer.points).toBeGreaterThan(0); // battle engine (combo/speed) ran for real

    // Only 1 of 8 questions was answered by 1 of 2 participants, so
    // `finishMatch`'s "all answered" guard won't pass — push the match's
    // hard deadline into the past instead (its other, equally-valid finish
    // condition) purely to unblock the finish call; the answer already
    // scored above is untouched by this.
    await harness.prisma.arenaMatch.update({
      where: { id: joined.body.matches[0].id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const profileBefore = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });
    const finished = await req(hostToken, 'POST', `/rooms/${roomId}/finish`, {});
    expect(finished.status).toBe(201);
    const profileAfter = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });
    expect(profileAfter!.mmr).not.toBe(profileBefore!.mmr); // RANKED affects ELO
  });

  it('FRIEND_CHALLENGE: private room requires PRIVATE visibility, matches, and never changes ELO', async () => {
    jest.spyOn(aiSource, 'generateCandidates').mockResolvedValue(distinctAiCandidates(8, 'friend'));

    const { user: host, token: hostToken } = await makeAuthedUser('smoke-friend-host');
    const { token: guestToken } = await makeAuthedUser('smoke-friend-guest');

    const rejectedPublic = await req(hostToken, 'POST', '/rooms', {
      name: 'Smoke friend (public - rejected)',
      visibility: 'PUBLIC',
      mode: 'FRIEND_CHALLENGE',
      teamFormat: 'SOLO_1V1',
      skill: 'Vocabulary',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    });
    expect(rejectedPublic.status).toBe(400);

    const created = await req(hostToken, 'POST', '/rooms', {
      name: 'Smoke friend',
      visibility: 'PRIVATE',
      password: 'secret123',
      mode: 'FRIEND_CHALLENGE',
      teamFormat: 'SOLO_1V1',
      skill: 'Vocabulary',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    });
    expect(created.status).toBe(201);
    const roomId = created.body.id;
    roomIds.push(roomId);

    const joined = await req(guestToken, 'POST', `/rooms/${roomId}/join`, { password: 'secret123' });
    expect(joined.status).toBe(201);
    expect(joined.body.status).toBe('PLAYING');

    // No answers submitted — push the deadline into the past so `finish`'s
    // "all answered OR time up" guard is satisfied via the time-up branch.
    await harness.prisma.arenaMatch.update({
      where: { id: joined.body.matches[0].id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const profileBefore = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });
    const finished = await req(hostToken, 'POST', `/rooms/${roomId}/finish`, {});
    expect(finished.status).toBe(201);
    const profileAfter = await harness.prisma.arenaProfile.findUnique({ where: { userId: host.id } });
    expect(profileAfter!.mmr).toBe(profileBefore!.mmr); // FRIEND_CHALLENGE never affects ELO
    expect(profileAfter!.gold).toBeGreaterThan(profileBefore!.gold); // still rewarding
  });

  it('rejects room creation for a disabled mode (AI_PRACTICE) over real HTTP', async () => {
    const { token } = await makeAuthedUser('smoke-disabled');
    const res = await req(token, 'POST', '/rooms', {
      name: 'Smoke disabled mode',
      visibility: 'PUBLIC',
      mode: 'AI_PRACTICE',
      teamFormat: 'SOLO',
      skill: 'Vocabulary',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    });
    expect(res.status).toBe(400);
  });

  it('fallback path: AI returns nothing but the static bank alone (skill=Mixed) is enough to start the match', async () => {
    jest.spyOn(aiSource, 'generateCandidates').mockResolvedValue([]);

    const { token: hostToken } = await makeAuthedUser('smoke-fallback-host');
    const { token: guestToken } = await makeAuthedUser('smoke-fallback-guest');

    const created = await req(hostToken, 'POST', '/rooms', {
      name: 'Smoke fallback',
      visibility: 'PUBLIC',
      gameMode: 'SOLO_1V1',
      skill: 'Mixed',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    });
    expect(created.status).toBe(201);
    const roomId = created.body.id;
    roomIds.push(roomId);

    const joined = await req(guestToken, 'POST', `/rooms/${roomId}/join`, {});
    expect(joined.status).toBe(201);
    expect(joined.body.status).toBe('PLAYING');
    expect(joined.body.matches[0].questions.length).toBeGreaterThan(0);
  });

  it('FAILED -> retry: a room stuck FAILED (fallback pool too small) recovers via the real retry endpoint once AI is healthy again', async () => {
    jest.spyOn(aiSource, 'generateCandidates').mockResolvedValueOnce([]);

    const { token: hostToken } = await makeAuthedUser('smoke-retry-host');
    const { token: guestToken } = await makeAuthedUser('smoke-retry-guest');

    const created = await req(hostToken, 'POST', '/rooms', {
      name: 'Smoke retry',
      visibility: 'PUBLIC',
      gameMode: 'SOLO_1V1',
      skill: 'Pronunciation', // narrow fallback pool (1 Pronunciation + 2 Mixed = 3, below the required 8)
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    });
    expect(created.status).toBe(201);
    const roomId = created.body.id;
    roomIds.push(roomId);

    const joined = await req(guestToken, 'POST', `/rooms/${roomId}/join`, {});
    expect(joined.status).toBe(201);
    expect(joined.body.status).toBe('FAILED');
    expect(typeof joined.body.preparationError).toBe('string');

    jest
      .spyOn(aiSource, 'generateCandidates')
      .mockResolvedValue(distinctAiCandidates(8, 'retry-recovered', 'Pronunciation'));

    const retried = await req(hostToken, 'POST', `/rooms/${roomId}/retry`, {});
    expect(retried.status).toBe(201);
    expect(retried.body.status).toBe('PLAYING');
    expect(retried.body.matches[0].questions).toHaveLength(8);
  });

  it('history: a second RANKED match for the same two users does not repeat any question from their first match', async () => {
    const { user: host, token: hostToken } = await makeAuthedUser('smoke-history-host');
    const { user: guest, token: guestToken } = await makeAuthedUser('smoke-history-guest');

    jest
      .spyOn(aiSource, 'generateCandidates')
      .mockResolvedValueOnce(distinctAiCandidates(8, 'history-first'));
    const firstRoom = await req(hostToken, 'POST', '/rooms', {
      name: 'Smoke history 1',
      visibility: 'PUBLIC',
      gameMode: 'SOLO_1V1',
      skill: 'Vocabulary',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    });
    roomIds.push(firstRoom.body.id);
    const firstJoin = await req(guestToken, 'POST', `/rooms/${firstRoom.body.id}/join`, {});
    const firstPrompts = new Set(
      firstJoin.body.matches[0].questions.map((q: { prompt: string }) => q.prompt),
    );
    // Finish (via the time-up branch, no answers needed) so `createRoom`
    // below sees the host as free to start a second room instead of
    // resolving back to this still-open one.
    await harness.prisma.arenaMatch.update({
      where: { id: firstJoin.body.matches[0].id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await req(hostToken, 'POST', `/rooms/${firstRoom.body.id}/finish`, {});

    // Second AI batch intentionally repeats 2 of the first match's prompts
    // plus 8 fresh ones — history exclusion must filter the repeats out.
    const repeatedFromFirst = distinctAiCandidates(8, 'history-first').slice(0, 2);
    jest.spyOn(aiSource, 'generateCandidates').mockResolvedValueOnce([
      ...repeatedFromFirst,
      ...distinctAiCandidates(8, 'history-second'),
    ]);
    const secondRoom = await req(hostToken, 'POST', '/rooms', {
      name: 'Smoke history 2',
      visibility: 'PUBLIC',
      gameMode: 'SOLO_1V1',
      skill: 'Vocabulary',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    });
    roomIds.push(secondRoom.body.id);
    const secondJoin = await req(guestToken, 'POST', `/rooms/${secondRoom.body.id}/join`, {});
    const secondPrompts: string[] = secondJoin.body.matches[0].questions.map(
      (q: { prompt: string }) => q.prompt,
    );

    expect(secondPrompts.some((p) => firstPrompts.has(p))).toBe(false);
  });
});
