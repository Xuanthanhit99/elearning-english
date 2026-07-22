import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { parseArenaQuestionResponse } from './arena-question-parser';
import { validateArenaQuestionCandidates } from './arena-question-validator';
import { ArenaQuestionCandidate } from './arena-question.types';

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

const getMaxAttemptsPerModel = () => envInt('ARENA_AI_MAX_ATTEMPTS_PER_MODEL', 2);
const getRetryBaseDelayMs = () => envInt('ARENA_AI_RETRY_BASE_DELAY_MS', 500);

/**
 * Wraps the Gemini call Arena used to make directly from `ArenaService`.
 * Bounded retry-with-backoff across model fallbacks mirrors
 * `placement-ai.service.ts`'s `generateWithRetry` — the strongest existing
 * precedent for this in the codebase. Parsing/validation are delegated to
 * the dedicated parser/validator, never inlined here.
 */
@Injectable()
export class ArenaAiQuestionSource {
  private readonly logger = new Logger(ArenaAiQuestionSource.name);
  private readonly ai: GoogleGenAI;
  private readonly models: string[];

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const configured = process.env.ARENA_GEMINI_MODEL?.trim() || process.env.GEMINI_MODEL?.trim();
    this.models = Array.from(
      new Set(
        [configured, 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].filter(
          (model): model is string => Boolean(model),
        ),
      ),
    );
  }

  async generateCandidates(input: {
    skill: string;
    level: string;
    topic: string;
    count: number;
  }): Promise<ArenaQuestionCandidate[]> {
    const prompt = this.buildPrompt(input);

    let rawText: string;
    try {
      rawText = await this.generateWithRetry(prompt);
    } catch (error) {
      this.logger.warn(
        `Arena AI question generation failed after retries: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }

    let parsed: ReturnType<typeof parseArenaQuestionResponse>;
    try {
      parsed = parseArenaQuestionResponse(rawText);
    } catch (error) {
      this.logger.warn(
        `Arena AI response failed to parse: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }

    const { valid, rejected } = validateArenaQuestionCandidates(parsed);
    if (rejected.length) {
      this.logger.warn(
        `Arena AI question source rejected ${rejected.length}/${parsed.length} candidates: ` +
          rejected.map((r) => r.reason).join(', '),
      );
    }
    return valid;
  }

  private buildPrompt(input: { skill: string; level: string; topic: string; count: number }): string {
    return `
Generate ${input.count} English learning arena questions.

Config:
- Skill: ${input.skill}
- Level: ${input.level}
- Topic: ${input.topic}

Return ONLY JSON array. Each item must have: type, skill, prompt, options (array), answer, explanation.

Rules:
- type must be one of: MULTIPLE_CHOICE, FILL_BLANK, ORDER_SENTENCE, LISTENING_PLACEHOLDER, PRONUNCIATION_PLACEHOLDER, FLASH, MATCHING_PLACEHOLDER.
- Each question has exactly 4 unique, non-empty options.
- answer must be one of options.
- Vietnamese prompt is allowed.
- Do not return markdown.
`;
  }

  private async generateWithRetry(prompt: string): Promise<string> {
    let lastError: unknown;
    const maxAttempts = getMaxAttemptsPerModel();

    for (const model of this.models) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await this.ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: 'application/json' },
          });
          const text = response.text;
          if (!text?.trim()) {
            throw new Error(`Gemini ${model} returned no content`);
          }
          return text;
        } catch (error) {
          lastError = error;
          this.logger.warn(
            `Arena Gemini ${model} attempt ${attempt} failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          if (attempt < maxAttempts && this.isRetryableError(error)) {
            await this.sleep(getRetryBaseDelayMs() * attempt);
            continue;
          }
          break;
        }
      }
    }

    throw lastError ?? new Error('No Arena Gemini model available');
  }

  private isRetryableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return (
      message.includes('"code":503') ||
      message.includes('"code":429') ||
      message.includes('UNAVAILABLE') ||
      message.includes('RESOURCE_EXHAUSTED') ||
      message.includes('timeout')
    );
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
