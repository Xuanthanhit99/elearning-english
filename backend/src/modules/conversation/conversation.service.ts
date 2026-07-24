import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ConversationMode,
  ConversationRole,
  ConversationStatus,
  CefrLevel,
  LearningSkill,
  SpeakingSessionStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import { SkillLevelResolverService } from '../../common/skill-level/skill-level-resolver.service';
import { LearningXpPublisher } from '../learning-xp/learning-xp.publisher';
import { ContentFilterService } from '../chat-session/content-filter.service';
import {
  ConversationGeminiService,
  ConversationHistoryTurn,
} from './conversation-gemini.service';
import {
  CONVERSATION_ACTIVITY_CODE,
  CONVERSATION_GENERATION_LOCK_TTL_SECONDS,
  CONVERSATION_MEMORY_WINDOW,
  CONVERSATION_SCENARIO_CACHE_TTL_SECONDS,
  CONVERSATION_SUMMARY_TRIGGER_TURNS,
  conversationGenerationLockKey,
  conversationScenarioCacheKey,
} from './conversation.constants';
import {
  CONVERSATION_SCENARIO_CATALOG,
  toScenarioUpsertData,
} from './conversation-scenario-catalog';
import { StartConversationDto } from './dto/start-conversation.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';

const CEFR_ORDER: CefrLevel[] = [
  CefrLevel.A1,
  CefrLevel.A2,
  CefrLevel.B1,
  CefrLevel.B2,
  CefrLevel.C1,
  CefrLevel.C2,
];

const STALE_SESSION_HOURS = 24;

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisCache: RedisCacheService,
    private readonly gemini: ConversationGeminiService,
    private readonly learningXp: LearningXpPublisher,
    private readonly contentFilter: ContentFilterService,
    private readonly skillLevelResolver: SkillLevelResolverService,
  ) {}

  async onModuleInit() {
    await this.seedCatalog();
  }

  async seedCatalog() {
    for (const item of CONVERSATION_SCENARIO_CATALOG) {
      await this.prisma.conversationScenario.upsert({
        where: { code: item.code },
        create: toScenarioUpsertData(item),
        update: toScenarioUpsertData(item),
      });
    }
  }

  async listScenarios() {
    const cacheKey = conversationScenarioCacheKey();
    const cached = await this.redisCache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // corrupted entry — fall through and recompute
      }
    }

    const scenarios = await this.prisma.conversationScenario.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }],
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        mode: true,
        difficulty: true,
        icon: true,
        requiredVocabulary: true,
        grammarFocus: true,
        goals: true,
      },
    });

    await this.redisCache.set(
      cacheKey,
      JSON.stringify(scenarios),
      CONVERSATION_SCENARIO_CACHE_TTL_SECONDS,
    );
    return scenarios;
  }

  async startSession(userId: string, dto: StartConversationDto) {
    let scenario = null as Awaited<
      ReturnType<typeof this.prisma.conversationScenario.findUnique>
    >;

    if (dto.scenarioCode) {
      scenario = await this.prisma.conversationScenario.findUnique({
        where: { code: dto.scenarioCode },
      });
      if (!scenario || !scenario.isActive) {
        throw new NotFoundException('Scenario not found.');
      }
    }

    const mode = scenario?.mode ?? this.parseMode(dto.mode);
    const difficulty =
      dto.difficulty ??
      scenario?.difficulty ??
      (await this.resolveAdaptiveDifficulty(userId));

    const systemPromptTemplate =
      scenario?.systemPromptTemplate ??
      'You are a friendly, encouraging English conversation partner. Keep the conversation natural, ask engaging follow-up questions, and gently correct major mistakes by modeling the correct form in your reply.';
    const openingLine =
      scenario?.openingLine ??
      "Hi! I'm ready to chat whenever you are — what's on your mind today?";

    const session = await this.prisma.conversationSession.create({
      data: {
        userId,
        scenarioId: scenario?.id,
        mode,
        difficulty,
        status: ConversationStatus.ACTIVE,
        turnCount: 0,
      },
    });

    await this.prisma.conversationMessage.create({
      data: {
        sessionId: session.id,
        role: ConversationRole.ASSISTANT,
        content: openingLine,
      },
    });

    return {
      session: await this.getSession(userId, session.id),
      systemPrompt: this.gemini.buildSystemPrompt({
        systemPromptTemplate,
        difficulty,
        goals: scenario?.goals ?? [],
        requiredVocabulary: scenario?.requiredVocabulary ?? [],
        grammarFocus: scenario?.grammarFocus ?? [],
      }),
    };
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.conversationSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        scenario: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) {
      throw new NotFoundException('Conversation session not found.');
    }

    return session;
  }

  async listSessions(userId: string, query: ListConversationsDto) {
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 50);

    const sessions = await this.prisma.conversationSession.findMany({
      where: { userId, ...(query.status ? { status: query.status } : {}) },
      include: { scenario: true },
      orderBy: [{ lastMessageAt: 'desc' }],
      take: limit,
    });

    return sessions;
  }

  /**
   * Ownership + status + safety checks, then returns everything the
   * controller needs to stream a reply. The actual Gemini stream is
   * consumed by the controller (so it can write chunks straight to the HTTP
   * response as they arrive) — this method hands back an async generator
   * plus a `persist(finalText)` callback the controller calls once the
   * stream ends (or is aborted, with whatever partial text was produced).
   */
  async prepareMessageStream(userId: string, sessionId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestException('Message cannot be empty.');
    }
    if (!this.contentFilter.isUserInputSafe(trimmed)) {
      throw new BadRequestException(
        'This message was blocked by the conversation safety filter.',
      );
    }

    const session = await this.prisma.conversationSession.findFirst({
      where: { id: sessionId, userId },
      include: { scenario: true },
    });
    if (!session) {
      throw new NotFoundException('Conversation session not found.');
    }
    if (session.status !== ConversationStatus.ACTIVE) {
      throw new BadRequestException('This conversation has already ended.');
    }

    const lockKey = conversationGenerationLockKey(sessionId);
    // Atomic acquire (SET NX) — a plain get()-then-set() has a TOCTOU race
    // where two concurrent requests can both observe "no lock" before
    // either writes one, so both proceed to call Gemini for the same
    // session. setNx() is a single Redis command, so only one caller can
    // ever win. If Redis itself is down, fail OPEN (allow the message
    // through) rather than blocking conversations on a cache outage —
    // matching RedisCacheService's documented "never cost availability"
    // contract; the duplicate-request risk during an outage is an accepted
    // trade-off, same as every other best-effort cache use in this codebase.
    if (this.redisCache.isAvailable()) {
      const acquired = await this.redisCache.setNx(
        lockKey,
        '1',
        CONVERSATION_GENERATION_LOCK_TTL_SECONDS,
      );
      if (!acquired) {
        throw new ConflictException(
          'A reply is already being generated for this conversation.',
        );
      }
    }

    const recentMessages = await this.prisma.conversationMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: CONVERSATION_MEMORY_WINDOW,
    });
    const history: ConversationHistoryTurn[] = recentMessages
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));

    // Gemini's startChat({history}) requires the first turn to be 'user'.
    // The scenario's seeded opening line (ASSISTANT) — and, depending on
    // where the CONVERSATION_MEMORY_WINDOW cutoff lands, potentially other
    // leading ASSISTANT turns — would otherwise violate that. The opening
    // persona/greeting is already baked into the system prompt, so it's
    // safe to drop leading ASSISTANT turns rather than replay them here.
    while (history.length > 0 && history[0].role === ConversationRole.ASSISTANT) {
      history.shift();
    }

    await this.prisma.conversationMessage.create({
      data: { sessionId, role: ConversationRole.USER, content: trimmed },
    });

    const systemPrompt = this.gemini.buildSystemPrompt({
      systemPromptTemplate:
        session.scenario?.systemPromptTemplate ??
        'You are a friendly, encouraging English conversation partner.',
      difficulty: session.difficulty,
      goals: session.scenario?.goals ?? [],
      requiredVocabulary: session.scenario?.requiredVocabulary ?? [],
      grammarFocus: session.scenario?.grammarFocus ?? [],
    });

    const stream = this.gemini.streamReply(systemPrompt, history, trimmed);

    const persist = async (finalText: string) => {
      try {
        const safeText = this.contentFilter.isAiOutputSafe(finalText)
          ? finalText
          : "Let's keep our conversation focused on English practice — could you rephrase that?";

        await this.prisma.conversationMessage.create({
          data: { sessionId, role: ConversationRole.ASSISTANT, content: safeText },
        });

        const updated = await this.prisma.conversationSession.update({
          where: { id: sessionId },
          data: { turnCount: { increment: 1 }, lastMessageAt: new Date() },
        });

        if (updated.turnCount >= CONVERSATION_SUMMARY_TRIGGER_TURNS) {
          await this.maybeSummarize(sessionId);
        }
      } finally {
        await this.redisCache.del(lockKey);
      }
    };

    return { stream, persist };
  }

  private async maybeSummarize(sessionId: string) {
    const session = await this.prisma.conversationSession.findUnique({
      where: { id: sessionId },
      select: { summary: true },
    });
    const allMessages = await this.prisma.conversationMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    const toFold = allMessages.slice(0, Math.max(0, allMessages.length - CONVERSATION_MEMORY_WINDOW));
    if (toFold.length === 0) return;

    const summary = await this.gemini.summarize(
      session?.summary ?? null,
      toFold.map((m) => ({ role: m.role, content: m.content })),
    );

    if (summary) {
      await this.prisma.conversationSession.update({
        where: { id: sessionId },
        data: { summary },
      });
    }
  }

  async finishSession(userId: string, sessionId: string) {
    const session = await this.prisma.conversationSession.findFirst({
      where: { id: sessionId, userId },
      include: { scenario: true, messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) {
      throw new NotFoundException('Conversation session not found.');
    }
    if (session.status === ConversationStatus.COMPLETED) {
      return this.getSession(userId, sessionId);
    }

    const scoring = await this.gemini.scoreConversation(
      session.scenario?.title ?? 'Free Conversation',
      session.difficulty,
      session.messages.map((m) => ({ role: m.role, content: m.content })),
    );

    // Create a linked SpeakingSession purely as an Analytics sink — both FKs
    // nullable on that model — so this conversation's aggregate scores
    // surface in the user's existing SPEAKING skill radar / weakness
    // detection / dashboard with zero changes to those already-complete
    // read paths (see the Step 0 audit's backend architecture review).
    const speakingSession = await this.prisma.speakingSession.create({
      data: {
        userId,
        status: SpeakingSessionStatus.COMPLETED,
        overallScore: scoring.overallScore,
        pronunciation: scoring.pronunciationScore,
        fluency: scoring.fluencyScore,
        grammar: scoring.grammarScore,
        vocabulary: scoring.vocabularyScore,
        confidence: scoring.confidenceScore,
        finishedAt: new Date(),
      },
    });

    const updated = await this.prisma.conversationSession.update({
      where: { id: sessionId },
      data: {
        status: ConversationStatus.COMPLETED,
        completedAt: new Date(),
        overallScore: scoring.overallScore,
        fluencyScore: scoring.fluencyScore,
        grammarScore: scoring.grammarScore,
        vocabularyScore: scoring.vocabularyScore,
        pronunciationScore: scoring.pronunciationScore,
        confidenceScore: scoring.confidenceScore,
        naturalnessScore: scoring.naturalnessScore,
        feedback: scoring.feedback,
        recommendedVocabulary: session.scenario?.requiredVocabulary ?? [],
        recommendedGrammar: session.scenario?.grammarFocus ?? [],
        speakingSessionId: speakingSession.id,
      },
      include: { scenario: true, messages: { orderBy: { createdAt: 'asc' } } },
    });

    // One publish() call triggers both XP award AND achievement processing
    // (LearningXpListener + AchievementsListener both subscribe to the same
    // event) — no separate achievements call needed, matching the exact
    // integration contract Speaking/Writing already use.
    const userTurnCount = session.messages.filter(
      (m) => m.role === ConversationRole.USER,
    ).length;
    await this.learningXp.publish({
      activity: CONVERSATION_ACTIVITY_CODE,
      userId,
      sourceId: sessionId,
      score: scoring.overallScore,
      completionRate: userTurnCount > 0 ? 100 : 0,
      metadata: {
        scenarioCode: session.scenario?.code ?? null,
        mode: session.mode,
        turnCount: userTurnCount,
      },
    });

    return {
      ...updated,
      grammarCorrections: scoring.grammarCorrections,
      vocabularySuggestions: scoring.vocabularySuggestions,
    };
  }

  /** Marks sessions nobody has touched in 24h as ABANDONED rather than
   * leaving them ACTIVE forever. Real, scoped "background cleanup"
   * (Part 7), not a full analytics job. */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupStaleSessions() {
    const cutoff = new Date(Date.now() - STALE_SESSION_HOURS * 60 * 60 * 1000);
    const result = await this.prisma.conversationSession.updateMany({
      where: { status: ConversationStatus.ACTIVE, lastMessageAt: { lt: cutoff } },
      data: { status: ConversationStatus.ABANDONED },
    });
    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} stale conversation session(s) as abandoned.`);
    }
    return result.count;
  }

  private parseMode(mode?: string): ConversationMode {
    if (mode && (Object.values(ConversationMode) as string[]).includes(mode)) {
      return mode as ConversationMode;
    }
    return ConversationMode.FREE;
  }

  private async resolveAdaptiveDifficulty(userId: string): Promise<CefrLevel> {
    const resolved = await this.skillLevelResolver.resolveSkillLevel(
      userId,
      LearningSkill.SPEAKING,
    );
    const index = CEFR_ORDER.indexOf(resolved.level);
    return index >= 0 ? resolved.level : CefrLevel.A1;
  }
}
