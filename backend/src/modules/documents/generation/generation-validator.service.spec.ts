import { GenerationValidatorService } from './generation-validator.service';
import {
  DocumentGenerationConfig,
  GeneratedLesson,
  GeneratedOutline,
} from './document-generation.types';

function baseConfig(
  overrides: Partial<DocumentGenerationConfig> = {},
): DocumentGenerationConfig {
  return {
    title: 'Business English Basics',
    topic: 'Business English',
    category: 'business-english',
    level: 'B1',
    skills: ['speaking'],
    explanationLanguage: 'vi',
    lessonCount: 2,
    vocabularyPerLesson: 2,
    includeIpa: true,
    includeTranslation: true,
    includeDialogues: true,
    includeGrammar: true,
    includeExercises: true,
    includeAnswerKey: true,
    includeFinalTest: true,
    includeStudyPlan: false,
    allowDownload: true,
    featured: false,
    publishMode: 'REQUIRE_ADMIN_REVIEW',
    ...overrides,
  };
}

function validLesson(
  overrides: Partial<GeneratedLesson> = {},
): GeneratedLesson {
  return {
    lessonNumber: 1,
    title: 'Meeting people',
    objectives: ['Greet colleagues'],
    vocabulary: [
      {
        id: 'l1-v1',
        word: 'meeting',
        ipa: '/ˈmiːtɪŋ/',
        partOfSpeech: 'noun',
        meaning: 'cuộc họp',
        example: 'We have a meeting.',
        exampleTranslation: 'Chúng tôi có một cuộc họp.',
      },
      {
        id: 'l1-v2',
        word: 'colleague',
        ipa: '/ˈkɒliːɡ/',
        partOfSpeech: 'noun',
        meaning: 'đồng nghiệp',
        example: 'She is my colleague.',
        exampleTranslation: 'Cô ấy là đồng nghiệp của tôi.',
      },
    ],
    usefulExpressions: [],
    dialogue: {
      context: 'First day at work',
      participants: ['A', 'B'],
      lines: [
        { speaker: 'A', english: 'Hi, nice to meet you.' },
        { speaker: 'B', english: 'Nice to meet you too.' },
        { speaker: 'A', english: 'Welcome to the team.' },
        { speaker: 'B', english: 'Thank you!' },
      ],
      memorablePhrases: ['Nice to meet you'],
    },
    grammar: {
      title: 'Present simple',
      explanation: 'Used for facts and routines.',
      structure: 'Subject + verb (+s)',
      usage: ['facts'],
      examples: [{ english: 'She works here.' }],
      commonMistakes: ['Forgetting the -s in third person'],
    },
    exercises: [
      {
        id: 'l1-e1',
        type: 'MULTIPLE_CHOICE',
        instruction: 'Choose the correct answer',
        questions: [{ id: 'l1-e1-q1', prompt: 'What does "meeting" mean?' }],
      },
    ],
    answers: [
      { exerciseId: 'l1-e1', questionId: 'l1-e1-q1', answer: 'cuộc họp' },
    ],
    ...overrides,
  };
}

describe('GenerationValidatorService', () => {
  const validator = new GenerationValidatorService();

  describe('validateOutline', () => {
    it('accepts an outline whose lesson count matches config', () => {
      const outline: GeneratedOutline = {
        documentTitle: 'X',
        summary: 'Y',
        lessons: [
          { lessonNumber: 1, title: 'A', objectives: ['x'] },
          { lessonNumber: 2, title: 'B', objectives: ['y'] },
        ],
      };
      const report = validator.validateOutline(outline, baseConfig());
      expect(report.valid).toBe(true);
    });

    it('rejects a lesson count mismatch', () => {
      const outline: GeneratedOutline = {
        documentTitle: 'X',
        summary: 'Y',
        lessons: [{ lessonNumber: 1, title: 'A', objectives: ['x'] }],
      };
      const report = validator.validateOutline(outline, baseConfig());
      expect(report.valid).toBe(false);
      expect(
        report.issues.some((i) => i.code === 'LESSON_COUNT_MISMATCH'),
      ).toBe(true);
    });

    it('rejects duplicate lesson numbers', () => {
      const outline: GeneratedOutline = {
        documentTitle: 'X',
        summary: 'Y',
        lessons: [
          { lessonNumber: 1, title: 'A', objectives: ['x'] },
          { lessonNumber: 1, title: 'B', objectives: ['y'] },
        ],
      };
      const report = validator.validateOutline(outline, baseConfig());
      expect(
        report.issues.some((i) => i.code === 'DUPLICATE_LESSON_NUMBER'),
      ).toBe(true);
    });
  });

  describe('validateLesson', () => {
    it('accepts a fully valid lesson', () => {
      const report = validator.validateLesson(validLesson(), baseConfig());
      expect(report.valid).toBe(true);
    });

    it('detects placeholder text (TODO)', () => {
      const lesson = validLesson({ title: 'Meeting people TODO' });
      const report = validator.validateLesson(lesson, baseConfig());
      expect(report.issues.some((i) => i.code === 'PLACEHOLDER_DETECTED')).toBe(
        true,
      );
    });

    it('detects "sẽ bổ sung" placeholder in Vietnamese', () => {
      const lesson = validLesson();
      lesson.grammar.explanation = 'Nội dung sẽ bổ sung sau.';
      const report = validator.validateLesson(lesson, baseConfig());
      expect(report.issues.some((i) => i.code === 'PLACEHOLDER_DETECTED')).toBe(
        true,
      );
    });

    it('does not flag a legitimate ellipsis in dialogue', () => {
      const lesson = validLesson();
      lesson.dialogue.context = 'A pauses mid-sentence... then continues.';
      const report = validator.validateLesson(lesson, baseConfig());
      expect(report.issues.some((i) => i.code === 'PLACEHOLDER_DETECTED')).toBe(
        false,
      );
    });

    it('rejects vocabulary count mismatch', () => {
      const lesson = validLesson();
      lesson.vocabulary = lesson.vocabulary.slice(0, 1);
      const report = validator.validateLesson(lesson, baseConfig());
      expect(
        report.issues.some((i) => i.code === 'VOCABULARY_COUNT_MISMATCH'),
      ).toBe(true);
    });

    it('rejects duplicate vocabulary IDs', () => {
      const lesson = validLesson();
      lesson.vocabulary[1] = {
        ...lesson.vocabulary[1],
        id: lesson.vocabulary[0].id,
      };
      const report = validator.validateLesson(lesson, baseConfig());
      expect(report.issues.some((i) => i.code === 'VOCAB_DUPLICATE_ID')).toBe(
        true,
      );
    });

    it('rejects a vocabulary item missing IPA when config requires it', () => {
      const lesson = validLesson();
      lesson.vocabulary[0] = { ...lesson.vocabulary[0], ipa: '' };
      const report = validator.validateLesson(lesson, baseConfig());
      expect(report.issues.some((i) => i.code === 'VOCAB_MISSING_IPA')).toBe(
        true,
      );
    });

    it('rejects a dialogue shorter than 4 turns when dialogues are required', () => {
      const lesson = validLesson();
      lesson.dialogue.lines = lesson.dialogue.lines.slice(0, 2);
      const report = validator.validateLesson(lesson, baseConfig());
      expect(report.issues.some((i) => i.code === 'DIALOGUE_TOO_SHORT')).toBe(
        true,
      );
    });

    it('rejects a question with no ID', () => {
      const lesson = validLesson();
      lesson.exercises[0].questions = [{ prompt: 'no id here' }];
      const report = validator.validateLesson(lesson, baseConfig());
      expect(report.issues.some((i) => i.code === 'QUESTION_MISSING_ID')).toBe(
        true,
      );
    });

    it('rejects a question missing its answer', () => {
      const lesson = validLesson();
      lesson.answers = [];
      const report = validator.validateLesson(lesson, baseConfig());
      expect(
        report.issues.some((i) => i.code === 'MISSING_ANSWER_FOR_QUESTION'),
      ).toBe(true);
    });

    it('rejects an orphan answer referencing a non-existent question', () => {
      const lesson = validLesson();
      lesson.answers = [
        ...lesson.answers,
        { exerciseId: 'l1-e1', questionId: 'does-not-exist', answer: 'x' },
      ];
      const report = validator.validateLesson(lesson, baseConfig());
      expect(report.issues.some((i) => i.code === 'ORPHAN_ANSWER')).toBe(true);
    });
  });

  describe('validateFinalTest', () => {
    it('rejects a totalScore that does not match the sum of question scores', () => {
      const report = validator.validateFinalTest(
        {
          instructions: 'Do the test',
          totalScore: 100,
          questions: [
            { id: 'q1', type: 'MULTIPLE_CHOICE', prompt: 'x', score: 10 },
          ],
          answers: [
            { exerciseId: 'final-test', questionId: 'q1', answer: 'x' },
          ],
        },
        baseConfig(),
      );
      expect(
        report.issues.some((i) => i.code === 'FINAL_TEST_SCORE_MISMATCH'),
      ).toBe(true);
    });

    it('accepts a final test whose totalScore matches and all questions are answered', () => {
      const report = validator.validateFinalTest(
        {
          instructions: 'Do the test',
          totalScore: 10,
          questions: [
            { id: 'q1', type: 'MULTIPLE_CHOICE', prompt: 'x', score: 10 },
          ],
          answers: [
            { exerciseId: 'final-test', questionId: 'q1', answer: 'x' },
          ],
        },
        baseConfig(),
      );
      expect(report.valid).toBe(true);
    });
  });
});
