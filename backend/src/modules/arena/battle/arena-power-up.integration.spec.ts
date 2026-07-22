import { ArenaService } from '../arena.service';
import { ArenaPowerUpService } from './arena-power-up.service';
import { getArenaQuestionWindowMs } from './arena-battle.constants';
import { ArenaQuestionPipelineService } from '../question/arena-question-pipeline.service';
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
  prompt: `Question ${index + 1}`,
  options: ['A', 'B', 'C', 'D'],
  answer: 'A',
  explanation: `Explanation ${index + 1}`,
  points: 10,
}));

/*
 * Real Postgres (not arena-fake-prisma.ts) is required here — the whole
 * point is proving the DB-level guarantees (unique-constraint idempotency,
 * conditional-updateMany CAS) actually hold under two real, separate
 * connections racing, which an in-memory fake with a promise-chained mutex
 * cannot prove (see arena-fake-prisma.ts's own docblock on this exact
 * limitation).
 */
describe('ArenaPowerUpService (Gate E integration)', () => {
  let harness: Awaited<ReturnType<typeof buildArenaTestApp>>;
  let arenaService: ArenaService;
  let powerUps: ArenaPowerUpService;
  const roomIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    harness = await buildArenaTestApp();
    arenaService = harness.app.get(ArenaService);
    powerUps = harness.app.get(ArenaPowerUpService);
    const pipeline = harness.app.get(ArenaQuestionPipelineService);
    jest.spyOn(pipeline, 'prepareQuestionSet').mockResolvedValue(mockCandidates);
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

  async function makeReadyRoom(tag: string) {
    const host = await makeUser(`${tag}-host`);
    const guest = await makeUser(`${tag}-guest`);
    const room = await arenaService.createRoom(host.id, {
      name: `Power-up test ${tag}`,
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
    return { host, guest, roomId: room!.id, matchId: match!.id };
  }

  /** Fast-forwards a freshly-started match past its countdown, keeping questionActivatedAt/questionDeadlineAt internally consistent (same technique as the Phase A unit-test `expireCountdown` helper, adapted for real Postgres rows). */
  async function fastForwardPastCountdown(roomId: string, matchId: string) {
    await harness.prisma.arenaRoom.update({
      where: { id: roomId },
      data: { countdownEndsAt: new Date(Date.now() - 1000) },
    });
    const windowMs = getArenaQuestionWindowMs();
    const questionActivatedAt = new Date(Date.now() - windowMs * 0.8);
    await harness.prisma.arenaMatch.update({
      where: { id: matchId },
      data: {
        questionActivatedAt,
        questionDeadlineAt: new Date(questionActivatedAt.getTime() + windowMs),
      },
    });
  }

  it('is idempotent under a real duplicate request with the same clientRequestId', async () => {
    const { host, roomId } = await makeReadyRoom('idempotent');
    const requestId = 'req-idempotent-1';

    const first = await powerUps.usePowerUp(host.id, roomId, {
      type: 'SHIELD',
      clientRequestId: requestId,
    });
    const second = await powerUps.usePowerUp(host.id, roomId, {
      type: 'SHIELD',
      clientRequestId: requestId,
    });

    expect(first.status).toBe('APPLIED');
    expect((second as any).idempotentReplay).toBe(true);

    const loadout = await harness.prisma.arenaMatchPowerUp.findFirst({
      where: { userId: host.id, type: 'SHIELD' },
    });
    expect(loadout?.remainingUses).toBe(0);
    expect(loadout?.usedCount).toBe(1);
  });

  it('rejects a retried clientRequestId whose payload changed', async () => {
    const { host, roomId } = await makeReadyRoom('conflict');
    await powerUps.usePowerUp(host.id, roomId, {
      type: 'SHIELD',
      clientRequestId: 'req-conflict',
    });

    await expect(
      powerUps.usePowerUp(host.id, roomId, {
        type: 'TIME_BOOST',
        clientRequestId: 'req-conflict',
      }),
    ).rejects.toThrow();
  });

  it('only lets one of two concurrent requests consume the last charge', async () => {
    const { host, roomId } = await makeReadyRoom('race');

    const results = await Promise.allSettled([
      powerUps.usePowerUp(host.id, roomId, { type: 'SHIELD', clientRequestId: 'race-a' }),
      powerUps.usePowerUp(host.id, roomId, { type: 'SHIELD', clientRequestId: 'race-b' }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const loadout = await harness.prisma.arenaMatchPowerUp.findFirst({
      where: { userId: host.id, type: 'SHIELD' },
    });
    expect(loadout?.remainingUses).toBe(0);
    expect(loadout?.usedCount).toBe(1);
  });

  it('rejects use beyond the registry-configured max uses per match', async () => {
    const { host, roomId } = await makeReadyRoom('out-of-uses');
    await powerUps.usePowerUp(host.id, roomId, { type: 'SHIELD', clientRequestId: 'once' });

    await expect(
      powerUps.usePowerUp(host.id, roomId, { type: 'SHIELD', clientRequestId: 'twice' }),
    ).rejects.toThrow();
  });

  it('always derives the target from the match server-side, ignoring any client-asserted target', async () => {
    const { host, guest, roomId } = await makeReadyRoom('server-target');
    // UsePowerUpDto has no targetUserId field at all — this test documents
    // that guarantee by construction: FREEZE always resolves to "the other
    // participant in this room", never a client-supplied id.
    const matchId = (await harness.prisma.arenaMatch.findFirst({ where: { roomId } }))!.id;
    await harness.prisma.arenaMatchPowerUp.create({
      data: { matchId, userId: host.id, type: 'FREEZE', remainingUses: 1 },
    });

    const result = await powerUps.usePowerUp(host.id, roomId, {
      type: 'FREEZE',
      clientRequestId: 'freeze-target',
    });
    expect(result.targetUserId).toBe(guest.id);
  });

  it('SHIELD blocks a FREEZE targeting the shielded player and consumes the shield charge instead of the target\'s time', async () => {
    const { host, guest, roomId } = await makeReadyRoom('shield-blocks-freeze');
    const matchId = (await harness.prisma.arenaMatch.findFirst({ where: { roomId } }))!.id;

    await powerUps.usePowerUp(guest.id, roomId, {
      type: 'SHIELD',
      clientRequestId: 'shield-1',
    });
    await harness.prisma.arenaMatchPowerUp.create({
      data: { matchId, userId: host.id, type: 'FREEZE', remainingUses: 1 },
    });

    const result = await powerUps.usePowerUp(host.id, roomId, {
      type: 'FREEZE',
      clientRequestId: 'freeze-1',
    });
    expect(result.status).toBe('BLOCKED');

    const guestParticipant = await harness.prisma.arenaParticipant.findUnique({
      where: { roomId_userId: { roomId, userId: guest.id } },
    });
    const guestState = await harness.prisma.arenaParticipantBattleState.findUnique({
      where: { matchId_participantId: { matchId, participantId: guestParticipant!.id } },
    });
    expect(guestState?.shieldCharges).toBe(0);
    expect(guestState?.deadlineOverrideAt).toBeNull();
  });

  it('DOUBLE_SCORE doubles the base score of the next correct, on-time answer and is then consumed', async () => {
    const { host, roomId, matchId } = await makeReadyRoom('double-score');
    await fastForwardPastCountdown(roomId, matchId);

    await powerUps.usePowerUp(host.id, roomId, {
      type: 'DOUBLE_SCORE',
      clientRequestId: 'ds-1',
    });

    const question = await harness.prisma.arenaQuestion.findFirst({
      where: { matchId, order: 1 },
    });
    const result = await arenaService.submitAnswer(host.id, roomId, question!.id, {
      answer: 'A',
    } as any);

    // base 10 x combo(1)=1.0 x speed(no bonus, mid-window)=1.0 x doubleScore=2.0 = 20
    expect(result.answer.points).toBe(20);
    expect((result as any).powerUpApplied).toBe(true);

    const effect = await harness.prisma.arenaPowerUpEffect.findFirst({
      where: { matchId, targetUserId: host.id, type: 'DOUBLE_SCORE' },
    });
    expect(effect?.status).toBe('CONSUMED');
  });

  it('rejects using a power-up not supported for the room\'s game mode', async () => {
    const host = await makeUser('team-mode-host');
    const room = await arenaService.createRoom(host.id, {
      name: 'Team mode room',
      visibility: 'PUBLIC',
      gameMode: 'TEAM_2V2',
      skill: 'Vocabulary',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    } as any);
    roomIds.push(room!.id);

    await expect(
      powerUps.usePowerUp(host.id, room!.id, {
        type: 'SHIELD',
        clientRequestId: 'wrong-mode',
      }),
    ).rejects.toThrow();
  });
});
