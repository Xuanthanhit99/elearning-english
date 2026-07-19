import api from '../api/axiosClient';

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
  };
  user: {
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
  };
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
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export async function getPlacementTest(sessionId: string) {
  const response = await api.get<ApiResponse<PlacementTestScreenData>>(
    `/placement/tests/${sessionId}`,
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
    `/placement/tests/${sessionId}/answer`,
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
  >(`/placement/tests/${sessionId}/flag`, payload);

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
    `/placement/tests/${sessionId}/skip`,
    payload,
  );

  return response.data.data;
}
