import { BadRequestException, ConflictException } from '@nestjs/common';
import { ArenaMode, ArenaTeamFormat } from '@prisma/client';

export type ResolvedArenaMode = { mode: ArenaMode; teamFormat: ArenaTeamFormat };

/**
 * Maps a legacy `gameMode` string to the canonical mode/team-format pair.
 * `SOLO_1V1`/`TEAM_2V2`/`TEAM_3V3` were the only gameplay-live legacy modes
 * (ELO has always applied unconditionally) -> RANKED. `TOURNAMENT` ->
 * TOURNAMENT_LEGACY/SOLO (compatibility tag only — capacity for that mode
 * stays on the room's own legacy teamSize/maxPlayers, never routed through
 * `arena-capacity.util.ts`). Returns null for anything unrecognized —
 * callers must not guess.
 */
export function mapLegacyGameMode(gameMode: string): ResolvedArenaMode | null {
  switch (gameMode) {
    case 'SOLO_1V1':
      return { mode: 'RANKED', teamFormat: 'SOLO_1V1' };
    case 'TEAM_2V2':
      return { mode: 'RANKED', teamFormat: 'TEAM_2V2' };
    case 'TEAM_3V3':
      return { mode: 'RANKED', teamFormat: 'TEAM_3V3' };
    case 'TOURNAMENT':
      return { mode: 'TOURNAMENT_LEGACY', teamFormat: 'SOLO' };
    default:
      return null;
  }
}

/**
 * Canonical mode/team-format for a room: prefers the new columns, falls
 * back to legacy `gameMode` mapping for rows created before this migration.
 * Throws only if genuinely unresolvable (should not happen for any row that
 * passed `ArenaService`'s own create/join validation).
 */
export function resolveArenaMode(room: {
  mode: ArenaMode | null;
  teamFormat: ArenaTeamFormat | null;
  gameMode: string;
}): ResolvedArenaMode {
  if (room.mode && room.teamFormat) {
    return { mode: room.mode, teamFormat: room.teamFormat };
  }
  const legacy = mapLegacyGameMode(room.gameMode);
  if (!legacy) {
    throw new Error(`Cannot resolve Arena mode/team-format for gameMode="${room.gameMode}"`);
  }
  return legacy;
}

/**
 * Resolves a create-room/enter-queue request's mode/team-format from
 * whichever representation the client sent. Both DTOs accept the legacy
 * `gameMode` string and/or the canonical `mode`+`teamFormat` pair — this is
 * the single place that decides what to trust:
 *  - only legacy supplied -> mapped via `mapLegacyGameMode`.
 *  - only canonical supplied -> used directly (both fields required together).
 *  - both supplied and they agree -> used directly.
 *  - both supplied and they disagree -> rejected (never silently pick one).
 *  - neither supplied -> rejected.
 */
export function resolveRequestedArenaMode(input: {
  gameMode?: string;
  mode?: ArenaMode;
  teamFormat?: ArenaTeamFormat;
}): ResolvedArenaMode {
  const hasCanonical = Boolean(input.mode || input.teamFormat);
  const hasLegacy = Boolean(input.gameMode);

  if (hasCanonical && (!input.mode || !input.teamFormat)) {
    throw new BadRequestException('Cần cung cấp đủ cả mode và teamFormat.');
  }
  if (!hasCanonical && !hasLegacy) {
    throw new BadRequestException(
      'Thiếu thông tin chế độ chơi (mode/teamFormat hoặc gameMode).',
    );
  }

  const legacyResolved = hasLegacy ? mapLegacyGameMode(input.gameMode!) : null;
  if (hasLegacy && !legacyResolved) {
    throw new BadRequestException(`gameMode "${input.gameMode}" không hợp lệ.`);
  }

  if (hasCanonical && hasLegacy) {
    const conflicts =
      !legacyResolved ||
      legacyResolved.mode !== input.mode ||
      legacyResolved.teamFormat !== input.teamFormat;
    if (conflicts) {
      throw new ConflictException(
        'mode/teamFormat và gameMode xung đột nhau — vui lòng chỉ gửi một trong hai.',
      );
    }
    return { mode: input.mode!, teamFormat: input.teamFormat! };
  }

  if (hasCanonical) {
    return { mode: input.mode!, teamFormat: input.teamFormat! };
  }

  return legacyResolved!;
}
