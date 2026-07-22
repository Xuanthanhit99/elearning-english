import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { XpService } from 'src/modules/leaderboard/xp.service';
import { ArenaService } from './arena.service';
import { FakePrisma } from './arena-fake-prisma';
import { FakeXpService } from './arena-fake-xp-service';
import { ArenaEventPublisher } from './realtime/arena-event-publisher';
import { ArenaBattleEngineService } from './battle/arena-battle-engine.service';
import { ArenaBattleStateService } from './battle/arena-battle-state.service';
import { ArenaBattleEventService } from './battle/arena-battle-event.service';
import { ArenaPowerUpService } from './battle/arena-power-up.service';
import { getArenaQuestionWindowMs } from './battle/arena-battle.constants';
import { ArenaAiQuestionSource } from './question/arena-ai-question-source';
import { ArenaQuestionFallbackSource } from './question/arena-question-fallback-source';
import { ArenaQuestionHistoryService } from './question/arena-question-history.service';
import { ArenaQuestionPipelineService } from './question/arena-question-pipeline.service';
import { ArenaSeasonService } from './progression/arena-season.service';
import { ArenaProgressionDispatcherService } from './progression/arena-progression-dispatcher.service';
import { CreateArenaRoomDto } from './dto/create-arena-room.dto';
import { JoinArenaRoomDto } from './dto/join-arena-room.dto';
import { QueueArenaDto } from './dto/queue-arena.dto';
import { SubmitArenaAnswerDto } from './dto/submit-arena-answer.dto';
import { FinishArenaMatchDto } from './dto/finish-arena-match.dto';

/**
 * Phase A hardening tests.
 *
 * IMPORTANT LIMITATION (documented per Phase A instructions): `FakePrisma`
 * (see arena-fake-prisma.ts) is an in-memory stand-in, not a real Postgres
 * connection. It faithfully reproduces the two DB-level guarantees the
 * Phase A fixes actually rely on — (1) `updateMany({where:{..., finishedAt:
 * null}})` only affects rows still matching at call time and reports an
 * accurate `count`, and (2) unique-constraint violations throw a real
 * `Prisma.PrismaClientKnownRequestError` with `code: 'P2002'` — and it
 * serializes `$transaction(callback)` calls with a promise-chained mutex to
 * model the effect of the `pg_advisory_xact_lock` call `enterQueue` makes.
 * These tests verify the SERVICE-LEVEL LOGIC is correct given those
 * guarantees hold (which is what Postgres documents for `UPDATE ... WHERE`
 * and unique indexes). They do NOT exercise two real, separate Postgres
 * connections racing on the wire — no test-database harness exists in this
 * repo. A true multi-connection integration test would need a running
 * Postgres test instance; recommend adding one in a later hardening phase
 * if this becomes safety-critical (e.g. before scaling to many concurrent
 * matches).
 */
describe('ArenaService (Phase A hardening)', () => {
  let service: ArenaService;
  let fake: FakePrisma;

  const mockCandidates = Array.from({ length: 8 }, (_, index) => ({
    type: 'MULTIPLE_CHOICE' as const,
    skill: 'Vocabulary',
    prompt: `Question ${index + 1}`,
    options: ['A', 'B', 'C', 'D'],
    answer: 'A',
    explanation: `Explanation ${index + 1}`,
    points: 10,
  }));

  beforeEach(async () => {
    fake = new FakePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArenaService,
        { provide: PrismaService, useValue: fake },
        { provide: ArenaEventPublisher, useValue: { publish: jest.fn() } },
        ArenaBattleEngineService,
        ArenaBattleStateService,
        ArenaBattleEventService,
        ArenaPowerUpService,
        ArenaAiQuestionSource,
        ArenaQuestionFallbackSource,
        ArenaQuestionHistoryService,
        ArenaQuestionPipelineService,
        ArenaSeasonService,
        ArenaProgressionDispatcherService,
        { provide: XpService, useValue: new FakeXpService(fake) },
      ],
    }).compile();

    service = module.get<ArenaService>(ArenaService);
    const pipeline = module.get<ArenaQuestionPipelineService>(ArenaQuestionPipelineService);
    jest.spyOn(pipeline, 'prepareQuestionSet').mockResolvedValue(mockCandidates);
  });

  const roomDto = (): CreateArenaRoomDto =>
    ({
      name: 'Test room',
      visibility: 'PUBLIC',
      gameMode: 'SOLO_1V1',
      skill: 'Vocabulary',
      winCondition: 'TIME',
      difficulty: 'A1',
      topic: 'Animals',
    }) as CreateArenaRoomDto;

  async function setupTwoPlayerRoom(hostId: string, guestId: string) {
    const room = await service.createRoom(hostId, roomDto());
    if (!room) throw new Error('createRoom returned null in test setup');
    await service.joinRoom(guestId, room.id, {} as JoinArenaRoomDto);
    return room.id;
  }

  // Gate E added ArenaMatch.questionActivatedAt/questionDeadlineAt, set from
  // the *original* (5s-future) countdownEndsAt by beginRoomCountdown when
  // the match starts. Rewinding only `countdownEndsAt` (as these Phase A
  // tests already did, before Gate E existed) would leave those fields
  // stale — `questionActivatedAt` still ~5s in the "future" relative to
  // `Date.now()` at assertion time — which the SOLO_1V1 speed-bonus
  // calculation would read as a negative elapsed time, clamp to 0, and
  // score it as an instant (max speed bonus) answer. Rewinding them here
  // too keeps these pre-Gate-E test assertions (flat `points: 10` for a
  // normal correct answer) accurate: comfortably past the speed-bonus
  // window (no bonus) but still inside the per-question deadline (not late).
  function expireCountdown(roomId: string) {
    const row = fake.arenaRoomTable.findById(roomId)!;
    row.countdownEndsAt = new Date(Date.now() - 1000);

    const match = fake.arenaMatchTable.rows.find(
      (m) => m.roomId === roomId && !m.finishedAt,
    );
    if (match?.activeQuestionOrder) {
      const windowMs = getArenaQuestionWindowMs();
      match.questionActivatedAt = new Date(Date.now() - windowMs * 0.9);
      match.questionDeadlineAt = new Date(
        match.questionActivatedAt.getTime() + windowMs,
      );
    }
  }

  function getOpenMatchId(roomId: string) {
    const match = fake.arenaMatchTable.rows.find(
      (m) => m.roomId === roomId && !m.finishedAt,
    );
    return match!.id as string;
  }

  function setMatchExpiresAt(roomId: string, value: Date | null) {
    const match = fake.arenaMatchTable.rows.find((m) => m.roomId === roomId);
    match!.expiresAt = value;
  }

  // ---------------------------------------------------------------------
  // Fix 1: answer / spectator redaction
  // ---------------------------------------------------------------------
  describe('answer redaction (getRoom)', () => {
    it('does not reveal question.answer to a participant who has not answered it yet', async () => {
      const roomId = await setupTwoPlayerRoom('host-1', 'guest-1');
      const view = await service.getRoom('host-1', roomId);
      const question = view.matches[0].questions[0] as Record<string, unknown>;
      expect(question.answer).toBeUndefined();
      expect(question.explanation).toBeUndefined();
    });

    it('does not reveal another player\'s answer for a question I have not answered', async () => {
      const roomId = await setupTwoPlayerRoom('host-2', 'guest-2');
      expireCountdown(roomId);
      const questionId = fake.arenaQuestionTable.rows[0].id;

      await service.submitAnswer('guest-2', roomId, questionId, {
        answer: 'A',
      } as SubmitArenaAnswerDto);

      const view = await service.getRoom('host-2', roomId);
      const answersForQuestion = view.matches[0].answers.filter(
        (a) => a.questionId === questionId,
      );
      expect(answersForQuestion).toHaveLength(0);
      const question = view.matches[0].questions.find(
        (q) => q.id === questionId,
      ) as Record<string, unknown>;
      expect(question.answer).toBeUndefined();
    });

    it('throws ForbiddenException for a user who is not a participant of the room', async () => {
      const roomId = await setupTwoPlayerRoom('host-3', 'guest-3');
      await expect(
        service.getRoom('random-outsider', roomId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reveals the answer and other players\' answers for a question once I have answered it myself', async () => {
      const roomId = await setupTwoPlayerRoom('host-4', 'guest-4');
      expireCountdown(roomId);
      const questionId = fake.arenaQuestionTable.rows[0].id;

      await service.submitAnswer('guest-4', roomId, questionId, {
        answer: 'B',
      } as SubmitArenaAnswerDto);
      await service.submitAnswer('host-4', roomId, questionId, {
        answer: 'A',
      } as SubmitArenaAnswerDto);

      const view = await service.getRoom('host-4', roomId);
      const question = view.matches[0].questions.find(
        (q) => q.id === questionId,
      ) as Record<string, unknown>;
      expect(question.answer).toBe('A');
      const answersForQuestion = view.matches[0].answers.filter(
        (a) => a.questionId === questionId,
      );
      expect(answersForQuestion.map((a) => a.userId).sort()).toEqual(
        ['guest-4', 'host-4'].sort(),
      );
    });

    it('does not leak the answer for future (not-yet-answered) questions even after another question is revealed', async () => {
      const roomId = await setupTwoPlayerRoom('host-5', 'guest-5');
      expireCountdown(roomId);
      const [q1, q2] = fake.arenaQuestionTable.rows
        .filter((q) => q.matchId === getOpenMatchId(roomId))
        .sort((a, b) => a.order - b.order);

      await service.submitAnswer('host-5', roomId, q1.id, {
        answer: 'A',
      } as SubmitArenaAnswerDto);

      const view = await service.getRoom('host-5', roomId);
      const question2 = view.matches[0].questions.find(
        (q) => q.id === q2.id,
      ) as Record<string, unknown>;
      expect(question2.answer).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------
  // Fix 5: duplicate answer rule
  // ---------------------------------------------------------------------
  describe('duplicate answer handling (submitAnswer)', () => {
    it('accepts the first submission and scores it correctly', async () => {
      const roomId = await setupTwoPlayerRoom('host-6', 'guest-6');
      expireCountdown(roomId);
      const questionId = fake.arenaQuestionTable.rows[0].id;

      const result = await service.submitAnswer('host-6', roomId, questionId, {
        answer: 'A',
      } as SubmitArenaAnswerDto);

      expect(result.answer.isCorrect).toBe(true);
      expect(result.score).toBe(10);
    });

    it('is idempotent when the same answer is retried (no duplicate row, no double score)', async () => {
      const roomId = await setupTwoPlayerRoom('host-7', 'guest-7');
      expireCountdown(roomId);
      const questionId = fake.arenaQuestionTable.rows[0].id;

      const first = await service.submitAnswer('host-7', roomId, questionId, {
        answer: 'A',
      } as SubmitArenaAnswerDto);
      const retry = await service.submitAnswer('host-7', roomId, questionId, {
        answer: 'A',
      } as SubmitArenaAnswerDto);

      expect(retry.score).toBe(first.score);
      expect(
        fake.arenaAnswerTable.rows.filter(
          (a) => a.questionId === questionId && a.userId === 'host-7',
        ),
      ).toHaveLength(1);
    });

    it('rejects a second submission with a different answer (ConflictException), keeping the first result', async () => {
      const roomId = await setupTwoPlayerRoom('host-8', 'guest-8');
      expireCountdown(roomId);
      const questionId = fake.arenaQuestionTable.rows[0].id;

      await service.submitAnswer('host-8', roomId, questionId, {
        answer: 'A',
      } as SubmitArenaAnswerDto);

      await expect(
        service.submitAnswer('host-8', roomId, questionId, {
          answer: 'B',
        } as SubmitArenaAnswerDto),
      ).rejects.toBeInstanceOf(ConflictException);

      const stored = fake.arenaAnswerTable.rows.find(
        (a) => a.questionId === questionId && a.userId === 'host-8',
      );
      expect(stored?.answer).toBe('A');
      expect(stored?.points).toBe(10);
    });

    it('only creates one answer row when two concurrent requests submit the same question/user', async () => {
      const roomId = await setupTwoPlayerRoom('host-9', 'guest-9');
      expireCountdown(roomId);
      const questionId = fake.arenaQuestionTable.rows[0].id;

      const results = await Promise.allSettled([
        service.submitAnswer('host-9', roomId, questionId, {
          answer: 'A',
        } as SubmitArenaAnswerDto),
        service.submitAnswer('host-9', roomId, questionId, {
          answer: 'A',
        } as SubmitArenaAnswerDto),
      ]);

      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(
        fake.arenaAnswerTable.rows.filter(
          (a) => a.questionId === questionId && a.userId === 'host-9',
        ),
      ).toHaveLength(1);
      const participant = fake.arenaParticipantTable.rows.find(
        (p) => p.roomId === roomId && p.userId === 'host-9',
      );
      expect(participant?.score).toBe(10);
    });
  });

  // ---------------------------------------------------------------------
  // Fix 4: server-side question deadline
  // ---------------------------------------------------------------------
  describe('server-side deadline (submitAnswer)', () => {
    it('scores a correct answer submitted before the deadline normally', async () => {
      const roomId = await setupTwoPlayerRoom('host-10', 'guest-10');
      expireCountdown(roomId);
      const questionId = fake.arenaQuestionTable.rows[0].id;

      const result = await service.submitAnswer(
        'host-10',
        roomId,
        questionId,
        { answer: 'A' } as SubmitArenaAnswerDto,
      );

      expect(result.late).toBe(false);
      expect(result.answer.isCorrect).toBe(true);
    });

    it('forces 0 points on a correct-but-late answer instead of throwing (flow keeps moving)', async () => {
      const roomId = await setupTwoPlayerRoom('host-11', 'guest-11');
      expireCountdown(roomId);
      setMatchExpiresAt(roomId, new Date(Date.now() - 1000));
      const questionId = fake.arenaQuestionTable.rows[0].id;

      const result = await service.submitAnswer(
        'host-11',
        roomId,
        questionId,
        { answer: 'A' } as SubmitArenaAnswerDto,
      );

      expect(result.late).toBe(true);
      expect(result.answer.isCorrect).toBe(false);
      expect(result.answer.points).toBe(0);
    });

    it('never derives lateness from client input — only the server-stored answeredAt/expiresAt matter', async () => {
      const roomId = await setupTwoPlayerRoom('host-12', 'guest-12');
      expireCountdown(roomId);
      const questionId = fake.arenaQuestionTable.rows[0].id;

      const before = Date.now();
      const result = await service.submitAnswer(
        'host-12',
        roomId,
        questionId,
        // SubmitArenaAnswerDto only has `answer` — there is no client-suppliable
        // timestamp field at all, so this cast simulates an attacker trying to
        // sneak one in via an untyped body; the DTO/service simply ignores it.
        { answer: 'A', clientTime: 1 } as unknown as SubmitArenaAnswerDto,
      );

      expect(result.answer.answeredAt.getTime()).toBeGreaterThanOrEqual(
        before,
      );
    });

    it('does not reset the deadline on reload (expiresAt is stable across repeated reads)', async () => {
      const roomId = await setupTwoPlayerRoom('host-13', 'guest-13');
      const first = await service.getRoom('host-13', roomId);
      const second = await service.getRoom('host-13', roomId);
      expect(second.matches[0].expiresAt).toEqual(first.matches[0].expiresAt);
    });

    it('treats a match with no expiresAt (legacy data) as never late instead of crashing', async () => {
      const roomId = await setupTwoPlayerRoom('host-14', 'guest-14');
      expireCountdown(roomId);
      setMatchExpiresAt(roomId, null);
      const questionId = fake.arenaQuestionTable.rows[0].id;

      const result = await service.submitAnswer(
        'host-14',
        roomId,
        questionId,
        { answer: 'A' } as SubmitArenaAnswerDto,
      );

      expect(result.late).toBe(false);
      expect(result.answer.isCorrect).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // Fix 3: matchmaking concurrency
  // ---------------------------------------------------------------------
  describe('matchmaking concurrency (enterQueue)', () => {
    const queueDto = (): QueueArenaDto =>
      ({
        gameMode: 'SOLO_1V1',
        skill: 'Vocabulary',
        difficulty: 'A1',
        topic: 'Animals',
      }) as QueueArenaDto;

    it('matches two players into exactly one room', async () => {
      const first = await service.enterQueue('player-a', queueDto());
      expect(first.matched).toBe(false);

      const second = await service.enterQueue('player-b', queueDto());
      expect(second.matched).toBe(true);
      expect(fake.arenaRoomTable.rows).toHaveLength(1);
      expect(fake.arenaQueueTable.rows).toHaveLength(0);
    });

    it('does not double-match one queued player against two concurrent challengers', async () => {
      await service.enterQueue('player-x', queueDto());

      const [resultY, resultZ] = await Promise.all([
        service.enterQueue('player-y', queueDto()),
        service.enterQueue('player-z', queueDto()),
      ]);

      const matchedCount = [resultY, resultZ].filter((r) => r.matched).length;
      expect(matchedCount).toBe(1);
      expect(fake.arenaRoomTable.rows).toHaveLength(1);
      // Exactly one of Y/Z ends up queued alone (the loser of the race),
      // player-x's queue row was consumed by whichever one won.
      expect(fake.arenaQueueTable.rows).toHaveLength(1);
    });

    it('rejects entering the queue while already in an active room', async () => {
      const roomId = await setupTwoPlayerRoom('host-15', 'guest-15');
      void roomId;

      await expect(
        service.enterQueue('host-15', queueDto()),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  // ---------------------------------------------------------------------
  // Fix 2 & 6: server-computed winner + idempotent finish/reward
  // ---------------------------------------------------------------------
  describe('finishMatch / finalizeMatch (server-authoritative + idempotent)', () => {
    async function setupFinishableMatch(hostId: string, guestId: string) {
      const roomId = await setupTwoPlayerRoom(hostId, guestId);
      // Make host the clear winner by score, then let time run out so the
      // match becomes eligible to finish.
      const hostParticipant = fake.arenaParticipantTable.rows.find(
        (p) => p.roomId === roomId && p.userId === hostId,
      )!;
      const guestParticipant = fake.arenaParticipantTable.rows.find(
        (p) => p.roomId === roomId && p.userId === guestId,
      )!;
      hostParticipant.score = 100;
      guestParticipant.score = 10;
      setMatchExpiresAt(roomId, new Date(Date.now() - 1000));
      return roomId;
    }

    it('ignores a spoofed winnerTeam from the client and computes the winner from stored scores', async () => {
      const roomId = await setupFinishableMatch('host-16', 'guest-16');

      const result = await service.finishMatch('host-16', roomId, {
        winnerTeam: 'B', // host (team A) actually has the higher score
        result: { fabricated: true },
      } as FinishArenaMatchDto);

      expect(result.match?.winnerTeam).toBe('A');
    });

    it('rejects finish from a user who is not a participant of the room', async () => {
      const roomId = await setupFinishableMatch('host-17', 'guest-17');

      await expect(
        service.finishMatch('random-outsider', roomId, {} as FinishArenaMatchDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a manual finish before the match is actually eligible (not all answered, time not up)', async () => {
      const roomId = await setupTwoPlayerRoom('host-18', 'guest-18');

      await expect(
        service.finishMatch('host-18', roomId, {} as FinishArenaMatchDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('does not award rewards/ELO twice when finish is called twice in a row', async () => {
      const roomId = await setupFinishableMatch('host-19', 'guest-19');

      await service.finishMatch('host-19', roomId, {} as FinishArenaMatchDto);
      const mmrAfterFirst = fake.arenaProfileTable.rows.find(
        (p) => p.userId === 'host-19',
      )!.mmr;

      const second = await service.finishMatch(
        'guest-19',
        roomId,
        {} as FinishArenaMatchDto,
      );

      const mmrAfterSecond = fake.arenaProfileTable.rows.find(
        (p) => p.userId === 'host-19',
      )!.mmr;
      expect(mmrAfterSecond).toBe(mmrAfterFirst);
      expect(second.match?.id).toBeDefined();
      expect(
        fake.arenaRewardLogTable.rows.filter(
          (r) => r.matchId === second.match?.id,
        ),
      ).toHaveLength(2); // one per participant, not duplicated
    });

    it('only lets one of two concurrent finish calls actually apply rewards (CAS race)', async () => {
      const roomId = await setupFinishableMatch('host-20', 'guest-20');

      const [a, b] = await Promise.all([
        service.finishMatch('host-20', roomId, {} as FinishArenaMatchDto),
        service.finishMatch('guest-20', roomId, {} as FinishArenaMatchDto),
      ]);

      expect(a.match?.id).toBe(b.match?.id);
      const matchId = a.match?.id;
      expect(
        fake.arenaRewardLogTable.rows.filter((r) => r.matchId === matchId),
      ).toHaveLength(2);

      const hostProfile = fake.arenaProfileTable.rows.find(
        (p) => p.userId === 'host-20',
      )!;
      // Both players start at mmr 1500 (equal), so eloDelta() for a single
      // win is round(40 * (1 - 0.5)) = 20. If the reward loop had run twice
      // (no CAS protection), this would be 40 instead.
      expect(hostProfile.mmr - 1500).toBe(20);
    });

    it('returns the same (already-finished) result on a request that arrives after completion', async () => {
      const roomId = await setupFinishableMatch('host-21', 'guest-21');
      const first = await service.finishMatch(
        'host-21',
        roomId,
        {} as FinishArenaMatchDto,
      );
      const again = await service.finishMatch(
        'guest-21',
        roomId,
        {} as FinishArenaMatchDto,
      );

      expect(again.match?.id).toBe(first.match?.id);
      expect(again.match?.winnerTeam).toBe(first.match?.winnerTeam);
    });
  });
});
