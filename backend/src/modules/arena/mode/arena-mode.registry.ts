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
    grantsXp: true,
    grantsGold: true,
    grantsArenaPoints: true,
    participatesInSeason: true,
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
    // Casual/private play still feels rewarding (XP/gold), but never
    // touches ELO/season standing — matches the existing pre-F1 behavior
    // where gold/food/trophy were already granted unconditionally
    // regardless of affectsElo.
    grantsXp: true,
    grantsGold: true,
    grantsArenaPoints: false,
    participatesInSeason: false,
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
    grantsXp: false,
    grantsGold: false,
    grantsArenaPoints: false,
    participatesInSeason: false,
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
    grantsXp: false,
    grantsGold: false,
    grantsArenaPoints: false,
    participatesInSeason: false,
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
    grantsXp: false,
    grantsGold: false,
    grantsArenaPoints: false,
    participatesInSeason: false,
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
    // Gold/Arena Points preserve the exact pre-F1 unconditional-gold /
    // affectsElo-gated-arenaPoint behavior for any surviving legacy rows.
    // XP is a brand-new reward type that never existed for this legacy
    // path — deliberately not retrofitted onto it, and it's excluded from
    // the new season system entirely (compatibility-only, not a
    // product-supported path going forward).
    grantsXp: false,
    grantsGold: true,
    grantsArenaPoints: true,
    participatesInSeason: false,
  },
};

export function getModeCapability(mode: ArenaMode): ArenaModeCapability {
  return ARENA_MODE_CAPABILITIES[mode];
}
