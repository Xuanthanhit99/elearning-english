import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ArenaMode, ArenaTeamFormat } from '@prisma/client';

const ARENA_MODES: ArenaMode[] = [
  'RANKED',
  'AI_PRACTICE',
  'SURVIVAL',
  'BLITZ',
  'FRIEND_CHALLENGE',
  'TOURNAMENT_LEGACY',
];
const ARENA_TEAM_FORMATS: ArenaTeamFormat[] = ['SOLO', 'SOLO_1V1', 'TEAM_2V2', 'TEAM_3V3'];

export class CreateArenaRoomDto {
  @IsString()
  @MaxLength(60)
  name: string;

  @IsIn(['PUBLIC', 'PRIVATE'])
  visibility: 'PUBLIC' | 'PRIVATE';

  @IsOptional()
  @IsString()
  @MaxLength(40)
  password?: string;

  // Legacy shape — still accepted for backward compatibility. Optional now
  // that `mode`/`teamFormat` exist; ArenaService requires at least one of
  // the two representations and rejects a conflicting combination.
  @IsOptional()
  @IsIn(['SOLO_1V1', 'TEAM_2V2', 'TEAM_3V3', 'TOURNAMENT'])
  gameMode?: string;

  // Canonical shape (Phase BC-Reconciliation).
  @IsOptional()
  @IsIn(ARENA_MODES)
  mode?: ArenaMode;

  @IsOptional()
  @IsIn(ARENA_TEAM_FORMATS)
  teamFormat?: ArenaTeamFormat;

  @IsIn(['Vocabulary', 'Grammar', 'Listening', 'Pronunciation', 'Mixed'])
  skill: string;

  @IsIn(['TIME', 'MAX_WRONG', 'RACE', 'BEST_OF'])
  winCondition: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(900)
  durationSec?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxWrong?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(100)
  targetCorrect?: number;

  @IsOptional()
  @IsIn([3, 5, 7])
  bestOf?: number;

  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'Mixed'])
  difficulty: string;

  @IsIn([
    'Animals',
    'Business',
    'Travel',
    'IELTS',
    'TOEIC',
    'Conversation',
    'Daily life',
  ])
  topic: string;

  @IsOptional()
  @IsBoolean()
  voiceChat?: boolean;

  @IsOptional()
  @IsBoolean()
  emojiEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pingEnabled?: boolean;
}
