export const securityKeys = {
  all: ['security'] as const,
  sessions: () => [...securityKeys.all, 'sessions'] as const,
};
