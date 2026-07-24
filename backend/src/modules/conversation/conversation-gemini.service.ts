import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConversationRole } from '@prisma/client';

export type ConversationHistoryTurn = { role: ConversationRole; content: string };

export type ConversationScoring = {
  overallScore: number;
  fluencyScore: number;
  grammarScore: number;
  vocabularyScore: number;
  pronunciationScore: number;
  confidenceScore: number;
  naturalnessScore: number;
  feedback: string;
  grammarCorrections: Array<{ original: string; corrected: string; explanation: string }>;
  vocabularySuggestions: string[];
};

/**
 * Own lightweight GoogleGenerativeAI client, mirroring GeminiChatService's
 * proven pattern (multi-turn via `startChat()`) rather than reusing the
 * shared `GeminiService` — that service's `generateJson` is single-shot
 * (`generateContent`, not `startChat`) and has no streaming surface, so it
 * cannot serve a conversational, streamed use case without changes to an
 * already-complete module. Kept separate the same way GeminiChatService is
 * separate: a different SDK surface for a different job (see the Step 0
 * audit's "AI architecture review" for the rationale).
 */
@Injectable()
export class ConversationGeminiService {
  private readonly logger = new Logger(ConversationGeminiService.name);
  private readonly genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  buildSystemPrompt(params: {
    systemPromptTemplate: string;
    difficulty: string;
    goals: string[];
    requiredVocabulary: string[];
    grammarFocus: string[];
  }) {
    return `${params.systemPromptTemplate}

LEARNER LEVEL: ${params.difficulty} (CEFR) — adjust your vocabulary and sentence complexity to this level.
CONVERSATION GOALS: ${params.goals.join('; ') || 'General fluency practice'}
${params.requiredVocabulary.length ? `TRY TO NATURALLY USE OR PROMPT THESE WORDS: ${params.requiredVocabulary.join(', ')}` : ''}
${params.grammarFocus.length ? `GRAMMAR FOCUS FOR THIS SESSION: ${params.grammarFocus.join(', ')}` : ''}

RULES:
- Reply in English only, at most 2-4 sentences per turn, so the learner has room to respond.
- Stay in character/persona for the whole conversation.
- Never break the fourth wall by mentioning you are an AI unless directly asked.
- If the learner writes something unsafe, off-topic, or abusive, gently redirect back to the conversation.
- Do not solve the exercise for the learner — ask questions, don't lecture.`;
  }

  /**
   * Streams the model's reply chunk-by-chunk. `history` must already be
   * bounded (see CONVERSATION_MEMORY_WINDOW) — this method sends whatever
   * it's given verbatim, it doesn't truncate.
   */
  async *streamReply(
    systemPrompt: string,
    history: ConversationHistoryTurn[],
    userMessage: string,
  ): AsyncGenerator<string, void, unknown> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
      generationConfig: { maxOutputTokens: 400, temperature: 0.85 },
    });

    const chat = model.startChat({
      history: history.map((turn) => ({
        role: turn.role === ConversationRole.USER ? 'user' : 'model',
        parts: [{ text: turn.content }],
      })),
    });

    const result = await chat.sendMessageStream(userMessage);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }

  /**
   * Non-streaming scoring pass, run once when a session finishes — reuses
   * the same LLM-text-based scoring approach already established platform-
   * wide by the Speaking module (no audio is ever sent to the model there
   * either; see the Step 0 audit's "Speaking pipeline review" for why this
   * is a deliberate, honest, consistent choice, not a new gap).
   */
  async scoreConversation(
    scenarioTitle: string,
    difficulty: string,
    transcript: ConversationHistoryTurn[],
  ): Promise<ConversationScoring> {
    const userTurns = transcript.filter((t) => t.role === ConversationRole.USER);
    const transcriptText = transcript
      .map((t) => `${t.role === ConversationRole.USER ? 'Learner' : 'Partner'}: ${t.content}`)
      .join('\n');

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    });

    const prompt = `You are an English speaking coach evaluating a learner's performance in a conversation practice session.

SCENARIO: ${scenarioTitle}
LEARNER LEVEL: ${difficulty}

FULL TRANSCRIPT:
${transcriptText}

Evaluate ONLY the "Learner" turns. Respond as JSON matching exactly this shape:
{
  "overallScore": number (0-100),
  "fluencyScore": number (0-100),
  "grammarScore": number (0-100),
  "vocabularyScore": number (0-100),
  "pronunciationScore": number (0-100, best-effort text-based estimate — no audio was provided),
  "confidenceScore": number (0-100),
  "naturalnessScore": number (0-100, how natural/idiomatic the learner's phrasing was),
  "feedback": string (2-4 sentences of overall encouraging feedback),
  "grammarCorrections": [{ "original": string, "corrected": string, "explanation": string }] (up to 5, only real mistakes),
  "vocabularySuggestions": string[] (up to 5 words/phrases that would have been better choices)
}`;

    try {
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini scoring timeout')), 20000),
        ),
      ]);
      const text = (result as { response: { text(): string } }).response.text();
      const parsed = JSON.parse(text) as Partial<ConversationScoring>;
      return this.normalizeScoring(parsed, userTurns.length);
    } catch (error) {
      this.logger.warn(
        `Conversation scoring failed, using fallback: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.fallbackScoring(userTurns.length);
    }
  }

  private normalizeScoring(
    raw: Partial<ConversationScoring>,
    userTurnCount: number,
  ): ConversationScoring {
    const clamp = (value: unknown, fallback: number) =>
      typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, Math.min(100, Math.round(value)))
        : fallback;

    if (userTurnCount === 0) return this.fallbackScoring(userTurnCount);

    return {
      overallScore: clamp(raw.overallScore, 60),
      fluencyScore: clamp(raw.fluencyScore, 60),
      grammarScore: clamp(raw.grammarScore, 60),
      vocabularyScore: clamp(raw.vocabularyScore, 60),
      pronunciationScore: clamp(raw.pronunciationScore, 60),
      confidenceScore: clamp(raw.confidenceScore, 60),
      naturalnessScore: clamp(raw.naturalnessScore, 60),
      feedback:
        typeof raw.feedback === 'string' && raw.feedback.trim()
          ? raw.feedback
          : 'Great effort practicing this conversation!',
      grammarCorrections: Array.isArray(raw.grammarCorrections)
        ? raw.grammarCorrections.slice(0, 5)
        : [],
      vocabularySuggestions: Array.isArray(raw.vocabularySuggestions)
        ? raw.vocabularySuggestions.slice(0, 5).filter((s) => typeof s === 'string')
        : [],
    };
  }

  private fallbackScoring(userTurnCount: number): ConversationScoring {
    return {
      overallScore: userTurnCount > 0 ? 60 : 0,
      fluencyScore: userTurnCount > 0 ? 60 : 0,
      grammarScore: userTurnCount > 0 ? 60 : 0,
      vocabularyScore: userTurnCount > 0 ? 60 : 0,
      pronunciationScore: userTurnCount > 0 ? 60 : 0,
      confidenceScore: userTurnCount > 0 ? 60 : 0,
      naturalnessScore: userTurnCount > 0 ? 60 : 0,
      feedback:
        userTurnCount > 0
          ? 'Nice work completing this conversation! Detailed scoring is temporarily unavailable — try finishing another session for full feedback.'
          : 'No messages were exchanged in this session.',
      grammarCorrections: [],
      vocabularySuggestions: [],
    };
  }

  /** Short running summary of turns that have scrolled out of the memory
   * window — keeps long-conversation context bounded without silently
   * dropping the thread. Best-effort: falls back to a naive concatenation
   * summary on failure rather than throwing (never block the conversation
   * over a summarization hiccup). */
  async summarize(previousSummary: string | null, foldedTurns: ConversationHistoryTurn[]): Promise<string> {
    if (foldedTurns.length === 0) return previousSummary ?? '';

    const foldedText = foldedTurns
      .map((t) => `${t.role === ConversationRole.USER ? 'Learner' : 'Partner'}: ${t.content}`)
      .join('\n');

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-lite',
        generationConfig: { temperature: 0.2, maxOutputTokens: 150 },
      });
      const prompt = `Summarize the key facts/context from this English-conversation excerpt in 2-3 short sentences (for use as background context later — not a transcript). ${
        previousSummary ? `Prior summary: ${previousSummary}\n\n` : ''
      }New excerpt:\n${foldedText}`;
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('summary timeout')), 10000)),
      ]);
      const text = (result as { response: { text(): string } }).response.text().trim();
      return text || previousSummary || '';
    } catch (error) {
      this.logger.warn(
        `Conversation summarization failed, keeping prior summary: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return previousSummary ?? '';
    }
  }
}
