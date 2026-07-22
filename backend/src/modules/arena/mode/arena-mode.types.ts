import { ArenaMode, ArenaTeamFormat } from '@prisma/client';

export type ArenaModeCapability = {
  mode: ArenaMode;
  enabled: boolean;
  affectsElo: boolean;
  supportsPublicMatchmaking: boolean;
  supportsPrivateRooms: boolean;
  supportedTeamFormats: ArenaTeamFormat[];
  supportsBattleMechanics: boolean;
  supportsPowerUps: boolean;
  supportsAiQuestions: boolean;
  // Phase F1: reward/rating decisions must come from these four flags, never
  // inferred from gameMode strings/team format/visibility/match size (see
  // docs/arena-phase-f-design.md Part 4). Independent of `affectsElo` and of
  // each other on purpose — e.g. FRIEND_CHALLENGE grants XP/gold without
  // affecting ELO; a future mode could grant Arena Points without XP, etc.
  grantsXp: boolean;
  grantsGold: boolean;
  grantsArenaPoints: boolean;
  participatesInSeason: boolean;
};
