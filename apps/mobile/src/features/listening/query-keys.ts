import type { StartListeningInput } from './types/listening';

export const listeningKeys = {
  all: ['listening'] as const,
  home: () => [...listeningKeys.all, 'home'] as const,
  practice: (sessionId?: string | null) => [...listeningKeys.all, 'practice', sessionId ?? 'none'] as const,
  start: (input?: StartListeningInput) => [...listeningKeys.all, 'start', input ?? {}] as const,
  result: (sessionId?: string | null) => [...listeningKeys.all, 'result', sessionId ?? 'none'] as const,
};
