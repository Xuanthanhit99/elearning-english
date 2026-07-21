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
import { GoogleGenAI } from '@google/genai';
// type ArenaQuestionSeed = {
//   type: string;
//   skill: string;
//   prompt: string;
//   options?: string[];
//   answer: string;
//   explanation?: string;
//   points?: number;
// };

// const QUESTION_BANK: ArenaQuestionSeed[] = [
//   { type: 'MULTIPLE_CHOICE', skill: 'Vocabulary', prompt: 'Apple nghĩa là gì?', options: ['Quả táo', 'Quyển sách', 'Con mèo', 'Cái ghế'], answer: 'Quả táo', explanation: 'Apple là quả táo.' },
//   { type: 'MULTIPLE_CHOICE', skill: 'Vocabulary', prompt: 'Travel nghĩa là gì?', options: ['Du lịch', 'Nấu ăn', 'Ngủ', 'Vẽ'], answer: 'Du lịch' },
//   { type: 'FILL_BLANK', skill: 'Grammar', prompt: 'I ___ a student.', options: ['am', 'is', 'are', 'be'], answer: 'am', explanation: 'I đi với am.' },
//   { type: 'MULTIPLE_CHOICE', skill: 'Grammar', prompt: 'She ___ coffee every morning.', options: ['drink', 'drinks', 'drinking', 'to drink'], answer: 'drinks' },
//   { type: 'ORDER_SENTENCE', skill: 'Grammar', prompt: 'Sắp xếp câu: go / school / I / to', options: ['I go to school', 'School I go to', 'Go I to school', 'To school go I'], answer: 'I go to school' },
//   { type: 'LISTENING_PLACEHOLDER', skill: 'Listening', prompt: 'Nghe câu: "How are you today?". Người nói hỏi gì?', options: ['Bạn khỏe không hôm nay?', 'Bạn tên gì?', 'Bạn ở đâu?', 'Bạn học gì?'], answer: 'Bạn khỏe không hôm nay?' },
//   { type: 'PRONUNCIATION_PLACEHOLDER', skill: 'Pronunciation', prompt: 'Đọc từ "Opportunity". Phase demo: chọn phiên âm gần đúng.', options: ['/ˌɑːpərˈtuːnəti/', '/kæt/', '/bʊk/', '/hæpi/'], answer: '/ˌɑːpərˈtuːnəti/' },
//   { type: 'FLASH', skill: 'Vocabulary', prompt: 'Flash 5 giây: 🐶. Chọn từ đúng.', options: ['dog', 'cat', 'bird', 'fish'], answer: 'dog' },
//   { type: 'MATCHING_PLACEHOLDER', skill: 'Mixed', prompt: 'Ghép nghĩa: happy', options: ['vui vẻ', 'buồn', 'nhanh', 'sạch'], answer: 'vui vẻ' },
//   { type: 'MULTIPLE_CHOICE', skill: 'Mixed', prompt: 'Which sentence is correct?', options: ['I am happy.', 'I is happy.', 'I are happy.', 'I be happy.'], answer: 'I am happy.' },
// ];

export type ArenaQuestionType =
  | 'MULTIPLE_CHOICE'
  | 'FILL_BLANK'
  | 'ORDER_SENTENCE'
  | 'LISTENING_PLACEHOLDER'
  | 'PRONUNCIATION_PLACEHOLDER'
  | 'FLASH'
  | 'MATCHING_PLACEHOLDER';

export type ArenaQuestionSeed = {
  type: ArenaQuestionType;
  skill: string;
  level: string;
  topic: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation?: string;
};

const MODE_SIZE: Record<string, { teamSize: number; maxPlayers: number }> = {
  SOLO_1V1: { teamSize: 1, maxPlayers: 2 },
  TEAM_2V2: { teamSize: 2, maxPlayers: 4 },
  TEAM_3V3: { teamSize: 3, maxPlayers: 6 },
  TOURNAMENT: { teamSize: 1, maxPlayers: 64 },
};

@Injectable()
export class ArenaService {
  constructor(private readonly prisma: PrismaService) {}
  private ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  async generateQuestions(input: {
    skill: string;
    level: string;
    questionSet: string;
    count: number;
  }) {
    try {
      const prompt = `
Generate ${input.count} English learning arena questions.

Config:
- Skill: ${input.skill}
- Level: ${input.level}
- Topic: ${input.questionSet}

Return ONLY JSON array.

Rules:
- Each question has exactly 4 options.
- answer must be one of options.
- Vietnamese prompt is allowed.
- Do not return markdown.
`;

      const res = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      return JSON.parse(res.text ?? '[]');
    } catch (error) {
      console.error('Gemini generate questions failed:', error);
      throw new BadRequestException('Không tạo được câu hỏi từ AI');
    }
  }

  // private buildQuestions(skill: string, topic: string, difficulty: string) {
  //   const pool = QUESTION_BANK.filter((item) => skill === 'Mixed' || item.skill === skill || item.skill === 'Mixed');
  //   const selected = (pool.length ? pool : QUESTION_BANK).slice(0, 8);

  //   return selected.map((item, index) => ({
  //     order: index + 1,
  //     type: item.type,
  //     skill: skill === 'Mixed' ? item.skill : skill,
  //     prompt: `${item.prompt} (${topic} · ${difficulty})`,
  //     options: item.options || [],
  //     answer: item.answer,
  //     explanation: item.explanation,
  //     points: item.points || 10,
  //   }));
  // }

  private async buildQuestions(
    skill: string,
    topic: string,
    difficulty: string,
  ) {
    const questions: ArenaQuestionSeed[] = await this.generateQuestions({
      skill,
      level: difficulty,
      questionSet: topic,
      count: 8,
    });

    return questions.map((item, index) => ({
      order: index + 1,
      type: item.type,
      skill: item.skill || skill,
      prompt: item.prompt,
      options: item.options || [],
      answer: item.answer,
      explanation: item.explanation,
      points: 10,
    }));
  }

  private normalizeAnswer(answer: string) {
    return answer.trim().toLowerCase().replace(/\s+/g, ' ');
  }
  private expectedScore(playerMmr: number, opponentMmr: number) {
    return 1 / (1 + Math.pow(10, (opponentMmr - playerMmr) / 400));
  }

  private eloDelta(playerMmr: number, opponentMmr: number, won: boolean) {
    const k = 40;
    const raw = Math.round(
      k * ((won ? 1 : 0) - this.expectedScore(playerMmr, opponentMmr)),
    );
    return won ? Math.max(6, raw) : Math.min(-4, raw);
  }

  private getStreakFoodMultiplier(streak: number) {
    if (streak >= 10) return 1.5;
    if (streak >= 5) return 1.3;
    if (streak >= 3) return 1.1;
    return 1;
  }

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
    const size = MODE_SIZE[dto.gameMode] || MODE_SIZE.SOLO_1V1;
    const existingRoom = await this.prisma.arenaRoom.findFirst({
      where: {
        status: { in: ['WAITING', 'PLAYING'] },
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
        gameMode: dto.gameMode,
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
        updatedRoom.participants.length >= 2 &&
        updatedRoom.participants.every((participant) => participant.ready)
      ) {
        await this.beginRoomCountdown(updatedRoom);
      }
      return this.includeRoom(roomId);
    }
    if (room.participants.length >= room.maxPlayers)
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
      updatedRoom.participants.length >= 2 &&
      updatedRoom.participants.every((participant) => participant.ready)
    ) {
      await this.beginRoomCountdown(updatedRoom);
    }

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

    return {
      ...room,
      matches,
      isParticipant,
      serverTime: new Date().toISOString(),
    };
  }

  async enterQueue(userId: string, dto: QueueArenaDto) {
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
          gameMode: dto.gameMode,
          skill: dto.skill,
          difficulty: dto.difficulty,
          topic: dto.topic,
          mmr: { gte: ownRange.min, lte: ownRange.max },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (opponent) {
        const size = MODE_SIZE[dto.gameMode] || MODE_SIZE.SOLO_1V1;
        const room = await tx.arenaRoom.create({
          data: {
            hostId: opponent.userId,
            name: `Matchmaking ${dto.skill} ${dto.difficulty}`,
            visibility: 'PUBLIC',
            gameMode: dto.gameMode,
            skill: dto.skill,
            winCondition: 'TIME',
            durationSec: 180,
            difficulty: dto.difficulty,
            topic: dto.topic,
            teamSize: size.teamSize,
            maxPlayers: size.maxPlayers,
            voiceChat: dto.gameMode !== 'SOLO_1V1',
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
          gameMode: dto.gameMode,
          skill: dto.skill,
          difficulty: dto.difficulty,
          topic: dto.topic,
          mmr: profile.mmr,
          searchMinMmr: range.min,
          searchMaxMmr: range.max,
        },
        create: {
          userId,
          gameMode: dto.gameMode,
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
  private async beginRoomCountdown(
    room: Prisma.ArenaRoomGetPayload<{
      include: { participants: true; matches: true };
    }>,
  ) {
    const countdownEndsAt = new Date(Date.now() + 5000);
    // Phase A: deadline cho toàn bộ trận (server-authoritative), tính từ lúc
    // countdown kết thúc + thời lượng trận (durationSec đã có sẵn trên
    // ArenaRoom nhưng trước đây chưa được dùng để chặn late-answer).
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
      const questions = await this.buildQuestions(
        room.skill,
        room.topic,
        room.difficulty,
      );

      await this.prisma.arenaQuestion.createMany({
        data: questions.map((question) => ({
          ...question,
          matchId: match.id,
        })),
      });
    }

    await this.prisma.arenaParticipant.updateMany({
      where: { roomId: room.id },
      data: { score: 0, correct: 0, wrong: 0 },
    });

    await this.prisma.arenaRoom.update({
      where: { id: room.id },
      data: { status: 'PLAYING', countdownEndsAt },
    });
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
    return this.includeRoom(roomId);
  }

  async setReady(userId: string, roomId: string, dto: SetArenaReadyDto) {
    const room = await this.prisma.arenaRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng Arena');
    if (room.status !== 'WAITING')
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
      updatedRoom.status === 'WAITING' &&
      updatedRoom.participants.length >= 2 &&
      updatedRoom.participants.every((participant) => participant.ready)
    ) {
      await this.beginRoomCountdown(updatedRoom);
    }

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
      ...(nextHost
        ? [
            this.prisma.arenaRoom.update({
              where: { id: roomId },
              data: { hostId: nextHost.userId },
            }),
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

    // Phase A: deadline server-side. Quá hạn -> vẫn ghi nhận answer (để flow
    // tiến lên, không throw lỗi làm match treo) nhưng luôn tính 0 điểm bất kể
    // đáp án đúng/sai, không tin timestamp do client gửi.
    const isLate = Boolean(
      match.expiresAt && Date.now() > match.expiresAt.getTime(),
    );
    const isCorrect =
      !isLate &&
      this.normalizeAnswer(dto.answer) ===
        this.normalizeAnswer(question.answer);
    const points = isCorrect ? question.points : 0;

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
    if (
      !match.finishedAt &&
      questionCount > 0 &&
      answerCount >= questionCount * freshParticipants.length
    ) {
      await this.finalizeMatch(roomId);
    }

    return { answer, score, correct, wrong, late: isLate };
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

    return this.finalizeMatch(roomId);
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
  private async finalizeMatch(roomId: string) {
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
    const winnerTeam: 'A' | 'B' = teamBScore > teamAScore ? 'B' : 'A';

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.arenaMatch.updateMany({
        where: { id: openMatch.id, finishedAt: null },
        data: {
          winnerTeam,
          result: {
            source: 'server',
            teamAScore,
            teamBScore,
            reason: 'server_computed_from_scores',
          },
          finishedAt: new Date(),
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

      const profiles = new Map<
        string,
        Awaited<ReturnType<typeof this.getOrCreateProfile>>
      >();
      for (const participant of room.participants) {
        profiles.set(
          participant.userId,
          await this.getOrCreateProfile(participant.userId, tx),
        );
      }

      const avgA = Math.round(
        teamA.reduce(
          (sum, item) => sum + (profiles.get(item.userId)?.mmr || 1500),
          0,
        ) / Math.max(1, teamA.length),
      );
      const avgB = Math.round(
        teamB.reduce(
          (sum, item) => sum + (profiles.get(item.userId)?.mmr || 1500),
          0,
        ) / Math.max(1, teamB.length),
      );

      const rewards: any[] = [];

      for (const participant of room.participants) {
        const profile = profiles.get(participant.userId)!;
        const won = participant.team === winnerTeam;
        const opponentAvg = participant.team === 'A' ? avgB : avgA;
        const mmrDelta = this.eloDelta(profile.mmr, opponentAvg, won);
        const nextMmr = Math.max(100, profile.mmr + mmrDelta);
        const nextStreak = won ? profile.winStreak + 1 : 0;
        const foodMultiplier = won
          ? this.getStreakFoodMultiplier(nextStreak)
          : 0.35;
        const foodDelta = Math.round((won ? 40 : 12) * foodMultiplier);
        const goldDelta = won ? 20 : 6;
        const trophyDelta = won ? 1 : 0;
        const arenaDelta = won ? Math.max(6, mmrDelta) : mmrDelta;

        await tx.arenaProfile.update({
          where: { userId: participant.userId },
          data: {
            mmr: nextMmr,
            arenaPoint: Math.max(0, profile.arenaPoint + arenaDelta),
            winCount: profile.winCount + (won ? 1 : 0),
            loseCount: profile.loseCount + (won ? 0 : 1),
            winStreak: nextStreak,
            bestWinStreak: Math.max(profile.bestWinStreak, nextStreak),
            arenaFood: profile.arenaFood + foodDelta,
            gold: profile.gold + goldDelta,
            trophy: profile.trophy + trophyDelta,
            level: Math.floor(nextMmr / 250),
            lastMatchAt: new Date(),
          },
        });

        await tx.petProfile.updateMany({
          where: { userId: participant.userId },
          data: {
            food: { increment: foodDelta },
            coins: { increment: goldDelta },
            xp: { increment: won ? 20 : 8 },
          },
        });

        try {
          const reward = await tx.arenaRewardLog.create({
            data: {
              matchId: openMatch.id,
              userId: participant.userId,
              isWinner: won,
              mmrBefore: profile.mmr,
              mmrAfter: nextMmr,
              arenaDelta,
              foodDelta,
              goldDelta,
              trophyDelta,
            },
          });
          rewards.push(reward);
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            // Đã có reward log cho user này trong match (lớp bảo vệ thứ 2)
            // -> không cộng thưởng thêm, chỉ trả lại bản ghi đã có.
            const existingReward = await tx.arenaRewardLog.findUnique({
              where: {
                matchId_userId: {
                  matchId: openMatch.id,
                  userId: participant.userId,
                },
              },
            });
            if (existingReward) rewards.push(existingReward);
          } else {
            throw error;
          }
        }
      }

      await tx.arenaRoom.update({
        where: { id: roomId },
        data: { status: 'FINISHED' },
      });

      const finalMatch = await tx.arenaMatch.findUnique({
        where: { id: openMatch.id },
      });
      return { match: finalMatch, rewards };
    });
  }
}
