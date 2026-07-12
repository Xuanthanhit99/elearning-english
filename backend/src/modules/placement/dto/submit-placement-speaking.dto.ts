import { IsInt, IsString, Min } from 'class-validator';

export class SubmitPlacementSpeakingDto {
  @IsString()
  questionId: string;

  @IsInt()
  @Min(0)
  spentSeconds: number;
}
