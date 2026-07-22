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
};
