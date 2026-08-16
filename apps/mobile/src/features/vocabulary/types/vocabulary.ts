export type VocabularyStatus = 'NEW' | 'LEARNING' | 'KNOWN' | 'REVIEW' | 'MASTERED';

export type VocabularyWord = {
  id: string;
  word: string;
  phonetic?: string | null;
  audio?: string | null;
  imageUrl?: string | null;
  partOfSpeech?: string | null;
  meaningVi?: string | null;
  meaningEn?: string | null;
  example?: string | null;
  level?: string | null;
  difficulty?: number | null;
  topic?: { id: string; name: string; description?: string | null } | null;
};

export type UserWordProgress = {
  id?: string;
  wordId?: string;
  status: VocabularyStatus;
  seenCount?: number;
  correctCount?: number;
  wrongCount?: number;
  reviewAt?: string | null;
  learnedAt?: string | null;
  masteredAt?: string | null;
};

export type DailyWordItem = {
  id: string;
  wordId: string;
  order: number;
  word: VocabularyWord;
  progress?: UserWordProgress | null;
  inNotebook?: boolean;
};

export type TodayVocabulary = {
  locked?: boolean;
  completed?: boolean;
  reason?: string;
  id?: string;
  status?: string;
  date?: string;
  topic?: { id: string; name: string; description?: string | null } | null;
  words?: DailyWordItem[];
};

export type DailyVocabularyWords = TodayVocabulary & {
  id: string;
  words: DailyWordItem[];
};

export type VocabularyStats = {
  totalWords: number;
  learnedWords: number;
  masteredWords: number;
  reviewDue: number;
  notebookWords: number;
  testsTaken: number;
  memoryRate: number;
};

export type WordProgressResult = UserWordProgress & {
  missionProgressUpdated?: boolean;
};

export type CompleteDailyVocabularyResult = DailyVocabularyWords & {
  completed: true;
  alreadyCompleted: boolean;
};
