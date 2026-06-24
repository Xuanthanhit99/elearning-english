import { BadRequestException, Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from 'src/prisma/prisma.service';
import { CheckWritingDto } from './dro/check-writing.dto';

@Injectable()
export class WritingService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  constructor(private readonly prisma: PrismaService) {}

  private cleanJson(text: string) {
    return text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
  }

  async checkWriting(dto: CheckWritingDto, userId?: string) {
    const text = dto.text?.trim();

    if (!text) {
      throw new BadRequestException('Text is required');
    }

    const requestLevel = dto.level || 'Beginner';
    const style = dto.style || 'general';

    const existed = await this.prisma.writingSubmission.findFirst({
      where: {
        originalText: text,
        style,
        level: requestLevel,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existed) {
      return {
        id: existed.id,
        score: existed.score,
        level: existed.level,
        summary:
          existed.summary ||
          `Bài viết đạt mức ${existed.level}, cần cải thiện thêm ngữ pháp và cách diễn đạt.`,
        grammarScore: existed.grammarScore,
        vocabularyScore: existed.vocabularyScore,
        clarityScore: existed.clarityScore,
        meaningScore: existed.meaningScore,
        corrections: existed.corrections || [],
        suggestedVersion: existed.suggestedVersion || '',
        phrases: existed.phrases || [],
        learningTips: existed.learningTips || [],
        miuNote: existed.miuNote || '',
      };
    }

    const prompt = `
Check this English writing for Vietnamese learners.

Text:
${text}

Style: ${style}
Level: ${requestLevel}

Return ONLY JSON:
{
  "detectedLanguage": "",
  "score": 0,
  "level": "",
  "summary": "",
  "grammarScore": 0,
  "vocabularyScore": 0,
  "clarityScore": 0,
  "meaningScore": 0,
  "corrections": [
    {
      "type": "",
      "level": "",
      "wrong": "",
      "correct": "",
      "explanation": ""
    }
  ],
  "suggestedVersion": "",
  "phrases": [],
  "learningTips": [],
  "miuNote": ""
}

Rules:
- Explain in Vietnamese.
- Keep it concise.
- Maximum 3 corrections.
- Maximum 5 phrases.
- Maximum 3 learningTips.
`;

    try {
      const aiData = await this.callGemini(prompt);

      const saved = await this.prisma.writingSubmission.create({
        data: {
          userId: userId || null,
          originalText: text,
          detectedLanguage: aiData.detectedLanguage || '',
          style,
          level: requestLevel,

          score: aiData.score,
          grammarScore: aiData.grammarScore,
          vocabularyScore: aiData.vocabularyScore,
          clarityScore: aiData.clarityScore,
          meaningScore: aiData.meaningScore,

          corrections: aiData.corrections || [],
          suggestedVersion: aiData.suggestedVersion || '',
          phrases: aiData.phrases || [],
          learningTips: aiData.learningTips || [],
          miuNote: aiData.miuNote || '',
        },
      });

      return {
        id: saved.id,
        score: aiData.score,
        level: aiData.level,

        summary:
          aiData.summary ||
          `Bài viết đạt mức ${aiData.level}, cần cải thiện thêm ngữ pháp và cách diễn đạt.`,

        grammarScore: aiData.grammarScore,
        vocabularyScore: aiData.vocabularyScore,
        clarityScore: aiData.clarityScore,
        meaningScore: aiData.meaningScore,

        corrections: aiData.corrections || [],
        suggestedVersion: aiData.suggestedVersion || '',
        phrases: aiData.phrases || [],
        learningTips: aiData.learningTips || [],
        miuNote: aiData.miuNote || '',
      };
    } catch (error: any) {
      console.log('FULL ERROR:', error);

      throw new BadRequestException('Không thể check bài viết lúc này');
    }
  }

  private async callGemini(prompt: string) {
    const models = ['gemini-2.0-flash', 'gemini-2.5-flash'];

    for (const modelName of models) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
        });

        const result = await model.generateContent(prompt);
        const rawText = result.response.text();

        return JSON.parse(this.cleanJson(rawText));
      } catch (error: any) {
        console.log('Gemini failed:', {
          modelName,
          status: error?.status,
          message: error?.message,
        });

        if (error?.status === 503 || error?.status === 429) {
          continue;
        }

        throw error;
      }
    }

    throw new BadRequestException(
      'AI đang quá tải, vui lòng thử lại sau vài phút.',
    );
  }

  async getMyHistory(userId: string) {
    return this.prisma.writingSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
