import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  CefrLevel,
  ConversationMode,
  ConversationRole,
  ConversationStatus,
  SpeakingSessionStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import { SkillLevelResolverService } from '../../common/skill-level/skill-level-resolver.service';
import { LearningXpPublisher } from '../learning-xp/learning-xp.publisher';
import { ContentFilterService } from '../chat-session/content-filter.service';
import { ConversationGeminiService } from './conversation-gemini.service';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  let service: ConversationService;

  const scenario = {
    id: 'scenario-1',
    code: 'scenario_restaurant',
    title: 'Restaurant',
    mode: ConversationMode.SCENARIO,
    difficulty: CefrLevel.A2,
    isActive: true,
    systemPromptTemplate: 'You are a waiter.',
    openingLine: 'Welcome! What can I get you?',
    requiredVocabulary: ['menu'],
    grammarFocus: ['polite requests'],
    goals: ['order food'],
  };

  const prismaMock = {
    conversationScenario: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    conversationSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    conversationMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    speakingSession: {
      create: jest.fn(),
    },
  };

  const redisCacheMock = {
    get: jest.fn(),
    set: jest.fn(),
    setNx: jest.fn(),
    del: jest.fn(),
    isAvailable: jest.fn(),
  };

  const geminiMock = {
    buildSystemPrompt: jest.fn().mockReturnValue('SYSTEM PROMPT'),
    streamReply: jest.fn(),
    scoreConversation: jest.fn(),
    summarize: jest.fn(),
  };

  const learningXpMock = { publish: jest.fn() };
  const contentFilterMock = {
    isUserInputSafe: jest.fn().mockReturnValue(true),
    isAiOutputSafe: jest.fn().mockReturnValue(true),
  };
  const skillLevelResolverMock = {
    resolveSkillLevel: jest.fn().mockResolvedValue({ level: CefrLevel.B1 }),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    contentFilterMock.isUserInputSafe.mockReturnValue(true);
    contentFilterMock.isAiOutputSafe.mockReturnValue(true);
    skillLevelResolverMock.resolveSkillLevel.mockResolvedValue({ level: CefrLevel.B1 });
    redisCacheMock.get.mockResolvedValue(null);
    redisCacheMock.set.mockResolvedValue(true);
    redisCacheMock.setNx.mockResolvedValue(true);
    redisCacheMock.isAvailable.mockReturnValue(true);
    geminiMock.buildSystemPrompt.mockReturnValue('SYSTEM PROMPT');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisCacheService, useValue: redisCacheMock },
        { provide: ConversationGeminiService, useValue: geminiMock },
        { provide: LearningXpPublisher, useValue: learningXpMock },
        { provide: ContentFilterService, useValue: contentFilterMock },
        { provide: SkillLevelResolverService, useValue: skillLevelResolverMock },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startSession', () => {
    it('creates a session + opening message from a scenario', async () => {
      prismaMock.conversationScenario.findUnique.mockResolvedValue(scenario);
      prismaMock.conversationSession.create.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
      });
      prismaMock.conversationMessage.create.mockResolvedValue({});
      prismaMock.conversationSession.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        scenario,
        messages: [{ role: ConversationRole.ASSISTANT, content: scenario.openingLine }],
      });

      const result = await service.startSession('user-1', { scenarioCode: 'scenario_restaurant' });

      expect(prismaMock.conversationSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            scenarioId: 'scenario-1',
            mode: ConversationMode.SCENARIO,
            difficulty: CefrLevel.A2,
          }),
        }),
      );
      expect(prismaMock.conversationMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: ConversationRole.ASSISTANT,
            content: scenario.openingLine,
          }),
        }),
      );
      expect(result.session.id).toBe('session-1');
    });

    it('throws NotFoundException for an unknown/inactive scenario code', async () => {
      prismaMock.conversationScenario.findUnique.mockResolvedValue(null);

      await expect(
        service.startSession('user-1', { scenarioCode: 'not_real' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('resolves adaptive difficulty from the SPEAKING skill level when no scenario/difficulty is given', async () => {
      prismaMock.conversationSession.create.mockResolvedValue({ id: 'session-2', userId: 'user-1' });
      prismaMock.conversationMessage.create.mockResolvedValue({});
      prismaMock.conversationSession.findFirst.mockResolvedValue({
        id: 'session-2',
        userId: 'user-1',
        scenario: null,
        messages: [],
      });

      await service.startSession('user-1', { mode: 'FREE' });

      expect(skillLevelResolverMock.resolveSkillLevel).toHaveBeenCalledWith('user-1', 'SPEAKING');
      expect(prismaMock.conversationSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mode: ConversationMode.FREE, difficulty: CefrLevel.B1 }),
        }),
      );
    });
  });

  describe('getSession — ownership scoping', () => {
    it('throws NotFoundException when the session belongs to a different user', async () => {
      // findFirst is called with a `userId` filter baked in — simulating "not
      // found for this user" (Prisma returns null rather than another user's row).
      prismaMock.conversationSession.findFirst.mockResolvedValue(null);

      await expect(service.getSession('user-1', 'session-owned-by-user-2')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.conversationSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-owned-by-user-2', userId: 'user-1' },
        }),
      );
    });
  });

  describe('prepareMessageStream', () => {
    const activeSession = {
      id: 'session-1',
      userId: 'user-1',
      status: ConversationStatus.ACTIVE,
      difficulty: CefrLevel.B1,
      scenario: null,
    };

    it('rejects an empty message', async () => {
      await expect(
        service.prepareMessageStream('user-1', 'session-1', '   '),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects unsafe content before touching the database', async () => {
      contentFilterMock.isUserInputSafe.mockReturnValue(false);

      await expect(
        service.prepareMessageStream('user-1', 'session-1', 'hello'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.conversationSession.findFirst).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a session that is not this user\'s', async () => {
      prismaMock.conversationSession.findFirst.mockResolvedValue(null);

      await expect(
        service.prepareMessageStream('user-1', 'session-1', 'hello'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects sending to an already-finished conversation', async () => {
      prismaMock.conversationSession.findFirst.mockResolvedValue({
        ...activeSession,
        status: ConversationStatus.COMPLETED,
      });

      await expect(
        service.prepareMessageStream('user-1', 'session-1', 'hello'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a concurrent generation for the same session (lock held)', async () => {
      prismaMock.conversationSession.findFirst.mockResolvedValue(activeSession);
      redisCacheMock.setNx.mockResolvedValue(false); // another request already holds the lock

      await expect(
        service.prepareMessageStream('user-1', 'session-1', 'hello'),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.conversationMessage.create).not.toHaveBeenCalled();
    });

    it('fails open (no lock enforcement) when Redis itself is unavailable', async () => {
      prismaMock.conversationSession.findFirst.mockResolvedValue(activeSession);
      prismaMock.conversationMessage.findMany.mockResolvedValue([]);
      prismaMock.conversationMessage.create.mockResolvedValue({});
      redisCacheMock.isAvailable.mockReturnValue(false);
      geminiMock.streamReply.mockReturnValue((async function* () {
        yield 'Hello';
      })());

      const { stream } = await service.prepareMessageStream('user-1', 'session-1', 'hello');
      for await (const _chunk of stream) {
        // drain
      }

      expect(redisCacheMock.setNx).not.toHaveBeenCalled();
    });

    it('persists the user message immediately and sends only the bounded recent history to Gemini', async () => {
      prismaMock.conversationSession.findFirst.mockResolvedValue(activeSession);
      prismaMock.conversationMessage.findMany.mockResolvedValue([
        { role: ConversationRole.ASSISTANT, content: 'Hi there', createdAt: new Date() },
      ]);
      prismaMock.conversationMessage.create.mockResolvedValue({});
      geminiMock.streamReply.mockReturnValue((async function* () {
        yield 'Hello';
      })());

      const { stream, persist } = await service.prepareMessageStream(
        'user-1',
        'session-1',
        'hi!',
      );

      expect(prismaMock.conversationMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: ConversationRole.USER, content: 'hi!' }),
        }),
      );
      expect(geminiMock.streamReply).toHaveBeenCalledWith(
        'SYSTEM PROMPT',
        expect.any(Array),
        'hi!',
      );

      const chunks: string[] = [];
      for await (const chunk of stream) chunks.push(chunk);
      expect(chunks).toEqual(['Hello']);

      prismaMock.conversationSession.update.mockResolvedValue({ turnCount: 1 });
      await persist('Hello');

      expect(prismaMock.conversationMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: ConversationRole.ASSISTANT, content: 'Hello' }),
        }),
      );
      // The generation lock must always be released after persist(), success or not.
      expect(redisCacheMock.del).toHaveBeenCalled();
    });

    it('replaces unsafe AI output with a safe redirect message before persisting', async () => {
      prismaMock.conversationSession.findFirst.mockResolvedValue(activeSession);
      prismaMock.conversationMessage.findMany.mockResolvedValue([]);
      prismaMock.conversationMessage.create.mockResolvedValue({});
      geminiMock.streamReply.mockReturnValue((async function* () {})());
      prismaMock.conversationSession.update.mockResolvedValue({ turnCount: 1 });
      contentFilterMock.isAiOutputSafe.mockReturnValue(false);

      const { persist } = await service.prepareMessageStream('user-1', 'session-1', 'hi');
      await persist('something unsafe');

      const assistantCall = prismaMock.conversationMessage.create.mock.calls.find(
        (call) => call[0]?.data?.role === ConversationRole.ASSISTANT,
      );
      expect(assistantCall?.[0]?.data?.content).not.toBe('something unsafe');
    });
  });

  describe('finishSession', () => {
    it('scores the conversation, links a SpeakingSession, and publishes the XP/achievement event', async () => {
      const messages = [
        { role: ConversationRole.ASSISTANT, content: 'Hi' },
        { role: ConversationRole.USER, content: 'Hello' },
      ];
      prismaMock.conversationSession.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        status: ConversationStatus.ACTIVE,
        difficulty: CefrLevel.B1,
        mode: ConversationMode.FREE,
        scenario: null,
        messages,
      });
      geminiMock.scoreConversation.mockResolvedValue({
        overallScore: 88,
        fluencyScore: 80,
        grammarScore: 85,
        vocabularyScore: 82,
        pronunciationScore: 70,
        confidenceScore: 75,
        naturalnessScore: 79,
        feedback: 'Great job!',
        grammarCorrections: [],
        vocabularySuggestions: [],
      });
      prismaMock.speakingSession.create.mockResolvedValue({ id: 'speaking-session-1' });
      prismaMock.conversationSession.update.mockResolvedValue({
        id: 'session-1',
        status: ConversationStatus.COMPLETED,
        overallScore: 88,
        scenario: null,
        messages,
      });

      const result = await service.finishSession('user-1', 'session-1');

      expect(prismaMock.speakingSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            status: SpeakingSessionStatus.COMPLETED,
            overallScore: 88,
          }),
        }),
      );
      expect(prismaMock.conversationSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ConversationStatus.COMPLETED,
            speakingSessionId: 'speaking-session-1',
          }),
        }),
      );
      expect(learningXpMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          activity: 'CONVERSATION_COMPLETED',
          userId: 'user-1',
          sourceId: 'session-1',
          score: 88,
        }),
      );
      expect(result.status).toBe(ConversationStatus.COMPLETED);
    });

    it('is idempotent — finishing an already-completed session does not re-score or re-publish XP', async () => {
      prismaMock.conversationSession.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        status: ConversationStatus.COMPLETED,
        scenario: null,
        messages: [],
      });

      await service.finishSession('user-1', 'session-1');

      expect(geminiMock.scoreConversation).not.toHaveBeenCalled();
      expect(learningXpMock.publish).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a session that is not this user\'s', async () => {
      prismaMock.conversationSession.findFirst.mockResolvedValue(null);

      await expect(service.finishSession('user-1', 'session-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cleanupStaleSessions', () => {
    it('marks ACTIVE sessions inactive for 24h+ as ABANDONED', async () => {
      prismaMock.conversationSession.updateMany.mockResolvedValue({ count: 3 });

      const count = await service.cleanupStaleSessions();

      expect(prismaMock.conversationSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ConversationStatus.ACTIVE }),
          data: { status: ConversationStatus.ABANDONED },
        }),
      );
      expect(count).toBe(3);
    });
  });
});
