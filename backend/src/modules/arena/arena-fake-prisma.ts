// Test-only in-memory fake Prisma client for ArenaService.spec.ts.
//
// This is NOT a general-purpose Prisma mock — it implements exactly the
// subset of Prisma Client API surface that ArenaService actually calls
// (findUnique/findFirst/findMany/create/update/updateMany/upsert/count/
// delete/deleteMany/$transaction/$executeRawUnsafe), with real semantics for
// the two things Phase A relies on being correct:
//   1. `updateMany({ where: { id, finishedAt: null }, ... })` only affects
//      rows that still match at call time, and returns `{ count }` — this
//      is what makes finalizeMatch's compare-and-swap idempotent.
//   2. Unique constraints (ArenaAnswer @@unique([questionId,userId]),
//      ArenaRewardLog @@unique([matchId,userId]), ArenaQueue.userId,
//      ArenaParticipant @@unique([roomId,userId])) throw a real
//      `Prisma.PrismaClientKnownRequestError` with `code: 'P2002'`, matching
//      what ArenaService's catch blocks check for.
//
// `$transaction(callback)` additionally serializes concurrent callback
// executions via a promise-chained mutex — this models the effect of the
// `pg_advisory_xact_lock` call ArenaService makes at the top of its own
// transaction body. It intentionally does NOT model true multi-connection
// Postgres concurrency (MVCC, real row locks) — see the test file docblock
// for what this does and doesn't prove.

import { Prisma } from '@prisma/client';

function p2002(message: string): never {
  throw new Prisma.PrismaClientKnownRequestError(message, {
    code: 'P2002',
    clientVersion: 'test',
  });
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

type Row = Record<string, any>;

// A JSON round-trip would turn Date fields (countdownEndsAt, expiresAt,
// answeredAt, ...) into strings, breaking every `.getTime()` call in
// ArenaService — so this clones plain objects/arrays recursively while
// preserving Date instances as real Dates.
function clone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = clone(val);
  }
  return result as T;
}

class Table {
  rows: Row[] = [];

  constructor(
    private readonly name: string,
    private readonly uniqueKeys: string[][] = [],
  ) {}

  private checkUnique(candidate: Row, ignoreId?: string) {
    for (const keys of this.uniqueKeys) {
      const clash = this.rows.find(
        (row) =>
          row.id !== ignoreId &&
          keys.every((key) => row[key] === candidate[key]),
      );
      if (clash) {
        p2002(
          `Unique constraint failed on ${this.name}(${keys.join(',')})`,
        );
      }
    }
  }

  insert(data: Row) {
    const row = { id: data.id ?? nextId(this.name), ...data };
    this.checkUnique(row);
    this.rows.push(row);
    return clone(row);
  }

  findById(id: string) {
    return this.rows.find((row) => row.id === id);
  }
}

function applyData(row: Row, data: Row) {
  for (const [key, value] of Object.entries(data)) {
    if (
      value &&
      typeof value === 'object' &&
      !(value instanceof Date) &&
      'increment' in value
    ) {
      row[key] = (row[key] ?? 0) + (value as Row).increment;
    } else {
      row[key] = value;
    }
  }
}

function matchesSimpleWhere(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (cond === undefined) return true;
    if (key === 'OR') {
      return (cond as Row[]).some((branch) => matchesSimpleWhere(row, branch));
    }
    if (key === 'AND') {
      return (cond as Row[]).every((branch) => matchesSimpleWhere(row, branch));
    }
    const value = row[key];
    if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('not' in cond) return value !== cond.not;
      if ('in' in cond) return (cond.in as any[]).includes(value);
      let ok = true;
      if ('gte' in cond) ok = ok && value >= cond.gte;
      if ('lte' in cond) ok = ok && value <= cond.lte;
      if ('gt' in cond) ok = ok && value > cond.gt;
      if ('lt' in cond) ok = ok && value < cond.lt;
      return ok;
    }
    return value === cond;
  });
}

export class FakePrisma {
  arenaProfileTable = new Table('ArenaProfile', [['userId']]);
  arenaRoomTable = new Table('ArenaRoom');
  arenaParticipantTable = new Table('ArenaParticipant', [
    ['roomId', 'userId'],
  ]);
  arenaQueueTable = new Table('ArenaQueue', [['userId']]);
  arenaMatchTable = new Table('ArenaMatch');
  arenaQuestionTable = new Table('ArenaQuestion', [['matchId', 'order']]);
  arenaAnswerTable = new Table('ArenaAnswer', [['questionId', 'userId']]);
  arenaRewardLogTable = new Table('ArenaRewardLog', [['matchId', 'userId']]);
  petProfileTable = new Table('PetProfile');
  arenaParticipantBattleStateTable = new Table('ArenaParticipantBattleState', [
    ['matchId', 'participantId'],
  ]);
  arenaMatchPowerUpTable = new Table('ArenaMatchPowerUp', [
    ['matchId', 'userId', 'type'],
  ]);
  arenaPowerUpEffectTable = new Table('ArenaPowerUpEffect');
  arenaPowerUpUsageTable = new Table('ArenaPowerUpUsage', [
    ['matchId', 'userId', 'clientRequestId'],
  ]);
  arenaBattleEventTable = new Table('ArenaBattleEvent', [['matchId', 'sequence']]);
  arenaUserQuestionHistoryTable = new Table('ArenaUserQuestionHistory');
  // Phase F1
  arenaSeasonTable = new Table('ArenaSeason');
  arenaRatingHistoryTable = new Table('ArenaRatingHistory', [['matchId', 'userId']]);
  arenaProgressionRecordTable = new Table('ArenaProgressionRecord', [['matchId', 'userId']]);
  xpTransactionTable = new Table('XpTransaction', [['idempotencyKey']]);

  private mutex: Promise<unknown> = Promise.resolve();

  private roomParticipants(roomId: string) {
    return this.arenaParticipantTable.rows.filter(
      (row) => row.roomId === roomId,
    );
  }

  private roomMatchesActiveRoom(row: Row, where: Row): boolean {
    if (where.status && !matchesSimpleWhere(row, { status: where.status })) {
      return false;
    }
    if (where.participants?.some) {
      const some = where.participants.some;
      const participants = this.roomParticipants(row.id);
      if (!participants.some((p) => matchesSimpleWhere(p, some))) {
        return false;
      }
    }
    if (where.OR) {
      const anyMatch = (where.OR as Row[]).some((sub) => {
        if (sub.hostId !== undefined) return row.hostId === sub.hostId;
        if (sub.participants?.some) {
          const participants = this.roomParticipants(row.id);
          return participants.some((p) =>
            matchesSimpleWhere(p, sub.participants.some),
          );
        }
        return false;
      });
      if (!anyMatch) return false;
    }
    return true;
  }

  arenaProfile = {
    findUnique: async ({ where }: { where: { userId: string } }) => {
      const row = this.arenaProfileTable.rows.find(
        (r) => r.userId === where.userId,
      );
      return row ? clone(row) : null;
    },
    create: async ({ data }: { data: Row }) => {
      return this.arenaProfileTable.insert({
        mmr: 1500,
        arenaPoint: 1500,
        level: 1,
        winCount: 0,
        loseCount: 0,
        winStreak: 0,
        bestWinStreak: 0,
        arenaFood: 0,
        gold: 0,
        trophy: 0,
        lastMatchAt: null,
        tier: 'BRONZE',
        peakMmr: 1500,
        peakTier: 'BRONZE',
        seasonWinCount: 0,
        seasonLoseCount: 0,
        lastDailyBonusAt: null,
        lastFirstWinBonusAt: null,
        placementMatchesRemaining: 5,
        lastRatingDecayAt: null,
        ...data,
      });
    },
    update: async ({
      where,
      data,
    }: {
      where: { userId: string };
      data: Row;
    }) => {
      const row = this.arenaProfileTable.rows.find(
        (r) => r.userId === where.userId,
      );
      if (!row) throw new Error('ArenaProfile not found');
      Object.assign(row, data);
      return clone(row);
    },
  };

  arenaRoom = {
    findFirst: async ({ where }: { where: Row }) => {
      const row = this.arenaRoomTable.rows.find((r) =>
        this.roomMatchesActiveRoom(r, where),
      );
      return row ? clone(row) : null;
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const row = this.arenaRoomTable.findById(where.id);
      if (!row) return null;
      return this.hydrateRoom(row);
    },
    findMany: async ({ where }: { where?: Row } = {}) => {
      return this.arenaRoomTable.rows
        .filter((r) => matchesSimpleWhere(r, where))
        .map((r) => this.hydrateRoom(r));
    },
    create: async ({ data }: { data: Row }) => {
      const { participants, ...roomData } = data;
      const room = this.arenaRoomTable.insert({
        status: 'WAITING',
        countdownEndsAt: null,
        durationSec: null,
        maxWrong: null,
        targetCorrect: null,
        bestOf: null,
        password: null,
        revision: 1,
        ...roomData,
      });
      if (participants?.create) {
        const list = Array.isArray(participants.create)
          ? participants.create
          : [participants.create];
        for (const participant of list) {
          this.arenaParticipantTable.insert({
            roomId: room.id,
            ready: false,
            score: 0,
            correct: 0,
            wrong: 0,
            joinedAt: new Date(),
            ...participant,
          });
        }
      }
      return this.hydrateRoom(room);
    },
    update: async ({ where, data }: { where: { id: string }; data: Row }) => {
      const row = this.arenaRoomTable.findById(where.id);
      if (!row) throw new Error('ArenaRoom not found');
      applyData(row, data);
      return clone(row);
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = this.arenaRoomTable.rows.filter((r) =>
        matchesSimpleWhere(r, where),
      );
      rows.forEach((row) => applyData(row, data));
      return { count: rows.length };
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const index = this.arenaRoomTable.rows.findIndex(
        (r) => r.id === where.id,
      );
      if (index === -1) throw new Error('ArenaRoom not found');
      const [removed] = this.arenaRoomTable.rows.splice(index, 1);
      return clone(removed);
    },
  };

  private hydrateRoom(room: Row) {
    return {
      ...clone(room),
      participants: this.roomParticipants(room.id).map((p) => clone(p)),
      matches: this.arenaMatchTable.rows
        .filter((m) => m.roomId === room.id)
        .map((m) => this.hydrateMatch(m)),
      events: [],
      host: null,
    };
  }

  private hydrateMatch(match: Row) {
    return {
      ...clone(match),
      questions: this.arenaQuestionTable.rows
        .filter((q) => q.matchId === match.id)
        .sort((a, b) => a.order - b.order)
        .map((q) => clone(q)),
      answers: this.arenaAnswerTable.rows
        .filter((a) => a.matchId === match.id)
        .map((a) => clone(a)),
    };
  }

  arenaParticipant = {
    count: async ({ where }: { where?: Row } = {}) => {
      return this.arenaParticipantTable.rows.filter((r) =>
        matchesSimpleWhere(r, where),
      ).length;
    },
    findUnique: async ({
      where,
    }: {
      where: { roomId_userId: { roomId: string; userId: string } };
    }) => {
      const { roomId, userId } = where.roomId_userId;
      const row = this.arenaParticipantTable.rows.find(
        (r) => r.roomId === roomId && r.userId === userId,
      );
      return row ? clone(row) : null;
    },
    findMany: async ({ where }: { where?: Row } = {}) => {
      return this.arenaParticipantTable.rows
        .filter((r) => matchesSimpleWhere(r, where))
        .map((r) => clone(r));
    },
    create: async ({ data }: { data: Row }) => {
      return this.arenaParticipantTable.insert({
        ready: false,
        score: 0,
        correct: 0,
        wrong: 0,
        joinedAt: new Date(),
        ...data,
      });
    },
    update: async ({
      where,
      data,
    }: {
      where: { roomId_userId: { roomId: string; userId: string } };
      data: Row;
    }) => {
      const { roomId, userId } = where.roomId_userId;
      const row = this.arenaParticipantTable.rows.find(
        (r) => r.roomId === roomId && r.userId === userId,
      );
      if (!row) throw new Error('ArenaParticipant not found');
      applyData(row, data);
      return clone(row);
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = this.arenaParticipantTable.rows.filter((r) =>
        matchesSimpleWhere(r, where),
      );
      rows.forEach((row) => applyData(row, data));
      return { count: rows.length };
    },
    delete: async ({
      where,
    }: {
      where: { roomId_userId: { roomId: string; userId: string } };
    }) => {
      const { roomId, userId } = where.roomId_userId;
      const index = this.arenaParticipantTable.rows.findIndex(
        (r) => r.roomId === roomId && r.userId === userId,
      );
      if (index === -1) throw new Error('ArenaParticipant not found');
      const [removed] = this.arenaParticipantTable.rows.splice(index, 1);
      return clone(removed);
    },
    deleteMany: async ({ where }: { where: Row }) => {
      const before = this.arenaParticipantTable.rows.length;
      this.arenaParticipantTable.rows = this.arenaParticipantTable.rows.filter(
        (r) => !matchesSimpleWhere(r, where),
      );
      return { count: before - this.arenaParticipantTable.rows.length };
    },
  };

  arenaQueue = {
    findFirst: async ({
      where,
      orderBy,
    }: {
      where: Row;
      orderBy?: { createdAt: 'asc' | 'desc' };
    }) => {
      const rows = this.arenaQueueTable.rows.filter((r) =>
        matchesSimpleWhere(r, where),
      );
      if (orderBy?.createdAt === 'asc') {
        rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
      return rows[0] ? clone(rows[0]) : null;
    },
    upsert: async ({
      where,
      update,
      create,
    }: {
      where: { userId: string };
      update: Row;
      create: Row;
    }) => {
      const row = this.arenaQueueTable.rows.find(
        (r) => r.userId === where.userId,
      );
      if (row) {
        Object.assign(row, update);
        return clone(row);
      }
      return this.arenaQueueTable.insert({ createdAt: new Date(), ...create });
    },
    deleteMany: async ({ where }: { where: Row }) => {
      const before = this.arenaQueueTable.rows.length;
      this.arenaQueueTable.rows = this.arenaQueueTable.rows.filter(
        (r) => !matchesSimpleWhere(r, where),
      );
      return { count: before - this.arenaQueueTable.rows.length };
    },
  };

  arenaMatch = {
    findUnique: async ({
      where,
      include,
    }: {
      where: { id: string };
      include?: { room?: { include?: { participants?: boolean } } };
    }) => {
      const row = this.arenaMatchTable.findById(where.id);
      if (!row) return null;
      const hydrated = this.hydrateMatch(row) as Row;
      if (include?.room) {
        const roomRow = this.arenaRoomTable.findById(row.roomId);
        const room: Row | null = roomRow ? clone(roomRow) : null;
        if (room && include.room.include?.participants) {
          room.participants = this.arenaParticipantTable.rows
            .filter((p) => p.roomId === row.roomId)
            .map((p) => clone(p));
        }
        hydrated.room = room;
      }
      return hydrated;
    },
    findFirst: async ({
      where,
      include,
    }: {
      where: Row;
      orderBy?: unknown;
      include?: { rewards?: boolean };
    }) => {
      const rows = this.arenaMatchTable.rows
        .filter((r) => matchesSimpleWhere(r, where))
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
      const row = rows[0];
      if (!row) return null;
      const hydrated = this.hydrateMatch(row);
      if (include?.rewards) {
        (hydrated as Row).rewards = this.arenaRewardLogTable.rows
          .filter((r) => r.matchId === row.id)
          .map((r) => clone(r));
      }
      return hydrated;
    },
    create: async ({ data }: { data: Row }) => {
      const row = this.arenaMatchTable.insert({
        startedAt: new Date(),
        finishedAt: null,
        expiresAt: null,
        winnerTeam: null,
        result: null,
        revision: 1,
        activeQuestionOrder: null,
        questionActivatedAt: null,
        questionDeadlineAt: null,
        eventSequence: 0,
        ...data,
      });
      return this.hydrateMatch(row);
    },
    update: async ({ where, data }: { where: { id: string }; data: Row }) => {
      const row = this.arenaMatchTable.findById(where.id);
      if (!row) throw new Error('ArenaMatch not found');
      applyData(row, data);
      return this.hydrateMatch(row);
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = this.arenaMatchTable.rows.filter((r) =>
        matchesSimpleWhere(r, where),
      );
      rows.forEach((row) => applyData(row, data));
      return { count: rows.length };
    },
    deleteMany: async ({ where }: { where: Row }) => {
      const before = this.arenaMatchTable.rows.length;
      this.arenaMatchTable.rows = this.arenaMatchTable.rows.filter(
        (r) => !matchesSimpleWhere(r, where),
      );
      return { count: before - this.arenaMatchTable.rows.length };
    },
  };

  arenaQuestion = {
    count: async ({ where }: { where: Row }) => {
      return this.arenaQuestionTable.rows.filter((r) =>
        matchesSimpleWhere(r, where),
      ).length;
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const row = this.arenaQuestionTable.findById(where.id);
      return row ? clone(row) : null;
    },
    findFirst: async ({ where }: { where: Row }) => {
      const row = this.arenaQuestionTable.rows.find((r) =>
        matchesSimpleWhere(r, where),
      );
      return row ? clone(row) : null;
    },
    findMany: async ({
      where,
      orderBy,
      take,
    }: {
      where?: Row;
      orderBy?: { createdAt?: 'asc' | 'desc' };
      take?: number;
    } = {}) => {
      let rows = this.arenaQuestionTable.rows.filter((r) =>
        matchesSimpleWhere(r, where),
      );
      if (orderBy?.createdAt) {
        rows = [...rows].sort((a, b) =>
          orderBy.createdAt === 'asc'
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : b.createdAt.getTime() - a.createdAt.getTime(),
        );
      }
      if (typeof take === 'number') rows = rows.slice(0, take);
      return rows.map((r) => clone(r));
    },
    createMany: async ({ data }: { data: Row[] }) => {
      data.forEach((item) =>
        this.arenaQuestionTable.insert({ createdAt: new Date(), ...item }),
      );
      return { count: data.length };
    },
    deleteMany: async ({ where }: { where: Row }) => {
      const before = this.arenaQuestionTable.rows.length;
      this.arenaQuestionTable.rows = this.arenaQuestionTable.rows.filter(
        (r) => !matchesSimpleWhere(r, where),
      );
      return { count: before - this.arenaQuestionTable.rows.length };
    },
  };

  arenaAnswer = {
    create: async ({ data }: { data: Row }) => {
      return this.arenaAnswerTable.insert({ answeredAt: new Date(), ...data });
    },
    findUnique: async ({
      where,
    }: {
      where: { questionId_userId: { questionId: string; userId: string } };
    }) => {
      const { questionId, userId } = where.questionId_userId;
      const row = this.arenaAnswerTable.rows.find(
        (r) => r.questionId === questionId && r.userId === userId,
      );
      return row ? clone(row) : null;
    },
    findMany: async ({ where }: { where?: Row } = {}) => {
      return this.arenaAnswerTable.rows
        .filter((r) => matchesSimpleWhere(r, where))
        .map((r) => clone(r));
    },
    count: async ({ where }: { where: Row }) => {
      return this.arenaAnswerTable.rows.filter((r) =>
        matchesSimpleWhere(r, where),
      ).length;
    },
    deleteMany: async ({ where }: { where: Row }) => {
      const before = this.arenaAnswerTable.rows.length;
      this.arenaAnswerTable.rows = this.arenaAnswerTable.rows.filter(
        (r) => !matchesSimpleWhere(r, where),
      );
      return { count: before - this.arenaAnswerTable.rows.length };
    },
  };

  arenaRewardLog = {
    create: async ({ data }: { data: Row }) => {
      return this.arenaRewardLogTable.insert({
        createdAt: new Date(),
        ...data,
      });
    },
    findUnique: async ({ where }: { where: Row }) => {
      if (where.id) {
        const row = this.arenaRewardLogTable.findById(where.id as string);
        return row ? clone(row) : null;
      }
      const { matchId, userId } = where.matchId_userId as { matchId: string; userId: string };
      const row = this.arenaRewardLogTable.rows.find(
        (r) => r.matchId === matchId && r.userId === userId,
      );
      return row ? clone(row) : null;
    },
    findMany: async ({ where }: { where?: Row } = {}) => {
      return this.arenaRewardLogTable.rows
        .filter((r) => matchesSimpleWhere(r, where))
        .map((r) => clone(r));
    },
    deleteMany: async ({ where }: { where: Row }) => {
      const before = this.arenaRewardLogTable.rows.length;
      this.arenaRewardLogTable.rows = this.arenaRewardLogTable.rows.filter(
        (r) => !matchesSimpleWhere(r, where),
      );
      return { count: before - this.arenaRewardLogTable.rows.length };
    },
  };

  petProfile = {
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = this.petProfileTable.rows.filter((r) =>
        matchesSimpleWhere(r, where),
      );
      for (const row of rows) {
        for (const [key, value] of Object.entries(data)) {
          if (value && typeof value === 'object' && 'increment' in value) {
            row[key] = (row[key] ?? 0) + (value as Row).increment;
          } else {
            row[key] = value;
          }
        }
      }
      return { count: rows.length };
    },
  };

  arenaParticipantBattleState = {
    findUnique: async ({
      where,
    }: {
      where: { matchId_participantId: { matchId: string; participantId: string } };
    }) => {
      const { matchId, participantId } = where.matchId_participantId;
      const row = this.arenaParticipantBattleStateTable.rows.find(
        (r) => r.matchId === matchId && r.participantId === participantId,
      );
      return row ? clone(row) : null;
    },
    create: async ({ data }: { data: Row }) => {
      return this.arenaParticipantBattleStateTable.insert({
        score: 0,
        combo: 0,
        maxCombo: 0,
        correctStreak: 0,
        wrongStreak: 0,
        multiplierBasisPoints: 10000,
        shieldCharges: 0,
        deadlineOverrideAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      });
    },
    update: async ({ where, data }: { where: { id: string }; data: Row }) => {
      const row = this.arenaParticipantBattleStateTable.findById(where.id);
      if (!row) throw new Error('ArenaParticipantBattleState not found');
      applyData(row, data);
      row.updatedAt = new Date();
      return clone(row);
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = this.arenaParticipantBattleStateTable.rows.filter((r) =>
        matchesSimpleWhere(r, where),
      );
      rows.forEach((row) => {
        applyData(row, data);
        row.updatedAt = new Date();
      });
      return { count: rows.length };
    },
  };

  arenaMatchPowerUp = {
    findUnique: async ({
      where,
    }: {
      where: { matchId_userId_type: { matchId: string; userId: string; type: string } };
    }) => {
      const { matchId, userId, type } = where.matchId_userId_type;
      const row = this.arenaMatchPowerUpTable.rows.find(
        (r) => r.matchId === matchId && r.userId === userId && r.type === type,
      );
      return row ? clone(row) : null;
    },
    findMany: async ({ where }: { where?: Row } = {}) => {
      return this.arenaMatchPowerUpTable.rows
        .filter((r) => matchesSimpleWhere(r, where))
        .map((r) => clone(r));
    },
    createMany: async ({
      data,
      skipDuplicates,
    }: {
      data: Row[];
      skipDuplicates?: boolean;
    }) => {
      let count = 0;
      for (const item of data) {
        const exists = this.arenaMatchPowerUpTable.rows.some(
          (r) =>
            r.matchId === item.matchId &&
            r.userId === item.userId &&
            r.type === item.type,
        );
        if (exists) {
          if (skipDuplicates) continue;
          p2002('Unique constraint failed on ArenaMatchPowerUp');
        }
        this.arenaMatchPowerUpTable.insert({
          usedCount: 0,
          cooldownUntil: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...item,
        });
        count += 1;
      }
      return { count };
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = this.arenaMatchPowerUpTable.rows.filter((r) =>
        matchesSimpleWhere(r, where),
      );
      rows.forEach((row) => {
        applyData(row, data);
        row.updatedAt = new Date();
      });
      return { count: rows.length };
    },
  };

  arenaPowerUpEffect = {
    create: async ({ data }: { data: Row }) => {
      return this.arenaPowerUpEffectTable.insert({
        status: 'PENDING',
        appliesFromQuestionOrder: null,
        expiresAt: null,
        remainingTriggers: null,
        createdAt: new Date(),
        consumedAt: null,
        ...data,
      });
    },
    findFirst: async ({ where }: { where: Row }) => {
      const row = this.arenaPowerUpEffectTable.rows.find((r) =>
        matchesSimpleWhere(r, where),
      );
      return row ? clone(row) : null;
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = this.arenaPowerUpEffectTable.rows.filter((r) =>
        matchesSimpleWhere(r, where),
      );
      rows.forEach((row) => applyData(row, data));
      return { count: rows.length };
    },
  };

  arenaPowerUpUsage = {
    create: async ({ data }: { data: Row }) => {
      return this.arenaPowerUpUsageTable.insert({
        createdAt: new Date(),
        ...data,
      });
    },
    findUnique: async ({
      where,
    }: {
      where: {
        matchId_userId_clientRequestId: {
          matchId: string;
          userId: string;
          clientRequestId: string;
        };
      };
    }) => {
      const { matchId, userId, clientRequestId } = where.matchId_userId_clientRequestId;
      const row = this.arenaPowerUpUsageTable.rows.find(
        (r) =>
          r.matchId === matchId &&
          r.userId === userId &&
          r.clientRequestId === clientRequestId,
      );
      return row ? clone(row) : null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Row }) => {
      const row = this.arenaPowerUpUsageTable.findById(where.id);
      if (!row) throw new Error('ArenaPowerUpUsage not found');
      applyData(row, data);
      return clone(row);
    },
  };

  arenaBattleEvent = {
    create: async ({ data }: { data: Row }) => {
      return this.arenaBattleEventTable.insert({
        createdAt: new Date(),
        ...data,
      });
    },
  };

  arenaUserQuestionHistory = {
    findMany: async ({ where }: { where?: Row } = {}) => {
      return this.arenaUserQuestionHistoryTable.rows
        .filter((r) => matchesSimpleWhere(r, where))
        .map((r) => clone(r));
    },
    createMany: async ({ data }: { data: Row[] }) => {
      data.forEach((item) =>
        this.arenaUserQuestionHistoryTable.insert({ seenAt: new Date(), ...item }),
      );
      return { count: data.length };
    },
  };

  // Phase F1
  arenaSeason = {
    findFirst: async ({ where }: { where?: Row } = {}) => {
      const rows = this.arenaSeasonTable.rows
        .filter((r) => matchesSimpleWhere(r, where))
        .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
      return rows[0] ? clone(rows[0]) : null;
    },
    create: async ({ data }: { data: Row }) => {
      return this.arenaSeasonTable.insert({
        status: 'ACTIVE',
        isActive: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      });
    },
  };

  arenaRatingHistory = {
    count: async ({ where }: { where?: Row } = {}) => {
      return this.arenaRatingHistoryTable.rows.filter((r) => matchesSimpleWhere(r, where)).length;
    },
    findUnique: async ({ where }: { where: Row }) => {
      if (where.id) {
        const row = this.arenaRatingHistoryTable.findById(where.id);
        return row ? clone(row) : null;
      }
      const { matchId, userId } = where.matchId_userId;
      const row = this.arenaRatingHistoryTable.rows.find(
        (r) => r.matchId === matchId && r.userId === userId,
      );
      return row ? clone(row) : null;
    },
    create: async ({ data }: { data: Row }) => {
      return this.arenaRatingHistoryTable.insert({ createdAt: new Date(), ...data });
    },
  };

  arenaProgressionRecord = {
    findUnique: async ({ where }: { where: { matchId_userId: { matchId: string; userId: string } } }) => {
      const { matchId, userId } = where.matchId_userId;
      const row = this.arenaProgressionRecordTable.rows.find(
        (r) => r.matchId === matchId && r.userId === userId,
      );
      return row ? clone(row) : null;
    },
    findMany: async ({ where }: { where?: Row } = {}) => {
      return this.arenaProgressionRecordTable.rows
        .filter((r) => matchesSimpleWhere(r, where))
        .map((r) => clone(r));
    },
    create: async ({ data }: { data: Row }) => {
      return this.arenaProgressionRecordTable.insert({
        status: 'PENDING',
        attempts: 0,
        seasonId: null,
        leaseExpiresAt: null,
        lastError: null,
        xpTransactionId: null,
        ratingHistoryId: null,
        rewardLogId: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      });
    },
    update: async ({
      where,
      data,
    }: {
      where: { matchId_userId: { matchId: string; userId: string } };
      data: Row;
    }) => {
      const { matchId, userId } = where.matchId_userId;
      const row = this.arenaProgressionRecordTable.rows.find(
        (r) => r.matchId === matchId && r.userId === userId,
      );
      if (!row) throw new Error('ArenaProgressionRecord not found');
      applyData(row, { updatedAt: new Date(), ...data });
      return clone(row);
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = this.arenaProgressionRecordTable.rows.filter((r) =>
        matchesSimpleWhere(r, where),
      );
      rows.forEach((row) => applyData(row, { updatedAt: new Date(), ...data }));
      return { count: rows.length };
    },
  };

  xpTransaction = {
    findUnique: async ({ where }: { where: Row }) => {
      if (where.id) {
        const row = this.xpTransactionTable.findById(where.id);
        return row ? clone(row) : null;
      }
      const row = this.xpTransactionTable.rows.find(
        (r) => r.idempotencyKey === where.idempotencyKey,
      );
      return row ? clone(row) : null;
    },
    create: async ({ data }: { data: Row }) => {
      return this.xpTransactionTable.insert({ earnedAt: new Date(), reversedAt: null, ...data });
    },
  };

  /**
   * Only ever called by ArenaBattleEventService.append with the exact
   * `UPDATE "ArenaMatch" SET "eventSequence" = "eventSequence" + 1 WHERE id
   * = $1 RETURNING "eventSequence"` shape — not a general SQL engine.
   */
  $queryRaw = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    void strings;
    const matchId = values[0] as string;
    const match = this.arenaMatchTable.findById(matchId);
    if (!match) throw new Error('ArenaMatch not found');
    match.eventSequence = (match.eventSequence ?? 0) + 1;
    return [{ eventSequence: match.eventSequence }];
  };

  $executeRawUnsafe = async (_sql: string) => {
    void _sql;
    return 0;
  };

  /**
   * Array form (`$transaction([p1, p2, ...])`): the array elements are
   * already-invoked promises by the time this is called (matches real
   * Prisma usage in ArenaService.leaveRoom), so this just awaits them.
   *
   * Callback form (`$transaction(async (tx) => {...})`): serialized via a
   * promise-chained mutex so concurrent callers cannot interleave their
   * reads/writes inside the callback — this models the mutual exclusion
   * that `pg_advisory_xact_lock` + Postgres row locks provide in production,
   * without requiring a real Postgres connection.
   */
  $transaction = async (arg: unknown[] | ((tx: this) => Promise<unknown>)) => {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    const run = this.mutex.then(() => arg(this));
    // Keep the chain alive even if this call rejects, so later callers still
    // queue up after it instead of racing ahead.
    this.mutex = run.catch(() => undefined);
    return run;
  };
}
