export function getArenaDisconnectGraceMs(): number {
  const raw = Number(process.env.ARENA_DISCONNECT_GRACE_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 30000;
}

export function arenaUserChannel(userId: string) {
  return `arena:user:${userId}`;
}

export function arenaRoomChannel(roomId: string) {
  return `arena:room:${roomId}`;
}
