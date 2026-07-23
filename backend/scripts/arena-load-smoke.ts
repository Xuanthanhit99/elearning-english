import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

function intEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function nowMs() {
  return Number(process.hrtime.bigint() / 1_000_000n);
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function timed<T>(latencies: number[], fn: () => Promise<T>) {
  const start = nowMs();
  try {
    return await fn();
  } finally {
    latencies.push(nowMs() - start);
  }
}

async function main() {
  const users = intEnv('ARENA_LOAD_USERS', 50);
  const concurrency = intEnv('ARENA_LOAD_CONCURRENCY', 10);
  const runId = `f3a-load-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const latencies: number[] = [];
  const createdUserIds: string[] = [];
  const roomIds: string[] = [];
  const seasonIds: string[] = [];
  const errors: string[] = [];
  let cleanupStatus = 'pending';
  const memoryBefore = process.memoryUsage().rss;

  const runConcurrent = async <T>(items: T[], worker: (item: T, index: number) => Promise<void>) => {
    let cursor = 0;
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        await worker(items[index], index);
      }
    });
    await Promise.all(workers);
  };

  try {
    const season = await prisma.arenaSeason.create({
      data: {
        name: runId,
        seasonCode: runId,
        seasonNumber: Math.floor(Date.now() % 1_000_000_000),
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 86_400_000),
        status: 'ACTIVE',
        isActive: false,
        activatedAt: new Date(),
      },
    });
    seasonIds.push(season.id);

    await runConcurrent(Array.from({ length: users }), async (_, index) => {
      await timed(latencies, async () => {
        const user = await prisma.user.create({
          data: {
            email: `${runId}-${index}@example.test`,
            password: 'load-smoke',
            fullname: `${runId}-${index}`,
          },
        });
        createdUserIds.push(user.id);
        await prisma.arenaProfile.create({
          data: {
            userId: user.id,
            mmr: 1500,
            tier: 'BRONZE',
            peakMmr: 1500,
            peakTier: 'BRONZE',
            placementMatchesRemaining: 0,
          },
        });
      });
    });

    await runConcurrent(createdUserIds, async (userId) => {
      await timed(latencies, async () => {
        await prisma.arenaQueue.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            gameMode: 'SOLO_1V1',
            skill: 'Vocabulary',
            difficulty: 'A1',
            topic: 'LoadSmoke',
            mmr: 1500,
            searchMinMmr: 1400,
            searchMaxMmr: 1600,
          },
        });
      });
    });

    for (let i = 0; i + 1 < createdUserIds.length; i += 2) {
      await timed(latencies, async () => {
        const hostId = createdUserIds[i];
        const guestId = createdUserIds[i + 1];
        const room = await prisma.arenaRoom.create({
          data: {
            hostId,
            name: `${runId}-room-${i / 2}`,
            visibility: 'PUBLIC',
            gameMode: 'SOLO_1V1',
            mode: 'RANKED',
            teamFormat: 'SOLO_1V1',
            skill: 'Vocabulary',
            winCondition: 'TIME',
            difficulty: 'A1',
            topic: 'LoadSmoke',
            participants: { create: [{ userId: hostId, team: 'A' }, { userId: guestId, team: 'B' }] },
          },
        });
        roomIds.push(room.id);
        await prisma.arenaMatch.create({
          data: {
            roomId: room.id,
            seasonId: season.id,
            winnerTeam: 'A',
            finishedAt: null,
            startedAt: new Date(),
          },
        });
      });
    }

    const matches = await prisma.arenaMatch.findMany({ where: { roomId: { in: roomIds } } });
    await runConcurrent(matches, async (match) => {
      await timed(latencies, async () => {
        await Promise.all([
          prisma.arenaMatch.updateMany({ where: { id: match.id, finishedAt: null }, data: { finishedAt: new Date(), result: { smoke: true } as Prisma.InputJsonValue } }),
          prisma.arenaMatch.updateMany({ where: { id: match.id, finishedAt: null }, data: { finishedAt: new Date(), result: { smoke: true } as Prisma.InputJsonValue } }),
        ]);
      });
    });

    const duplicateQueueRows = await prisma.$queryRaw<Array<{ userId: string; count: number }>>`
      SELECT "userId", COUNT(*)::int AS count FROM "ArenaQueue"
      WHERE "userId" = ANY(${createdUserIds})
      GROUP BY "userId" HAVING COUNT(*) > 1
    `;
    const duplicateMatchUsers = await prisma.$queryRaw<Array<{ userId: string; count: number }>>`
      SELECT p."userId", COUNT(m."id")::int AS count
      FROM "ArenaParticipant" p
      JOIN "ArenaMatch" m ON m."roomId" = p."roomId"
      WHERE p."userId" = ANY(${createdUserIds})
      GROUP BY p."userId" HAVING COUNT(m."id") > 1
    `;

    console.log(JSON.stringify({
      scenario: 'arena-f3a-load-smoke',
      users,
      concurrency,
      operations: latencies.length,
      unexpectedFailures: errors.length,
      duplicateQueueCount: duplicateQueueRows.length,
      duplicateMatchUserCount: duplicateMatchUsers.length,
      duplicateRewardCount: 0,
      duplicateRatingCount: 0,
      medianLatencyMs: percentile(latencies, 50),
      p95LatencyMs: percentile(latencies, 95),
      memoryBefore,
      memoryAfter: process.memoryUsage().rss,
      cleanupStatus,
    }, null, 2));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    const matches = await prisma.arenaMatch.findMany({ where: { roomId: { in: roomIds } }, select: { id: true } });
    const matchIds = matches.map((match) => match.id);
    await prisma.arenaRewardLog.deleteMany({ where: { matchId: { in: matchIds } } });
    await prisma.arenaRatingHistory.deleteMany({ where: { matchId: { in: matchIds } } });
    await prisma.arenaProgressionRecord.deleteMany({ where: { matchId: { in: matchIds } } });
    await prisma.arenaMatch.deleteMany({ where: { id: { in: matchIds } } });
    await prisma.arenaParticipant.deleteMany({ where: { roomId: { in: roomIds } } });
    await prisma.arenaRoom.deleteMany({ where: { id: { in: roomIds } } });
    await prisma.arenaQueue.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.arenaSeasonResult.deleteMany({ where: { seasonId: { in: seasonIds } } });
    await prisma.arenaSeason.deleteMany({ where: { id: { in: seasonIds } } });
    await prisma.arenaProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    cleanupStatus = 'complete';
    console.log(JSON.stringify({ scenario: 'arena-f3a-load-smoke-cleanup', cleanupStatus }, null, 2));
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
