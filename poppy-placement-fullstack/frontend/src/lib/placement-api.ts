import api from '@/src/lib/api';

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

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
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
