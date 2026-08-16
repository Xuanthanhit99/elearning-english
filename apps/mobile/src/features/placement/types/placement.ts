export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type PlacementMode = 'ADAPTIVE' | 'LEVEL_BASED';
export type PlacementStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | string;
export type LearningSkill = 'VOCABULARY' | 'GRAMMAR' | 'LISTENING' | 'READING' | 'SPEAKING' | 'WRITING';
export type PlacementQuestionType = 'MULTIPLE_CHOICE' | 'FILL_BLANK' | 'LISTENING' | 'READING' | 'SPEAKING' | 'WRITING';

export type PlacementIntroduction = {
  user: { id: string; name: string; avatar: string | null };
  test: {
    hasActiveSession: boolean;
    sessionId: string | null;
    mode: PlacementMode;
    status: PlacementStatus | null;
    currentStep: string;
    answeredQuestions: number;
  };
  content: {
    title: string;
    description: string;
    adaptive: { title: string; description: string };
    summaryCards: Array<{ key: string; value: string; label: string }>;
    benefits: Array<{ key: string; title: string; description: string }>;
    skills: LearningSkill[];
    steps: Array<{ key: string; order: number; title: string; subtitle: string }>;
    estimatedMinutes: number;
    autosaveMessage: string;
  };
};

export type PlacementRetakeStatus = {
  state: 'FIRST_TIME' | 'IN_PROGRESS' | 'PROCESSING' | 'COOLDOWN' | 'CAN_RETAKE' | string;
  allowed: boolean;
  canForce?: boolean;
  currentTestId: string | null;
  nextUrl: string | null;
  remainingDays?: number;
  recommendedDate?: string | null;
  latestResult?: {
    level: string | null;
    score: number | null;
    completedAt: string | null;
  };
  message: string;
};

export type StartPlacementResult = {
  testId: string;
  sessionId: string;
  resumed: boolean;
  mode: PlacementMode;
  level: CefrLevel | null;
  status: PlacementStatus;
  totalQuestions: number;
  nextUrl: string;
};

export type PlacementOption = {
  key: string;
  text: string;
  translation: string | null;
};

export type PlacementQuestion = {
  id: string;
  testQuestionId: string;
  globalOrder: number;
  sectionOrder: number;
  sectionTotal: number;
  skill: LearningSkill;
  level: CefrLevel;
  type: PlacementQuestionType;
  prompt: string;
  options: PlacementOption[];
  audioUrl: string | null;
  passage: string | null;
  selectedAnswer: string | null;
  isFlagged: boolean;
  isSkipped: boolean;
  spentSeconds?: number;
  adaptiveMessage: string;
};

export type PlacementSession = {
  session: {
    id: string;
    status: PlacementStatus;
    mode: PlacementMode;
    startedAt: string;
    updatedAt: string;
    durationSeconds: number;
    answeredTotal: number;
    totalQuestions: number;
    progressPercent: number;
    isCompleted: boolean;
  };
  user?: { id: string; name: string; avatar: string | null };
  currentQuestion: PlacementQuestion | null;
  sections: Array<{ skill: LearningSkill; total: number; answered: number; status: string }>;
  questionNavigator: Array<{
    id: string;
    order: number;
    skill: LearningSkill;
    answered: boolean;
    skipped: boolean;
    flagged: boolean;
    active: boolean;
  }>;
  autosave: { savedAt: string };
  nextUrl?: string;
};

export type PlacementProcessingSnapshot = {
  status: 'WAITING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  progress: number;
  currentStep: 'ANSWER_ANALYSIS' | 'SKILL_EVALUATION' | 'LEARNING_PATH' | 'QUALITY_CHECK' | null | string;
  estimatedRemainingSeconds: number | null;
  errorMessage: string | null;
  nextUrl: string | null;
  steps: Array<{ key: string; title: string; status: string; progress: number }>;
  skills: Array<{
    skill: LearningSkill;
    status: string;
    progress: number;
    score: number | null;
    level: CefrLevel | null;
    message: string | null;
  }>;
  logs: Array<{ id: string; message: string; status: string; createdAt: string }>;
  insights: string[];
  startedAt: string | null;
  completedAt: string | null;
};

export type PlacementResult = {
  testId: string;
  status: 'DRAFT' | 'READY' | 'FAILED' | string;
  completedAt: string | null;
  generatedAt: string;
  overview: {
    overallScore: number;
    overallLevel: CefrLevel;
    percentile: number | null;
    confidence: number | null;
    summary: string | null;
    strengths: string[];
    improvements: string[];
    projectedLevel: CefrLevel | null;
    projectedWeeksMin: number | null;
    projectedWeeksMax: number | null;
    processedSeconds: number | null;
  };
  analysis: {
    totalQuestions: number;
    speakingCount: number;
    writingCount: number;
  };
  skills: Array<{
    skill: LearningSkill;
    score: number;
    level: string | null;
    status: string;
    rating: number | null;
    label: string | null;
    feedback: string | null;
    strengths: string[];
    improvements: string[];
  }>;
  learningPath: {
    phases: Array<{
      phase: number;
      title: string;
      targetLevel: string | null;
      weeksMin: number;
      weeksMax: number;
      description: string;
      objectives: string[];
      progress: number;
    }>;
    priorities: Array<{ id: string; skill: LearningSkill; priority: number; reason: string }>;
  };
  recommendedCourses: Array<{
    id: string;
    title: string;
    slug: string | null;
    thumbnail: string | null;
    rating: number | null;
    reviews: number | null;
    lessonCount: number | null;
    reason: string;
    order: number;
  }>;
  actions: {
    startLearningUrl: string;
    retryTestUrl: string;
    chooseOtherPathUrl: string;
    detailedAnalysisUrl: string;
  };
};
