export type SpeakingProcessingQueueData = {
  processingJobId: string;
  sessionId: string;
  answerId: string;
  userId: string;
};

export type SpeakingEvaluationResult = {
  overallScore: number;
  pronunciation: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  confidence: number;
  correctedText: string;
  feedback: string;
  suggestions: string[];
  mistakes: Array<{
    type: 'PRONUNCIATION' | 'GRAMMAR' | 'VOCABULARY' | 'FLUENCY' | 'CONTENT';
    original: string;
    corrected: string;
    explanation: string;
  }>;
  improvedVersion: string;
  nextPractice: {
    focusSkill: string;
    title: string;
    reason: string;
  };
};
