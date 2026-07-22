import { Socket as ClientSocket } from 'socket.io-client';
import { ArenaService } from '../arena.service';
import { ArenaQuestionPipelineService } from '../question/arena-question-pipeline.service';
import {
  buildArenaTestApp,
  cleanupArenaTestData,
  closeArenaTestApp,
  connectArenaClient,
  createTestUser,
  emitAck,
  signArenaToken,
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

/*
 * Proves the Redis Socket.IO adapter actually fans events out across
 * separate backend instances: a mutation executed on instance B's
 * ArenaService must reach a client that is only connected to instance A.
 */
describe('ArenaGateway cross-instance fan-out (Gate D-Recovery)', () => {
  let appA: Awaited<ReturnType<typeof buildArenaTestApp>>;
  let appB: Awaited<ReturnType<typeof buildArenaTestApp>>;
  const roomIds: string[] = [];
  const userIds: string[] = [];
  const sockets: ClientSocket[] = [];

  beforeAll(async () => {
    appA = await buildArenaTestApp();
    appB = await buildArenaTestApp();
    jest
      .spyOn(appA.app.get(ArenaQuestionPipelineService), 'prepareQuestionSet')
      .mockResolvedValue(mockCandidates);
    jest
      .spyOn(appB.app.get(ArenaQuestionPipelineService), 'prepareQuestionSet')
      .mockResolvedValue(mockCandidates);
  });

  afterAll(async () => {
    sockets.forEach((s) => s.close());
    await cleanupArenaTestData(appA.prisma, roomIds, userIds);
    await closeArenaTestApp(appA);
    await closeArenaTestApp(appB);
  });

  it('delivers a snapshot push triggered on instance B to a client connected only to instance A', async () => {
    const serviceA = appA.app.get(ArenaService);
    const serviceB = appB.app.get(ArenaService);

    const host = await createTestUser(appA.prisma, 'xinst-host');
    const guest = await createTestUser(appA.prisma, 'xinst-guest');
    userIds.push(host.id, guest.id);

    const room = await serviceA.createRoom(host.id, {
      name: 'Cross instance room',
      visibility: 'PUBLIC',
      gameMode: 'SOLO_1V1',
      skill: 'Vocabulary',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    } as any);
    roomIds.push(room!.id);
    await serviceA.joinRoom(guest.id, room!.id, {} as any);

    const token = signArenaToken(appA.jwt, guest.id);
    const outcome = await connectArenaClient(appA.port, token);
    expect(outcome.status).toBe('connected');
    const client = outcome.client;
    sockets.push(client);
    await emitAck(client, 'arena:room:join', { roomId: room!.id });

    const pushPromise = waitForEvent<any>(client, 'arena:room:snapshot', 10000);
    // Mutation executed through instance B's ArenaService/EventPublisher —
    // instance B's own ArenaRealtimeListener/gateway will emit to
    // `arena:user:<guestId>`, and only the Redis adapter can get that packet
    // to a socket that is physically connected to instance A's server.
    // (Room is already PLAYING by this point — both createRoom/joinRoom
    // default participants to ready:true, so the match auto-starts as soon
    // as the second player joins — `createEvent` is used here instead of
    // `setReady` since `setReady` only allows WAITING rooms.)
    await serviceB.createEvent(host.id, room!.id, {
      type: 'PING',
      payload: { ping: 'cross-instance' },
    } as any);

    const pushed = await pushPromise;
    expect(pushed.id).toBe(room!.id);
  });
});
