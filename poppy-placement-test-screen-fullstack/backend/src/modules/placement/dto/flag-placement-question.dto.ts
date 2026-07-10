import { IsBoolean, IsString } from 'class-validator';

export class FlagPlacementQuestionDto {
  @IsString()
  questionId: string;

  @IsBoolean()
  isFlagged: boolean;
}
