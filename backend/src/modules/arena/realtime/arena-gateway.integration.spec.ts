import { Socket as ClientSocket } from 'socket.io-client';
import { ArenaService } from '../arena.service';
import { ArenaQuestionPipelineService } from '../question/arena-question-pipeline.service';
import { ArenaPresenceService } from './arena-presence.service';
import {
  buildArenaTestApp,
  cleanupArenaTestData,
  closeArenaTestApp,
  connectArenaClient,
  createTestUser,
  emitAck,
  signArenaToken,
  signExpiredArenaToken,
  waitForEvent,
} from './arena-realtime-test-utils';

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

describe('ArenaGateway (Gate D-Recovery integration)', () => {
  let harness: Awaited<ReturnType<typeof buildArenaTestApp>>;
  let arenaService: ArenaService;
  const roomIds: string[] = [];
  const userIds: string[] = [];
  const sockets: ClientSocket[] = [];

  beforeAll(async () => {
    harness = await buildArenaTestApp();
    arenaService = harness.app.get(ArenaService);
    const pipeline = harness.app.get(ArenaQuestionPipelineService);
    jest.spyOn(pipeline, 'prepareQuestionSet').mockResolvedValue(mockCandidates);
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

  // Both `createRoom` and `joinRoom` default new participants to `ready:
  // true`, so as soon as the second player joins a SOLO_1V1 room, the
  // countdown/match auto-starts (`beginRoomCountdown`) — the room is
  // already PLAYING with an open match by the time this resolves, no
  // explicit `setReady` call needed (and calling it again would 400, since
  // `setReady` only allows WAITING rooms).
  async function makeTwoPlayerRoom(tag: string) {
    const host = await makeUser(`${tag}-host`);
    const guest = await makeUser(`${tag}-guest`);
    const room = await arenaService.createRoom(host.id, {
      name: `Test room ${tag}`,
      visibility: 'PUBLIC',
      gameMode: 'SOLO_1V1',
      skill: 'Vocabulary',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    } as any);
    roomIds.push(room!.id);
    await arenaService.joinRoom(guest.id, room!.id, {} as any);
    return { host, guest, roomId: room!.id };
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

  describe('auth', () => {
    it('connects and emits arena:connected with a valid cookie', async () => {
      const user = await makeUser('auth-ok');
      const token = signArenaToken(harness.jwt, user.id);
      const outcome = await connectArenaClient(harness.port, token);
      track(outcome.client);
      expect(outcome.status).toBe('connected');
    });

    it('rejects a missing cookie with arena:unauthorized(INVALID_SESSION) then disconnects', async () => {
      const outcome = await connectArenaClient(harness.port);
      track(outcome.client);
      expect(outcome.status).toBe('unauthorized');
      if (outcome.status === 'unauthorized') {
        expect(outcome.code).toBe('INVALID_SESSION');
      }
      await outcome.disconnected;
    });

    it('rejects an expired token with arena:unauthorized(TOKEN_EXPIRED) then disconnects', async () => {
      const user = await makeUser('auth-expired');
      const token = signExpiredArenaToken(harness.jwt, user.id);
      const outcome = await connectArenaClient(harness.port, token);
      track(outcome.client);
      expect(outcome.status).toBe('unauthorized');
      if (outcome.status === 'unauthorized') {
        expect(outcome.code).toBe('TOKEN_EXPIRED');
      }
      await outcome.disconnected;
    });
  });

  describe('room join + snapshot', () => {
    it('rejects room join for a non-participant', async () => {
      const { roomId } = await makeTwoPlayerRoom('join-nonparticipant');
      const outsider = await makeUser('join-outsider');
      const client = await connectAsParticipant(outsider.id);

      const ack = await emitAck<{ joined: boolean }>(client, 'arena:room:join', { roomId });
      expect(ack.joined).toBe(false);
    });

    it('allows a participant to join and pushes an initial snapshot', async () => {
      const { host, roomId } = await makeTwoPlayerRoom('join-participant');
      const client = await connectAsParticipant(host.id);

      const snapshotPromise = waitForEvent<any>(client, 'arena:room:snapshot');
      const ack = await emitAck<{ joined: boolean; roomId: string }>(client, 'arena:room:join', {
        roomId,
      });
      expect(ack.joined).toBe(true);
      expect(ack.roomId).toBe(roomId);

      const snapshot = await snapshotPromise;
      expect(snapshot.id).toBe(roomId);
      expect(snapshot.isParticipant).toBe(true);
    });

    it('never reveals an unrevealed question answer/explanation in the socket snapshot', async () => {
      const { guest, roomId } = await makeTwoPlayerRoom('join-redaction');
      const client = await connectAsParticipant(guest.id);

      const snapshotPromise = waitForEvent<any>(client, 'arena:room:snapshot');
      await emitAck(client, 'arena:room:join', { roomId });
      const snapshot = await snapshotPromise;

      const match = snapshot.matches?.[0];
      expect(match).toBeTruthy();
      expect(match.questions.length).toBeGreaterThan(0);
      for (const question of match.questions) {
        expect(question.answer).toBeUndefined();
        expect(question.explanation).toBeUndefined();
      }
    });
  });

  describe('REST mutation -> realtime push', () => {
    it('pushes an updated snapshot with a bumped revision when a REST-equivalent mutation happens', async () => {
      const { host, guest, roomId } = await makeTwoPlayerRoom('push-on-mutation');
      const client = await connectAsParticipant(guest.id);

      const initialSnapshot = await (async () => {
        const p = waitForEvent<any>(client, 'arena:room:snapshot');
        await emitAck(client, 'arena:room:join', { roomId });
        return p;
      })();
      const initialRevision = initialSnapshot.revision;

      const pushPromise = waitForEvent<any>(client, 'arena:room:snapshot');
      await arenaService.createEvent(host.id, roomId, {
        type: 'PING',
        payload: { ping: 'Đẩy tốc độ' },
      } as any);
      const pushed = await pushPromise;

      expect(pushed.revision).toBeGreaterThan(initialRevision);
    });
  });

  describe('multi-tab presence', () => {
    it('keeps presence when one of two tabs for the same user disconnects', async () => {
      const { guest, roomId } = await makeTwoPlayerRoom('multi-tab');

      const tabA = await connectAsParticipant(guest.id);
      await emitAck(tabA, 'arena:room:join', { roomId });

      const tabB = await connectAsParticipant(guest.id);
      await emitAck(tabB, 'arena:room:join', { roomId });

      tabA.close();
      await new Promise((resolve) => setTimeout(resolve, 300));

      const presence = harness.app.get(ArenaPresenceService);
      const stillPresent = await presence.isPresent(roomId, guest.id);
      expect(stillPresent).toBe(true);
    });
  });

  describe('disconnect grace + SOLO_1V1 forfeit', () => {
    const originalGrace = process.env.ARENA_DISCONNECT_GRACE_MS;

    afterEach(() => {
      if (originalGrace === undefined) {
        delete process.env.ARENA_DISCONNECT_GRACE_MS;
      } else {
        process.env.ARENA_DISCONNECT_GRACE_MS = originalGrace;
      }
    });

    it('finalizes the match with the opponent as winner if the disconnected player never reconnects', async () => {
      process.env.ARENA_DISCONNECT_GRACE_MS = '300';
      const { host, guest, roomId } = await makeTwoPlayerRoom('grace-forfeit');

      const client = await connectAsParticipant(guest.id);
      await emitAck(client, 'arena:room:join', { roomId });

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 900));

      const match = await harness.prisma.arenaMatch.findFirst({
        where: { roomId },
        orderBy: { startedAt: 'desc' },
      });
      expect(match?.finishedAt).toBeTruthy();

      const hostParticipant = await harness.prisma.arenaParticipant.findUnique({
        where: { roomId_userId: { roomId, userId: host.id } },
      });
      expect(match?.winnerTeam).toBe(hostParticipant?.team);
    });

    it('cancels the grace timer and does not forfeit when the player reconnects via arena:resume in time', async () => {
      process.env.ARENA_DISCONNECT_GRACE_MS = '500';
      const { guest, roomId } = await makeTwoPlayerRoom('grace-resume');

      const firstClient = await connectAsParticipant(guest.id);
      await emitAck(firstClient, 'arena:room:join', { roomId });
      firstClient.close();

      await new Promise((resolve) => setTimeout(resolve, 150));

      const secondClient = await connectAsParticipant(guest.id);
      const resumeAck = await emitAck<{ joined: boolean }>(secondClient, 'arena:resume', {
        roomId,
      });
      expect(resumeAck.joined).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 700));

      const match = await harness.prisma.arenaMatch.findFirst({
        where: { roomId },
        orderBy: { startedAt: 'desc' },
      });
      expect(match?.finishedAt).toBeNull();
    });
  });
});
