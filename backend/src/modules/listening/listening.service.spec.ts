import { Test, TestingModule } from '@nestjs/testing';
import { ListeningService } from './listening.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { MissionV2ProgressService } from '../missions-v2/services/mission-v2-progress.service';
import { ListeningTtsService } from './listening-tts.service';
import { LearningXpPublisher } from '../learning-xp/learning-xp.publisher';
import { ListeningJobService } from '../listening-job/listening-job.service';
import { ListeningAudioBackfillService } from '../listening-job/listening-audio-backfill.service';
import { LISTENING_REDIS } from './listening-redis.provider';

/*
 * LƯU Ý (Stage 6D.1 - 6D.3): file test này được viết/sửa qua nhiều
 * phiên mà sandbox thực thi lệnh không khởi động được ("Not enough
 * disk space to set up the workspace"), nên KHÔNG thể tự chạy `npm
 * test` để xác nhận PASS. Test được viết cẩn thận theo đúng chữ ký
 * thật của ListeningService (đọc trực tiếp từ source), nhưng phải coi
 * là UNVERIFIED cho tới khi chạy được `npm test -- listening` trên môi
 * trường có sandbox hoạt động — xem
 * docs/phase1-stage6d3-listening-local-fix-verification-report.md mục 9.
 */
describe('ListeningService', () => {
  let service: ListeningService;

  const prismaMock = {
    userListeningProgress: { findUnique: jest.fn(), upsert: jest.fn() },
    listeningSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    listeningSessionAnswer: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      createMany: jest.fn(),
    },
    listeningQuestion: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    petProfile: { upsert: jest.fn() },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
  };

  const missionServiceMock = { increase: jest.fn() };
  const learningXpMock = { publish: jest.fn() };
  const geminiServiceMock = { generateJson: jest.fn() };
  const listeningTtsServiceMock = { createAudioFromTranscript: jest.fn() };
  const listeningJobServiceMock = { enqueueGeneration: jest.fn() };
  const listeningAudioBackfillServiceMock = {
    enqueueMissingAudio: jest.fn(),
  };
  const redisMock = { set: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListeningService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: GeminiService, useValue: geminiServiceMock },
        { provide: MissionV2ProgressService, useValue: missionServiceMock },
        { provide: ListeningTtsService, useValue: listeningTtsServiceMock },
        { provide: LearningXpPublisher, useValue: learningXpMock },
        { provide: ListeningJobService, useValue: listeningJobServiceMock },
        {
          provide: ListeningAudioBackfillService,
          useValue: listeningAudioBackfillServiceMock,
        },
        { provide: LISTENING_REDIS, useValue: redisMock },
      ],
    }).compile();

    service = module.get<ListeningService>(ListeningService);

    // Default an toàn cho enqueue async (không throw unhandled rejection).
    listeningJobServiceMock.enqueueGeneration.mockResolvedValue({
      queued: 0,
    });
    listeningAudioBackfillServiceMock.enqueueMissingAudio.mockResolvedValue({
      queued: 0,
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('finishSession reward gating (chống reward-farming)', () => {
    const userId = 'user-1';
    const sessionId = 'session-1';

    function mockSession(overrides: Record<string, unknown> = {}) {
      return {
        id: sessionId,
        userId,
        status: 'IN_PROGRESS',
        total: 2,
        correct: 0,
        wrong: 0,
        skipped: 0,
        score: 0,
        xpEarned: 0,
        coinsEarned: 0,
        level: 'B1',
        topic: 'Test',
        completedAt: null,
        ...overrides,
      };
    }

    function mockTransaction() {
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          listeningSession: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          userListeningProgress: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
          },
          petProfile: { upsert: jest.fn().mockResolvedValue({}) },
        };

        return callback(tx);
      });
    }

    it('KHÔNG phát Mission/XP khi finish mà chưa trả lời/skip câu nào (attempted === 0)', async () => {
      prismaMock.listeningSession.findUnique.mockResolvedValue(mockSession());
      prismaMock.listeningSessionAnswer.findMany.mockResolvedValue([]);
      mockTransaction();

      const result = await service.finishSession(userId, sessionId);

      expect(missionServiceMock.increase).not.toHaveBeenCalled();
      expect(learningXpMock.publish).not.toHaveBeenCalled();
      expect(result.missionUpdated).toBe(false);
    });

    it('CÓ phát Mission/XP khi có ít nhất 1 câu được trả lời (attempted > 0)', async () => {
      prismaMock.listeningSession.findUnique.mockResolvedValue(mockSession());
      prismaMock.listeningSessionAnswer.findMany.mockResolvedValue([
        { isCorrect: true, isSkipped: false, timeSpent: 10 },
      ]);
      mockTransaction();

      await service.finishSession(userId, sessionId);

      expect(missionServiceMock.increase).toHaveBeenCalled();
      expect(learningXpMock.publish).toHaveBeenCalledTimes(1);
      expect(learningXpMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          activity: 'LISTENING_COMPLETED',
          userId,
          sourceId: sessionId,
        }),
      );
    });

    it('CÓ phát Mission/XP khi câu duy nhất bị skip (attempted > 0 kể cả không đúng câu nào)', async () => {
      prismaMock.listeningSession.findUnique.mockResolvedValue(mockSession());
      prismaMock.listeningSessionAnswer.findMany.mockResolvedValue([
        { isCorrect: null, isSkipped: true, timeSpent: 0 },
      ]);
      mockTransaction();

      await service.finishSession(userId, sessionId);

      expect(missionServiceMock.increase).toHaveBeenCalled();
      expect(learningXpMock.publish).toHaveBeenCalledTimes(1);
    });

    it('finish lần hai trên session đã COMPLETED: không tính lại, không phát thưởng lại', async () => {
      prismaMock.listeningSession.findUnique.mockResolvedValue(
        mockSession({ status: 'COMPLETED', completedAt: new Date() }),
      );

      const result = await service.finishSession(userId, sessionId);

      expect(result.alreadyCompleted).toBe(true);
      expect(missionServiceMock.increase).not.toHaveBeenCalled();
      expect(learningXpMock.publish).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('2 request finish "thắng-thua" transaction (updateMany.count=0): request thua không phát thưởng lại', async () => {
      prismaMock.listeningSession.findUnique.mockResolvedValue(mockSession());
      prismaMock.listeningSessionAnswer.findMany.mockResolvedValue([
        { isCorrect: true, isSkipped: false, timeSpent: 5 },
      ]);

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          listeningSession: {
            // count !== 1 => request này thua, đã có request khác complete trước.
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          userListeningProgress: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
          },
          petProfile: { upsert: jest.fn() },
        };

        return callback(tx);
      });

      const result = await service.finishSession(userId, sessionId);

      expect(result.alreadyCompleted).toBe(true);
      expect(missionServiceMock.increase).not.toHaveBeenCalled();
      expect(learningXpMock.publish).not.toHaveBeenCalled();
    });
  });

  describe('transcript/correctAnswer/explanation không lộ trước khi trả lời', () => {
    const userId = 'user-1';
    const sessionId = 'session-1';

    const answeredQuestion = {
      id: 'q1',
      level: 'B1',
      topic: 'Test',
      audioUrl: 'https://example.com/q1.mp3',
      transcript: 'SECRET TRANSCRIPT Q1',
      duration: 60,
      question: 'Question 1?',
      options: [
        { label: 'A', text: 'A1' },
        { label: 'B', text: 'B1' },
      ],
      correctAnswer: 'A',
      explanation: 'Explanation Q1',
    };

    const freshQuestion = {
      id: 'q2',
      level: 'B1',
      topic: 'Test',
      audioUrl: 'https://example.com/q2.mp3',
      transcript: 'SECRET TRANSCRIPT Q2',
      duration: 60,
      question: 'Question 2?',
      options: [
        { label: 'A', text: 'A2' },
        { label: 'B', text: 'B2' },
      ],
      correctAnswer: 'B',
      explanation: 'Explanation Q2',
    };

    it('resume (startPractice trên session IN_PROGRESS có sẵn) chỉ lộ transcript/correctAnswer/explanation cho câu đã trả lời', async () => {
      // Lần gọi findFirst #1: check "existing IN_PROGRESS" trong startPractice.
      prismaMock.listeningSession.findFirst.mockResolvedValueOnce({
        id: sessionId,
        userId,
        level: 'B1',
        topic: 'Test',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      });

      // Lần gọi findFirst #2: bên trong getSessionPayload (resume payload thật).
      prismaMock.listeningSession.findFirst.mockResolvedValueOnce({
        id: sessionId,
        userId,
        level: 'B1',
        topic: 'Test',
        total: 2,
        correct: 1,
        wrong: 0,
        skipped: 0,
        answer: [
          {
            question: answeredQuestion,
            questionId: 'q1',
            selectedAnswer: 'A',
            isCorrect: true,
            isSkipped: false,
            isFlagged: false,
          },
          {
            question: freshQuestion,
            questionId: 'q2',
            selectedAnswer: null,
            isCorrect: null,
            isSkipped: false,
            isFlagged: false,
          },
        ],
      });

      const payload = await service.startPractice(userId, {
        level: 'B1',
        topic: 'Test',
        limit: 10,
      });

      const answered = payload.questions.find((item: any) => item.id === 'q1');
      const fresh = payload.questions.find((item: any) => item.id === 'q2');

      expect(answered.transcript).toBe('SECRET TRANSCRIPT Q1');
      expect(answered.correctAnswer).toBe('A');
      expect(answered.explanation).toBe('Explanation Q1');

      expect(fresh.transcript).toBeNull();
      expect(fresh.correctAnswer).toBeNull();
      expect(fresh.explanation).toBeNull();
    });
  });

  describe('cold-start Redis lock (chống multi-instance thundering herd)', () => {
    /*
     * `tryAcquireColdStartLock`/`coldStartLockKey`/`enqueueShortfallAsync`
     * là private method — test truy cập qua `(service as any)` là cách
     * chuẩn để unit-test logic lock/key mà không cần dựng lại toàn bộ
     * flow `startPractice` (vốn cần mock rất nhiều bảng chỉ để chạm
     * tới nhánh cold-start). Đây là lựa chọn có ý thức để test chính
     * xác đơn vị logic vừa sửa ở Stage 6D.3.
     */
    function callTryAcquire(level: string, topic: string) {
      return (service as any).tryAcquireColdStartLock(
        level,
        topic,
      ) as Promise<boolean>;
    }

    it('request đầu tiên nhận lock (Redis SET NX trả OK)', async () => {
      redisMock.set.mockResolvedValue('OK');

      const acquired = await callTryAcquire('B1', 'Environment');

      expect(acquired).toBe(true);
      expect(redisMock.set).toHaveBeenCalledWith(
        expect.stringContaining('listening:cold-start-lock:B1:'),
        '1',
        'EX',
        60,
        'NX',
      );
    });

    it('request thứ hai trong cửa sổ cooldown không nhận lock (Redis SET NX trả null)', async () => {
      redisMock.set.mockResolvedValue(null);

      const acquired = await callTryAcquire('B1', 'Environment');

      expect(acquired).toBe(false);
    });

    it('TTL đúng 60 giây theo rule hiện tại', async () => {
      redisMock.set.mockResolvedValue('OK');

      await callTryAcquire('A1', 'Daily Life');

      const callArgs = redisMock.set.mock.calls[0];
      expect(callArgs[2]).toBe('EX');
      expect(callArgs[3]).toBe(60);
      expect(callArgs[4]).toBe('NX');
    });

    it('scope level/topic khác nhau tạo key khác nhau, không block sai nhau', async () => {
      redisMock.set.mockResolvedValue('OK');

      await callTryAcquire('A1', 'Daily Life');
      await callTryAcquire('B1', 'Environment');
      await callTryAcquire('A1', 'School');

      const keys = redisMock.set.mock.calls.map((call) => call[0]);
      const uniqueKeys = new Set(keys);

      expect(keys).toHaveLength(3);
      expect(uniqueKeys.size).toBe(3);
    });

    it('Redis lỗi/unavailable: không throw, trả false (an toàn = deny, không allow)', async () => {
      redisMock.set.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(callTryAcquire('B1', 'Environment')).resolves.toBe(false);
    });

    it('enqueueShortfallAsync vẫn gọi ListeningJobService bất kể lock kết quả gì (job async độc lập với lock)', () => {
      (service as any).enqueueShortfallAsync('B1', 'Environment', 5);

      expect(listeningJobServiceMock.enqueueGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          totalNeed: 5,
          configs: [{ level: 'B1', topic: 'Environment' }],
        }),
      );
    });
  });
});
