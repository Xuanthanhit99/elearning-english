import { mapLegacyGameMode, resolveArenaMode, resolveRequestedArenaMode } from './arena-mode-resolver.util';
import { getModeCapability } from './arena-mode.registry';
import {
  areRequiredPlayersReady,
  getRequiredPlayerCount,
  isRoomAtCapacity,
} from './arena-capacity.util';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('mapLegacyGameMode', () => {
  it('maps legacy SOLO_1V1/TEAM_2V2/TEAM_3V3 to RANKED with the matching team format', () => {
    expect(mapLegacyGameMode('SOLO_1V1')).toEqual({ mode: 'RANKED', teamFormat: 'SOLO_1V1' });
    expect(mapLegacyGameMode('TEAM_2V2')).toEqual({ mode: 'RANKED', teamFormat: 'TEAM_2V2' });
    expect(mapLegacyGameMode('TEAM_3V3')).toEqual({ mode: 'RANKED', teamFormat: 'TEAM_3V3' });
  });

  it('maps legacy TOURNAMENT to TOURNAMENT_LEGACY/SOLO', () => {
    expect(mapLegacyGameMode('TOURNAMENT')).toEqual({ mode: 'TOURNAMENT_LEGACY', teamFormat: 'SOLO' });
  });

  it('returns null for an unrecognized legacy value instead of guessing', () => {
    expect(mapLegacyGameMode('NOT_A_REAL_MODE')).toBeNull();
  });
});

describe('resolveArenaMode', () => {
  it('prefers the canonical mode/teamFormat columns when both are set', () => {
    const resolved = resolveArenaMode({
      mode: 'FRIEND_CHALLENGE',
      teamFormat: 'SOLO_1V1',
      gameMode: 'SOLO_1V1', // would map to RANKED if used — canonical columns win
    });
    expect(resolved).toEqual({ mode: 'FRIEND_CHALLENGE', teamFormat: 'SOLO_1V1' });
  });

  it('falls back to legacy gameMode mapping when the canonical columns are null (pre-migration rows)', () => {
    const resolved = resolveArenaMode({ mode: null, teamFormat: null, gameMode: 'TEAM_2V2' });
    expect(resolved).toEqual({ mode: 'RANKED', teamFormat: 'TEAM_2V2' });
  });
});

describe('resolveRequestedArenaMode', () => {
  it('resolves from legacy gameMode alone', () => {
    expect(resolveRequestedArenaMode({ gameMode: 'SOLO_1V1' })).toEqual({
      mode: 'RANKED',
      teamFormat: 'SOLO_1V1',
    });
  });

  it('resolves from canonical mode+teamFormat alone', () => {
    expect(
      resolveRequestedArenaMode({ mode: 'FRIEND_CHALLENGE', teamFormat: 'SOLO_1V1' }),
    ).toEqual({ mode: 'FRIEND_CHALLENGE', teamFormat: 'SOLO_1V1' });
  });

  it('accepts both when they agree', () => {
    expect(
      resolveRequestedArenaMode({
        gameMode: 'SOLO_1V1',
        mode: 'RANKED',
        teamFormat: 'SOLO_1V1',
      }),
    ).toEqual({ mode: 'RANKED', teamFormat: 'SOLO_1V1' });
  });

  it('rejects with ConflictException when both are supplied and disagree', () => {
    expect(() =>
      resolveRequestedArenaMode({
        gameMode: 'SOLO_1V1', // -> RANKED/SOLO_1V1
        mode: 'FRIEND_CHALLENGE',
        teamFormat: 'SOLO_1V1',
      }),
    ).toThrow(ConflictException);
  });

  it('rejects when neither representation is supplied', () => {
    expect(() => resolveRequestedArenaMode({})).toThrow(BadRequestException);
  });

  it('rejects a partial canonical pair (mode without teamFormat)', () => {
    expect(() => resolveRequestedArenaMode({ mode: 'RANKED' })).toThrow(BadRequestException);
  });

  it('rejects an unrecognized legacy gameMode', () => {
    expect(() => resolveRequestedArenaMode({ gameMode: 'NOT_REAL' })).toThrow(BadRequestException);
  });
});

describe('ARENA_MODE_CAPABILITIES (registry)', () => {
  it('RANKED affects ELO and supports battle mechanics + power-ups', () => {
    const cap = getModeCapability('RANKED');
    expect(cap.enabled).toBe(true);
    expect(cap.affectsElo).toBe(true);
    expect(cap.supportsBattleMechanics).toBe(true);
    expect(cap.supportedTeamFormats).toEqual(
      expect.arrayContaining(['SOLO_1V1', 'TEAM_2V2', 'TEAM_3V3']),
    );
  });

  it('FRIEND_CHALLENGE never affects ELO and requires private rooms only via ArenaService, but the registry itself allows private rooms', () => {
    const cap = getModeCapability('FRIEND_CHALLENGE');
    expect(cap.enabled).toBe(true);
    expect(cap.affectsElo).toBe(false);
    expect(cap.supportsPublicMatchmaking).toBe(false);
    expect(cap.supportsPrivateRooms).toBe(true);
  });

  it('AI_PRACTICE, SURVIVAL, BLITZ are disabled', () => {
    expect(getModeCapability('AI_PRACTICE').enabled).toBe(false);
    expect(getModeCapability('SURVIVAL').enabled).toBe(false);
    expect(getModeCapability('BLITZ').enabled).toBe(false);
  });

  it('TOURNAMENT_LEGACY is disabled for new matchmaking (compatibility only)', () => {
    const cap = getModeCapability('TOURNAMENT_LEGACY');
    expect(cap.enabled).toBe(false);
    expect(cap.supportsPublicMatchmaking).toBe(false);
  });
});

describe('arena-capacity.util', () => {
  it('returns the correct required player count for every team format', () => {
    expect(getRequiredPlayerCount('SOLO')).toBe(1);
    expect(getRequiredPlayerCount('SOLO_1V1')).toBe(2);
    expect(getRequiredPlayerCount('TEAM_2V2')).toBe(4);
    expect(getRequiredPlayerCount('TEAM_3V3')).toBe(6);
  });

  it('areRequiredPlayersReady requires the FULL roster to be ready, not just 2 — the historical TEAM_2V2/3V3 bug this replaces', () => {
    const twoOfFourReady = {
      maxPlayers: 4,
      participants: [{ ready: true }, { ready: true }],
    };
    expect(areRequiredPlayersReady(twoOfFourReady)).toBe(false);

    const fourOfFourReady = {
      maxPlayers: 4,
      participants: [{ ready: true }, { ready: true }, { ready: true }, { ready: true }],
    };
    expect(areRequiredPlayersReady(fourOfFourReady)).toBe(true);

    const fourJoinedOneNotReady = {
      maxPlayers: 4,
      participants: [{ ready: true }, { ready: true }, { ready: true }, { ready: false }],
    };
    expect(areRequiredPlayersReady(fourJoinedOneNotReady)).toBe(false);
  });

  it('isRoomAtCapacity compares against maxPlayers, not a hardcoded number', () => {
    expect(isRoomAtCapacity({ maxPlayers: 6, participants: new Array(5) })).toBe(false);
    expect(isRoomAtCapacity({ maxPlayers: 6, participants: new Array(6) })).toBe(true);
  });
});
