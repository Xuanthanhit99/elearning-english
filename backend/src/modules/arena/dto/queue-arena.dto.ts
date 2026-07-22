import { IsIn, IsOptional } from 'class-validator';
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

export class QueueArenaDto {
  @IsOptional()
  @IsIn(['SOLO_1V1', 'TEAM_2V2', 'TEAM_3V3'])
  gameMode?: string;

  @IsOptional()
  @IsIn(ARENA_MODES)
  mode?: ArenaMode;

  @IsOptional()
  @IsIn(ARENA_TEAM_FORMATS)
  teamFormat?: ArenaTeamFormat;

  @IsIn(['Vocabulary', 'Grammar', 'Listening', 'Pronunciation', 'Mixed'])
  skill: string;

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
}
