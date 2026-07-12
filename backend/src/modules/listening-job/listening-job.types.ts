export type ListeningGenerationConfig = {
  level: string;
  topic: string;
};

export type GeneratedListeningOption = {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
};

export type GeneratedListeningQuestion = {
  transcript: string;
  question: string;
  options: GeneratedListeningOption[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  duration?: number;
};

export type GenerateBatchJobData = {
  level: string;
  topic: string;
  count: number;
};

export type GenerateAudioJobData = {
  questionId: string;
  transcript: string;
};
