import { GoogleGenAI } from '@google/genai';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import {
  CefrLevel,
  LearningSkill,
  PlacementQuestionType,
} from '@prisma/client';

type GeminiRawPlacementQuestion = {
  question?: unknown;
  options?: unknown;
  correctAnswer?: unknown;
  explanation?: unknown;
  passage?: unknown;
  audioScript?: unknown;
};

export type GeneratedPlacementQuestion = {
  skill: LearningSkill;
  level: CefrLevel;
  type: PlacementQuestionType;
  question: string;
  options: Array<{
    key: string;
    text: string;
    translation: string | null;
  }>;
  correctAnswer: string;
  explanation: string;
  passage: string | null;
  audioScript: string | null;
};

@Injectable()
export class PlacementAiService {
  private readonly logger = new Logger(PlacementAiService.name);
  private readonly ai: GoogleGenAI;
  private readonly models: string[];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('Thiếu biến môi trường GEMINI_API_KEY');
    }

    this.ai = new GoogleGenAI({ apiKey });

    const configuredModel = process.env.GEMINI_MODEL?.trim();

    this.models = Array.from(
      new Set(
        [configuredModel, 'gemini-2.5-flash-lite', 'gemini-2.5-flash'].filter(
          (model): model is string => Boolean(model),
        ),
      ),
    );
  }

  async generateQuestions(params: {
    skill: LearningSkill;
    level: CefrLevel;
    type: PlacementQuestionType;
    count: number;
    excludedQuestions?: string[];
  }): Promise<GeneratedPlacementQuestion[]> {
    const { skill, level, type, count, excludedQuestions = [] } = params;

    if (count <= 0) {
      return [];
    }

    const prompt = this.buildPrompt({
      skill,
      level,
      type,
      count,
      excludedQuestions,
    });

    try {
      const rawText = await this.generateWithRetry(prompt);
      const parsed = this.parseJsonResponse(rawText);

      this.logger.debug(
        `Gemini generated ${parsed.length} raw questions for ${skill}/${level}/${type}`,
      );

      return this.validateQuestions(parsed, {
        skill,
        level,
        type,
        count,
      });
    } catch (error) {
      this.logger.error(
        `Gemini generate placement questions failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      throw new BadGatewayException(
        'Không thể tạo thêm câu hỏi từ AI. Vui lòng thử lại.',
      );
    }
  }

  private async generateWithRetry(prompt: string): Promise<string> {
    let lastError: unknown;

    for (const model of this.models) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          this.logger.log(`Gemini ${model} attempt ${attempt}`);

          const response = await this.ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              temperature: 0.7,
              responseMimeType: 'application/json',
            },
          });

          const text = response.text;

          if (!text?.trim()) {
            throw new Error(`Gemini ${model} không trả về nội dung`);
          }

          return text;
        } catch (error) {
          lastError = error;

          this.logger.warn(
            `Gemini ${model} attempt ${attempt} failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );

          if (attempt < 3 && this.isRetryableError(error)) {
            await this.sleep(1000 * attempt);
            continue;
          }

          break;
        }
      }
    }

    throw lastError ?? new Error('Không có Gemini model nào khả dụng');
  }

  private buildPrompt(params: {
    skill: LearningSkill;
    level: CefrLevel;
    type: PlacementQuestionType;
    count: number;
    excludedQuestions: string[];
  }): string {
    const { skill, level, type, count, excludedQuestions } = params;

    const excludedText =
      excludedQuestions.length > 0
        ? excludedQuestions
            .slice(0, 30)
            .map((question, index) => `${index + 1}. ${question}`)
            .join('\n')
        : 'Không có';

    return `
Bạn là chuyên gia thiết kế bài kiểm tra xếp trình độ tiếng Anh theo CEFR.

Hãy tạo chính xác ${count} câu hỏi mới.

Cấu hình do backend quyết định:
- Kỹ năng: ${skill}
- CEFR level: ${level}
- Loại câu hỏi: ${type}

Không trả về các trường skill, level, type hoặc audioUrl.
Backend sẽ tự gán skill, level và type.
Backend sẽ tạo audioUrl thật từ audioScript bằng Text-to-Speech.

Mỗi phần tử JSON chỉ được gồm:
- question
- options
- correctAnswer
- explanation
- passage
- audioScript

Ví dụ cấu trúc JSON:

[
  {
    "question": "Nội dung câu hỏi",
    "options": [
      {
        "key": "A",
        "text": "Nội dung đáp án A",
        "translation": null
      },
      {
        "key": "B",
        "text": "Nội dung đáp án B",
        "translation": null
      },
      {
        "key": "C",
        "text": "Nội dung đáp án C",
        "translation": null
      },
      {
        "key": "D",
        "text": "Nội dung đáp án D",
        "translation": null
      }
    ],
    "correctAnswer": "Nội dung chính xác của một option",
    "explanation": "Giải thích bằng tiếng Việt",
    "passage": null,
    "audioScript": null
  }
]

Quy tắc chung:
- Tạo đúng ${count} phần tử.
- Không tạo câu hỏi trùng nhau.
- Không tạo câu hỏi mơ hồ.
- Không chứa nội dung nhạy cảm hoặc gây tranh cãi.
- explanation phải viết bằng tiếng Việt.
- Không ghi đáp án đúng vào nội dung câu hỏi.
- Chỉ trả về JSON array hợp lệ.
- Không dùng markdown.
- Không thêm lời giải thích bên ngoài JSON.

Quy tắc cho câu hỏi khách quan:
- MULTIPLE_CHOICE, FILL_BLANK, LISTENING và READING phải có đúng 4 options.
- options phải có key A, B, C, D.
- Các option không được trùng nhau.
- Chỉ có đúng 1 đáp án đúng.
- correctAnswer phải bằng chính xác text của một option.

Quy tắc cho SPEAKING và WRITING:
- options phải là [].
- correctAnswer phải là "AI_EVALUATION".
- passage phải là null.
- audioScript phải là null.

Các câu hỏi đã có, tuyệt đối không tạo lại:
${excludedText}

Yêu cầu riêng theo kỹ năng:
${this.getSkillInstruction(skill, type)}
`.trim();
  }

  private getSkillInstruction(
    skill: LearningSkill,
    type: PlacementQuestionType,
  ): string {
    switch (skill) {
      case LearningSkill.VOCABULARY:
        return `
- Kiểm tra nghĩa từ, từ đồng nghĩa, từ trái nghĩa hoặc từ phù hợp ngữ cảnh.
- Câu văn phải tự nhiên.
- Từ cần kiểm tra nên được đặt trong ngữ cảnh rõ ràng.
- passage phải là null.
- audioScript phải là null.
`;

      case LearningSkill.GRAMMAR:
        return `
- Kiểm tra ngữ pháp đúng với level CEFR.
- Có thể dùng chia động từ, giới từ, mạo từ, câu điều kiện hoặc cấu trúc câu.
- Chỉ một lựa chọn đúng về mặt ngữ pháp và ngữ nghĩa.
- passage phải là null.
- audioScript phải là null.
`;

      case LearningSkill.LISTENING:
        return `
- Tạo một đoạn hội thoại, thông báo hoặc độc thoại tự nhiên.
- audioScript bắt buộc phải có và dài khoảng 20–60 từ.
- question phải chỉ có thể trả lời đúng sau khi nghe audioScript.
- passage phải là null.
- Không tạo audioUrl.
- Backend sẽ dùng audioScript để tạo file audio thật.
- Phải có đúng 4 options và 1 correctAnswer.
`;

      case LearningSkill.READING:
        return `
- passage bắt buộc phải có và phù hợp với level CEFR.
- question phải kiểm tra nội dung, chi tiết hoặc suy luận từ passage.
- audioScript phải là null.
- Phải có đúng 4 options và 1 correctAnswer.
`;

      case LearningSkill.SPEAKING:
        return `
- Tạo một đề bài nói ngắn, rõ ràng và phù hợp level CEFR.
- Người học nên có thể trả lời trong khoảng 30–60 giây.
- options phải là [].
- correctAnswer phải là "AI_EVALUATION".
- passage phải là null.
- audioScript phải là null.
`;

      case LearningSkill.WRITING:
        return `
- Tạo một đề bài viết ngắn, rõ ràng và phù hợp level CEFR.
- Đề bài nên phù hợp với bài viết khoảng 80–120 từ.
- options phải là [].
- correctAnswer phải là "AI_EVALUATION".
- passage phải là null.
- audioScript phải là null.
`;

      default:
        return `Tạo câu hỏi rõ ràng và phù hợp với loại ${type}.`;
    }
  }

  private parseJsonResponse(rawText: string): GeminiRawPlacementQuestion[] {
    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed: unknown = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error('Kết quả Gemini không phải JSON array');
    }

    return parsed as GeminiRawPlacementQuestion[];
  }

  private validateQuestions(
    questions: GeminiRawPlacementQuestion[],
    expected: {
      skill: LearningSkill;
      level: CefrLevel;
      type: PlacementQuestionType;
      count: number;
    },
  ): GeneratedPlacementQuestion[] {
    if (questions.length === 0) {
      throw new Error('Gemini không tạo được câu hỏi nào');
    }

    if (questions.length !== expected.count) {
      throw new Error(
        `Gemini trả về ${questions.length}/${expected.count} câu hỏi`,
      );
    }

    const uniqueQuestions = new Set<string>();
    const isAiScored =
      expected.type === PlacementQuestionType.SPEAKING ||
      expected.type === PlacementQuestionType.WRITING;

    return questions.map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new Error(`Câu ${index + 1} không đúng định dạng`);
      }

      const question = this.toRequiredText(
        item.question,
        `Câu ${index + 1} thiếu nội dung câu hỏi`,
      );

      const explanation =
        this.normalizeNullableText(item.explanation) ||
        (isAiScored
          ? 'Câu trả lời sẽ được AI đánh giá.'
          : 'Chưa có giải thích chi tiết.');

      const passage = this.normalizeNullableText(item.passage);
      const audioScript = this.normalizeNullableText(item.audioScript);
      const options = this.normalizeOptions(item.options);

      const normalizedQuestion = this.normalizeText(question);

      if (uniqueQuestions.has(normalizedQuestion)) {
        throw new Error(`Câu ${index + 1} bị trùng trong kết quả Gemini`);
      }

      uniqueQuestions.add(normalizedQuestion);

      if (expected.type === PlacementQuestionType.READING) {
        if (!passage) {
          throw new Error(`Câu ${index + 1} thiếu passage cho phần Reading`);
        }

        if (audioScript) {
          throw new Error(
            `Câu ${index + 1} không được có audioScript ở phần Reading`,
          );
        }
      }

      if (expected.type === PlacementQuestionType.LISTENING) {
        if (!audioScript) {
          throw new Error(
            `Câu ${index + 1} thiếu audioScript cho phần Listening`,
          );
        }

        if (passage) {
          throw new Error(
            `Câu ${index + 1} không được có passage ở phần Listening`,
          );
        }
      }

      if (isAiScored) {
        if (options.length > 0) {
          throw new Error(
            `Câu ${index + 1} thuộc ${expected.type} nên options phải là []`,
          );
        }

        if (passage || audioScript) {
          throw new Error(
            `Câu ${index + 1} thuộc ${expected.type} không được có passage hoặc audioScript`,
          );
        }

        return {
          skill: expected.skill,
          level: expected.level,
          type: expected.type,
          question,
          options: [],
          correctAnswer: 'AI_EVALUATION',
          explanation,
          passage: null,
          audioScript: null,
        };
      }

      if (options.length !== 4) {
        throw new Error(`Câu ${index + 1} phải có đúng 4 lựa chọn`);
      }

      const uniqueOptionTexts = new Set(
        options.map((option) => this.normalizeText(option.text)),
      );

      if (uniqueOptionTexts.size !== 4) {
        throw new Error(`Câu ${index + 1} có lựa chọn bị trùng`);
      }

      const rawCorrectAnswer = this.toRequiredText(
        item.correctAnswer,
        `Câu ${index + 1} thiếu correctAnswer`,
      );

      const normalizedCorrectAnswer = this.normalizeText(rawCorrectAnswer);

      const matchedOption = options.find(
        (option) =>
          this.normalizeText(option.text) === normalizedCorrectAnswer ||
          option.key.toUpperCase() === rawCorrectAnswer.toUpperCase(),
      );

      if (!matchedOption) {
        throw new Error(
          `Đáp án đúng của câu ${index + 1} không nằm trong options`,
        );
      }

      return {
        skill: expected.skill,
        level: expected.level,
        type: expected.type,
        question,
        options,
        correctAnswer: matchedOption.text,
        explanation,
        passage,
        audioScript,
      };
    });
  }

  private toRequiredText(value: unknown, errorMessage: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(errorMessage);
    }

    return value.trim();
  }

  private normalizeText(value: string): string {
    return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  }

  private normalizeNullableText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();

    return normalized || null;
  }

  private normalizeOptions(value: unknown): Array<{
    key: string;
    text: string;
    translation: string | null;
  }> {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item, index) => {
        if (typeof item === 'string') {
          const text = item.trim();

          if (!text) {
            return null;
          }

          return {
            key: String.fromCharCode(65 + index),
            text,
            translation: null,
          };
        }

        if (!item || typeof item !== 'object') {
          return null;
        }

        const option = item as Record<string, unknown>;

        const text =
          typeof option.text === 'string'
            ? option.text.trim()
            : typeof option.value === 'string'
              ? option.value.trim()
              : '';

        if (!text) {
          return null;
        }

        return {
          key: String.fromCharCode(65 + index),
          text,
          translation:
            typeof option.translation === 'string'
              ? option.translation.trim() || null
              : null,
        };
      })
      .filter(
        (
          item,
        ): item is {
          key: string;
          text: string;
          translation: string | null;
        } => item !== null,
      )
      .slice(0, 4);
  }

  private isRetryableError(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);

    return (
      message.includes('"code":503') ||
      message.includes('"code":429') ||
      message.includes('UNAVAILABLE') ||
      message.includes('RESOURCE_EXHAUSTED') ||
      message.includes('high demand') ||
      message.includes('timeout')
    );
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  async evaluateWriting(input: {
    prompt: string;
    answer: string;
    level: CefrLevel;
  }): Promise<{
    score: number;
    level: CefrLevel;
    summary: string;
  }> {
    const prompt = `
Bạn là giám khảo CEFR Writing.

Đề bài:
${input.prompt}

Trình độ mục tiêu:
${input.level}

Bài viết:
${input.answer}

Hãy đánh giá:
- task achievement
- grammar
- vocabulary
- coherence
- accuracy

Chỉ trả JSON:

{
  "score": 0,
  "level": "A1",
  "summary": "Nhận xét ngắn bằng tiếng Việt"
}
`.trim();

    const rawText = await this.generateWithRetry(prompt);
    const parsed = JSON.parse(rawText) as {
      score?: unknown;
      level?: unknown;
      summary?: unknown;
    };

    const score = Math.max(0, Math.min(100, Number(parsed.score ?? 0)));

    return {
      score,
      level: this.normalizeCefrLevel(parsed.level, this.scoreToLevel(score)),
      summary:
        typeof parsed.summary === 'string'
          ? parsed.summary.trim()
          : 'Đã hoàn tất đánh giá bài viết.',
    };
  }

  async evaluateSpeaking(input: {
    prompt: string;
    transcript: string;
    level: CefrLevel;
  }): Promise<{
    score: number;
    level: CefrLevel;
    summary: string;
  }> {
    const prompt = `
Bạn là giám khảo CEFR Speaking.

Đề bài:
${input.prompt}

Trình độ mục tiêu:
${input.level}

Transcript câu trả lời:
${input.transcript}

Hãy đánh giá:
- fluency
- grammar
- vocabulary
- relevance
- coherence

Không đánh giá phát âm vì chỉ có transcript.

Chỉ trả JSON:

{
  "score": 0,
  "level": "A1",
  "summary": "Nhận xét ngắn bằng tiếng Việt"
}
`.trim();

    const rawText = await this.generateWithRetry(prompt);
    const parsed = JSON.parse(rawText) as {
      score?: unknown;
      level?: unknown;
      summary?: unknown;
    };

    const score = Math.max(0, Math.min(100, Number(parsed.score ?? 0)));

    return {
      score,
      level: this.normalizeCefrLevel(parsed.level, this.scoreToLevel(score)),
      summary:
        typeof parsed.summary === 'string'
          ? parsed.summary.trim()
          : 'Đã hoàn tất đánh giá bài nói.',
    };
  }

  async generateLearningPath(input: {
    skills: Array<{
      skill: LearningSkill;
      score: number | null;
      level: CefrLevel | null;
      status: string;
    }>;
  }): Promise<{
    overallLevel: CefrLevel;
    summary: string;
    priorities: Array<{
      skill: LearningSkill;
      level: CefrLevel | null;
      priority: number;
      reason: string;
    }>;
  }> {
    const prompt = `
Bạn là chuyên gia xây dựng lộ trình học tiếng Anh.

Kết quả kỹ năng:
${JSON.stringify(input.skills, null, 2)}

Quy tắc:
- SKIPPED không được tính vào điểm trung bình.
- Ưu tiên kỹ năng có điểm thấp.
- Speaking chưa đánh giá thì dùng overallLevel tạm thời.
- Trả tối đa 6 ưu tiên.

Chỉ trả JSON:

{
  "overallLevel": "B1",
  "summary": "Tóm tắt bằng tiếng Việt",
  "priorities": [
    {
      "skill": "GRAMMAR",
      "level": "A2",
      "priority": 1,
      "reason": "Lý do"
    }
  ]
}
`.trim();

    const rawText = await this.generateWithRetry(prompt);
    const parsed = JSON.parse(rawText) as {
      overallLevel?: unknown;
      summary?: unknown;
      priorities?: unknown;
    };

    const evaluatedScores = input.skills
      .filter((item) => item.status !== 'SKIPPED' && item.score !== null)
      .map((item) => item.score as number);

    const average =
      evaluatedScores.length > 0
        ? Math.round(
            evaluatedScores.reduce((sum, value) => sum + value, 0) /
              evaluatedScores.length,
          )
        : 0;

    const fallbackLevel = this.scoreToLevel(average);

    return {
      overallLevel: this.normalizeCefrLevel(parsed.overallLevel, fallbackLevel),
      summary:
        typeof parsed.summary === 'string'
          ? parsed.summary.trim()
          : 'Đã tạo lộ trình học cá nhân hóa.',
      priorities: Array.isArray(parsed.priorities)
        ? parsed.priorities
            .map((item, index) => {
              if (!item || typeof item !== 'object') {
                return null;
              }

              const value = item as Record<string, unknown>;

              const skill = String(value.skill ?? '') as LearningSkill;

              if (!Object.values(LearningSkill).includes(skill)) {
                return null;
              }

              return {
                skill,
                level: this.normalizeNullableCefrLevel(value.level),
                priority: Number(value.priority ?? index + 1),
                reason:
                  typeof value.reason === 'string'
                    ? value.reason.trim()
                    : 'Cần được ưu tiên trong lộ trình.',
              };
            })
            .filter(
              (
                item,
              ): item is {
                skill: LearningSkill;
                level: CefrLevel | null;
                priority: number;
                reason: string;
              } => item !== null,
            )
        : [],
    };
  }

  private scoreToLevel(score: number): CefrLevel {
    if (score >= 90) return CefrLevel.C2;
    if (score >= 80) return CefrLevel.C1;
    if (score >= 70) return CefrLevel.B2;
    if (score >= 55) return CefrLevel.B1;
    if (score >= 40) return CefrLevel.A2;
    return CefrLevel.A1;
  }

  private normalizeCefrLevel(value: unknown, fallback: CefrLevel): CefrLevel {
    const level = String(value ?? '').toUpperCase();

    return Object.values(CefrLevel).includes(level as CefrLevel)
      ? (level as CefrLevel)
      : fallback;
  }

  private normalizeNullableCefrLevel(value: unknown): CefrLevel | null {
    if (value === null || value === undefined) {
      return null;
    }

    const level = String(value).toUpperCase();

    return Object.values(CefrLevel).includes(level as CefrLevel)
      ? (level as CefrLevel)
      : null;
  }
}
