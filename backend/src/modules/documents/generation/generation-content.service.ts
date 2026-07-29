import { Injectable } from '@nestjs/common';
import { GeminiService } from '../../gemini/gemini.service';
import { getDocumentGenerationModel } from '../../../config/document-storage.config';
import {
  DocumentGenerationConfig,
  GeneratedFinalTest,
  GeneratedLesson,
  GeneratedOutline,
  GeneratedStudyPlan,
} from './document-generation.types';

/** Wraps every Gemini call in the ebook-generation pipeline. Each method
 * maps 1:1 to a DocumentGenerationJobName step and returns raw parsed
 * JSON — callers (the processor) run the result through
 * GenerationValidatorService before persisting/trusting it (spec §14:
 * never trust Gemini's own self-review as the sole gate). */
@Injectable()
export class GenerationContentService {
  constructor(private readonly gemini: GeminiService) {}

  private models() {
    const model = getDocumentGenerationModel();
    return model ? [model] : undefined;
  }

  async generateOutline(
    config: DocumentGenerationConfig,
    userId: string,
  ): Promise<GeneratedOutline> {
    const prompt = `Bạn là chuyên gia biên soạn giáo trình tiếng Anh cho BeaconVie.
Tạo dàn ý (outline) cho một tài liệu học tiếng Anh với thông tin sau:
- Tiêu đề: ${config.title}
- Chủ đề: ${config.topic}
- Cấp độ: ${config.level}
- Số bài học: ${config.lessonCount}
- Đối tượng: ${config.targetAudience ?? 'người học tiếng Anh nói chung'}
- Ngôn ngữ giải thích: ${config.explanationLanguage}

Trả về CHÍNH XÁC JSON:
{
  "documentTitle": string,
  "summary": string,
  "lessons": [{ "lessonNumber": number, "title": string, "vietnameseTitle": string, "objectives": string[] }]
}
Phải có đúng ${config.lessonCount} bài, lessonNumber bắt đầu từ 1 và không trùng. Không dùng placeholder như "TODO", "sẽ bổ sung".`;

    return this.gemini.generateJson(prompt, {
      models: this.models(),
      module: 'document_generation_outline',
      userId,
      temperature: 0.5,
    }) as Promise<GeneratedOutline>;
  }

  async generateLessonSection(
    config: DocumentGenerationConfig,
    lessonNumber: number,
    lessonTitle: string,
    objectives: string[],
    userId: string,
  ): Promise<GeneratedLesson> {
    const prompt = `Bạn là chuyên gia biên soạn giáo trình tiếng Anh cho BeaconVie.
Viết ĐẦY ĐỦ nội dung cho bài học số ${lessonNumber}: "${lessonTitle}".
Mục tiêu bài học: ${objectives.join('; ')}
Cấp độ: ${config.level}. Ngôn ngữ giải thích: ${config.explanationLanguage}.
Yêu cầu: ${config.vocabularyPerLesson} từ vựng${config.includeIpa ? ' (có IPA)' : ''}${config.includeTranslation ? ', có bản dịch ví dụ' : ''}.
${config.includeDialogues ? 'Có hội thoại tối thiểu 6 lượt trao đổi.' : ''}
${config.includeGrammar ? 'Có phần ngữ pháp với giải thích, cấu trúc, ví dụ, lỗi thường gặp.' : ''}
${config.includeExercises ? 'Có ít nhất 2 bài tập với câu hỏi có ID ổn định (dạng "l' + lessonNumber + '-e{n}-q{n}").' : ''}
${config.includeExercises && config.includeAnswerKey ? 'MỌI câu hỏi phải có đáp án tương ứng tham chiếu đúng questionId, không thiếu không thừa.' : ''}

Trả về CHÍNH XÁC JSON theo schema GeneratedLesson:
{
  "lessonNumber": ${lessonNumber},
  "title": string, "vietnameseTitle": string, "objectives": string[],
  "vocabulary": [{ "id": string, "word": string, "ipa": string, "partOfSpeech": string, "meaning": string, "example": string, "exampleTranslation": string }],
  "usefulExpressions": [{ "id": string, "expression": string, "meaning": string, "usage": string, "sampleResponse": string }],
  "dialogue": { "context": string, "participants": string[], "lines": [{ "speaker": string, "english": string, "translation": string }], "memorablePhrases": string[] },
  "grammar": { "title": string, "explanation": string, "structure": string, "usage": string[], "examples": [{ "english": string, "translation": string }], "commonMistakes": string[] },
  "exercises": [{ "id": string, "type": "MULTIPLE_CHOICE"|"FILL_BLANK"|"MATCHING"|"ORDERING"|"WRITING"|"SPEAKING"|"DIALOGUE_COMPLETION", "instruction": string, "questions": [{ "id": string, "prompt": string, "options": unknown }] }],
  "answers": [{ "exerciseId": string, "questionId": string, "answer": unknown, "explanation": string }]
}
KHÔNG dùng placeholder, KHÔNG viết "tương tự như trên" hay "sẽ bổ sung" — mọi trường phải có nội dung thật.`;

    return this.gemini.generateJson(prompt, {
      models: this.models(),
      module: 'document_generation_section',
      userId,
      temperature: 0.6,
      timeoutMs: 45000,
    }) as Promise<GeneratedLesson>;
  }

  async generateFinalTest(
    config: DocumentGenerationConfig,
    lessonTitles: string[],
    userId: string,
  ): Promise<GeneratedFinalTest> {
    const prompt = `Tạo bài kiểm tra cuối khoá cho tài liệu "${config.title}" (cấp độ ${config.level}), bao quát các bài: ${lessonTitles.join(', ')}.
Trả về CHÍNH XÁC JSON:
{
  "instructions": string,
  "totalScore": number,
  "questions": [{ "id": string, "type": "MULTIPLE_CHOICE"|"FILL_BLANK"|"WRITING", "prompt": string, "score": number, "options": unknown }],
  "answers": [{ "exerciseId": "final-test", "questionId": string, "answer": unknown, "explanation": string }]
}
totalScore phải bằng đúng tổng "score" của tất cả questions.${config.includeAnswerKey ? ' Mọi câu hỏi phải có đáp án.' : ''}`;

    return this.gemini.generateJson(prompt, {
      models: this.models(),
      module: 'document_generation_final_test',
      userId,
      temperature: 0.4,
    }) as Promise<GeneratedFinalTest>;
  }

  async generateSummary(
    config: DocumentGenerationConfig,
    lessonTitles: string[],
    userId: string,
  ): Promise<string> {
    const prompt = `Viết một đoạn tóm tắt (150-250 từ) giới thiệu tài liệu "${config.title}" gồm các bài: ${lessonTitles.join(', ')}. Trả về JSON: { "summary": string }`;
    const result = (await this.gemini.generateJson(prompt, {
      models: this.models(),
      module: 'document_generation_summary',
      userId,
      temperature: 0.5,
    })) as { summary: string };
    return result.summary;
  }

  async generateStudyPlan(
    config: DocumentGenerationConfig,
    lessonTitles: string[],
    userId: string,
  ): Promise<GeneratedStudyPlan> {
    const prompt = `Tạo lộ trình học ${lessonTitles.length * 2} ngày cho tài liệu "${config.title}" gồm các bài: ${lessonTitles.join(', ')}.
Trả về CHÍNH XÁC JSON: { "totalDays": number, "days": [{ "day": number, "focus": string, "tasks": string[] }] }`;
    return this.gemini.generateJson(prompt, {
      models: this.models(),
      module: 'document_generation_study_plan',
      userId,
      temperature: 0.5,
    }) as Promise<GeneratedStudyPlan>;
  }

  /** Repair pass — asks Gemini to fix ONLY the fields flagged by the
   * validator, on the existing lesson JSON, rather than regenerating the
   * whole lesson from scratch (spec §15). */
  async repairLesson(
    config: DocumentGenerationConfig,
    lesson: GeneratedLesson,
    issues: string[],
    userId: string,
  ): Promise<GeneratedLesson> {
    const prompt = `Đây là nội dung bài học hiện tại (JSON):
${JSON.stringify(lesson)}

Nội dung này có các lỗi sau cần sửa:
${issues.map((i) => `- ${i}`).join('\n')}

Hãy trả về LẠI TOÀN BỘ object JSON đã được sửa lỗi (giữ nguyên các phần đã đúng, chỉ sửa phần bị lỗi), theo đúng schema GeneratedLesson như ban đầu. Cấp độ: ${config.level}. Không dùng placeholder.`;

    return this.gemini.generateJson(prompt, {
      models: this.models(),
      module: 'document_generation_repair',
      userId,
      temperature: 0.4,
      retries: 2,
    }) as Promise<GeneratedLesson>;
  }
}
