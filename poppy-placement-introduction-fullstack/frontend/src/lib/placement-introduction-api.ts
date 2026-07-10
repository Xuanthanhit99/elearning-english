import api from '@/src/lib/api';

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

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
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
  >('/placement/start', {
    mode: 'ADAPTIVE',
  });

  return response.data.data;
}
