export const settingsKeys = {
  all: ['settings'] as const,
  root: () => [...settingsKeys.all, 'root'] as const,
  learning: () => [...settingsKeys.all, 'learning'] as const,
  notifications: () => [...settingsKeys.all, 'notifications'] as const,
  privacy: () => [...settingsKeys.all, 'privacy'] as const,
};
