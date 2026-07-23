// Test-only helpers for Gate D-Recovery gateway integration tests. Boots a
// real NestJS app (real Postgres via PrismaModule, real Redis via
// RedisIoAdapter) and connects real socket.io-client sockets against it —
// deliberately not using arena-fake-prisma.ts here, since concurrency/
// cross-instance/disconnect-grace behavior needs a real Postgres + Redis to
// prove anything.
import { randomUUID } from 'crypto';
import { BullModule } from '@nestjs/bullmq';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { getJwtAccessSecret } from '../../auth/auth-secrets.util';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { RedisIoAdapter } from '../../../realtime/redis-io.adapter';
import { ArenaModule } from '../arena.module';

/**
 * Boots a real NestJS app with real Postgres (PrismaModule) and real Redis
 * (RedisIoAdapter) — used by both the Gate D-Recovery socket integration
 * tests and the Phase C.1 REST/runtime-smoke tests. Also wires up
 * cookie-parser + the real JwtStrategy + a whitelist ValidationPipe so HTTP
 * calls against `ArenaController` go through the same auth/validation path
 * as production (`main.ts`), not a test-only shortcut. `JwtStrategy` has no
 * DB dependency (see its `validate()`), so importing just it + PassportModule
 * — not the full `AuthModule` (OAuth strategies, mail, etc.) — is sufficient
 * and avoids pulling in unrelated env-var requirements.
 *
 * Phase F1: `ArenaModule` now imports `LeaderboardModule`, whose own
 * `LeaderboardCookieAuthService` needs a bare `JwtService` — in production
 * this comes for free from `AuthModule` (`@Global()`, exports `JwtModule`),
 * which this harness deliberately doesn't import (see above). Registering
 * `JwtModule` here with `global: true` (a `@nestjs/jwt` option) reproduces
 * just that one effect for every module in this test app, without pulling
 * in the rest of `AuthModule`.
 *
 * `ArenaModule`/`LeaderboardModule`/`NotificationsModule`/`AchievementsModule`
 * (the achievement listener side) all register BullMQ queues now, each of
 * which needs a real `Worker` backed by a real Redis connection —
 * `BullModule.forRoot({connection})` (same shape as `app.module.ts`'s
 * `BullModule.forRootAsync`) provides that connection app-wide, same as
 * production.
 */
export async function buildArenaTestApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [
      EventEmitterModule.forRoot(),
      PrismaModule,
      PassportModule,
      JwtModule.register({ global: true, secret: getJwtAccessSecret() }),
      BullModule.forRoot({
        connection: {
          host: process.env.REDIS_HOST ?? '127.0.0.1',
          port: Number(process.env.REDIS_PORT ?? 6379),
          password: process.env.REDIS_PASSWORD || undefined,
        },
      }),
      ArenaModule,
    ],
    providers: [JwtStrategy],
  }).compile();

  const app = moduleRef.createNestApplication();
  const redisIoAdapter = new RedisIoAdapter(app);
  redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  await app.init();
  await app.listen(0);

  return {
    app,
    redisIoAdapter,
    prisma: app.get(PrismaService),
    jwt: app.get(JwtService),
    port: getPort(app),
  };
}

/** Base URL for real HTTP calls against the harness's listening server. */
export function arenaHttpBaseUrl(port: number) {
  return `http://127.0.0.1:${port}/arena`;
}

/** `fetch` wrapper that authenticates via the same `access_token` cookie the real frontend sends. */
export async function arenaHttpRequest(
  port: number,
  token: string,
  method: string,
  path: string,
  body?: unknown,
) {
  const response = await fetch(`${arenaHttpBaseUrl(port)}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `access_token=${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : undefined;
  return { status: response.status, body: json };
}

export async function closeArenaTestApp(harness: {
  app: INestApplication;
  redisIoAdapter: RedisIoAdapter;
}) {
  await harness.app.close();
  await harness.redisIoAdapter.closeRedisClients();
}

function getPort(app: INestApplication): number {
  const address = app.getHttpServer().address();
  if (typeof address === 'object' && address) return address.port;
  throw new Error('Test HTTP server has no address');
}

export function signArenaToken(jwt: JwtService, userId: string) {
  return jwt.sign(
    { sub: userId },
    { secret: getJwtAccessSecret(), expiresIn: '1h' },
  );
}

export function signExpiredArenaToken(jwt: JwtService, userId: string) {
  return jwt.sign(
    { sub: userId },
    { secret: getJwtAccessSecret(), expiresIn: '-10s' },
  );
}

/*
 * Synchronous on purpose: the server can respond (e.g. `arena:connected`)
 * essentially in the same tick as the connection handshake. Any listener
 * that needs to observe the very first server packet(s) must be registered
 * with `client.once(...)` *before* awaiting anything — see
 * `connectArenaClient` below for the safe pattern. A version of this helper
 * that returned a Promise resolved on `connect` was tried first and lost
 * events to exactly this race (listener attached one microtask too late).
 */
export function createArenaClient(port: number, token?: string): ClientSocket {
  return io(`http://127.0.0.1:${port}/arena`, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    extraHeaders: token ? { Cookie: `access_token=${token}` } : undefined,
  });
}

export type ArenaConnectOutcome =
  | { status: 'connected'; client: ClientSocket; disconnected: Promise<string> }
  | { status: 'unauthorized'; client: ClientSocket; code: string; disconnected: Promise<string> };

/**
 * Connects and waits for the gateway's own post-handshake signal
 * (`arena:connected` on success, `arena:unauthorized` on failure) instead of
 * the transport-level `connect` event, so there's no window where the
 * server's first packet can be emitted before a listener exists. The
 * `arena:connected`/`arena:unauthorized` listeners are therefore already
 * consumed by the time this resolves — callers should not `waitForEvent`
 * for them again on the same client.
 *
 * `disconnected` is captured synchronously at client creation for the same
 * reason: on the unauthorized path the server emits `arena:unauthorized`
 * and force-disconnects back-to-back, and a `disconnect` listener attached
 * only after awaiting this function's return can already be too late.
 */
export function connectArenaClient(port: number, token?: string): Promise<ArenaConnectOutcome> {
  const client = createArenaClient(port, token);
  const disconnected = safe(
    new Promise<string>((resolve) => client.once('disconnect', (reason) => resolve(reason))),
  );

  // Deliberately not composed from independent `waitForEvent` calls raced
  // against each other: whichever one "loses" the race would leave its own
  // 5s timeout dangling as an open handle for the rest of the process's
  // life (nothing ever clears a timer for an event that never arrives). A
  // single shared timeout with explicit listener teardown avoids that.
  const outcome = new Promise<ArenaConnectOutcome>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('timed out waiting for arena:connected/arena:unauthorized'));
    }, 5000);

    const onConnected = () => {
      cleanup();
      resolve({ status: 'connected', client, disconnected });
    };
    const onUnauthorized = (payload: { code: string }) => {
      cleanup();
      resolve({ status: 'unauthorized', client, code: payload.code, disconnected });
    };
    const onConnectError = (error: Error) => {
      cleanup();
      reject(error);
    };

    function cleanup() {
      clearTimeout(timeout);
      client.off('arena:connected', onConnected);
      client.off('arena:unauthorized', onUnauthorized);
      client.off('connect_error', onConnectError);
    }

    client.once('arena:connected', onConnected);
    client.once('arena:unauthorized', onUnauthorized);
    client.once('connect_error', onConnectError);
  });

  return safe(outcome).catch((error) => {
    client.close();
    throw error;
  });
}

// Marks a promise as "handled" for Node's unhandled-rejection detector
// without consuming it — callers can still await/catch the exact same
// promise instance normally. Needed because integration tests create
// several `waitForEvent`/`emitAck` promises per case, and a test that
// throws before reaching one of its own `await`s would otherwise leave that
// promise's eventual timeout-rejection unhandled, which crashes the whole
// Node process (not just fails the test) once it fires later.
function safe<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => undefined);
  return promise;
}

export function waitForEvent<T = unknown>(
  client: ClientSocket,
  event: string,
  timeoutMs = 5000,
): Promise<T> {
  return safe(
    new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`timed out waiting for "${event}"`)),
        timeoutMs,
      );
      client.once(event, (payload: T) => {
        clearTimeout(timeout);
        resolve(payload);
      });
    }),
  );
}

export function emitAck<T = unknown>(
  client: ClientSocket,
  event: string,
  payload: unknown,
): Promise<T> {
  return safe(
    new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`ack timeout for "${event}"`)), 5000);
      client.emit(event, payload, (response: T) => {
        clearTimeout(timeout);
        resolve(response);
      });
    }),
  );
}

export async function createTestUser(prisma: PrismaService, tag: string) {
  const id = randomUUID();
  return prisma.user.create({
    data: {
      id,
      fullname: `Arena Test ${tag}`,
      email: `arena-test-${tag}-${id}@test.local`,
      password: 'test-password-hash',
    },
  });
}

export async function cleanupArenaTestData(
  prisma: PrismaService,
  roomIds: string[],
  userIds: string[],
) {
  const matches = await prisma.arenaMatch.findMany({
    where: { roomId: { in: roomIds } },
    select: { id: true },
  });
  const matchIds = matches.map((m) => m.id);

  await prisma.arenaRewardLog.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.arenaAnswer.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.arenaQuestion.deleteMany({ where: { matchId: { in: matchIds } } });
  // Gate E child tables — must go before the ArenaMatch delete below (FKs).
  await prisma.arenaBattleEvent.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.arenaPowerUpUsage.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.arenaPowerUpEffect.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.arenaMatchPowerUp.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.arenaParticipantBattleState.deleteMany({ where: { matchId: { in: matchIds } } });
  // Phase BC-Reconciliation child table — same FK-ordering requirement.
  await prisma.arenaUserQuestionHistory.deleteMany({ where: { matchId: { in: matchIds } } });
  // Phase F1 child tables — same FK-ordering requirement.
  await prisma.arenaProgressionRecord.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.arenaFairPlayLog.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.arenaRatingHistory.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.arenaMatch.deleteMany({ where: { roomId: { in: roomIds } } });
  await prisma.arenaRoomEvent.deleteMany({ where: { roomId: { in: roomIds } } });
  await prisma.arenaParticipant.deleteMany({ where: { roomId: { in: roomIds } } });
  await prisma.arenaRoom.deleteMany({ where: { id: { in: roomIds } } });
  await prisma.arenaQueue.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.arenaSeasonResult.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.arenaFairPlayLog.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.arenaProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.petProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.xpTransaction.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userXpProfile.deleteMany({ where: { userId: { in: userIds } } });
  // Phase F2.1: ARENA_PROMOTED/ARENA_PLACEMENT_COMPLETED notifications now
  // actually reach a real `Notification` row (see the F2.1 preference-
  // registry fix) — must delete before the User row or the FK constraint
  // rejects the delete.
  await prisma.notification.deleteMany({ where: { recipientUserId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
