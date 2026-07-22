import { ArenaPowerUpType, ArenaTeamFormat } from '@prisma/client';
import {
  getArenaFreezeDurationMs,
  getArenaPowerUpCooldownMs,
  getArenaTimeBoostMs,
} from './arena-battle.constants';

export type ArenaPowerUpTargetType = 'SELF' | 'OPPONENT';

export type ArenaPowerUpDefinition = {
  type: ArenaPowerUpType;
  enabled: boolean;
  allowedTeamFormats: ArenaTeamFormat[];
  maxUsesPerMatch: number;
  cooldownMs: () => number;
  targetType: ArenaPowerUpTargetType;
  durationMs: () => number;
};

/**
 * Single source of truth for power-up rules (§12 of the spec) — nothing
 * about a power-up's availability/target/cooldown should be hardcoded
 * anywhere else.
 */
export const ARENA_POWER_UP_DEFINITIONS: Record<ArenaPowerUpType, ArenaPowerUpDefinition> = {
  DOUBLE_SCORE: {
    type: 'DOUBLE_SCORE',
    enabled: true,
    allowedTeamFormats: ['SOLO_1V1'],
    maxUsesPerMatch: 1,
    cooldownMs: () => 0,
    targetType: 'SELF',
    durationMs: () => 0,
  },
  SHIELD: {
    type: 'SHIELD',
    enabled: true,
    allowedTeamFormats: ['SOLO_1V1'],
    maxUsesPerMatch: 1,
    cooldownMs: () => 0,
    targetType: 'SELF',
    durationMs: () => 0,
  },
  FREEZE: {
    type: 'FREEZE',
    enabled: true,
    allowedTeamFormats: ['SOLO_1V1'],
    maxUsesPerMatch: 1,
    cooldownMs: getArenaPowerUpCooldownMs,
    targetType: 'OPPONENT',
    durationMs: getArenaFreezeDurationMs,
  },
  TIME_BOOST: {
    type: 'TIME_BOOST',
    enabled: true,
    allowedTeamFormats: ['SOLO_1V1'],
    maxUsesPerMatch: 1,
    cooldownMs: () => 0,
    targetType: 'SELF',
    durationMs: getArenaTimeBoostMs,
  },
};

/**
 * Default per-match loadout, identical for every SOLO_1V1 participant
 * (Ranked and Friend Challenge alike — this codebase has no ranked/casual
 * distinction yet, see Gate E scoping note). FREEZE is defined in the
 * registry but deliberately left out of the starting loadout until it's
 * been balance-tested (spec §24 explicitly allows this).
 */
export const ARENA_DEFAULT_LOADOUT: ArenaPowerUpType[] = ['DOUBLE_SCORE', 'SHIELD', 'TIME_BOOST'];
