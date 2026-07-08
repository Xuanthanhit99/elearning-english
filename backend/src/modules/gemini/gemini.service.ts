// src/modules/gemini/gemini.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

  async generateJson(prompt: string) {
    const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];

    let lastError: any;

    for (const modelName of models) {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      });

      for (let retry = 0; retry < 3; retry++) {
        try {
          const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Gemini timeout')), 30000),
            ),
          ]);

          const text = (result as any).response.text();

          return this.extractJson(text);
        } catch (error: any) {
          lastError = error;

          console.error(
            `[Gemini] ${modelName} retry ${retry + 1}:`,
            error.message,
          );

          if (retry < 2) {
            await this.sleep((retry + 1) * 5000);
          }
        }
      }
    }

    throw new InternalServerErrorException(
      lastError?.message || 'Gemini generate failed',
    );
  }
}