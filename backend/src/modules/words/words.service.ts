import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CheckWordDto } from './dto/check-word.dto';

@Injectable()
export class WordsService {
  private aiGemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async generateWithRetry(model: any, prompt: string, retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        return await model.generateContent(prompt);
      } catch (error: any) {
        const status = error?.status;

        if (status === 503 && i < retries) {
          await this.sleep(1000 * (i + 1));
          continue;
        }

        throw error;
      }
    }
  }

  async checkWord(dto: CheckWordDto) {
    const { word, sourceLanguage, targetLanguage, level = 'Beginner' } = dto;

    if (!process.env.GEMINI_API_KEY) {
      throw new BadRequestException('Missing GEMINI_API_KEY');
    }

    const model = this.aiGemini.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const prompt = `
You are an English learning assistant.

Analyze this word:

Word: ${word}
Source language: ${sourceLanguage}
Target language: ${targetLanguage}
Learner level: ${level}

Return ONLY valid JSON. No markdown.

JSON format:
{
  "word": "",
  "ipa": "",
  "partOfSpeech": "",
  "level": "",
  "mainMeaning": "",
  "shortExplanation": "",
  "synonyms": [
    {
      "word": "",
      "meaning": ""
    }
  ],
  "phrases": [
    {
      "phrase": "",
      "meaning": ""
    }
  ],
  "examples": [
    {
      "source": "",
      "target": ""
    }
  ]
}
`;

    try {
      // const result = await model.generateContent(prompt)
      const result = await this.generateWithRetry(model, prompt, 2);

      const text = result.response.text();
      return JSON.parse(
        text
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim(),
      );
    } catch (error) {
      console.error(error);

      if (error?.status === 503) {
        throw new ServiceUnavailableException(
          'AI đang quá tải, vui lòng thử lại sau',
        );
      }

      throw new BadRequestException('Không thể check từ lúc này');
    }
  }
}
