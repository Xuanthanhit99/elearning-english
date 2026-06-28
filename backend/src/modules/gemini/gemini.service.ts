// src/gemini/gemini.service.ts
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
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error('Gemini did not return valid JSON');
    }

    return JSON.parse(match[0]);
  }

  async generateJson(prompt: string) {
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash'].sort(
      () => Math.random() - 0.5,
    );

    let lastError: any;

    for (const modelName of models) {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
      });

      for (let retry = 0; retry < 3; retry++) {
        try {
          const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Gemini timeout')), 25000),
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
            await this.sleep((retry + 1) * 2000);
          }
        }
      }
    }

    throw new InternalServerErrorException(
      lastError?.message || 'Gemini generate failed',
    );
  }
}
