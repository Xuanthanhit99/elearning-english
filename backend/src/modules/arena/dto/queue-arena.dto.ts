import { IsIn } from 'class-validator';

export class QueueArenaDto {
  @IsIn(['SOLO_1V1', 'TEAM_2V2', 'TEAM_3V3'])
  gameMode: string;

  @IsIn(['Vocabulary', 'Grammar', 'Listening', 'Pronunciation', 'Mixed'])
  skill: string;

  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'Mixed'])
  difficulty: string;

  @IsIn(['Animals', 'Business', 'Travel', 'IELTS', 'TOEIC', 'Conversation', 'Daily life'])
  topic: string;
}
