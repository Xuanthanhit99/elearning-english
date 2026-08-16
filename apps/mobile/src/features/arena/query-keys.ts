export const arenaKeys = {
  all: ['arena'] as const,
  lobby: () => [...arenaKeys.all, 'lobby'] as const,
  season: () => [...arenaKeys.all, 'season'] as const,
  room: (roomId?: string | null) => [...arenaKeys.all, 'room', roomId ?? 'none'] as const,
};
