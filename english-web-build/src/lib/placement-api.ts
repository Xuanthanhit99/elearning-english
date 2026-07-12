import { api } from "./axios";

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type PlacementMethod = 'TEST' | 'CERTIFICATE' | 'MANUAL';
export type PlacementStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type PlacementSkill = {
  skill:
    | 'VOCABULARY'
    | 'GRAMMAR'
    | 'LISTENING'
    | 'READING'
    | 'SPEAKING'
    | 'WRITING';
  level: CefrLevel;
  score: number | null;
};

export type PlacementHomeData = {
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  placement: {
    status: PlacementStatus;
    method: PlacementMethod | null;
    overallLevel: CefrLevel | null;
    completedAt: string | null;
    skillLevels: PlacementSkill[];
  };
  options: {
    recommendedMethod: PlacementMethod;
    testDurationMinutes: {
      min: number;
      max: number;
    };
    supportedCertificates: string[];
    cefrLevels: CefrLevel[];
  };
};

export async function getPlacementHome(): Promise<PlacementHomeData> {
  const response = await api.get<ApiResponse<PlacementHomeData>>(
    '/placement/home',
  );

  return response.data.data;
}

export async function selectManualLevel(level: CefrLevel) {
  const response = await api.post<
    ApiResponse<{
      placementId: string;
      method: PlacementMethod;
      status: PlacementStatus;
      overallLevel: CefrLevel;
      nextUrl: string;
    }>
  >('/placement/manual', { level });

  return response.data.data;
}

//introduction
export type PlacementStepKey =
  | 'INTRODUCTION'
  | 'VOCABULARY'
  | 'GRAMMAR'
  | 'LISTENING'
  | 'READING'
  | 'SPEAKING'
  | 'WRITING'
  | 'RESULT';

export type PlacementIntroductionData = {
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  test: {
    hasActiveSession: boolean;
    sessionId: string | null;
    mode: 'LEVEL_BASED' | 'ADAPTIVE';
    status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | null;
    currentStep: PlacementStepKey;
    answeredQuestions: number;
  };
  content: {
    title: string;
    description: string;
    adaptive: {
      title: string;
      description: string;
    };
    summaryCards: Array<{
      key: 'TIME' | 'QUESTIONS' | 'SPEAKING' | 'WRITING';
      value: string;
      label: string;
    }>;
    benefits: Array<{
      key: 'ADAPTIVE' | 'AI' | 'RETRY' | 'NO_RANK';
      title: string;
      description: string;
    }>;
    skills: Array<
      | 'VOCABULARY'
      | 'GRAMMAR'
      | 'LISTENING'
      | 'READING'
      | 'SPEAKING'
      | 'WRITING'
    >;
    steps: Array<{
      key: PlacementStepKey;
      order: number;
      title: string;
      subtitle: string;
    }>;
    estimatedMinutes: number;
    autosaveMessage: string;
  };
};

export async function getPlacementIntroduction() {
  const response = await api.get<ApiResponse<PlacementIntroductionData>>(
    '/placement/introduction',
  );

  return response.data.data;
}

export async function startPlacementTest() {
  const response = await api.post<
    ApiResponse<{
      sessionId: string;
      resumed: boolean;
      status: 'IN_PROGRESS';
      mode: 'LEVEL_BASED' | 'ADAPTIVE';
      nextUrl: string;
    }>
  >('/placement/session/start', {
    mode: 'ADAPTIVE',
  });

  return response.data.data;
}

export type LearningSkill =
  | 'VOCABULARY'
  | 'GRAMMAR'
  | 'LISTENING'
  | 'READING'
  | 'SPEAKING'
  | 'WRITING';

export type PlacementOption = {
  key: string;
  text: string;
  translation: string | null;
};

export type PlacementTestScreenData = {
  session: {
    id: string;
    status: 'IN_PROGRESS';
    mode: 'LEVEL_BASED' | 'ADAPTIVE';
    startedAt: string;
    updatedAt: string;
    durationSeconds: number;
    answeredTotal: number;
    totalQuestions: number;
    progressPercent: number;
    isCompleted: boolean;
  };

  user?: {
    id: string;
    name: string;
    avatar: string | null;
  };

  currentQuestion: {
    id: string;
    testQuestionId: string;
    globalOrder: number;
    sectionOrder: number;
    sectionTotal: number;
    skill: LearningSkill;
    level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    type:
      | 'MULTIPLE_CHOICE'
      | 'FILL_BLANK'
      | 'LISTENING'
      | 'READING'
      | 'SPEAKING'
      | 'WRITING';
    prompt: string;
    options: PlacementOption[];
    audioUrl: string | null;
    passage: string | null;
    selectedAnswer: string | null;
    isFlagged: boolean;
    isSkipped: boolean;
    adaptiveMessage: string;
  } | null;

  sections: Array<{
    skill: LearningSkill;
    total: number;
    answered: number;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  }>;

  questionNavigator: Array<{
    id: string;
    order: number;
    skill: LearningSkill;
    answered: boolean;
    skipped: boolean;
    flagged: boolean;
    active: boolean;
  }>;

  autosave: {
    savedAt: string;
  };

  nextUrl?: string;

  // các field còn lại...
};
type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export async function getPlacementTest(sessionId: string) {
  const response = await api.get<ApiResponse<PlacementTestScreenData>>(
    `/placement-test/${sessionId}`,
  );

  return response.data.data;
}

export async function answerPlacementQuestion(
  sessionId: string,
  payload: {
    questionId: string;
    answer: string;
    spentSeconds: number;
  },
) {
  const response = await api.post<ApiResponse<PlacementTestScreenData>>(
    `/placement-test/${sessionId}/answer`,
    payload,
  );

  return response.data.data;
}

export async function flagPlacementQuestion(
  sessionId: string,
  payload: {
    questionId: string;
    isFlagged: boolean;
  },
) {
  const response = await api.post<
    ApiResponse<{
      questionId: string;
      isFlagged: boolean;
      savedAt: string;
    }>
  >(`/placement-test/${sessionId}/flag`, payload);

  return response.data.data;
}

export async function skipPlacementQuestion(
  sessionId: string,
  payload: {
    questionId: string;
    spentSeconds: number;
  },
) {
  const response = await api.post<ApiResponse<PlacementTestScreenData>>(
    `/placement-test/${sessionId}/skip`,
    payload,
  );

  return response.data.data;
}
