import { Injectable } from '@nestjs/common';
import {
  DocumentGenerationConfig,
  GeneratedFinalTest,
  GeneratedLesson,
  GeneratedOutline,
} from './document-generation.types';

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
}

// Placeholder phrases the model sometimes emits instead of real content
// (spec §14). A trailing "..." is only flagged when preceded by one of
// these placeholder-ish cues, not for every ellipsis (which is valid in
// real dialogue).
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /coming soon/i,
  /to be added/i,
  /continue similarly/i,
  /same as above/i,
  /n[ộo]i dung (đang cập nhật|tương tự)/i,
  /s[ẽe] b[ổo] sung/i,
  /h[ãa]y t[ựu] b[ổo] sung/i,
  /\[placeholder\]/i,
  /(tương tự như trên|và tiếp tục như vậy)\s*\.{3}/i,
];

function findPlaceholders(text: string): string[] {
  const found: string[] = [];
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(text)) found.push(pattern.source);
  }
  return found;
}

@Injectable()
export class GenerationValidatorService {
  validateOutline(
    outline: GeneratedOutline,
    config: DocumentGenerationConfig,
  ): ValidationReport {
    const issues: ValidationIssue[] = [];

    if (
      !Array.isArray(outline.lessons) ||
      outline.lessons.length !== config.lessonCount
    ) {
      issues.push({
        code: 'LESSON_COUNT_MISMATCH',
        message: `Outline có ${outline.lessons?.length ?? 0} bài, yêu cầu ${config.lessonCount} bài.`,
      });
    }

    const numbers = new Set<number>();
    for (const lesson of outline.lessons ?? []) {
      if (numbers.has(lesson.lessonNumber)) {
        issues.push({
          code: 'DUPLICATE_LESSON_NUMBER',
          message: `Trùng lessonNumber ${lesson.lessonNumber}.`,
        });
      }
      numbers.add(lesson.lessonNumber);
      if (!lesson.title?.trim()) {
        issues.push({
          code: 'EMPTY_LESSON_TITLE',
          message: `Bài ${lesson.lessonNumber} thiếu tiêu đề.`,
        });
      }
      const placeholders = findPlaceholders(lesson.title ?? '');
      if (placeholders.length) {
        issues.push({
          code: 'PLACEHOLDER_IN_TITLE',
          message: `Bài ${lesson.lessonNumber} chứa placeholder.`,
        });
      }
    }

    return { valid: issues.length === 0, issues };
  }

  validateLesson(
    lesson: GeneratedLesson,
    config: DocumentGenerationConfig,
  ): ValidationReport {
    const issues: ValidationIssue[] = [];
    const push = (code: string, message: string) =>
      issues.push({ code, message });

    if (!lesson.title?.trim())
      push('EMPTY_LESSON_TITLE', 'Tiêu đề bài học rỗng.');
    for (const field of [
      lesson.title,
      lesson.grammar?.explanation,
      lesson.dialogue?.context,
    ]) {
      if (field && findPlaceholders(field).length)
        push(
          'PLACEHOLDER_DETECTED',
          `Phát hiện placeholder: "${field.slice(0, 80)}"`,
        );
    }

    if (
      !Array.isArray(lesson.vocabulary) ||
      lesson.vocabulary.length !== config.vocabularyPerLesson
    ) {
      push(
        'VOCABULARY_COUNT_MISMATCH',
        `Có ${lesson.vocabulary?.length ?? 0} từ vựng, yêu cầu ${config.vocabularyPerLesson}.`,
      );
    }
    const vocabIds = new Set<string>();
    for (const item of lesson.vocabulary ?? []) {
      if (!item.id) push('VOCAB_MISSING_ID', 'Từ vựng thiếu ID.');
      if (vocabIds.has(item.id))
        push('VOCAB_DUPLICATE_ID', `Trùng ID từ vựng: ${item.id}`);
      vocabIds.add(item.id);
      if (
        !item.word?.trim() ||
        !item.meaning?.trim() ||
        !item.example?.trim()
      ) {
        push(
          'VOCAB_MISSING_FIELD',
          `Từ vựng ${item.id ?? '?'} thiếu trường bắt buộc.`,
        );
      }
      if (config.includeIpa && !item.ipa?.trim())
        push('VOCAB_MISSING_IPA', `Từ vựng ${item.id} thiếu IPA.`);
      if (config.includeTranslation && !item.exampleTranslation?.trim()) {
        push(
          'VOCAB_MISSING_TRANSLATION',
          `Từ vựng ${item.id} thiếu bản dịch ví dụ.`,
        );
      }
    }

    if (config.includeDialogues) {
      if (
        !lesson.dialogue ||
        !Array.isArray(lesson.dialogue.lines) ||
        lesson.dialogue.lines.length < 4
      ) {
        push('DIALOGUE_TOO_SHORT', 'Hội thoại cần tối thiểu 4 lượt trao đổi.');
      }
    }

    if (config.includeGrammar && !lesson.grammar?.explanation?.trim()) {
      push('MISSING_GRAMMAR', 'Thiếu phần giải thích ngữ pháp.');
    }

    if (config.includeExercises) {
      if (!Array.isArray(lesson.exercises) || lesson.exercises.length === 0) {
        push('MISSING_EXERCISES', 'Thiếu bài tập.');
      } else {
        this.validateExerciseAnswerConsistency(
          lesson.exercises,
          lesson.answers ?? [],
          config,
          push,
        );
      }
    }

    return { valid: issues.length === 0, issues };
  }

  validateFinalTest(
    test: GeneratedFinalTest,
    config: DocumentGenerationConfig,
  ): ValidationReport {
    const issues: ValidationIssue[] = [];
    const push = (code: string, message: string) =>
      issues.push({ code, message });

    if (!Array.isArray(test.questions) || test.questions.length === 0) {
      push('EMPTY_FINAL_TEST', 'Bài kiểm tra cuối khoá không có câu hỏi.');
    }
    const sumScore = (test.questions ?? []).reduce(
      (acc, q) => acc + (Number(q.score) || 0),
      0,
    );
    if (test.totalScore && Math.abs(sumScore - test.totalScore) > 0.01) {
      push(
        'FINAL_TEST_SCORE_MISMATCH',
        `Tổng điểm các câu (${sumScore}) không khớp totalScore (${test.totalScore}).`,
      );
    }
    if (config.includeAnswerKey) {
      const questionIds = new Set((test.questions ?? []).map((q) => q.id));
      const answerIds = new Set((test.answers ?? []).map((a) => a.questionId));
      for (const id of questionIds) {
        if (!answerIds.has(id))
          push('FINAL_TEST_MISSING_ANSWER', `Câu hỏi ${id} thiếu đáp án.`);
      }
      for (const id of answerIds) {
        if (!questionIds.has(id))
          push(
            'FINAL_TEST_ORPHAN_ANSWER',
            `Đáp án thừa cho câu hỏi không tồn tại: ${id}.`,
          );
      }
    }

    return { valid: issues.length === 0, issues };
  }

  private validateExerciseAnswerConsistency(
    exercises: GeneratedLesson['exercises'],
    answers: GeneratedLesson['answers'],
    config: DocumentGenerationConfig,
    push: (code: string, message: string) => void,
  ) {
    const questionIds = new Set<string>();
    for (const exercise of exercises) {
      if (!Array.isArray(exercise.questions)) continue;
      for (const question of exercise.questions as Array<{ id?: string }>) {
        if (!question.id) {
          push(
            'QUESTION_MISSING_ID',
            `Câu hỏi trong bài tập ${exercise.id} thiếu ID ổn định.`,
          );
          continue;
        }
        if (questionIds.has(question.id))
          push('DUPLICATE_QUESTION_ID', `Trùng questionId: ${question.id}`);
        questionIds.add(question.id);
      }
    }

    if (!config.includeAnswerKey) return;

    const answerKeys = new Set(answers.map((a) => a.questionId));
    for (const id of questionIds) {
      if (!answerKeys.has(id))
        push(
          'MISSING_ANSWER_FOR_QUESTION',
          `Câu hỏi ${id} không có đáp án tương ứng.`,
        );
    }
    for (const answer of answers) {
      if (!questionIds.has(answer.questionId)) {
        push(
          'ORPHAN_ANSWER',
          `Đáp án tham chiếu questionId không tồn tại: ${answer.questionId}`,
        );
      }
    }
  }
}
