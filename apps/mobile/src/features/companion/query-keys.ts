export const companionKeys = {
  all: ['companion'] as const,
  pet: () => [...companionKeys.all, 'pet'] as const,
  conversations: () => [...companionKeys.all, 'sessions'] as const,
  messages: (sessionId?: string | null) => [...companionKeys.all, 'messages', sessionId ?? 'none'] as const,
  generation: (sessionId?: string | null) => [...companionKeys.all, 'generation', sessionId ?? 'none'] as const,
};
