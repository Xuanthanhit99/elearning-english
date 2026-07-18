import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  WritingEvaluationResult,
  WritingMistake,
} from './writing-processing.types';

@Injectable()
export class WritingAiEvaluationService {
  private readonly model;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({
      model: process.env.WRITING_GEMINI_MODEL ?? 'gemini-2.5-flash',
    });
  }

  async evaluate(input: {
    prompt: string;
    essay: string;
    type: string;
    level: string;
    minWords?: number | null;
    maxWords?: number | null;
    correctionMode?: string;
    translationMode?: string;
    learningGoal?: string;
  }): Promise<WritingEvaluationResult> {
    const essay = input.essay.trim();

    if (!essay || essay.split(/\s+/).length < 10) {
      return this.emptyResult(
        'Bài viết quá ngắn để đánh giá chính xác. Hãy viết thêm ý chính, ví dụ và kết luận.',
      );
    }

    const prompt = `
You are an English Writing evaluator for Vietnamese learners.

Writing prompt:
${input.prompt}

Writing type:
${input.type}

CEFR level:
${input.level}

Word target:
${input.minWords ?? 0} - ${input.maxWords ?? 0} words

Student essay:
${essay}

Learner's goal: ${input.learningGoal || 'DAILY_ENGLISH'}

Correction mode (correctionMode = ${input.correctionMode || 'EXPLAIN_GRAMMAR'}):
${this.correctionModeInstruction(input.correctionMode)}

Translation policy (translationMode = ${input.translationMode || 'ON_REQUEST'}):
${this.translationModeInstruction(input.translationMode)}

Return ONLY valid JSON, no markdown:
{
  "overallScore": 0,
  "grammar": 0,
  "vocabulary": 0,
  "coherence": 0,
  "taskResponse": 0,
  "correctedEssay": "",
  "mistakes": [
    {
      "type": "GRAMMAR",
      "original": "",
      "corrected": "",
      "explanation": ""
    }
  ],
  "feedback": "",
  "suggestions": [""],
  "nextPractice": {
    "title": "",
    "focusSkill": "",
    "reason": ""
  }
}

Rules:
- Scores are integers from 0 to 100.
- feedback, suggestions, mistake explanations, nextPractice.reason should be Vietnamese.
- correctedEssay must be English.
- Maximum 12 mistakes and 6 suggestions.
- Do not invent content not related to the essay.
`;

    const result = await this.model.generateContent(prompt);
    const parsed = this.parseJson(result.response.text());
    return this.normalize(parsed);
  }

  private correctionModeInstruction(correctionMode?: string): string {
    switch (correctionMode) {
      case 'MAJOR_ONLY':
        return 'Only list mistakes that change the meaning of the sentence; ignore minor style issues.';
      case 'CORRECT_EVERYTHING':
        return 'List every mistake in detail, including minor grammar, spelling, and word choice issues.';
      case 'NATIVE_EXPRESSION':
        return 'After correcting mistakes, also suggest more natural, native-like phrasing where useful.';
      case 'EXPLAIN_GRAMMAR':
      default:
        return 'For each mistake, briefly explain the grammar rule that was broken.';
    }
  }

  private translationModeInstruction(translationMode?: string): string {
    switch (translationMode) {
      case 'ALWAYS':
        return 'Include a Vietnamese translation for the feedback and key suggestions.';
      case 'NEVER':
        return 'Do not include any Vietnamese translation, keep feedback bilingual-free where possible.';
      case 'ON_REQUEST':
      default:
        return 'Feedback/suggestions text is already expected in Vietnamese as instructed above; do not add English translation of it.';
    }
  }

  private emptyResult(feedback: string): WritingEvaluationResult {
    return {
      overallScore: 0,
      grammar: 0,
      vocabulary: 0,
      coherence: 0,
      taskResponse: 0,
      correctedEssay: '',
      mistakes: [],
      feedback,
      suggestions: ['Viết ít nhất 10 từ và bám sát đề bài trước khi nộp lại.'],
      nextPractice: {
        title: 'Viết đoạn văn ngắn có đủ ý chính',
        focusSkill: 'TASK_RESPONSE',
        reason: 'Bài hiện tại chưa đủ dữ liệu để AI đánh giá đầy đủ.',
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

  private normalize(value: any): WritingEvaluationResult {
    const score = (input: unknown) => {
      const number = Number(input ?? 0);
      if (!Number.isFinite(number)) return 0;
      return Math.max(0, Math.min(100, Math.round(number)));
    };

    const allowed = new Set([
      'GRAMMAR',
      'VOCABULARY',
      'COHERENCE',
      'TASK_RESPONSE',
      'SPELLING',
    ]);

    const mistakes: WritingMistake[] = Array.isArray(value?.mistakes)
      ? value.mistakes
          .map((item: any) => ({
            type: allowed.has(item?.type) ? item.type : 'GRAMMAR',
            original: String(item?.original ?? ''),
            corrected: String(item?.corrected ?? ''),
            explanation: String(item?.explanation ?? ''),
          }))
          .filter((item: WritingMistake) => item.original || item.corrected)
          .slice(0, 12)
      : [];

    return {
      overallScore: score(value?.overallScore),
      grammar: score(value?.grammar),
      vocabulary: score(value?.vocabulary),
      coherence: score(value?.coherence),
      taskResponse: score(value?.taskResponse),
      correctedEssay: String(value?.correctedEssay ?? ''),
      mistakes,
      feedback: String(value?.feedback ?? ''),
      suggestions: Array.isArray(value?.suggestions)
        ? value.suggestions.map(String).slice(0, 6)
        : [],
      nextPractice: {
        title: String(value?.nextPractice?.title ?? 'Practice writing again'),
        focusSkill: String(value?.nextPractice?.focusSkill ?? 'WRITING'),
        reason: String(value?.nextPractice?.reason ?? ''),
      },
    };
  }
}
