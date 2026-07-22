import { ArenaMode } from '@prisma/client';
import { ArenaModeCapability } from './arena-mode.types';

/**
 * Single source of truth for what each ArenaMode is allowed to do — mirrors
 * the convention already established by
 * `../battle/arena-power-up.registry.ts`. Nothing about a mode's
 * availability/ELO/team-formats/battle-mechanics should be hardcoded
 * anywhere else; gate on `ARENA_MODE_CAPABILITIES[mode]` instead.
 */
export const ARENA_MODE_CAPABILITIES: Record<ArenaMode, ArenaModeCapability> = {
  RANKED: {
    mode: 'RANKED',
    enabled: true,
    affectsElo: true,
    supportsPublicMatchmaking: true,
    supportsPrivateRooms: true,
    // All three legacy-supported team formats keep working (room
    // creation/join/finish) — battle mechanics (combo/power-ups) are further
    // gated to SOLO_1V1 only via supportsBattleMechanics + a team-format
    // check at the call site, not by narrowing this list.
    supportedTeamFormats: ['SOLO_1V1', 'TEAM_2V2', 'TEAM_3V3'],
    supportsBattleMechanics: true,
    supportsPowerUps: true,
    supportsAiQuestions: true,
  },
  FRIEND_CHALLENGE: {
    mode: 'FRIEND_CHALLENGE',
    enabled: true,
    affectsElo: false,
    supportsPublicMatchmaking: false,
    supportsPrivateRooms: true,
    supportedTeamFormats: ['SOLO_1V1'],
    supportsBattleMechanics: true,
    supportsPowerUps: true,
    supportsAiQuestions: true,
  },
  AI_PRACTICE: {
    mode: 'AI_PRACTICE',
    enabled: false,
    affectsElo: false,
    supportsPublicMatchmaking: false,
    supportsPrivateRooms: false,
    supportedTeamFormats: ['SOLO'],
    supportsBattleMechanics: false,
    supportsPowerUps: false,
    supportsAiQuestions: true,
  },
  SURVIVAL: {
    mode: 'SURVIVAL',
    enabled: false,
    affectsElo: false,
    supportsPublicMatchmaking: false,
    supportsPrivateRooms: false,
    supportedTeamFormats: ['SOLO'],
    supportsBattleMechanics: false,
    supportsPowerUps: false,
    supportsAiQuestions: true,
  },
  BLITZ: {
    mode: 'BLITZ',
    enabled: false,
    affectsElo: false,
    supportsPublicMatchmaking: false,
    supportsPrivateRooms: false,
    supportedTeamFormats: ['SOLO_1V1'],
    supportsBattleMechanics: false,
    supportsPowerUps: false,
    supportsAiQuestions: true,
  },
  TOURNAMENT_LEGACY: {
    mode: 'TOURNAMENT_LEGACY',
    // Compatibility only — existing legacy rows keep working end to end
    // (ArenaService never rejects an already-created TOURNAMENT_LEGACY
    // room), but `enabled: false` blocks it from *new* room
    // creation/matchmaking, per "must not enter new matchmaking unless
    // explicitly supported."
    enabled: false,
    affectsElo: true,
    supportsPublicMatchmaking: false,
    supportsPrivateRooms: true,
    supportedTeamFormats: ['SOLO'],
    supportsBattleMechanics: false,
    supportsPowerUps: false,
    supportsAiQuestions: true,
  },
};

export function getModeCapability(mode: ArenaMode): ArenaModeCapability {
  return ARENA_MODE_CAPABILITIES[mode];
}
