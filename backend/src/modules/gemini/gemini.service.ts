// src/modules/gemini/gemini.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiUsageService } from '../ai-usage/ai-usage.service';

@Injectable()
export class GeminiService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  constructor(private readonly aiUsage: AiUsageService) {}

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractJson(text: string) {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const firstObject = cleaned.indexOf('{');
    const firstArray = cleaned.indexOf('[');

    let start = -1;
    let end = -1;

    if (firstObject !== -1 && (firstArray === -1 || firstObject < firstArray)) {
      start = firstObject;
      end = this.findMatchingBracket(cleaned, start, '{', '}');
    } else if (firstArray !== -1) {
      start = firstArray;
      end = this.findMatchingBracket(cleaned, start, '[', ']');
    }

    if (start === -1 || end === -1) {
      throw new Error('Gemini did not return valid JSON');
    }

    const jsonText = cleaned.slice(start, end + 1);

    return JSON.parse(jsonText);
  }

  private findMatchingBracket(
    text: string,
    start: number,
    open: string,
    close: string,
  ) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const char = text[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === open) depth++;
      if (char === close) depth--;

      if (depth === 0) return i;
    }

    return -1;
  }

  /**
   * `options` lets call sites that need a specific model list / timeout /
   * temperature (e.g. an env-var-pinned evaluation model) keep that
   * behavior while still sharing this one client + retry + JSON-extraction
   * implementation, instead of each duplicating `new GoogleGenerativeAI(...)`.
   * Defaults match the original hardcoded behavior exactly, so every
   * existing caller (vocabulary, reading, listening, grammar, ...) is
   * unaffected.
   */
  async generateJson(
    prompt: string,
    options?: {
      models?: string[];
      temperature?: number;
      timeoutMs?: number;
      retries?: number;
      /** Caller-supplied label for AI-usage attribution (Part 9's
       * "endpoint/module usage") — optional so existing call sites don't
       * break; defaults to 'unspecified' rather than silently dropping
       * the request from usage tracking. */
      module?: string;
      userId?: string;
    },
  ) {
    const models = options?.models ?? ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
    const temperature = options?.temperature ?? 0.4;
    const timeoutMs = options?.timeoutMs ?? 30000;
    const retries = options?.retries ?? 3;
    const moduleLabel = options?.module ?? 'unspecified';
    const startedAt = Date.now();

    let lastError: any;
    let timedOut = false;

    for (const modelName of models) {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature,
          responseMimeType: 'application/json',
        },
      });

      for (let retry = 0; retry < retries; retry++) {
        try {
          const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Gemini timeout')), timeoutMs),
            ),
          ]);

          const text = (result as any).response.text();
          const usageMetadata = (result as any).response.usageMetadata;

          const parsed = this.extractJson(text);
          void this.aiUsage.record({
            module: moduleLabel,
            success: true,
            durationMs: Date.now() - startedAt,
            promptTokens: usageMetadata?.promptTokenCount ?? null,
            completionTokens: usageMetadata?.candidatesTokenCount ?? null,
            userId: options?.userId,
          });
          return parsed;
        } catch (error: any) {
          lastError = error;
          if (error?.message === 'Gemini timeout') timedOut = true;

          console.error(
            `[Gemini] ${modelName} retry ${retry + 1}:`,
            error.message,
          );

          if (retry < retries - 1) {
            await this.sleep((retry + 1) * 5000);
          }
        }
      }
    }

    void this.aiUsage.record({
      module: moduleLabel,
      success: false,
      timedOut,
      durationMs: Date.now() - startedAt,
      errorType: lastError?.name ?? 'UnknownError',
      userId: options?.userId,
    });

    throw new InternalServerErrorException(
      lastError?.message || 'Gemini generate failed',
    );
  }
}
