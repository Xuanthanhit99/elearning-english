export const socketNamespaces = {
  notifications: '/notifications',
  community: '/community',
  leaderboard: '/leaderboard',
  arena: '/arena',
} as const;

export type SocketNamespace = (typeof socketNamespaces)[keyof typeof socketNamespaces];
