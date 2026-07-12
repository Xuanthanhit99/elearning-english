import { api } from "./axios";

export type PlacementRetakeStatus = {
  state:
    | 'FIRST_TIME'
    | 'IN_PROGRESS'
    | 'PROCESSING'
    | 'COOLDOWN'
    | 'CAN_RETAKE';

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

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export async function getRetakeStatus() {
  const response = await api.get<
    ApiResponse<PlacementRetakeStatus>
  >('/placement/retake/status');

  return response.data.data;
}

export async function retakePlacement(
  force = false,
) {
  const response = await api.post<
    ApiResponse<{
      reused: boolean;
      testId: string;
      nextUrl: string;
    }>
  >('/placement/retake', {
    force,
  });

  return response.data.data;
}