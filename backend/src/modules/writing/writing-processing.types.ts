export type WritingProcessingQueueData = {
  processingJobId: string;
  sessionId: string;
  userId: string;
};

export type WritingMistake = {
  type: 'GRAMMAR' | 'VOCABULARY' | 'COHERENCE' | 'TASK_RESPONSE' | 'SPELLING';
  original: string;
  corrected: string;
  explanation: string;
};

export type WritingEvaluationResult = {
  overallScore: number;
  grammar: number;
  vocabulary: number;
  coherence: number;
  taskResponse: number;
  correctedEssay: string;
  mistakes: WritingMistake[];
  feedback: string;
  suggestions: string[];
  nextPractice: {
    title: string;
    focusSkill: string;
    reason: string;
  };
};
