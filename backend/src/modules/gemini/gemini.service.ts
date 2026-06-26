// src/gemini/gemini.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  async generateJson(prompt: string) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const cleaned = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Gemini generate failed');
    }
  }
}