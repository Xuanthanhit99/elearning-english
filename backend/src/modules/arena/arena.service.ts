import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateArenaRoomDto } from './dto/create-arena-room.dto';
import { FinishArenaMatchDto } from './dto/finish-arena-match.dto';
import { JoinArenaRoomDto } from './dto/join-arena-room.dto';
import { QueueArenaDto } from './dto/queue-arena.dto';
import { CreateArenaEventDto } from './dto/create-arena-event.dto';
import { SubmitArenaAnswerDto } from './dto/submit-arena-answer.dto';
import { SetArenaReadyDto } from './dto/set-arena-ready.dto';
import { ArenaEventPublisher } from './realtime/arena-event-publisher';
import {
  ARENA_ANSWER_SUBMITTED,
  ARENA_MATCH_FINISHED,
  ARENA_MATCH_STARTED,
  ARENA_ROOM_UPDATED,
} from './realtime/arena-domain-event';
import { ArenaBattleEngineService } from './battle/arena-battle-engine.service';
import { ArenaBattleStateService } from './battle/arena-battle-state.service';
import { ArenaBattleEventService } from './battle/arena-battle-event.service';
import { ArenaPowerUpService } from './battle/arena-power-up.service';
import { getArenaQuestionWindowMs } from './battle/arena-battle.constants';
import { getModeCapability } from './mode/arena-mode.registry';
import {
  resolveArenaMode,
  resolveRequestedArenaMode,
} from './mode/arena-mode-resolver.util';
import {
  areRequiredPlayersReady,
  getArenaPreparationTimeoutMs,
  getCapacityForTeamFormat,
  isRoomAtCapacity,
  isStalePreparingRoom,
} from './mode/arena-capacity.util';
import {
  ArenaQuestionPipelineService,
  ArenaQuestionPreparationError,
} from './question/arena-question-pipeline.service';
import { ArenaQuestionHistoryService } from './question/arena-question-history.service';
import { createQuestionContentHash } from './question/arena-question-hash.util';
import { ArenaQuestionCandidate } from './question/arena-question.types';
import { ArenaProgressionDispatcherService } from './progression/arena-progression-dispatcher.service';
/** Internal signal: the room left PREPARING (or its participant set changed) mid-preparation — bail out quietly, not a failure to report. */
class RoomStateChangedError extends Error {}

@Injectable()
export class ArenaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: ArenaEventPublisher,
    private readonly battleEngine: ArenaBattleEngineService,
    private readonly battleState: ArenaBattleStateService,
    private readonly battleEvents: ArenaBattleEventService,
    private readonly powerUps: ArenaPowerUpService,
    private readonly questionPipeline: ArenaQuestionPipelineService,
    private readonly questionHistory: ArenaQuestionHistoryService,
    private readonly progressionDispatcher: ArenaProgressionDispatcherService,
  ) {}

  private async bumpRoomRevision(roomId: string) {
    await this.prisma.arenaRoom
      .update({
        where: { id: roomId },
        data: { revision: { increment: 1 } },
      })
      .catch(() => undefined);
  }

  private async bumpMatchRevision(matchId: string) {
    await this.prisma.arenaMatch
      .update({
        where: { id: matchId },
        data: { revision: { increment: 1 } },
      })
      .catch(() => undefined);
  }

  private normalizeAnswer(answer: string) {
    return answer.trim().toLowerCase().replace(/\s+/g, ' ');
  }
  // Phase F1: ELO/streak-multiplier math moved to
  // `progression/arena-rating-engine.ts` / `progression/arena-pet-reward.util.ts`
  // — reward/rating application itself moved out of `finalizeMatch`'s
  // transaction into `ArenaProgressionDispatcherService` (see
  // docs/arena-progression-sequence.md).

  private async getOrCreateProfile(
    userId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const existing = await client.arenaProfile.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    return client.arenaProfile.create({ data: { userId } });
  }

  async getMyProfile(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const total = profile.winCount + profile.loseCount;

    return {
      ...profile,
      winRate: total === 0 ? 0 : Math.round((profile.winCount / total) * 100),
    };
  }

  async getLobby(userId: string) {
    const profile = await this.getMyProfile(userId);
    const rooms = await this.prisma.arenaRoom.findMany({
      where: { status: 'WAITING' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        host: { select: { id: true, fullname: true, avatar: true } },
        participants: {
          include: {
            user: { select: { id: true, fullname: true, avatar: true } },
          },
        },
      },
    });
    const myActiveRoom = await this.prisma.arenaRoom.findFirst({
      where: {
        status: { in: ['WAITING', 'PLAYING'] },
        participants: { some: { userId } },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        host: { select: { id: true, fullname: true, avatar: true } },
        participants: {
          include: {
            user: { select: { id: true, fullname: true, avatar: true } },
          },
        },
      },
    });

    return { profile, rooms, myActiveRoom };
  }

  async createRoom(userId: string, dto: CreateArenaRoomDto) {
    await this.getOrCreateProfile(userId);

    const resolved = resolveRequestedArenaMode({
      gameMode: dto.gameMode,
      mode: dto.mode,
      teamFormat: dto.teamFormat,
    });
    const capability = getModeCapability(resolved.mode);
    if (!capability.enabled) {
      throw new BadRequestException(
        `Chế độ "${resolved.mode}" hiện chưa khả dụng.`,
      );
    }
    if (!capability.supportedTeamFormats.includes(resolved.teamFormat)) {
      throw new BadRequestException(
        `Chế độ "${resolved.mode}" không hỗ trợ đội hình "${resolved.teamFormat}".`,
      );
    }
    if (resolved.mode === 'FRIEND_CHALLENGE' && dto.visibility !== 'PRIVATE') {
      throw new BadRequestException('Friend Challenge chỉ hỗ trợ phòng riêng tư (PRIVATE).');
    }
    if (!capability.supportsPrivateRooms && dto.visibility === 'PRIVATE') {
      throw new BadRequestException(`Chế độ "${resolved.mode}" không hỗ trợ phòng riêng tư.`);
    }

    const size = getCapacityForTeamFormat(resolved.teamFormat);
    const existingRoom = await this.prisma.arenaRoom.findFirst({
      where: {
        status: { in: ['WAITING', 'PREPARING', 'PLAYING'] },
        OR: [{ hostId: userId }, { participants: { some: { userId } } }],
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (existingRoom) return this.includeRoom(existingRoom.id);

    const room = await this.prisma.arenaRoom.create({
      data: {
        hostId: userId,
        name: dto.name,
        visibility: dto.visibility,
        password: dto.visibility === 'PRIVATE' ? dto.password : null,
        gameMode: dto.gameMode ?? resolved.teamFormat,
        mode: resolved.mode,
        teamFormat: resolved.teamFormat,
        skill: dto.skill,
        winCondition: dto.winCondition,
        durationSec: dto.durationSec,
        maxWrong: dto.maxWrong,
        targetCorrect: dto.targetCorrect,
        bestOf: dto.bestOf,
        difficulty: dto.difficulty,
        topic: dto.topic,
        teamSize: size.teamSize,
        maxPlayers: size.maxPlayers,
        voiceChat: dto.voiceChat ?? false,
        emojiEnabled: dto.emojiEnabled ?? true,
        pingEnabled: dto.pingEnabled ?? true,
        participants: {
          create: {
            userId,
            team: 'A',
            ready: true,
          },
        },
      },
      include: { participants: true },
    });

    return room;
  }

  async joinRoom(userId: string, roomId: string, dto: JoinArenaRoomDto) {
    await this.getOrCreateProfile(userId);
    const room = await this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });

    if (!room) throw new NotFoundException('Không tìm thấy phòng Arena');
    if (room.status !== 'WAITING')
      throw new BadRequestException('Phòng không còn chờ người chơi');
    if (
      room.visibility === 'PRIVATE' &&
      room.password &&
      room.password !== dto.password
    ) {
      throw new ForbiddenException('Sai mật khẩu phòng');
    }
    if (room.participants.some((item) => item.userId === userId)) {
      await this.prisma.arenaParticipant.update({
        where: { roomId_userId: { roomId, userId } },
        data: { ready: true },
      });
      const updatedRoom = await this.prisma.arenaRoom.findUnique({
        where: { id: roomId },
        include: {
          participants: true,
          matches: { where: { finishedAt: null }, take: 1 },
        },
      });
      if (
        updatedRoom &&
        updatedRoom.status === 'WAITING' &&
        areRequiredPlayersReady(updatedRoom)
      ) {
        await this.beginRoomCountdown(updatedRoom);
      }
      await this.bumpRoomRevision(roomId);
      this.eventPublisher.publish({ type: ARENA_ROOM_UPDATED, roomId, actorUserId: userId });
      return this.includeRoom(roomId);
    }
    if (isRoomAtCapacity(room))
      throw new BadRequestException('Phòng đã đầy');

    const teamACount = room.participants.filter(
      (item) => item.team === 'A',
    ).length;
    const teamBCount = room.participants.filter(
      (item) => item.team === 'B',
    ).length;
    const team = teamACount <= teamBCount ? 'A' : 'B';

    await this.prisma.arenaParticipant.create({
      data: { roomId, userId, team, ready: true },
    });

    const updatedRoom = await this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
        matches: { where: { finishedAt: null }, take: 1 },
      },
    });
    if (
      updatedRoom &&
      updatedRoom.status === 'WAITING' &&
      areRequiredPlayersReady(updatedRoom)
    ) {
      await this.beginRoomCountdown(updatedRoom);
    }

    await this.bumpRoomRevision(roomId);
    this.eventPublisher.publish({ type: ARENA_ROOM_UPDATED, roomId, actorUserId: userId });
    return this.includeRoom(roomId);
  }

  private getSearchRange(createdAt: Date, mmr: number) {
    const waitedSeconds = Math.floor((Date.now() - createdAt.getTime()) / 1000);
    const range = waitedSeconds >= 20 ? 200 : waitedSeconds >= 10 ? 100 : 50;
    return { min: mmr - range, max: mmr + range, range };
  }

  private async includeRoom(roomId: string) {
    return this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
      include: {
        host: { select: { id: true, fullname: true, avatar: true } },
        participants: {
          include: {
            user: { select: { id: true, fullname: true, avatar: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        events: {
          include: {
            user: { select: { id: true, fullname: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        matches: {
          include: {
            questions: { orderBy: { order: 'asc' } },
            answers: true,
            // Gate E: combo/score/streak per participant (public — same
            // visibility as ArenaParticipant.score/correct/wrong already
            // has) and currently-relevant power-up effects (only
            // ACTIVE/BLOCKED — no need to ship the full historical log for
            // room rendering; ArenaBattleEvent is the audit trail for that).
            battleStates: true,
            powerUpEffects: { where: { status: { in: ['ACTIVE', 'BLOCKED'] } } },
          },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Phase A security fix: một câu hỏi/đáp án chỉ được "reveal" cho một user
   * cụ thể khi: (a) trận đã kết thúc, hoặc (b) chính user đó đã tự trả lời
   * câu hỏi này rồi — khớp với UX hiện tại (frontend hiện đáp án đúng ngay
   * sau khi chính người dùng bấm chọn). Trước khi reveal: không trả
   * `question.answer`/`explanation`, và không trả answer của người khác cho
   * câu hỏi đó (chỉ trả answer của chính user).
   */
  private sanitizeMatchForUser<
    T extends {
      questions: Array<{
        id: string;
        answer: string;
        explanation: string | null;
      }>;
      answers: Array<{ questionId: string; userId: string }>;
      finishedAt: Date | null;
    },
  >(match: T, userId: string) {
    const matchFinished = Boolean(match.finishedAt);
    const myAnsweredQuestionIds = new Set(
      match.answers
        .filter((answer) => answer.userId === userId)
        .map((answer) => answer.questionId),
    );

    const questions = match.questions.map((question) => {
      const revealed = matchFinished || myAnsweredQuestionIds.has(question.id);
      if (revealed) return question;
      const safeQuestion: Record<string, unknown> = { ...question };
      delete safeQuestion.answer;
      delete safeQuestion.explanation;
      return safeQuestion;
    });

    const answers = match.answers.filter((answer) => {
      if (matchFinished) return true;
      if (answer.userId === userId) return true;
      return myAnsweredQuestionIds.has(answer.questionId);
    });

    return { ...match, questions, answers };
  }

  async getRoom(userId: string, roomId: string) {
    const room = await this.includeRoom(roomId);
    if (!room) throw new NotFoundException('Không tìm thấy phòng Arena');
    const isParticipant = room.participants.some(
      (item) => item.userId === userId,
    );
    if (!isParticipant) {
      // Phase A: chưa làm spectator thật — người ngoài phòng không được xem
      // dữ liệu trận đấu (câu hỏi/đáp án/answers của người chơi khác).
      throw new ForbiddenException('Bạn chưa tham gia phòng này.');
    }

    const matches = room.matches.map((match) =>
      this.sanitizeMatchForUser(match, userId),
    );

    // Gate E: own power-up loadout (remaining uses/cooldown) is private —
    // never included for the opponent, only the caller's own. Only fetched
    // for the currently-open match, if any.
    const openMatch = room.matches.find((match) => !match.finishedAt);
    const myPowerUps = openMatch
      ? await this.prisma.arenaMatchPowerUp.findMany({
          where: { matchId: openMatch.id, userId },
        })
      : [];

    return {
      ...room,
      matches,
      isParticipant,
      myPowerUps,
      serverTime: new Date().toISOString(),
    };
  }

  async enterQueue(userId: string, dto: QueueArenaDto) {
    const resolved = resolveRequestedArenaMode({
      gameMode: dto.gameMode,
      mode: dto.mode,
      teamFormat: dto.teamFormat,
    });
    const capability = getModeCapability(resolved.mode);
    if (!capability.enabled) {
      throw new BadRequestException(`Chế độ "${resolved.mode}" hiện chưa khả dụng.`);
    }
    if (!capability.supportsPublicMatchmaking) {
      throw new BadRequestException(
        `Chế độ "${resolved.mode}" không hỗ trợ ghép trận công khai.`,
      );
    }
    if (!capability.supportedTeamFormats.includes(resolved.teamFormat)) {
      throw new BadRequestException(
        `Chế độ "${resolved.mode}" không hỗ trợ đội hình "${resolved.teamFormat}".`,
      );
    }
    const legacyGameMode = dto.gameMode ?? resolved.teamFormat;

    // Phase A: chống double-match race condition. Toàn bộ chuỗi
    // "tìm đối thủ -> tạo room -> xoá queue" phải nằm trong 1 transaction,
    // và dùng Postgres advisory transaction lock (khoá theo 1 key cố định
    // cho toàn bộ matchmaking) để đảm bảo 2 request enterQueue chạy đồng
    // thời không thể cùng đọc thấy 1 đối thủ trước khi 1 trong 2 xoá dòng
    // queue đó. Lock tự nhả khi transaction commit/rollback (xact-scoped),
    // không cần dọn dẹp thủ công, không cần mutex in-memory (không an toàn
    // khi nhiều process/instance).
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext('arena_matchmaking'))`,
      );

      const activeRoom = await tx.arenaRoom.findFirst({
        where: {
          status: { in: ['WAITING', 'PLAYING'] },
          participants: { some: { userId } },
        },
        select: { id: true },
      });
      if (activeRoom) {
        throw new ConflictException(
          'Bạn đang ở trong một phòng/trận đang hoạt động, không thể vào hàng đợi.',
        );
      }

      const profile = await this.getOrCreateProfile(userId, tx);
      const now = new Date();
      const ownRange = this.getSearchRange(now, profile.mmr);

      const opponent = await tx.arenaQueue.findFirst({
        where: {
          userId: { not: userId },
          gameMode: legacyGameMode,
          skill: dto.skill,
          difficulty: dto.difficulty,
          topic: dto.topic,
          mmr: { gte: ownRange.min, lte: ownRange.max },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (opponent) {
        const size = getCapacityForTeamFormat(resolved.teamFormat);
        const room = await tx.arenaRoom.create({
          data: {
            hostId: opponent.userId,
            name: `Matchmaking ${dto.skill} ${dto.difficulty}`,
            visibility: 'PUBLIC',
            gameMode: legacyGameMode,
            mode: resolved.mode,
            teamFormat: resolved.teamFormat,
            skill: dto.skill,
            winCondition: 'TIME',
            durationSec: 180,
            difficulty: dto.difficulty,
            topic: dto.topic,
            teamSize: size.teamSize,
            maxPlayers: size.maxPlayers,
            voiceChat: resolved.teamFormat !== 'SOLO_1V1',
            emojiEnabled: true,
            pingEnabled: true,
            participants: {
              create: [
                { userId: opponent.userId, team: 'A' },
                { userId, team: 'B' },
              ],
            },
          },
        });

        await tx.arenaQueue.deleteMany({
          where: { userId: { in: [userId, opponent.userId] } },
        });

        return { matched: true as const, roomId: room.id };
      }

      const range = this.getSearchRange(now, profile.mmr);
      const queue = await tx.arenaQueue.upsert({
        where: { userId },
        update: {
          gameMode: legacyGameMode,
          skill: dto.skill,
          difficulty: dto.difficulty,
          topic: dto.topic,
          mmr: profile.mmr,
          searchMinMmr: range.min,
          searchMaxMmr: range.max,
        },
        create: {
          userId,
          gameMode: legacyGameMode,
          skill: dto.skill,
          difficulty: dto.difficulty,
          topic: dto.topic,
          mmr: profile.mmr,
          searchMinMmr: range.min,
          searchMaxMmr: range.max,
        },
      });

      return { matched: false as const, queue };
    });

    if (result.matched) {
      // Hydrate response ngoài transaction (đọc sau khi đã commit) để tránh
      // đọc dữ liệu chưa commit qua 1 connection khác.
      return { matched: true, room: await this.includeRoom(result.roomId) };
    }

    return result;
  }

  async leaveQueue(userId: string) {
    await this.prisma.arenaQueue.deleteMany({ where: { userId } });
    return { ok: true };
  }
  /**
   * Room preparation state machine (Phase BC-Reconciliation). Replaces the
   * old unconditional "just start it" flow:
   *   1. CAS claim WAITING (or a stale PREPARING) -> PREPARING.
   *   2. Defensive capability re-check.
   *   3. Question pipeline — OUTSIDE any DB transaction (it calls Gemini).
   *   4. Short transaction: re-verify still PREPARING with the same
   *      participants, persist match/questions/history, init battle state
   *      if supported, flip to PLAYING.
   *   5. Pipeline or persistence failure -> FAILED (+ sanitized reason),
   *      retryable via `retryPreparation`.
   */
  private async beginRoomCountdown(
    room: Prisma.ArenaRoomGetPayload<{
      include: { participants: true; matches: true };
    }>,
  ) {
    const staleThreshold = new Date(Date.now() - getArenaPreparationTimeoutMs());
    const claimed = await this.prisma.arenaRoom.updateMany({
      where: {
        id: room.id,
        OR: [
          { status: 'WAITING' },
          { status: 'PREPARING', preparationStartedAt: { lt: staleThreshold } },
        ],
      },
      data: { status: 'PREPARING', preparationStartedAt: new Date(), preparationError: null },
    });
    if (claimed.count === 0) {
      // Another request already owns preparation and it isn't stale yet —
      // idempotent no-op, let that request finish (no duplicate match).
      return;
    }

    await this.bumpRoomRevision(room.id);
    this.eventPublisher.publish({ type: ARENA_ROOM_UPDATED, roomId: room.id });

    const resolved = resolveArenaMode(room);
    const capability = getModeCapability(resolved.mode);
    const supportsBattle =
      capability.supportsBattleMechanics && resolved.teamFormat === 'SOLO_1V1';

    if (!capability.enabled || !capability.supportedTeamFormats.includes(resolved.teamFormat)) {
      await this.failRoomPreparation(room.id, 'Chế độ hoặc đội hình này chưa được hỗ trợ.');
      return;
    }

    const countdownEndsAt = new Date(Date.now() + 5000);
    // Phase A: deadline cho toàn bộ trận (server-authoritative), tính từ lúc
    // countdown kết thúc + thời lượng trận.
    const durationSec = room.durationSec ?? 180;
    const expiresAt = new Date(countdownEndsAt.getTime() + durationSec * 1000);

    const match =
      room.matches[0] ||
      (await this.prisma.arenaMatch.create({
        data: { roomId: room.id, expiresAt },
      }));

    if (!match.expiresAt) {
      await this.prisma.arenaMatch.update({
        where: { id: match.id },
        data: { expiresAt },
      });
    }

    const existingQuestionCount = await this.prisma.arenaQuestion.count({
      where: { matchId: match.id },
    });

    if (existingQuestionCount === 0) {
      let candidates: ArenaQuestionCandidate[];
      try {
        candidates = await this.questionPipeline.prepareQuestionSet({
          skill: room.skill,
          topic: room.topic,
          difficulty: room.difficulty,
          mode: resolved.mode,
          userIds: room.participants.map((participant) => participant.userId),
          count: 8,
        });
      } catch (error) {
        await this.failRoomPreparation(
          room.id,
          error instanceof ArenaQuestionPreparationError
            ? error.message
            : 'Không chuẩn bị được câu hỏi cho trận đấu.',
        );
        return;
      }

      try {
        await this.persistPreparedMatch({
          room,
          matchId: match.id,
          candidates,
          mode: resolved.mode,
          topic: room.topic,
          supportsBattle,
          countdownEndsAt,
        });
      } catch (error) {
        if (!(error instanceof RoomStateChangedError)) {
          await this.failRoomPreparation(room.id, 'Không lưu được dữ liệu trận đấu.');
        }
        return;
      }
    } else {
      await this.prisma.arenaRoom.update({
        where: { id: room.id },
        data: {
          status: 'PLAYING',
          countdownEndsAt,
          preparationStartedAt: null,
          preparationError: null,
          revision: { increment: 1 },
        },
      });
    }

    if (supportsBattle) {
      // Idempotent (createMany + skipDuplicates) — safe even if this is a
      // re-entry after a stale-PREPARING reclaim.
      await this.powerUps.initializeLoadout(
        match.id,
        room.participants.map((participant) => participant.userId),
      );
    }

    this.eventPublisher.publish({
      type: ARENA_MATCH_STARTED,
      roomId: room.id,
      matchId: match.id,
    });
  }

  private async persistPreparedMatch(input: {
    room: Prisma.ArenaRoomGetPayload<{ include: { participants: true; matches: true } }>;
    matchId: string;
    candidates: ArenaQuestionCandidate[];
    mode: string;
    topic: string;
    supportsBattle: boolean;
    countdownEndsAt: Date;
  }) {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.arenaRoom.findUnique({
        where: { id: input.room.id },
        include: { participants: true },
      });
      if (!current || current.status !== 'PREPARING') {
        throw new RoomStateChangedError();
      }
      const currentIds = new Set(current.participants.map((participant) => participant.userId));
      const originalIds = new Set(
        input.room.participants.map((participant) => participant.userId),
      );
      const sameParticipants =
        currentIds.size === originalIds.size &&
        [...currentIds].every((id) => originalIds.has(id));
      if (!sameParticipants) {
        throw new RoomStateChangedError();
      }

      const questionRows = input.candidates.map((candidate, index) => ({
        matchId: input.matchId,
        order: index + 1,
        type: candidate.type,
        skill: candidate.skill,
        prompt: candidate.prompt,
        options: candidate.options,
        answer: candidate.answer,
        explanation: candidate.explanation,
        points: candidate.points,
        contentHash: createQuestionContentHash(candidate),
      }));
      await tx.arenaQuestion.createMany({ data: questionRows });

      await this.questionHistory.recordSeen(
        tx,
        current.participants.flatMap((participant) =>
          questionRows.map((question) => ({
            userId: participant.userId,
            contentHash: question.contentHash,
            matchId: input.matchId,
            mode: input.mode,
            skill: question.skill,
            topic: input.topic,
          })),
        ),
      );

      await tx.arenaParticipant.updateMany({
        where: { roomId: input.room.id },
        data: { score: 0, correct: 0, wrong: 0 },
      });

      if (input.supportsBattle) {
        const questionActivatedAt = input.countdownEndsAt;
        const questionDeadlineAt = new Date(
          questionActivatedAt.getTime() + getArenaQuestionWindowMs(),
        );
        await tx.arenaMatch.update({
          where: { id: input.matchId },
          data: { activeQuestionOrder: 1, questionActivatedAt, questionDeadlineAt },
        });
      }

      await tx.arenaRoom.update({
        where: { id: input.room.id },
        data: {
          status: 'PLAYING',
          countdownEndsAt: input.countdownEndsAt,
          preparationStartedAt: null,
          preparationError: null,
          revision: { increment: 1 },
        },
      });
    });
  }

  private async failRoomPreparation(roomId: string, reason: string) {
    await this.prisma.arenaRoom
      .update({ where: { id: roomId }, data: { status: 'FAILED', preparationError: reason } })
      .catch(() => undefined);
    await this.bumpRoomRevision(roomId);
    this.eventPublisher.publish({ type: ARENA_ROOM_UPDATED, roomId });
  }

  /**
   * Retries preparation for a room stuck in FAILED — resets it to WAITING
   * (CAS, idempotent under a race with another retry call) and, if every
   * required player is still ready, immediately re-triggers preparation.
   */
  async retryPreparation(userId: string, roomId: string) {
    const room = await this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng Arena');
    if (!room.participants.some((participant) => participant.userId === userId)) {
      throw new ForbiddenException('Bạn chưa ở trong phòng này');
    }
    if (room.status !== 'FAILED') {
      throw new BadRequestException('Phòng không ở trạng thái lỗi, không cần thử lại.');
    }

    const claimed = await this.prisma.arenaRoom.updateMany({
      where: { id: roomId, status: 'FAILED' },
      data: { status: 'WAITING', preparationError: null, revision: { increment: 1 } },
    });
    if (claimed.count > 0) {
      this.eventPublisher.publish({ type: ARENA_ROOM_UPDATED, roomId, actorUserId: userId });
    }

    const updatedRoom = await this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
        matches: { where: { finishedAt: null }, take: 1 },
      },
    });
    if (updatedRoom && updatedRoom.status === 'WAITING' && areRequiredPlayersReady(updatedRoom)) {
      await this.beginRoomCountdown(updatedRoom);
    }

    return this.includeRoom(roomId);
  }

  async startRoom(userId: string, roomId: string) {
    const room = await this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
        matches: { where: { finishedAt: null }, take: 1 },
      },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng Arena');
    if (room.hostId !== userId)
      throw new ForbiddenException('Chỉ host được bắt đầu trận');
    if (room.status !== 'WAITING')
      throw new BadRequestException('Trận này không còn ở trạng thái chờ');
    if (room.participants.length < 2)
      throw new BadRequestException('Cần ít nhất 2 người chơi để bắt đầu');
    if (room.participants.some((participant) => !participant.ready)) {
      throw new BadRequestException(
        'Tất cả người chơi cần bấm sẵn sàng trước khi bắt đầu',
      );
    }

    await this.beginRoomCountdown(room);
    await this.bumpRoomRevision(roomId);
    this.eventPublisher.publish({ type: ARENA_ROOM_UPDATED, roomId, actorUserId: userId });
    return this.includeRoom(roomId);
  }

  async setReady(userId: string, roomId: string, dto: SetArenaReadyDto) {
    const room = await this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng Arena');
    // A stale-PREPARING room (see `beginRoomCountdown`'s CAS claim) is also
    // accepted here — it's the "next ready-toggle" that reclaims it, per the
    // state machine's own doc comment. `beginRoomCountdown` re-verifies
    // staleness itself via the same CAS claim before doing anything.
    if (room.status !== 'WAITING' && !isStalePreparingRoom(room))
      throw new BadRequestException('Chỉ có thể sẵn sàng khi phòng đang chờ');

    await this.prisma.arenaParticipant.update({
      where: { roomId_userId: { roomId, userId } },
      data: { ready: dto.ready },
    });

    const updatedRoom = await this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
        matches: { where: { finishedAt: null }, take: 1 },
      },
    });
    if (
      updatedRoom &&
      (updatedRoom.status === 'WAITING' || isStalePreparingRoom(updatedRoom)) &&
      areRequiredPlayersReady(updatedRoom)
    ) {
      await this.beginRoomCountdown(updatedRoom);
    }

    await this.bumpRoomRevision(roomId);
    this.eventPublisher.publish({ type: ARENA_ROOM_UPDATED, roomId, actorUserId: userId });
    return this.includeRoom(roomId);
  }

  async leaveRoom(userId: string, roomId: string) {
    const room = await this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: { user: { select: { id: true, fullname: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!room) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y phÃ²ng Arena');
    const participant = room.participants.find(
      (item) => item.userId === userId,
    );
    if (!participant)
      throw new ForbiddenException('Báº¡n chÆ°a á»Ÿ trong phÃ²ng nÃ y');

    const remainingParticipants = room.participants.filter(
      (item) => item.userId !== userId,
    );

    if (remainingParticipants.length === 0) {
      const matches = await this.prisma.arenaMatch.findMany({
        where: { roomId },
        select: { id: true },
      });
      const matchIds = matches.map((match) => match.id);
      await this.prisma.$transaction([
        this.prisma.arenaRewardLog.deleteMany({
          where: { matchId: { in: matchIds } },
        }),
        this.prisma.arenaAnswer.deleteMany({
          where: { matchId: { in: matchIds } },
        }),
        this.prisma.arenaQuestion.deleteMany({
          where: { matchId: { in: matchIds } },
        }),
        this.prisma.arenaMatch.deleteMany({ where: { roomId } }),
        this.prisma.arenaRoomEvent.deleteMany({ where: { roomId } }),
        this.prisma.arenaParticipant.deleteMany({ where: { roomId } }),
        this.prisma.arenaRoom.delete({ where: { id: roomId } }),
      ]);
      await this.prisma.arenaQueue.deleteMany({ where: { userId } });
      return { deleted: true };
    }

    const nextHost = room.hostId === userId ? remainingParticipants[0] : null;
    await this.prisma.$transaction([
      this.prisma.arenaParticipant.delete({
        where: { roomId_userId: { roomId, userId } },
      }),
      this.prisma.arenaRoom.update({
        where: { id: roomId },
        data: {
          revision: { increment: 1 },
          ...(nextHost ? { hostId: nextHost.userId } : {}),
        },
      }),
      ...(nextHost
        ? [
            this.prisma.arenaRoomEvent.create({
              data: {
                roomId,
                userId: nextHost.userId,
                type: 'HOST_CHANGED',
                payload: {
                  previousHostId: userId,
                  previousHostName: participant.user?.fullname || 'Chủ phòng',
                  newHostId: nextHost.userId,
                  newHostName: nextHost.user?.fullname || 'Người chơi mới',
                },
              },
            }),
          ]
        : [
            this.prisma.arenaRoomEvent.create({
              data: {
                roomId,
                userId: remainingParticipants[0].userId,
                type: 'PLAYER_LEFT',
                payload: {
                  userId,
                  name: participant.user?.fullname || 'Người chơi',
                },
              },
            }),
          ]),
    ]);

    await this.prisma.arenaQueue.deleteMany({ where: { userId } });
    this.eventPublisher.publish({ type: ARENA_ROOM_UPDATED, roomId, actorUserId: userId });
    return {
      deleted: false,
      hostChanged: Boolean(nextHost),
      room: await this.includeRoom(roomId),
    };
  }

  async createEvent(userId: string, roomId: string, dto: CreateArenaEventDto) {
    const participant = await this.prisma.arenaParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!participant)
      throw new ForbiddenException('Bạn chưa ở trong phòng này');

    const event = await this.prisma.arenaRoomEvent.create({
      data: {
        roomId,
        userId,
        type: dto.type,
        payload: dto.payload,
      },
      include: { user: { select: { id: true, fullname: true, avatar: true } } },
    });

    await this.bumpRoomRevision(roomId);
    this.eventPublisher.publish({ type: ARENA_ROOM_UPDATED, roomId, actorUserId: userId });
    return event;
  }

  async submitAnswer(
    userId: string,
    roomId: string,
    questionId: string,
    dto: SubmitArenaAnswerDto,
  ) {
    const participant = await this.prisma.arenaParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!participant)
      throw new ForbiddenException('Bạn chưa ở trong phòng này');

    const room = await this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
    });
    if (!room || room.status !== 'PLAYING')
      throw new BadRequestException('Trận chưa bắt đầu');
    if (!room.countdownEndsAt || room.countdownEndsAt.getTime() > Date.now()) {
      throw new BadRequestException('Trận đang đếm ngược, vui lòng chờ');
    }

    const question = await this.prisma.arenaQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Không tìm thấy câu hỏi Arena');

    const match = await this.prisma.arenaMatch.findUnique({
      where: { id: question.matchId },
    });
    if (!match) throw new NotFoundException('Không tìm thấy trận đấu Arena');

    // Gate E: per-question activation/deadline, battle-mechanics-capable
    // modes at SOLO_1V1 team format only — every other mode/team-format
    // keeps the exact Phase A "answer any question, single match-wide
    // deadline" behavior below unchanged.
    const answerBattleMode = resolveArenaMode(room);
    const isSolo =
      getModeCapability(answerBattleMode.mode).supportsBattleMechanics &&
      answerBattleMode.teamFormat === 'SOLO_1V1' &&
      Boolean(match.activeQuestionOrder);
    if (isSolo && question.order !== match.activeQuestionOrder) {
      throw new BadRequestException(
        'Đây không phải câu hỏi đang mở, vui lòng chờ câu hỏi hiện tại.',
      );
    }

    let battleStateBefore: Awaited<
      ReturnType<typeof this.battleState.getOrCreate>
    > | null = null;
    let armedDoubleScore = false;
    if (isSolo) {
      battleStateBefore = await this.battleState.getOrCreate(match.id, participant.id);
      const effect = await this.prisma.arenaPowerUpEffect.findFirst({
        where: {
          matchId: match.id,
          targetUserId: userId,
          type: 'DOUBLE_SCORE',
          status: 'ACTIVE',
        },
      });
      armedDoubleScore = Boolean(
        effect && (effect.appliesFromQuestionOrder ?? 0) <= (match.activeQuestionOrder ?? 0),
      );
    }

    // Phase A: deadline server-side. Quá hạn -> vẫn ghi nhận answer (để flow
    // tiến lên, không throw lỗi làm match treo) nhưng luôn tính 0 điểm bất kể
    // đáp án đúng/sai, không tin timestamp do client gửi.
    const now = Date.now();
    const isLateByMatch = Boolean(match.expiresAt && now > match.expiresAt.getTime());
    const perQuestionDeadline = isSolo
      ? (battleStateBefore?.deadlineOverrideAt ?? match.questionDeadlineAt)
      : null;
    const isLateByQuestion = Boolean(
      perQuestionDeadline && now > perQuestionDeadline.getTime(),
    );
    const isLate = isLateByMatch || isLateByQuestion;
    const isCorrect =
      !isLate &&
      this.normalizeAnswer(dto.answer) ===
        this.normalizeAnswer(question.answer);

    const outcome = isSolo
      ? this.battleEngine.calculateAnswerOutcome({
          basePoints: question.points,
          isCorrect,
          isLate,
          comboBefore: battleStateBefore?.combo ?? 0,
          questionActivatedAt: match.questionActivatedAt,
          answeredAt: new Date(now),
          windowMs: getArenaQuestionWindowMs(),
          powerUpMultiplierBasisPoints: armedDoubleScore ? 20000 : 10000,
        })
      : null;
    const points = isSolo ? outcome!.finalScore : isCorrect ? question.points : 0;

    // Phase A: mỗi user chỉ có 1 answer chính thức cho mỗi câu hỏi.
    // - Lần submit đầu tiên: create.
    // - Retry cùng answer (network retry/double-click): idempotent, trả lại
    //   kết quả đã lưu, không tạo row mới, không cộng điểm lại.
    // - Submit answer KHÁC sau khi đã trả lời: từ chối (ConflictException),
    //   không ghi đè, không đổi điểm.
    // Dựa vào unique constraint DB (@@unique([questionId, userId])) nên 2
    // request đồng thời cho cùng câu hỏi chỉ có đúng 1 request tạo được row,
    // request còn lại rơi vào nhánh catch bên dưới.
    let answer: Awaited<ReturnType<typeof this.prisma.arenaAnswer.findFirst>>;
    let isNewAnswer = false;
    try {
      answer = await this.prisma.arenaAnswer.create({
        data: {
          matchId: question.matchId,
          questionId,
          userId,
          answer: dto.answer,
          isCorrect,
          points,
        },
      });
      isNewAnswer = true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.arenaAnswer.findUnique({
          where: { questionId_userId: { questionId, userId } },
        });
        if (!existing) throw error;
        if (
          this.normalizeAnswer(existing.answer) !==
          this.normalizeAnswer(dto.answer)
        ) {
          throw new ConflictException(
            'Bạn đã trả lời câu hỏi này rồi, không thể đổi đáp án.',
          );
        }
        answer = existing;
      } else {
        throw error;
      }
    }

    if (isSolo && isNewAnswer) {
      await this.applySoloBattleOutcome({
        matchId: match.id,
        roomId,
        participantId: participant.id,
        userId,
        questionId,
        activeQuestionOrder: match.activeQuestionOrder!,
        isCorrect,
        isLate,
        armedDoubleScore,
        comboAfter: outcome!.comboAfter,
        scoreDelta: points,
      });
    }

    const answers = await this.prisma.arenaAnswer.findMany({
      where: { matchId: question.matchId, userId },
    });
    const score = answers.reduce((sum, item) => sum + item.points, 0);
    const correct = answers.filter((item) => item.isCorrect).length;
    const wrong = answers.filter((item) => !item.isCorrect).length;

    await this.prisma.arenaParticipant.update({
      where: { roomId_userId: { roomId, userId } },
      data: { score, correct, wrong },
    });

    const [questionCount, answerCount, freshParticipants] = await Promise.all([
      this.prisma.arenaQuestion.count({
        where: { matchId: question.matchId },
      }),
      this.prisma.arenaAnswer.count({ where: { matchId: question.matchId } }),
      this.prisma.arenaParticipant.findMany({ where: { roomId } }),
    ]);
    await this.bumpMatchRevision(question.matchId);
    this.eventPublisher.publish({
      type: ARENA_ANSWER_SUBMITTED,
      roomId,
      matchId: question.matchId,
      actorUserId: userId,
    });

    if (
      !match.finishedAt &&
      questionCount > 0 &&
      answerCount >= questionCount * freshParticipants.length
    ) {
      await this.finalizeMatch(roomId);
    }

    return {
      answer,
      score,
      correct,
      wrong,
      late: isLate,
      ...(isSolo && outcome
        ? {
            combo: outcome.comboAfter,
            comboMultiplierBasisPoints: outcome.comboMultiplierBasisPoints,
            speedBonusBasisPoints: outcome.speedBonusBasisPoints,
            powerUpApplied: armedDoubleScore,
          }
        : {}),
    };
  }

  /**
   * Gate E, SOLO_1V1 only: persists everything a scored answer implies on
   * top of the ArenaAnswer row Phase A already writes — combo/streak/
   * multiplier state, DOUBLE_SCORE consumption, the battle event log, and
   * advancing to the next question once both participants have answered
   * the current one. Only called for a genuinely new answer (never a
   * duplicate retry), so nothing here can double-apply.
   */
  private async applySoloBattleOutcome(input: {
    matchId: string;
    roomId: string;
    participantId: string;
    userId: string;
    questionId: string;
    activeQuestionOrder: number;
    isCorrect: boolean;
    isLate: boolean;
    armedDoubleScore: boolean;
    comboAfter: number;
    scoreDelta: number;
  }) {
    const awarded = input.isCorrect && !input.isLate;

    await this.prisma.$transaction(async (tx) => {
      const stateBefore = await this.battleState.getOrCreate(
        input.matchId,
        input.participantId,
        tx,
      );
      const comboBroken = !awarded && stateBefore.combo > 0;

      await this.battleState.applyAnswerOutcome(tx, {
        matchId: input.matchId,
        participantId: input.participantId,
        awarded,
        comboAfter: input.comboAfter,
        scoreDelta: input.scoreDelta,
      });

      if (input.armedDoubleScore) {
        await tx.arenaPowerUpEffect.updateMany({
          where: {
            matchId: input.matchId,
            targetUserId: input.userId,
            type: 'DOUBLE_SCORE',
            status: 'ACTIVE',
          },
          data: { status: 'CONSUMED', consumedAt: new Date(), remainingTriggers: 0 },
        });
        await this.battleEvents.append(tx, {
          matchId: input.matchId,
          type: 'POWER_UP_CONSUMED',
          actorUserId: input.userId,
          questionId: input.questionId,
          payload: { powerUpType: 'DOUBLE_SCORE' },
        });
      }

      await this.battleEvents.append(tx, {
        matchId: input.matchId,
        type: awarded ? 'ANSWER_CORRECT' : input.isLate ? 'ANSWER_LATE' : 'ANSWER_WRONG',
        actorUserId: input.userId,
        questionId: input.questionId,
        payload: { points: input.scoreDelta, combo: awarded ? input.comboAfter : 0 },
      });

      if (awarded) {
        await this.battleEvents.append(tx, {
          matchId: input.matchId,
          type: 'COMBO_INCREASED',
          actorUserId: input.userId,
          questionId: input.questionId,
          payload: { combo: input.comboAfter },
        });
      } else if (comboBroken) {
        await this.battleEvents.append(tx, {
          matchId: input.matchId,
          type: 'COMBO_BROKEN',
          actorUserId: input.userId,
          questionId: input.questionId,
          payload: { previousCombo: stateBefore.combo },
        });
      }

      const answerCountForQuestion = await tx.arenaAnswer.count({
        where: { questionId: input.questionId },
      });
      const participantCount = await tx.arenaParticipant.count({
        where: { roomId: input.roomId },
      });

      if (answerCountForQuestion >= participantCount) {
        const nextOrder = input.activeQuestionOrder + 1;
        const now = new Date();
        const nextDeadline = new Date(now.getTime() + getArenaQuestionWindowMs());
        await tx.arenaMatch.update({
          where: { id: input.matchId },
          data: {
            activeQuestionOrder: nextOrder,
            questionActivatedAt: now,
            questionDeadlineAt: nextDeadline,
          },
        });
        await tx.arenaParticipantBattleState.updateMany({
          where: { matchId: input.matchId },
          data: { deadlineOverrideAt: null },
        });
      }
    });
  }

  /**
   * Phase A security fix — public, user-facing entrypoint.
   * `dto.winnerTeam`/`dto.result` KHÔNG còn được tin dùng (xem
   * FinishArenaMatchDto) — winner luôn được tính lại từ
   * `ArenaParticipant.score` trong `finalizeMatch`. Method này chỉ chịu
   * trách nhiệm: (a) authorization — chỉ participant của phòng mới được gọi,
   * (b) chặn kết thúc sớm khi trận chưa đủ điều kiện (chưa ai trả lời hết
   * câu hỏi VÀ chưa hết hạn `expiresAt`) — để một participant không thể tự
   * ý "chốt" trận sớm khi đang có lợi thế.
   */
  async finishMatch(userId: string, roomId: string, dto: FinishArenaMatchDto) {
    // dto.winnerTeam/dto.result không còn được tin dùng — xem docblock phía
    // trên và FinishArenaMatchDto. Giữ tham số để không phá signature/route
    // hiện có, nhưng không đọc giá trị của nó.
    void dto;

    const room = await this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng Arena');

    const isParticipant = room.participants.some(
      (participant) => participant.userId === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Bạn không thuộc phòng này.');
    }
    if (room.participants.length < 2) {
      throw new BadRequestException(
        'Cần ít nhất 2 người chơi để kết thúc trận',
      );
    }

    const openMatch = await this.prisma.arenaMatch.findFirst({
      where: { roomId, finishedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (openMatch) {
      const [questionCount, answerCount] = await Promise.all([
        this.prisma.arenaQuestion.count({ where: { matchId: openMatch.id } }),
        this.prisma.arenaAnswer.count({ where: { matchId: openMatch.id } }),
      ]);
      const allAnswered =
        questionCount > 0 &&
        answerCount >= questionCount * room.participants.length;
      const timeUp = Boolean(
        openMatch.expiresAt && Date.now() > openMatch.expiresAt.getTime(),
      );
      if (!allAnswered && !timeUp) {
        throw new BadRequestException(
          'Trận chưa đủ điều kiện để kết thúc (chưa trả lời hết câu hỏi và chưa hết giờ).',
        );
      }
    }

    const result = await this.finalizeMatch(roomId);

    // Phase F1 (Part 9): per-caller progression summary — never the
    // opponent's XP/reward breakdown, only the calling user's own. The
    // pre-existing `rewards` array (both participants' mmr/gold deltas,
    // Phase A) is untouched — this is an additive field alongside it.
    const resolved = resolveArenaMode(room);
    const progression = result.match
      ? await this.progressionDispatcher.getProgressionSummary(result.match.id, userId)
      : null;

    return { ...result, mode: resolved.mode, teamFormat: resolved.teamFormat, progression };
  }

  /**
   * Phase A: nguồn sự thật duy nhất để chốt 1 match — không nhận input từ
   * client. Idempotent + an toàn concurrency:
   * 1. Winner luôn tính lại từ `ArenaParticipant.score` (không tin client).
   * 2. Chuyển `finishedAt: null -> now()` bằng 1 `updateMany` có điều kiện
   *    `WHERE finishedAt IS NULL` bên trong transaction — đây là compare-
   *    and-swap nguyên tử ở tầng Postgres: nếu 2 request gọi đồng thời, chỉ
   *    1 request có `count === 1` (thắng), request còn lại nhận `count === 0`
   *    và trả về kết quả đã có sẵn thay vì cộng thưởng lần 2.
   * 3. `ArenaRewardLog` có thêm `@@unique([matchId, userId])` làm lớp bảo vệ
   *    thứ 2 (defense in depth) phòng trường hợp gọi finalize trùng theo
   *    hướng khác.
   */
  private async finalizeMatch(
    roomId: string,
    options?: { forcedWinnerTeam?: 'A' | 'B'; reason?: string },
  ) {
    const room = await this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng Arena');
    if (room.participants.length < 2) {
      throw new BadRequestException(
        'Cần ít nhất 2 người chơi để kết thúc trận',
      );
    }

    const openMatch = await this.prisma.arenaMatch.findFirst({
      where: { roomId, finishedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (!openMatch) {
      // Không còn match nào đang mở -> đã được finalize trước đó (bởi 1
      // request khác hoặc lần gọi trước). Trả kết quả gần nhất, idempotent.
      const latestMatch = await this.prisma.arenaMatch.findFirst({
        where: { roomId },
        orderBy: { startedAt: 'desc' },
        include: { rewards: true },
      });
      return { match: latestMatch, rewards: latestMatch?.rewards ?? [] };
    }

    const teamA = room.participants.filter((item) => item.team === 'A');
    const teamB = room.participants.filter((item) => item.team === 'B');
    const teamAScore = teamA.reduce((sum, item) => sum + item.score, 0);
    const teamBScore = teamB.reduce((sum, item) => sum + item.score, 0);
    const winnerTeam: 'A' | 'B' =
      options?.forcedWinnerTeam ?? (teamBScore > teamAScore ? 'B' : 'A');

    let didFinalize = false;

    // Phase F1 (corrected per Phase F0.5 finding F0.5-1): this transaction
    // is now ONLY winner computation + the CAS `finishedAt` flip + the room
    // status flip — reward/rating/XP application moved to
    // `ArenaProgressionDispatcherService.processMatch()`, called AFTER this
    // transaction commits (below), because `XpService.awardXpWithSideEffects()`
    // manages its own transaction and cannot be nested inside this one.
    const outcome = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.arenaMatch.updateMany({
        where: { id: openMatch.id, finishedAt: null },
        data: {
          winnerTeam,
          result: {
            source: 'server',
            teamAScore,
            teamBScore,
            reason: options?.reason ?? 'server_computed_from_scores',
          },
          finishedAt: new Date(),
          revision: { increment: 1 },
        },
      });

      if (claimed.count === 0) {
        // Thua trong cuộc đua CAS: 1 request khác đã finalize match này
        // trước — trả lại kết quả đã có, không cộng thưởng thêm lần nữa.
        const finished = await tx.arenaMatch.findUnique({
          where: { id: openMatch.id },
          include: { rewards: true },
        });
        return { match: finished, rewards: finished?.rewards ?? [] };
      }

      didFinalize = true;

      await tx.arenaRoom.update({
        where: { id: roomId },
        data: { status: 'FINISHED', revision: { increment: 1 } },
      });

      const finalMatch = await tx.arenaMatch.findUnique({
        where: { id: openMatch.id },
      });
      return { match: finalMatch, rewards: [] as unknown[] };
    });

    if (didFinalize) {
      // Per-participant, post-commit, one XpService/own-transaction call
      // each — see docs/arena-progression-sequence.md §§3,6. Awaited here
      // (not fire-and-forget) so `finishMatch`'s caller/response and every
      // existing test that reads reward data immediately after this call
      // keep seeing fully-applied results, same timing as before F1.
      await this.progressionDispatcher.processMatch(openMatch.id);

      this.eventPublisher.publish({
        type: ARENA_MATCH_FINISHED,
        roomId,
        matchId: openMatch.id,
      });

      const rewards = await this.prisma.arenaRewardLog.findMany({
        where: { matchId: openMatch.id },
      });
      return { match: outcome.match, rewards };
    }

    return outcome;
  }

  /**
   * Gate D-Recovery: server-driven forfeit when a SOLO_1V1 participant fails
   * to reconnect within the disconnect-grace window (see
   * `ArenaGateway`/`ArenaPresenceService`). Reuses the exact same
   * CAS-protected `finalizeMatch` transaction as every other finish path —
   * the only difference is the winner is supplied instead of computed from
   * scores. Idempotent for the same reason `finalizeMatch` already is: a
   * second forfeit call (or a race with a normal finish) just hits the
   * `finishedAt: null` guard and no-ops.
   */
  async forfeitParticipant(roomId: string, userId: string) {
    const room = await this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });
    if (!room) return null;
    if (resolveArenaMode(room).teamFormat !== 'SOLO_1V1') return null;
    if (room.status !== 'PLAYING') return null;

    const participant = room.participants.find((item) => item.userId === userId);
    if (!participant) return null;

    const openMatch = await this.prisma.arenaMatch.findFirst({
      where: { roomId, finishedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (!openMatch) return null;

    const forcedWinnerTeam = participant.team === 'A' ? 'B' : 'A';
    return this.finalizeMatch(roomId, {
      forcedWinnerTeam,
      reason: 'disconnect_forfeit',
    });
  }
}
