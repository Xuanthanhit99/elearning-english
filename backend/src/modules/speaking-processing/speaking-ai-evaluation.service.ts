import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SpeakingEvaluationResult } from './speaking-processing.types';

@Injectable()
export class SpeakingAiEvaluationService {
  private readonly model;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    this.model = genAI.getGenerativeModel({
      model: process.env.SPEAKING_GEMINI_MODEL ?? 'gemini-2.5-flash',
    });
  }

  async evaluate(input: {
    question: string;
    expectedText?: string | null;
    transcript: string;
    level: string;
    speechConfidence: number;
  }): Promise<SpeakingEvaluationResult> {
    const transcript = input.transcript.trim();

    if (!transcript || transcript.split(/\s+/).length < 3) {
      return this.emptyResult('Không phát hiện đủ nội dung nói để chấm điểm.');
    }

    const prompt = `
Bạn là AI coach chấm bài Speaking tiếng Anh.

Question:
${input.question}

Expected text:
${input.expectedText || 'Không có câu mẫu'}

User transcript:
${transcript}

CEFR level:
${input.level}

Speech-to-text confidence:
${input.speechConfidence}/100

Quy tắc:
- Chỉ đánh giá dựa trên transcript thật.
- Không cho điểm cao nếu nội dung quá ngắn, không liên quan hoặc sai nghiêm trọng.
- pronunciation có thể tham khảo confidence nhưng không được chỉ dựa vào confidence.
- Mọi điểm từ 0 đến 100.
- Trả về JSON hợp lệ, không markdown.

Format:
{
  "overallScore": 0,
  "pronunciation": 0,
  "fluency": 0,
  "grammar": 0,
  "vocabulary": 0,
  "confidence": 0,
  "correctedText": "",
  "feedback": "",
  "suggestions": [""],
  "mistakes": [
    {
      "type": "GRAMMAR",
      "original": "",
      "corrected": "",
      "explanation": ""
    }
  ],
  "improvedVersion": "",
  "nextPractice": {
    "focusSkill": "PRONUNCIATION",
    "title": "",
    "reason": ""
  }
}`;

    const result = await this.model.generateContent(prompt);

    const parsed = this.parseJson(result.response.text());

    return this.normalize(parsed);
  }

  private emptyResult(feedback: string): SpeakingEvaluationResult {
    return {
      overallScore: 0,
      pronunciation: 0,
      fluency: 0,
      grammar: 0,
      vocabulary: 0,
      confidence: 0,
      correctedText: '',
      feedback,
      suggestions: ['Hãy nói ít nhất một câu hoàn chỉnh và thử lại.'],
      mistakes: [],
      improvedVersion: '',
      nextPractice: {
        focusSkill: 'PRONUNCIATION',
        title: 'Luyện phát âm câu ngắn',
        reason: 'Bài nói hiện tại chưa đủ dữ liệu để đánh giá.',
      },
    };
  }

  private parseJson(text: string) {
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start < 0 || end < 0) {
      throw new InternalServerErrorException(
        'Gemini response is not valid JSON',
      );
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }

  private normalize(value: any): SpeakingEvaluationResult {
    const score = (input: unknown) => {
      const number = Number(input ?? 0);

      if (!Number.isFinite(number)) {
        return 0;
      }

      return Math.max(0, Math.min(100, Math.round(number)));
    };

    const allowedMistakes = new Set([
      'PRONUNCIATION',
      'GRAMMAR',
      'VOCABULARY',
      'FLUENCY',
      'CONTENT',
    ]);

    return {
      overallScore: score(value?.overallScore),
      pronunciation: score(value?.pronunciation),
      fluency: score(value?.fluency),
      grammar: score(value?.grammar),
      vocabulary: score(value?.vocabulary),
      confidence: score(value?.confidence),
      correctedText: String(value?.correctedText ?? ''),
      feedback: String(value?.feedback ?? ''),
      suggestions: Array.isArray(value?.suggestions)
        ? value.suggestions.map(String)
        : [],
      mistakes: Array.isArray(value?.mistakes)
        ? value.mistakes
            .map((item: any) => ({
              type: allowedMistakes.has(item?.type) ? item.type : 'CONTENT',
              original: String(item?.original ?? ''),
              corrected: String(item?.corrected ?? ''),
              explanation: String(item?.explanation ?? ''),
            }))
            .slice(0, 20)
        : [],
      improvedVersion: String(value?.improvedVersion ?? ''),
      nextPractice: {
        focusSkill: String(value?.nextPractice?.focusSkill ?? 'PRONUNCIATION'),
        title: String(value?.nextPractice?.title ?? 'Luyện nói tiếp theo'),
        reason: String(value?.nextPractice?.reason ?? ''),
      },
    };
  }
}
