import { IsIn, IsObject } from 'class-validator';

export class FinishArenaMatchDto {
  @IsIn(['A', 'B'])
  winnerTeam: 'A' | 'B';

  @IsObject()
  result: Record<string, any>;
}
