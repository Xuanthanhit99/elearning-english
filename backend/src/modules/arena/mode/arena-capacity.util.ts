import { ArenaTeamFormat } from '@prisma/client';

export type ArenaCapacity = { teamSize: number; maxPlayers: number };

/**
 * Canonical capacity per team format — replaces the old private `MODE_SIZE`
 * lookup in `arena.service.ts`. `TOURNAMENT_LEGACY` rooms intentionally stay
 * on their own pre-existing `teamSize`/`maxPlayers` values (never fit this
 * table's 1/2/4/6 shape) and never resolve through here.
 */
export const ARENA_TEAM_FORMAT_CAPACITY: Record<ArenaTeamFormat, ArenaCapacity> = {
  SOLO: { teamSize: 1, maxPlayers: 1 },
  SOLO_1V1: { teamSize: 1, maxPlayers: 2 },
  TEAM_2V2: { teamSize: 2, maxPlayers: 4 },
  TEAM_3V3: { teamSize: 3, maxPlayers: 6 },
};

export function getCapacityForTeamFormat(teamFormat: ArenaTeamFormat): ArenaCapacity {
  return ARENA_TEAM_FORMAT_CAPACITY[teamFormat];
}

export function getRequiredPlayerCount(teamFormat: ArenaTeamFormat): number {
  return ARENA_TEAM_FORMAT_CAPACITY[teamFormat].maxPlayers;
}

type CapacityCheckRoom = { maxPlayers: number; participants: unknown[] };

export function isRoomAtCapacity(room: CapacityCheckRoom): boolean {
  return room.participants.length >= room.maxPlayers;
}

type ReadyCheckRoom = { maxPlayers: number; participants: { ready: boolean }[] };

export function areRequiredPlayersReady(room: ReadyCheckRoom): boolean {
  return (
    room.participants.length >= room.maxPlayers &&
    room.participants.every((participant) => participant.ready)
  );
}

export function canStartRoom(room: ReadyCheckRoom): boolean {
  return areRequiredPlayersReady(room);
}

/** How long a room may sit in PREPARING before the next ready-toggle is allowed to reclaim it (stale-preparation recovery). */
export function getArenaPreparationTimeoutMs(): number {
  const raw = Number(process.env.ARENA_PREPARATION_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 30000;
}

type StaleCheckRoom = { status: string; preparationStartedAt: Date | null };

/** True once a room has sat in PREPARING past the timeout — eligible for the next ready-toggle to reclaim it via `beginRoomCountdown`'s own CAS claim. */
export function isStalePreparingRoom(room: StaleCheckRoom): boolean {
  return (
    room.status === 'PREPARING' &&
    room.preparationStartedAt !== null &&
    room.preparationStartedAt.getTime() < Date.now() - getArenaPreparationTimeoutMs()
  );
}
