export interface GeneratedOutlineLesson {
  lessonNumber: number;
  title: string;
  vietnameseTitle?: string;
  objectives: string[];
}

export interface GeneratedOutline {
  documentTitle: string;
  summary: string;
  lessons: GeneratedOutlineLesson[];
}

export interface GeneratedVocabularyItem {
  id: string;
  word: string;
  ipa?: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
  exampleTranslation?: string;
}

export interface GeneratedExpression {
  id: string;
  expression: string;
  meaning: string;
  usage: string;
  sampleResponse: string;
}

export interface GeneratedDialogueLine {
  speaker: string;
  english: string;
  translation?: string;
}

export interface GeneratedDialogue {
  context: string;
  participants: string[];
  lines: GeneratedDialogueLine[];
  memorablePhrases: string[];
}

export interface GeneratedGrammar {
  title: string;
  explanation: string;
  structure: string;
  usage: string[];
  examples: Array<{ english: string; translation?: string }>;
  commonMistakes: string[];
}

export type ExerciseType =
  | 'MATCHING'
  | 'MULTIPLE_CHOICE'
  | 'FILL_BLANK'
  | 'ORDERING'
  | 'WRITING'
  | 'SPEAKING'
  | 'DIALOGUE_COMPLETION';

export interface GeneratedExercise {
  id: string;
  type: ExerciseType;
  instruction: string;
  questions: unknown[];
}

export interface GeneratedAnswer {
  exerciseId: string;
  questionId: string;
  answer: unknown;
  explanation?: string;
}

export interface GeneratedLesson {
  lessonNumber: number;
  title: string;
  vietnameseTitle?: string;
  objectives: string[];
  vocabulary: GeneratedVocabularyItem[];
  usefulExpressions: GeneratedExpression[];
  dialogue: GeneratedDialogue;
  grammar: GeneratedGrammar;
  exercises: GeneratedExercise[];
  answers: GeneratedAnswer[];
}

export interface GeneratedFinalTest {
  instructions: string;
  totalScore: number;
  questions: Array<{
    id: string;
    type: ExerciseType;
    prompt: string;
    score: number;
    options?: unknown;
  }>;
  answers: GeneratedAnswer[];
}

export interface GeneratedStudyPlan {
  totalDays: number;
  days: Array<{ day: number; focus: string; tasks: string[] }>;
}

export interface DocumentGenerationConfig {
  title: string;
  englishTitle?: string;
  topic: string;
  description?: string;
  category: string;
  level: string;
  skills: string[];
  targetAudience?: string;
  explanationLanguage: string;
  lessonCount: number;
  vocabularyPerLesson: number;
  estimatedPageCount?: number;
  includeIpa: boolean;
  includeTranslation: boolean;
  includeDialogues: boolean;
  includeGrammar: boolean;
  includeExercises: boolean;
  includeAnswerKey: boolean;
  includeFinalTest: boolean;
  includeStudyPlan: boolean;
  allowDownload: boolean;
  featured: boolean;
  publishMode:
    | 'SAVE_AS_DRAFT'
    | 'REQUIRE_ADMIN_REVIEW'
    | 'PUBLISH_AFTER_APPROVAL';
}

export const GENERATION_PROMPT_VERSION = 'document-generation.v1';
