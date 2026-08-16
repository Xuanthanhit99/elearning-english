export const placementKeys = {
  all: ['placement'] as const,
  introduction: () => [...placementKeys.all, 'introduction'] as const,
  retakeStatus: () => [...placementKeys.all, 'retake-status'] as const,
  session: (sessionId?: string | null) => [...placementKeys.all, 'session', sessionId ?? 'none'] as const,
  processing: (testId?: string | null) => [...placementKeys.all, 'processing', testId ?? 'none'] as const,
  result: (testId?: string | null) => [...placementKeys.all, 'result', testId ?? 'none'] as const,
};
