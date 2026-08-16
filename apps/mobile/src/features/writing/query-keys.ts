export const writingKeys = {
  all: ['writing'] as const,
  home: () => [...writingKeys.all, 'home'] as const,
  session: (sessionId?: string | null) => [...writingKeys.all, 'session', sessionId ?? 'none'] as const,
  status: (sessionId?: string | null) => [...writingKeys.all, 'status', sessionId ?? 'none'] as const,
  result: (sessionId?: string | null) => [...writingKeys.all, 'result', sessionId ?? 'none'] as const,
};
